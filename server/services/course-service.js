import path from 'node:path';
import { dashboardData, createFallbackCourseData } from '../../shared/course-blueprint.js';
import { getDatabase } from '../db/connection.js';
import { ensureSchema } from '../db/schema.js';
import {
  getCourseBundle,
  getCourseStats,
  replaceCourseData,
  updateLessonStorage
} from '../repositories/course-repository.js';
import {
  ensureCourseStorageFolders,
  getLessonFolderRelative,
  inspectLessonStorage,
  toPublicStorageUrl,
  toPublicVideoUrl
} from './storage-service.js';
import { normalizeImportedStorage } from './storage-normalizer.js';

const fallbackCourse = createFallbackCourseData();

export function initializeCourseData({ forceReseed = false } = {}) {
  const database = getDatabase();
  ensureSchema(database);

  const stats = getCourseStats(database, fallbackCourse.id);
  if (forceReseed || stats.courseCount === 0 || stats.lessonCount !== fallbackCourse.lessons.length) {
    replaceCourseData(database, fallbackCourse);
  }

  ensureCourseStorageFolders(fallbackCourse);
  syncStorageWithDatabase();
}

export function syncStorageWithDatabase() {
  const database = getDatabase();
  ensureSchema(database);
  normalizeImportedStorage();
  const bundle = getCourseBundle(database, fallbackCourse.id);
  if (!bundle) {
    return [];
  }

  const updates = bundle.lessons.map((lesson) => {
    const storageState = inspectLessonStorage(lesson.day_number, lesson.lesson_number);
    const metadata = normalizeMetadata(storageState.metadata);

    updateLessonStorage(database, {
      lessonId: lesson.id,
      title: metadata.title,
      description: metadata.description,
      shortDescription: metadata.shortDescription,
      fullDescription: metadata.fullDescription,
      speakerName: metadata.speakerName,
      objectivesJson: metadata.objectives ? JSON.stringify(metadata.objectives) : null,
      videoPath: storageState.videoPath,
      presentationPath: storageState.presentationPath,
      coverImagePath: storageState.coverPath,
      coverAlt: metadata.coverAlt,
      videoDurationSeconds: metadata.videoDurationSeconds,
      durationLabel: metadata.durationLabel,
      status: metadata.status,
      placeholderNote: metadata.placeholderNote
    });

    return {
      lessonId: lesson.id,
      folder: storageState.folderRelative,
      videoPath: storageState.videoPath ? path.posix.join('storage', storageState.videoPath) : '',
      presentationPath: storageState.presentationPath
        ? path.posix.join('storage', storageState.presentationPath)
        : ''
    };
  });

  return updates;
}

export function getBootstrapPayload() {
  const database = getDatabase();
  const bundle = getCourseBundle(database, fallbackCourse.id);
  if (!bundle) {
    return {
      dashboard: clonePlain(dashboardData),
      course: clonePlain(fallbackCourse)
    };
  }

  const days = bundle.days.map((day) => ({
    id: day.id,
    number: day.day_number,
    title: day.title,
    description: day.description,
    lessonIds: bundle.lessons
      .filter((lesson) => lesson.day_id === day.id)
      .map((lesson) => lesson.id),
    createdAt: day.created_at,
    updatedAt: day.updated_at
  }));

  const lessons = bundle.lessons.map((lesson) => {
    const storageState = inspectLessonStorage(lesson.day_number, lesson.lesson_number);
    const storageMetadata = normalizeMetadata(storageState.metadata);
    const videoRelativePath = lesson.video_path ? path.posix.join('storage', lesson.video_path) : '';
    const presentationRelativePath = lesson.presentation_path
      ? path.posix.join('storage', lesson.presentation_path)
      : '';
    const coverRelativePath = storageState.coverPath
      ? path.posix.join('storage', storageState.coverPath)
      : lesson.cover_image_path
        ? path.posix.join('storage', lesson.cover_image_path)
        : '';
    const objectives = parseJson(lesson.objectives_json, []);
    const shortDescription =
      storageMetadata.shortDescription ?? lesson.short_description ?? lesson.description ?? '';
    const fullDescription =
      storageMetadata.fullDescription ??
      lesson.full_description ??
      buildFullDescription(shortDescription, objectives);
    const speakerName = storageMetadata.speakerName ?? lesson.speaker_name ?? 'Команда Annaelle Academy';
    const videoSequence = resolveLessonVideoSequence(lesson, storageState, storageMetadata);
    const primaryVideo = videoSequence[0] ?? null;
    const duration = resolveLessonDurationLabel(
      storageMetadata.durationLabel,
      primaryVideo?.durationLabel,
      primaryVideo?.src ? lesson.duration_label ?? formatDuration(lesson.video_duration_seconds) : ''
    );
    const durationSeconds = resolveLessonDurationSeconds(
      storageMetadata.videoDurationSeconds,
      primaryVideo?.durationSeconds,
      primaryVideo?.src ? lesson.video_duration_seconds : null
    );

    return {
      id: lesson.id,
      order: lesson.course_order,
      dayNumber: lesson.day_number,
      lessonNumber: lesson.lesson_number,
      title: lesson.title,
      description: shortDescription,
      shortDescription,
      fullDescription,
      speakerName,
      objectives,
      categoryId: 'courses',
      isPublished: lesson.status === 'published',
      duration,
      durationSeconds,
      status: lesson.status,
      createdAt: lesson.created_at,
      updatedAt: lesson.updated_at,
      storage: {
        provider: 'local',
        folder: getLessonFolderRelative(lesson.day_number, lesson.lesson_number)
      },
      cover: {
        src: toPublicStorageUrl(storageState.coverPath || lesson.cover_image_path),
        relativePath: coverRelativePath,
        alt: storageMetadata.coverAlt ?? lesson.cover_alt ?? `Обложка урока «${lesson.title}»`,
        accent: resolveCoverAccentToken(lesson.course_order, lesson.day_number),
        badge: `Урок ${lesson.course_order}`
      },
      video: {
        src: primaryVideo?.src ?? toPublicVideoUrl(lesson.video_path),
        relativePath: primaryVideo?.relativePath ?? videoRelativePath,
        completionThreshold: primaryVideo?.completionThreshold ?? lesson.completion_threshold,
        placeholderNote: primaryVideo?.placeholderNote ?? lesson.placeholder_note,
        durationSeconds: primaryVideo?.durationSeconds ?? lesson.video_duration_seconds,
        sequence: videoSequence
      },
      presentation: {
        href: toPublicStorageUrl(lesson.presentation_path),
        relativePath: presentationRelativePath,
        fileName: lesson.presentation_path ? path.posix.basename(lesson.presentation_path) : '',
        label: 'Скачать PPTX',
        description: `Материал к уроку ${lesson.course_order}`,
        previewEndpoint: lesson.presentation_path
          ? `/api/lessons/${encodeURIComponent(lesson.id)}/presentation-preview`
          : ''
      },
      quiz: parseJson(lesson.quiz_json, null)
    };
  });

  return {
    dashboard: clonePlain(dashboardData),
    course: {
      id: bundle.course.id,
      title: bundle.course.title,
      description: bundle.course.description,
      days,
      lessons,
      finalExam: parseJson(bundle.course.final_exam_json, fallbackCourse.finalExam),
      meta: {
        source: 'sqlite',
        database: 'sqlite',
        storageProvider: 'local',
        brand: 'Annaelle Laser Academy'
      }
    }
  };
}

export function createStaticBootstrapPayload() {
  const course = clonePlain(fallbackCourse);
  course.lessons = course.lessons.map((lesson) => {
    const storageState = inspectLessonStorage(lesson.dayNumber, lesson.lessonNumber);
    const storageMetadata = normalizeMetadata(storageState.metadata);
    const objectives = storageMetadata.objectives?.length ? storageMetadata.objectives : lesson.objectives;
    const shortDescription =
      storageMetadata.shortDescription ?? storageMetadata.description ?? lesson.shortDescription ?? lesson.description ?? '';
    const fullDescription =
      storageMetadata.fullDescription ?? lesson.fullDescription ?? buildFullDescription(shortDescription, objectives);
    const videoSequence = resolveStaticLessonVideoSequence(lesson, storageState, storageMetadata);
    const primaryVideo = videoSequence[0] ?? null;
    const duration = resolveLessonDurationLabel(
      storageMetadata.durationLabel,
      primaryVideo?.durationLabel,
      primaryVideo?.src ? lesson.duration : ''
    );
    const durationSeconds = resolveLessonDurationSeconds(
      storageMetadata.videoDurationSeconds,
      primaryVideo?.durationSeconds,
      primaryVideo?.src ? lesson.durationSeconds : null
    );
    const coverRelativePath = storageState.coverPath
      ? path.posix.join('storage', storageState.coverPath)
      : lesson.cover?.relativePath ?? '';
    const presentationRelativePath = storageState.presentationPath
      ? path.posix.join('storage', storageState.presentationPath)
      : lesson.presentation?.relativePath ?? '';

    return {
      ...lesson,
      title: storageMetadata.title ?? lesson.title,
      description: shortDescription,
      shortDescription,
      fullDescription,
      speakerName: storageMetadata.speakerName ?? lesson.speakerName ?? 'Команда Annaelle Academy',
      objectives,
      duration,
      durationSeconds,
      status: storageMetadata.status ?? lesson.status,
      storage: {
        provider: 'static',
        folder: getLessonFolderRelative(lesson.dayNumber, lesson.lessonNumber)
      },
      cover: {
        ...(lesson.cover ?? {}),
        src: toPublicStorageUrl(storageState.coverPath),
        relativePath: coverRelativePath,
        alt: storageMetadata.coverAlt ?? lesson.cover?.alt ?? `Обложка урока «${lesson.title}»`
      },
      video: {
        ...(lesson.video ?? {}),
        src: primaryVideo?.src ?? toPublicVideoUrl(storageState.videoPath),
        relativePath: primaryVideo?.relativePath ?? videoRelativePathFromLesson(storageState.videoPath),
        completionThreshold: primaryVideo?.completionThreshold ?? lesson.video?.completionThreshold ?? 1,
        placeholderNote:
          primaryVideo?.placeholderNote ?? storageMetadata.placeholderNote ?? lesson.video?.placeholderNote ?? '',
        durationSeconds:
          primaryVideo?.durationSeconds ?? storageMetadata.videoDurationSeconds ?? lesson.durationSeconds ?? null,
        sequence: videoSequence
      },
      presentation: {
        ...(lesson.presentation ?? {}),
        href: toPublicStorageUrl(storageState.presentationPath),
        relativePath: presentationRelativePath,
        fileName: storageState.presentationPath
          ? path.posix.basename(storageState.presentationPath)
          : lesson.presentation?.fileName ?? '',
        previewEndpoint: ''
      }
    };
  });

  course.meta = {
    ...(course.meta ?? {}),
    source: 'static-bootstrap',
    database: 'none',
    storageProvider: 'static-storage',
    brand: 'Annaelle Laser Academy'
  };

  return {
    dashboard: clonePlain(dashboardData),
    course
  };
}

function resolveStaticLessonVideoSequence(lesson, storageState, metadata) {
  const availableVideoFiles = new Map(
    (storageState.videoFiles ?? []).map((file) => [file.name.toLowerCase(), file])
  );
  const defaultVideoFile = storageState.videoFiles?.[0] ?? null;
  const lessonFolderRelative = path.posix.join(`day-${lesson.dayNumber}`, `lesson-${lesson.lessonNumber}`);
  const hasMetadataBackedPrimaryVideo =
    Number.isFinite(metadata.videoDurationSeconds) ||
    (typeof metadata.durationLabel === 'string' && metadata.durationLabel.trim().length > 0);
  const fallbackVideoRelativePath = path.posix.join(lessonFolderRelative, 'video.mp4');
  const primaryVideoRelativePath = defaultVideoFile?.relativePath ?? (hasMetadataBackedPrimaryVideo ? fallbackVideoRelativePath : '');

  if (Array.isArray(metadata.videoSequence) && metadata.videoSequence.length > 0) {
    return metadata.videoSequence.map((entry, index) => {
      const fileReference = typeof entry.file === 'string' ? entry.file.trim() : '';
      const resolvedFile =
        availableVideoFiles.get(fileReference.toLowerCase()) ?? (!fileReference && index === 0 ? defaultVideoFile : null);
      const durationSeconds = entry.videoDurationSeconds ?? lesson.durationSeconds ?? null;
      const syntheticRelativePath =
        resolvedFile?.relativePath ??
        (fileReference
          ? path.posix.join(lessonFolderRelative, path.posix.basename(fileReference))
          : index === 0
            ? primaryVideoRelativePath
            : '');

      return {
        id: entry.id || `${lesson.id}-video-${index + 1}`,
        order: index + 1,
        title: entry.title || `Видео ${index + 1}`,
        src: syntheticRelativePath ? toPublicVideoUrl(syntheticRelativePath) : '',
        relativePath: syntheticRelativePath ? path.posix.join('storage', syntheticRelativePath) : '',
        completionThreshold: clampCompletionThreshold(entry.completionThreshold ?? lesson.video?.completionThreshold),
        placeholderNote: entry.placeholderNote || lesson.video?.placeholderNote || '',
        durationSeconds,
        durationLabel: entry.durationLabel || formatDuration(durationSeconds) || lesson.duration || ''
      };
    });
  }

  return [
    {
      id: `${lesson.id}-video-1`,
      order: 1,
      title: 'Видео 1',
      src: primaryVideoRelativePath ? toPublicVideoUrl(primaryVideoRelativePath) : '',
      relativePath: primaryVideoRelativePath ? path.posix.join('storage', primaryVideoRelativePath) : '',
      completionThreshold: clampCompletionThreshold(lesson.video?.completionThreshold),
      placeholderNote: metadata.placeholderNote || lesson.video?.placeholderNote || '',
      durationSeconds: metadata.videoDurationSeconds ?? (primaryVideoRelativePath ? lesson.durationSeconds : null) ?? null,
      durationLabel:
        metadata.durationLabel ||
        formatDuration(metadata.videoDurationSeconds ?? (primaryVideoRelativePath ? lesson.durationSeconds : null)) ||
        (primaryVideoRelativePath ? lesson.duration : '')
    }
  ];
}

function normalizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }

  const normalized = {};

  if (typeof metadata.title === 'string' && metadata.title.trim()) {
    normalized.title = metadata.title.trim();
  }

  if (typeof metadata.description === 'string' && metadata.description.trim()) {
    normalized.description = metadata.description.trim();
  }

  if (typeof metadata.shortDescription === 'string' && metadata.shortDescription.trim()) {
    normalized.shortDescription = metadata.shortDescription.trim();
  }

  if (typeof metadata.fullDescription === 'string' && metadata.fullDescription.trim()) {
    normalized.fullDescription = metadata.fullDescription.trim();
  }

  if (typeof metadata.speakerName === 'string' && metadata.speakerName.trim()) {
    normalized.speakerName = metadata.speakerName.trim();
  }

  if (typeof metadata.coverAlt === 'string' && metadata.coverAlt.trim()) {
    normalized.coverAlt = metadata.coverAlt.trim();
  }

  if (Array.isArray(metadata.objectives)) {
    normalized.objectives = metadata.objectives.filter(
      (objective) => typeof objective === 'string' && objective.trim()
    );
  }

  if (typeof metadata.durationLabel === 'string' && metadata.durationLabel.trim()) {
    normalized.durationLabel = metadata.durationLabel.trim();
  }

  if (Number.isFinite(metadata.videoDurationSeconds)) {
    normalized.videoDurationSeconds = Math.max(0, Math.round(metadata.videoDurationSeconds));
  }

  if (typeof metadata.status === 'string' && metadata.status.trim()) {
    normalized.status = metadata.status.trim();
  }

  if (typeof metadata.placeholderNote === 'string' && metadata.placeholderNote.trim()) {
    normalized.placeholderNote = metadata.placeholderNote.trim();
  }

  if (Array.isArray(metadata.videoSequence)) {
    normalized.videoSequence = metadata.videoSequence
      .filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry))
      .map((entry, index) => normalizeVideoSequenceEntry(entry, index))
      .filter(Boolean);
  }

  return normalized;
}

function resolveLessonVideoSequence(lesson, storageState, metadata) {
  const availableVideoFiles = new Map(
    (storageState.videoFiles ?? []).map((file) => [file.name.toLowerCase(), file])
  );
  const defaultVideoFile = lesson.video_path
    ? {
        relativePath: lesson.video_path,
        name: path.posix.basename(lesson.video_path)
      }
    : storageState.videoFiles?.[0] ?? null;

  if (Array.isArray(metadata.videoSequence) && metadata.videoSequence.length > 0) {
    return metadata.videoSequence.map((entry, index) => {
      const fileReference = typeof entry.file === 'string' ? entry.file.trim() : '';
      const resolvedFile =
        availableVideoFiles.get(fileReference.toLowerCase()) ?? (!fileReference && index === 0 ? defaultVideoFile : null);
      const durationSeconds =
        entry.videoDurationSeconds ??
        (resolvedFile?.relativePath === lesson.video_path ? lesson.video_duration_seconds : null);

      return {
        id: entry.id || `${lesson.id}-video-${index + 1}`,
        order: index + 1,
        title: entry.title || `Видео ${index + 1}`,
        src: resolvedFile ? toPublicVideoUrl(resolvedFile.relativePath) : '',
        relativePath: resolvedFile ? path.posix.join('storage', resolvedFile.relativePath) : '',
        completionThreshold: clampCompletionThreshold(
          entry.completionThreshold ?? lesson.completion_threshold
        ),
        placeholderNote: entry.placeholderNote || lesson.placeholder_note,
        durationSeconds,
        durationLabel: entry.durationLabel || formatDuration(durationSeconds) || ''
      };
    });
  }

  return [
    {
      id: `${lesson.id}-video-1`,
      order: 1,
      title: 'Видео 1',
      src: toPublicVideoUrl(lesson.video_path),
      relativePath: videoRelativePathFromLesson(lesson.video_path),
      completionThreshold: clampCompletionThreshold(lesson.completion_threshold),
      placeholderNote: lesson.placeholder_note,
      durationSeconds: lesson.video_duration_seconds,
      durationLabel: lesson.duration_label ?? formatDuration(lesson.video_duration_seconds) ?? ''
    }
  ];
}

function normalizeVideoSequenceEntry(entry, index) {
  const normalized = {
    id: typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : `video-${index + 1}`
  };

  if (typeof entry.title === 'string' && entry.title.trim()) {
    normalized.title = entry.title.trim();
  }

  if (typeof entry.file === 'string' && entry.file.trim()) {
    normalized.file = path.posix.basename(entry.file.trim());
  }

  if (typeof entry.durationLabel === 'string' && entry.durationLabel.trim()) {
    normalized.durationLabel = entry.durationLabel.trim();
  }

  if (Number.isFinite(entry.videoDurationSeconds)) {
    normalized.videoDurationSeconds = Math.max(0, Math.round(entry.videoDurationSeconds));
  }

  if (Number.isFinite(entry.completionThreshold)) {
    normalized.completionThreshold = clampCompletionThreshold(entry.completionThreshold);
  }

  if (typeof entry.placeholderNote === 'string' && entry.placeholderNote.trim()) {
    normalized.placeholderNote = entry.placeholderNote.trim();
  }

  return normalized;
}

function buildFullDescription(shortDescription, objectives) {
  const cleanDescription = typeof shortDescription === 'string' ? shortDescription.trim() : '';
  const focus = Array.isArray(objectives)
    ? objectives
        .filter((objective) => typeof objective === 'string' && objective.trim())
        .slice(0, 2)
        .join(', ')
    : '';

  if (!cleanDescription) {
    return focus ? `Ключевые акценты урока: ${focus}.` : '';
  }

  return focus
    ? `${cleanDescription} Основной фокус урока: ${focus}.`
    : cleanDescription;
}

function resolveCoverAccentToken(courseOrder, dayNumber) {
  const tokens = ['bronze', 'sand', 'olive', 'charcoal'];
  const seed = Number.isFinite(courseOrder) ? courseOrder - 1 : dayNumber - 1;
  return tokens[((seed % tokens.length) + tokens.length) % tokens.length];
}

function clampCompletionThreshold(value) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(Math.max(value, 0.1), 1);
}

function resolveLessonDurationLabel(primaryLabel, secondaryLabel, fallbackLabel) {
  return primaryLabel || secondaryLabel || fallbackLabel || '00:00';
}

function resolveLessonDurationSeconds(primarySeconds, secondarySeconds, fallbackSeconds) {
  if (Number.isFinite(primarySeconds)) {
    return primarySeconds;
  }

  if (Number.isFinite(secondarySeconds)) {
    return secondarySeconds;
  }

  return Number.isFinite(fallbackSeconds) ? fallbackSeconds : null;
}

function videoRelativePathFromLesson(relativePath) {
  return relativePath ? path.posix.join('storage', relativePath) : '';
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const restSeconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(restSeconds).padStart(2, '0')}`;
}
