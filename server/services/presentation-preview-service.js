import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { createFallbackCourseData } from '../../shared/course-blueprint.js';
import { config } from '../config.js';
import { getDatabase } from '../db/connection.js';
import { ensureSchema } from '../db/schema.js';
import { getCourseBundle } from '../repositories/course-repository.js';

const execFileAsync = promisify(execFile);
const fallbackCourseId = createFallbackCourseData().id;
const exportScriptPath = path.resolve(config.rootDir, 'server', 'tools', 'export-pptx-preview.ps1');
const pendingPreviewJobs = new Map();

export async function getPresentationPreviewPayload(lessonId) {
  const lesson = getLessonRecord(lessonId);
  if (!lesson) {
    return {
      statusCode: 404,
      payload: {
        message: 'Урок не найден.'
      }
    };
  }

  if (!lesson.presentation_path) {
    return {
      statusCode: 404,
      payload: {
        lessonId,
        message: 'Для этого урока презентация пока не загружена.'
      }
    };
  }

  const sourcePath = path.resolve(config.storageRoot, lesson.presentation_path);
  if (!existsSync(sourcePath)) {
    return {
      statusCode: 404,
      payload: {
        lessonId,
        message: 'Файл презентации не найден в локальном storage.'
      }
    };
  }

  const previewRelativePath = normalizeRelativePath(
    path.posix.join(`day-${lesson.day_number}`, `lesson-${lesson.lesson_number}`, 'presentation.pdf')
  );
  const previewAbsolutePath = path.resolve(config.presentationPreviewRoot, previewRelativePath);

  const previewReady = await ensurePresentationPreview(sourcePath, previewAbsolutePath);
  if (!previewReady.ok) {
    return {
      statusCode: previewReady.statusCode,
      payload: {
        lessonId,
        message: previewReady.message
      }
    };
  }

  const previewStats = statSync(previewAbsolutePath);
  return {
    statusCode: 200,
    payload: {
      lessonId,
      status: 'ready',
      viewerUrl: `${config.publicPresentationPreviewPrefix}${previewRelativePath}?v=${Math.round(previewStats.mtimeMs)}`,
      downloadUrl: `${config.publicStoragePrefix}${normalizeRelativePath(lesson.presentation_path)}`,
      generatedAt: previewStats.mtime.toISOString()
    }
  };
}

function getLessonRecord(lessonId) {
  const database = getDatabase();
  ensureSchema(database);
  const bundle = getCourseBundle(database, fallbackCourseId);
  return bundle?.lessons.find((lesson) => lesson.id === lessonId) ?? null;
}

async function ensurePresentationPreview(sourcePath, previewAbsolutePath) {
  mkdirSync(path.dirname(previewAbsolutePath), { recursive: true });

  if (isPreviewFresh(sourcePath, previewAbsolutePath)) {
    return { ok: true, statusCode: 200 };
  }

  if (process.platform !== 'win32') {
    return {
      ok: false,
      statusCode: 501,
      message:
        'Автоматический встроенный просмотр PPTX сейчас доступен только в локальном Windows-окружении с установленным PowerPoint. Файл по-прежнему можно скачать.'
    };
  }

  const runningJob = pendingPreviewJobs.get(previewAbsolutePath);
  if (runningJob) {
    return runningJob;
  }

  const generationJob = generatePresentationPreview(sourcePath, previewAbsolutePath)
    .then(() => ({ ok: true, statusCode: 200 }))
    .catch((error) => ({
      ok: false,
      statusCode: 503,
      message:
        error.message ||
        'Не удалось подготовить локальное PDF-превью презентации. Попробуйте скачать исходный PPTX.'
    }))
    .finally(() => {
      pendingPreviewJobs.delete(previewAbsolutePath);
    });

  pendingPreviewJobs.set(previewAbsolutePath, generationJob);
  return generationJob;
}

function isPreviewFresh(sourcePath, previewAbsolutePath) {
  if (!existsSync(previewAbsolutePath)) {
    return false;
  }

  const sourceStats = statSync(sourcePath);
  const previewStats = statSync(previewAbsolutePath);
  return previewStats.mtimeMs >= sourceStats.mtimeMs;
}

async function generatePresentationPreview(sourcePath, previewAbsolutePath) {
  if (!existsSync(exportScriptPath)) {
    throw new Error('Скрипт экспорта PDF-превью не найден.');
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
      previewAbsolutePath
    ],
    {
      windowsHide: true,
      timeout: 180000,
      maxBuffer: 1024 * 1024
    }
  );

  if (!existsSync(previewAbsolutePath)) {
    throw new Error('PowerPoint не создал PDF-превью для этой презентации.');
  }
}

function normalizeRelativePath(relativePath) {
  return relativePath.replace(/\\/gu, '/');
}
