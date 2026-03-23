const videoManifestRoot = '/__video_proxy__';
const assetOrigin = 'https://assets.local';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'GET' || request.method === 'HEAD') {
      const chunkedVideoResponse = await tryServeChunkedVideo(request, env, url);
      if (chunkedVideoResponse) {
        return chunkedVideoResponse;
      }
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (!url.pathname.startsWith('/storage/')) {
      return assetResponse;
    }

    return withMediaHeaders(assetResponse);
  }
};

async function tryServeChunkedVideo(request, env, url) {
  if (!url.pathname.startsWith('/storage/')) {
    return null;
  }

  const manifestResponse = await env.ASSETS.fetch(buildAssetRequest(`${videoManifestRoot}${url.pathname}/manifest.json`));
  if (!manifestResponse.ok || !isJsonResponse(manifestResponse)) {
    return null;
  }

  const manifest = await manifestResponse.json();
  return serveManifestBackedVideo(request, env, manifest);
}

async function serveManifestBackedVideo(request, env, manifest) {
  const totalSize = Number(manifest.totalSize || 0);
  if (!Number.isFinite(totalSize) || totalSize <= 0 || !Array.isArray(manifest.chunks) || manifest.chunks.length === 0) {
    return new Response('Chunk manifest is invalid.', { status: 500 });
  }

  const range = parseRangeHeader(request.headers.get('range'), totalSize);
  if (request.headers.has('range') && !range) {
    return withMediaHeaders(
      new Response(null, {
        status: 416,
        headers: {
          'Content-Range': `bytes */${totalSize}`
        }
      })
    );
  }

  const start = range?.start ?? 0;
  const end = range?.end ?? totalSize - 1;
  const contentLength = end - start + 1;
  const headers = new Headers({
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Length': String(contentLength),
    'Content-Type': manifest.mimeType || 'video/mp4'
  });

  if (range) {
    headers.set('Content-Range', `bytes ${start}-${end}/${totalSize}`);
  }

  if (request.method === 'HEAD') {
    return withMediaHeaders(
      new Response(null, {
        status: range ? 206 : 200,
        headers
      })
    );
  }

  return withMediaHeaders(
    new Response(createVideoStream(env, manifest, start, end), {
      status: range ? 206 : 200,
      headers
    })
  );
}

function createVideoStream(env, manifest, start, end) {
  const chunkSize = Number(manifest.chunkSize || 0);
  const firstChunkIndex = Math.floor(start / chunkSize);
  const lastChunkIndex = Math.floor(end / chunkSize);
  let nextChunkIndex = firstChunkIndex;

  return new ReadableStream({
    async pull(controller) {
      if (nextChunkIndex > lastChunkIndex) {
        controller.close();
        return;
      }

      const chunkPath = manifest.chunks[nextChunkIndex];
      const chunkResponse = await env.ASSETS.fetch(buildAssetRequest(chunkPath));
      if (!chunkResponse.ok) {
        controller.error(new Error(`Failed to load video chunk: ${chunkPath}`));
        return;
      }

      const chunkBytes = new Uint8Array(await chunkResponse.arrayBuffer());
      const chunkOffset = nextChunkIndex * chunkSize;
      const sliceStart = nextChunkIndex === firstChunkIndex ? start - chunkOffset : 0;
      const sliceEndExclusive = nextChunkIndex === lastChunkIndex ? end - chunkOffset + 1 : chunkBytes.byteLength;
      controller.enqueue(chunkBytes.subarray(sliceStart, sliceEndExclusive));
      nextChunkIndex += 1;
    }
  });
}

function buildAssetRequest(pathname) {
  return new Request(new URL(pathname, assetOrigin));
}

function isJsonResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json');
}

function parseRangeHeader(headerValue, totalSize) {
  if (!headerValue) {
    return null;
  }

  const match = /^bytes=(\d*)-(\d*)$/u.exec(headerValue.trim());
  if (!match) {
    return null;
  }

  if (match[1] === '' && match[2] === '') {
    return null;
  }

  let start;
  let end;

  if (match[1] === '') {
    const suffixLength = Number.parseInt(match[2], 10);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return null;
    }

    start = Math.max(totalSize - suffixLength, 0);
    end = totalSize - 1;
  } else {
    start = Number.parseInt(match[1], 10);
    end = match[2] === '' ? totalSize - 1 : Number.parseInt(match[2], 10);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > end || start >= totalSize) {
    return null;
  }

  return {
    start,
    end: Math.min(end, totalSize - 1)
  };
}

function withMediaHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  headers.set('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Length, Content-Range, Content-Type');
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  headers.set('Timing-Allow-Origin', '*');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
