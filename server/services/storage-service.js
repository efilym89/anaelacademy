import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

const videoExtensions = new Set(['.mp4', '.m4v', '.mov', '.webm', '.mkv']);
const presentationExtensions = new Set(['.pptx']);
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.avif']);

export function ensureCourseStorageFolders(course) {
  course.lessons.forEach((lesson) => {
    mkdirSync(getLessonFolderAbsolute(lesson.dayNumber, lesson.lessonNumber), { recursive: true });
  });
}

export function inspectLessonStorage(dayNumber, lessonNumber) {
  const absoluteFolder = getLessonFolderAbsolute(dayNumber, lessonNumber);
  const relativeFolder = getLessonFolderRelative(dayNumber, lessonNumber);
  mkdirSync(absoluteFolder, { recursive: true });

  const entries = readdirSync(absoluteFolder, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .sort((left, right) => left.name.localeCompare(right.name, 'ru', { sensitivity: 'base' }));
  const videoFiles = entries
    .filter((entry) => isVideoFile(entry.name))
    .map((entry) => ({
      name: entry.name,
      relativePath: normalizeRelativePath(
        path.posix.join(`day-${dayNumber}`, `lesson-${lessonNumber}`, entry.name)
      )
    }));
  const videoEntry =
    entries.find(
      (entry) =>
        isVideoFile(entry.name) && entry.name.toLowerCase().startsWith('video.')
    ) ?? entries.find((entry) => videoExtensions.has(path.extname(entry.name).toLowerCase()));
  const presentationEntry =
    entries.find((entry) => entry.name.toLowerCase() === 'presentation.pptx') ??
    entries.find((entry) => presentationExtensions.has(path.extname(entry.name).toLowerCase()));
  const coverEntry =
    entries.find(
      (entry) => isImageFile(entry.name) && entry.name.toLowerCase().startsWith('cover.')
    ) ?? entries.find((entry) => isImageFile(entry.name));
  const metadata = readLessonMetadata(absoluteFolder);

  return {
    folderAbsolute: absoluteFolder,
    folderRelative: relativeFolder,
    videoFiles,
    videoPath: videoEntry
      ? normalizeRelativePath(path.posix.join(`day-${dayNumber}`, `lesson-${lessonNumber}`, videoEntry.name))
      : null,
    presentationPath: presentationEntry
      ? normalizeRelativePath(path.posix.join(`day-${dayNumber}`, `lesson-${lessonNumber}`, presentationEntry.name))
      : null,
    coverPath: coverEntry
      ? normalizeRelativePath(path.posix.join(`day-${dayNumber}`, `lesson-${lessonNumber}`, coverEntry.name))
      : null,
    metadata
  };
}

export function toPublicStorageUrl(relativeAssetPath) {
  if (!relativeAssetPath) {
    return '';
  }

  return `${config.publicStoragePrefix}${normalizeRelativePath(relativeAssetPath)}`;
}

export function getLessonFolderAbsolute(dayNumber, lessonNumber) {
  return path.join(config.storageRoot, `day-${dayNumber}`, `lesson-${lessonNumber}`);
}

export function getLessonFolderRelative(dayNumber, lessonNumber) {
  return normalizeRelativePath(path.posix.join('storage', `day-${dayNumber}`, `lesson-${lessonNumber}`));
}

function readLessonMetadata(folderAbsolute) {
  const metadataPath = path.join(folderAbsolute, 'metadata.json');
  if (!existsSync(metadataPath)) {
    return null;
  }

  try {
    const rawMetadata = readFileSync(metadataPath, 'utf8').replace(/^\uFEFF/u, '');
    return JSON.parse(rawMetadata);
  } catch (error) {
    return {
      parseError: error.message
    };
  }
}

function normalizeRelativePath(relativePath) {
  return relativePath.replace(/\\/gu, '/');
}

function isVideoFile(fileName) {
  return videoExtensions.has(path.extname(fileName).toLowerCase());
}

function isImageFile(fileName) {
  return imageExtensions.has(path.extname(fileName).toLowerCase());
}
