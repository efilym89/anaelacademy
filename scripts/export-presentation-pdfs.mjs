import { execFile } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const storageRoot = path.join(rootDir, 'storage');
const exportScriptPath = path.join(rootDir, 'server', 'tools', 'export-pptx-preview.ps1');

if (!existsSync(exportScriptPath)) {
  throw new Error('PowerPoint export script was not found.');
}

const lessonFolders = collectLessonFolders(storageRoot);
let convertedCount = 0;
let skippedCount = 0;

for (const lessonFolder of lessonFolders) {
  const sourcePath = path.join(lessonFolder, 'presentation.pptx');
  if (!existsSync(sourcePath)) {
    continue;
  }

  const outputPath = path.join(lessonFolder, 'presentation.pdf');
  if (isFreshEnough(sourcePath, outputPath)) {
    skippedCount += 1;
    continue;
  }

  await execFileAsync(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      exportScriptPath,
      '-SourcePath',
      sourcePath,
      '-OutputPath',
      outputPath
    ],
    {
      cwd: rootDir,
      windowsHide: true,
      timeout: 180000,
      maxBuffer: 1024 * 1024
    }
  );

  convertedCount += 1;
  console.log(`[pdf] ${path.relative(rootDir, outputPath).replace(/\\/gu, '/')}`);
}

console.log(`Presentation PDF export complete. converted=${convertedCount} skipped=${skippedCount}`);

function collectLessonFolders(rootDirectory) {
  if (!existsSync(rootDirectory)) {
    return [];
  }

  const dayDirectories = readdirSync(rootDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^day-\d+$/u.test(entry.name))
    .map((entry) => path.join(rootDirectory, entry.name));

  return dayDirectories.flatMap((dayDirectory) =>
    readdirSync(dayDirectory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^lesson-\d+$/u.test(entry.name))
      .map((entry) => path.join(dayDirectory, entry.name))
  );
}

function isFreshEnough(sourcePath, outputPath) {
  if (!existsSync(outputPath)) {
    return false;
  }

  return statSync(outputPath).mtimeMs >= statSync(sourcePath).mtimeMs;
}
