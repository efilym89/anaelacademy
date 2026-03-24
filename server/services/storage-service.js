import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

const videoExtensions = new Set(['.mp4', '.m4v', '.mov', '.webm', '.mkv']);
const presentationSourceExtensions = new Set(['.pptx']);
const presentationDocumentExtensions = new Set(['.pdf']);
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.avif']);
const preferredVideoExtensionOrder = ['.mp4', '.m4v', '.webm', '.mov', '.mkv'];

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
  const videoEntries = entries
    .filter((entry) => isVideoFile(entry.name))
    .sort(compareVideoEntriesByPriority);
  const videoFiles = videoEntries
    .map((entry) => ({
      name: entry.name,
      relativePath: normalizeRelativePath(
        path.posix.join(`day-${dayNumber}`, `lesson-${lessonNumber}`, entry.name)
      )
    }));
  const videoEntry = videoEntries[0] ?? null;
  const presentationSourceEntry =
    entries.find((entry) => entry.name.toLowerCase() === 'presentation.pptx') ??
    entries.find((entry) => presentationSourceExtensions.has(path.extname(entry.name).toLowerCase()));
  const presentationPdfEntry =
    entries.find((entry) => entry.name.toLowerCase() === 'presentation.pdf') ??
    entries.find((entry) => presentationDocumentExtensions.has(path.extname(entry.name).toLowerCase()));
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
    presentationPath: presentationSourceEntry
      ? normalizeRelativePath(path.posix.join(`day-${dayNumber}`, `lesson-${lessonNumber}`, presentationSourceEntry.name))
      : null,
    presentationSourcePath: presentationSourceEntry
      ? normalizeRelativePath(path.posix.join(`day-${dayNumber}`, `lesson-${lessonNumber}`, presentationSourceEntry.name))
      : null,
    presentationPdfPath: presentationPdfEntry
      ? normalizeRelativePath(path.posix.join(`day-${dayNumber}`, `lesson-${lessonNumber}`, presentationPdfEntry.name))
      : null,
    coverPath: coverEntry
      ? normalizeRelativePath(path.posix.join(`day-${dayNumber}`, `lesson-${lessonNumber}`, coverEntry.name))
      : null,
    metadata
  };
}

export function toPublicStorageUrl(relativeAssetPath) {
  return buildPublicAssetUrl(relativeAssetPath, config.publicStorageOrigin);
}

export function toPublicVideoUrl(relativeAssetPath) {
  return buildPublicAssetUrl(relativeAssetPath, config.publicVideoOrigin || config.publicStorageOrigin);
}

function buildPublicAssetUrl(relativeAssetPath, origin) {
  if (!relativeAssetPath) {
    return '';
  }

  const normalizedRelativePath = normalizeRelativePath(relativeAssetPath);
  if (origin) {
    return `${origin}${config.publicStoragePrefix}${normalizedRelativePath}`;
  }

  return `${config.publicStoragePrefix}${normalizedRelativePath}`;
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

function compareVideoEntriesByPriority(left, right) {
  const extensionRank = getVideoExtensionPriority(path.extname(left.name)) - getVideoExtensionPriority(path.extname(right.name));
  if (extensionRank !== 0) {
    return extensionRank;
  }

  const isPreferredNameLeft = left.name.toLowerCase().startsWith('video.') ? -1 : 0;
  const isPreferredNameRight = right.name.toLowerCase().startsWith('video.') ? -1 : 0;
  if (isPreferredNameLeft !== isPreferredNameRight) {
    return isPreferredNameLeft - isPreferredNameRight;
  }

  return left.name.localeCompare(right.name, 'ru', { sensitivity: 'base' });
}

function getVideoExtensionPriority(extension) {
  const normalizedExtension = String(extension || '').toLowerCase();
  const index = preferredVideoExtensionOrder.indexOf(normalizedExtension);
  return index === -1 ? preferredVideoExtensionOrder.length : index;
}
