import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { config } from './config.js';
import { getBootstrapPayload, initializeCourseData } from './services/course-service.js';
import { getPresentationPreviewPayload } from './services/presentation-preview-service.js';

initializeCourseData();

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.avif': 'image/avif',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.m4v': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.svg': 'image/svg+xml',
  '.webm': 'video/webm',
  '.webp': 'image/webp'
};

const server = createServer((request, response) => {
  void handleRequest(request, response);
});

server.listen(config.port, () => {
  console.log(`Anael Academy local server started on http://localhost:${config.port}`);
});

async function handleRequest(request, response) {
  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

    if (url.pathname === '/api/health') {
      sendJson(response, 200, {
        status: 'ok',
        database: config.databasePath,
        storage: config.storageRoot
      });
      return;
    }

    if (url.pathname === '/api/bootstrap') {
      sendJson(response, 200, getBootstrapPayload());
      return;
    }

    const previewMatch = /^\/api\/lessons\/([^/]+)\/presentation-preview$/u.exec(url.pathname);
    if (previewMatch) {
      const previewResponse = await getPresentationPreviewPayload(decodeURIComponent(previewMatch[1]));
      sendJson(response, previewResponse.statusCode, previewResponse.payload);
      return;
    }

    if (url.pathname.startsWith(config.publicStoragePrefix)) {
      const relativeAssetPath = decodeURIComponent(url.pathname.slice(config.publicStoragePrefix.length));
      const absoluteAssetPath = safeResolve(config.storageRoot, relativeAssetPath);
      if (!absoluteAssetPath || !existsSync(absoluteAssetPath)) {
        sendText(response, 404, 'Asset not found');
        return;
      }

      serveFile(request, response, absoluteAssetPath, { enableRange: true });
      return;
    }

    if (url.pathname.startsWith(config.publicPresentationPreviewPrefix)) {
      const relativePreviewPath = decodeURIComponent(
        url.pathname.slice(config.publicPresentationPreviewPrefix.length)
      );
      const absolutePreviewPath = safeResolve(config.presentationPreviewRoot, relativePreviewPath);
      if (!absolutePreviewPath || !existsSync(absolutePreviewPath)) {
        sendText(response, 404, 'Preview not found');
        return;
      }

      serveFile(request, response, absolutePreviewPath);
      return;
    }

    const staticTarget = resolveStaticPath(url.pathname);
    if (!staticTarget || !existsSync(staticTarget)) {
      sendText(response, 404, 'Not found');
      return;
    }

    serveFile(request, response, staticTarget);
  } catch (error) {
    sendJson(response, 500, {
      error: 'Internal server error',
      details: error.message
    });
  }
}

function resolveStaticPath(pathname) {
  if (pathname === '/' || pathname === '/index.html') {
    return path.join(config.rootDir, 'index.html');
  }

  const rootFiles = new Set(['/app.js', '/course-data.js', '/progress-store.js', '/styles.css']);
  if (rootFiles.has(pathname)) {
    return path.join(config.rootDir, pathname.slice(1));
  }

  if (pathname.startsWith('/shared/')) {
    return safeResolve(path.join(config.rootDir, 'shared'), pathname.slice('/shared/'.length));
  }

  if (pathname.startsWith('/docs/')) {
    return safeResolve(path.join(config.rootDir, 'docs'), pathname.slice('/docs/'.length));
  }

  return null;
}

function safeResolve(basePath, relativePath) {
  const absolutePath = path.resolve(basePath, relativePath);
  if (absolutePath === basePath || absolutePath.startsWith(`${basePath}${path.sep}`)) {
    return absolutePath;
  }

  return null;
}

function serveFile(request, response, absolutePath, options = {}) {
  const stats = statSync(absolutePath);
  const extension = path.extname(absolutePath).toLowerCase();
  const mimeType = mimeTypes[extension] ?? 'application/octet-stream';

  if (options.enableRange && request.headers.range) {
    const range = parseRangeHeader(request.headers.range, stats.size);
    if (!range) {
      response.writeHead(416, {
        'Content-Range': `bytes */${stats.size}`
      });
      response.end();
      return;
    }

    response.writeHead(206, {
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
      'Content-Length': range.end - range.start + 1,
      'Content-Range': `bytes ${range.start}-${range.end}/${stats.size}`,
      'Content-Type': mimeType
    });
    createReadStream(absolutePath, range).pipe(response);
    return;
  }

  response.writeHead(200, {
    'Accept-Ranges': options.enableRange ? 'bytes' : 'none',
    'Cache-Control': 'no-cache',
    'Content-Length': stats.size,
    'Content-Type': mimeType
  });
  createReadStream(absolutePath).pipe(response);
}

function parseRangeHeader(headerValue, size) {
  const match = /^bytes=(\d*)-(\d*)$/u.exec(headerValue.trim());
  if (!match) {
    return null;
  }

  let start = match[1] ? Number.parseInt(match[1], 10) : 0;
  let end = match[2] ? Number.parseInt(match[2], 10) : size - 1;

  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
    return null;
  }

  end = Math.min(end, size - 1);
  return { start, end };
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'application/json; charset=utf-8'
  });
  response.end(body);
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8'
  });
  response.end(message);
}
