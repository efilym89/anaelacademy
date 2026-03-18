import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

const videoExtensions = new Set(['.mp4', '.m4v', '.mov', '.webm', '.mkv']);
const presentationExtensions = new Set(['.pptx']);

const dayFolders = [
  { dayNumber: 1, aliases: ['day-1', 'День первый', 'День 1'] },
  { dayNumber: 2, aliases: ['day-2', 'День второй', 'День 2'] }
];

export function normalizeImportedStorage() {
  const actions = [];

  dayFolders.forEach((dayFolder) => {
    const sourceFolders = dayFolder.aliases
      .map((folderName) => path.join(config.storageRoot, folderName))
      .filter((folderPath) => existsSync(folderPath));

    const canonicalDayPath = path.join(config.storageRoot, `day-${dayFolder.dayNumber}`);
    mkdirSync(canonicalDayPath, { recursive: true });

    sourceFolders.forEach((sourceDayPath) => {
      const lessonFolders = readdirSync(sourceDayPath, { withFileTypes: true }).filter((entry) =>
        entry.isDirectory()
      );

      lessonFolders.forEach((lessonFolder) => {
        const lessonNumber = extractLessonNumber(lessonFolder.name);
        if (!lessonNumber) {
          return;
        }

        const sourceLessonPath = path.join(sourceDayPath, lessonFolder.name);
        const canonicalLessonPath = path.join(canonicalDayPath, `lesson-${lessonNumber}`);
        moveDirectoryContents(sourceLessonPath, canonicalLessonPath, actions);

        if (sourceLessonPath !== canonicalLessonPath && isDirectoryEmpty(sourceLessonPath)) {
          rmSync(sourceLessonPath, { recursive: true, force: true });
        }
      });

      if (sourceDayPath !== canonicalDayPath && isDirectoryEmpty(sourceDayPath)) {
        rmSync(sourceDayPath, { recursive: true, force: true });
      }
    });
  });

  dayFolders.forEach((dayFolder) => {
    const canonicalDayPath = path.join(config.storageRoot, `day-${dayFolder.dayNumber}`);
    if (!existsSync(canonicalDayPath)) {
      return;
    }

    readdirSync(canonicalDayPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .forEach((lessonFolder) => {
        const lessonNumber = extractLessonNumber(lessonFolder.name);
        if (!lessonNumber) {
          return;
        }

        const canonicalLessonPath = path.join(canonicalDayPath, `lesson-${lessonNumber}`);
        if (lessonFolder.name !== `lesson-${lessonNumber}`) {
          moveDirectoryContents(path.join(canonicalDayPath, lessonFolder.name), canonicalLessonPath, actions);
          const nonCanonicalPath = path.join(canonicalDayPath, lessonFolder.name);
          if (isDirectoryEmpty(nonCanonicalPath)) {
            rmSync(nonCanonicalPath, { recursive: true, force: true });
          }
        }

        normalizeLessonFiles(canonicalLessonPath, actions);
      });
  });

  return actions;
}

function normalizeLessonFiles(lessonPath, actions) {
  if (!existsSync(lessonPath)) {
    return;
  }

  const files = readdirSync(lessonPath, { withFileTypes: true }).filter((entry) => entry.isFile());
  const sortedFiles = files.sort((left, right) =>
    left.name.localeCompare(right.name, 'ru', { sensitivity: 'base' })
  );

  const existingMetadata = readMetadata(lessonPath);
  const videoEntry =
    sortedFiles.find((entry) => isVideoFile(entry.name) && entry.name.toLowerCase().startsWith('video.')) ??
    sortedFiles.find((entry) => isVideoFile(entry.name));
  const presentationEntry =
    sortedFiles.find((entry) => entry.name.toLowerCase() === 'presentation.pptx') ??
    sortedFiles.find((entry) => isPresentationFile(entry.name));

  if (videoEntry) {
    const targetVideoName = `video${path.extname(videoEntry.name).toLowerCase()}`;
    if (videoEntry.name !== targetVideoName) {
      renameSync(path.join(lessonPath, videoEntry.name), path.join(lessonPath, targetVideoName));
      actions.push(`video:${path.basename(lessonPath)}:${videoEntry.name}->${targetVideoName}`);
    }
  }

  if (presentationEntry && presentationEntry.name !== 'presentation.pptx') {
    renameSync(
      path.join(lessonPath, presentationEntry.name),
      path.join(lessonPath, 'presentation.pptx')
    );
    actions.push(`presentation:${path.basename(lessonPath)}:${presentationEntry.name}->presentation.pptx`);
  }

  const titleSource =
    existingMetadata.title ??
    (presentationEntry ? presentationEntry.name : videoEntry ? videoEntry.name : path.basename(lessonPath));
  const normalizedMetadata = {
    ...existingMetadata,
    title: sanitizeLessonTitle(titleSource),
    status: existingMetadata.status ?? 'published'
  };

  writeFileSync(
    path.join(lessonPath, 'metadata.json'),
    `${JSON.stringify(normalizedMetadata, null, 2)}\n`,
    'utf8'
  );
}

function moveDirectoryContents(sourcePath, targetPath, actions) {
  if (!existsSync(sourcePath)) {
    return;
  }

  mkdirSync(targetPath, { recursive: true });
  const entries = readdirSync(sourcePath, { withFileTypes: true });

  entries.forEach((entry) => {
    const sourceEntryPath = path.join(sourcePath, entry.name);
    const targetEntryPath = path.join(targetPath, entry.name);

    if (entry.isDirectory()) {
      moveDirectoryContents(sourceEntryPath, targetEntryPath, actions);
      if (isDirectoryEmpty(sourceEntryPath)) {
        rmSync(sourceEntryPath, { recursive: true, force: true });
      }
      return;
    }

    if (sourceEntryPath === targetEntryPath) {
      return;
    }

    if (existsSync(targetEntryPath)) {
      const parsed = path.parse(entry.name);
      const uniqueTargetPath = path.join(
        targetPath,
        `${parsed.name}-imported${parsed.ext.toLowerCase()}`
      );
      renameSync(sourceEntryPath, uniqueTargetPath);
      actions.push(`move:${sourceEntryPath}->${uniqueTargetPath}`);
      return;
    }

    renameSync(sourceEntryPath, targetEntryPath);
    actions.push(`move:${sourceEntryPath}->${targetEntryPath}`);
  });
}

function readMetadata(lessonPath) {
  const metadataPath = path.join(lessonPath, 'metadata.json');
  if (!existsSync(metadataPath)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(metadataPath, 'utf8').replace(/^\uFEFF/u, ''));
  } catch (_) {
    return {};
  }
}

function sanitizeLessonTitle(value) {
  return path
    .parse(String(value).replace(/\u00A0/gu, ' ').trim())
    .name.replace(/^\s*Урок\s*№\s*\d+\s*/iu, '')
    .replace(/^\s*№\s*\d+\s*/iu, '')
    .replace(/^\s*[-–—]+\s*/u, '')
    .trim();
}

function extractLessonNumber(folderName) {
  const normalizedName = String(folderName).trim();
  const match =
    /^lesson-(\d+)$/iu.exec(normalizedName) ??
    /урок\s*(\d+)/iu.exec(normalizedName) ??
    /lesson\s*(\d+)/iu.exec(normalizedName);

  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10);
}

function isVideoFile(fileName) {
  return videoExtensions.has(path.extname(fileName).toLowerCase());
}

function isPresentationFile(fileName) {
  return presentationExtensions.has(path.extname(fileName).toLowerCase());
}

function isDirectoryEmpty(folderPath) {
  if (!existsSync(folderPath)) {
    return true;
  }

  return readdirSync(folderPath).length === 0;
}
