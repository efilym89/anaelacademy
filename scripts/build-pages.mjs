import {
  closeSync,
  cpSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'dist-pages');
const maxStaticAssetBytes = 25 * 1024 * 1024;
const chunkAssetBytes = 24 * 1024 * 1024;
const videoChunkRoot = '__video_proxy__';
const defaultPublicStorageOrigin = 'https://anaelacademy.efilym77.workers.dev';

const staticEntries = [
  'index.html',
  'app.js',
  'course-data.js',
  'progress-store.js',
  'styles.css',
  '_headers',
  '_redirects',
  'shared',
  'assets',
  'storage'
];

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

staticEntries.forEach((entry) => {
  const sourcePath = path.join(rootDir, entry);
  const targetPath = path.join(outDir, entry);

  if (!existsSync(sourcePath)) {
    return;
  }

  cpSync(sourcePath, targetPath, {
    recursive: true
  });
});

replaceLargeVideoAssetsWithChunks(path.join(outDir, 'storage'), outDir);

process.env.PUBLIC_STORAGE_ORIGIN ||= defaultPublicStorageOrigin;
const { createStaticBootstrapPayload } = await import('../server/services/course-service.js');
const staticBootstrapPayload = createStaticBootstrapPayload();
writeFileSync(path.join(outDir, 'bootstrap-course.json'), `${JSON.stringify(staticBootstrapPayload, null, 2)}\n`, 'utf8');

const indexHtml = readFileSync(path.join(rootDir, 'index.html'), 'utf8');
writeFileSync(path.join(outDir, '404.html'), indexHtml, 'utf8');
writeFileSync(path.join(outDir, '.nojekyll'), '', 'utf8');

function replaceLargeVideoAssetsWithChunks(directory, buildRoot) {
  if (!existsSync(directory)) {
    return;
  }

  const entries = readdirSync(directory, { withFileTypes: true });
  entries.forEach((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      replaceLargeVideoAssetsWithChunks(absolutePath, buildRoot);
      return;
    }

    if (!entry.isFile()) {
      return;
    }

    if (isLargeVideoAsset(absolutePath)) {
      chunkVideoAsset(absolutePath, buildRoot);
    }
  });
}

function isLargeVideoAsset(absolutePath) {
  const extension = path.extname(absolutePath).toLowerCase();
  if (!['.mp4', '.m4v', '.mov', '.webm', '.mkv'].includes(extension)) {
    return false;
  }

  return statSync(absolutePath).size > maxStaticAssetBytes;
}

function chunkVideoAsset(absolutePath, buildRoot) {
  const relativePath = normalizeAssetPath(path.relative(buildRoot, absolutePath));
  const stats = statSync(absolutePath);
  const chunkDirectory = path.join(buildRoot, videoChunkRoot, relativePath);
  const chunksDirectory = path.join(chunkDirectory, 'chunks');
  const manifestPath = path.join(chunkDirectory, 'manifest.json');
  const descriptor = {
    chunkSize: chunkAssetBytes,
    mimeType: resolveVideoMimeType(absolutePath),
    originalPath: `/${relativePath}`,
    totalSize: stats.size,
    chunks: []
  };

  mkdirSync(chunksDirectory, { recursive: true });

  const fileDescriptor = openSync(absolutePath, 'r');
  try {
    let offset = 0;
    let partIndex = 0;
    while (offset < stats.size) {
      const nextChunkSize = Math.min(chunkAssetBytes, stats.size - offset);
      const chunkBuffer = Buffer.allocUnsafe(nextChunkSize);
      readSync(fileDescriptor, chunkBuffer, 0, nextChunkSize, offset);

      const chunkRelativePath = normalizeAssetPath(
        path.join(videoChunkRoot, relativePath, 'chunks', `part-${String(partIndex).padStart(4, '0')}.bin`)
      );
      const chunkAbsolutePath = path.join(buildRoot, chunkRelativePath);
      mkdirSync(path.dirname(chunkAbsolutePath), { recursive: true });
      writeFileSync(chunkAbsolutePath, chunkBuffer);

      descriptor.chunks.push(`/${chunkRelativePath}`);
      offset += nextChunkSize;
      partIndex += 1;
    }
  } finally {
    closeSync(fileDescriptor);
  }

  writeFileSync(manifestPath, `${JSON.stringify(descriptor, null, 2)}\n`, 'utf8');
  rmSync(absolutePath, { force: true });
}

function resolveVideoMimeType(absolutePath) {
  const extension = path.extname(absolutePath).toLowerCase();
  if (extension === '.webm') {
    return 'video/webm';
  }

  if (extension === '.mkv') {
    return 'video/x-matroska';
  }

  if (extension === '.mov') {
    return 'video/quicktime';
  }

  return 'video/mp4';
}

function normalizeAssetPath(relativePath) {
  return relativePath.replace(/\\/gu, '/');
}
