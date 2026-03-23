import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticBootstrapPayload } from '../server/services/course-service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'dist-pages');

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

const staticBootstrapPayload = createStaticBootstrapPayload();
writeFileSync(path.join(outDir, 'bootstrap-course.json'), `${JSON.stringify(staticBootstrapPayload, null, 2)}\n`, 'utf8');

const indexHtml = readFileSync(path.join(rootDir, 'index.html'), 'utf8');
writeFileSync(path.join(outDir, '404.html'), indexHtml, 'utf8');
writeFileSync(path.join(outDir, '.nojekyll'), '', 'utf8');
