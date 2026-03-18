const STORAGE_KEY = 'anaelacademy.course-progress.v2';
const STORAGE_VERSION = 4;

let memoryProgressFallback = null;

export function loadCourseProgress(course) {
  const storedProgress = readStoredProgress();
  if (!storedProgress) {
    return persistProgress(course, createInitialProgress(course));
  }

  return persistProgress(course, storedProgress);
}

export function getLessonById(course, lessonId) {
  return course.lessons.find((lesson) => lesson.id === lessonId) ?? null;
}

export function getLessonProgress(progress, lessonId) {
  return progress.lessons[lessonId] ?? null;
}

export function getLessonStatus(course, progress, lessonId) {
  const lesson = getLessonById(course, lessonId);
  const lessonProgress = getLessonProgress(progress, lessonId);

  if (!lesson || !lessonProgress) {
    return 'locked';
  }

  if (!lessonProgress.isUnlocked) {
    return 'locked';
  }

  if (lessonProgress.quizPassed) {
    return 'completed';
  }

  if (lessonProgress.videoCompleted) {
    return 'watched';
  }

  return 'available';
}

export function getLessonTestStatus(progress, lessonId) {
  const lessonProgress = getLessonProgress(progress, lessonId);
  if (!lessonProgress) {
    return 'not_started';
  }

  if (lessonProgress.quizPassed) {
    return 'passed';
  }

  if (lessonProgress.quizAttempts > 0) {
    return 'failed';
  }

  return 'not_started';
}

export function toggleLessonFavorite(course, progress, lessonId) {
  if (!getLessonById(course, lessonId)) {
    return persistProgress(course, progress);
  }

  const updatedProgress = cloneProgress(progress);
  const lessonProgress = updatedProgress.lessons[lessonId];
  if (!lessonProgress) {
    return persistProgress(course, progress);
  }

  lessonProgress.isFavorite = !lessonProgress.isFavorite;
  return persistProgress(course, updatedProgress);
}

export function getLessonVideoItems(lesson) {
  const sequence = Array.isArray(lesson?.video?.sequence) ? lesson.video.sequence : [];
  if (sequence.length > 0) {
    return sequence.map((item, index) => ({
      id: item.id || `${lesson.id}-video-${index + 1}`,
      order: item.order ?? index + 1,
      title: item.title || `Видео ${index + 1}`,
      src: item.src || '',
      relativePath: item.relativePath || '',
      completionThreshold: clampNumber(
        item.completionThreshold ?? lesson.video?.completionThreshold ?? 1,
        0.1,
        1
      ),
      placeholderNote: item.placeholderNote || lesson.video?.placeholderNote || '',
      durationSeconds: clampNumber(item.durationSeconds ?? 0, 0, Number.MAX_SAFE_INTEGER),
      durationLabel: item.durationLabel || ''
    }));
  }

  return [
    {
      id: `${lesson.id}-video-1`,
      order: 1,
      title: 'Видео 1',
      src: lesson.video?.src || '',
      relativePath: lesson.video?.relativePath || '',
      completionThreshold: clampNumber(lesson.video?.completionThreshold ?? 1, 0.1, 1),
      placeholderNote: lesson.video?.placeholderNote || '',
      durationSeconds: clampNumber(lesson.video?.durationSeconds ?? 0, 0, Number.MAX_SAFE_INTEGER),
      durationLabel: lesson.duration || ''
    }
  ];
}

export function isLessonAccessible(course, progress, lessonId) {
  return Boolean(getLessonById(course, lessonId) && getLessonProgress(progress, lessonId)?.isUnlocked);
}

export function canOpenFinalExam(progress) {
  return Boolean(progress.finalExam?.isUnlocked);
}

export function getLessonUnlockReason(course, progress, lessonId) {
  const lessonIndex = course.lessons.findIndex((lesson) => lesson.id === lessonId);
  if (lessonIndex <= 0) {
    return 'Первый урок уже доступен.';
  }

  const previousLesson = course.lessons[lessonIndex - 1];
  const previousLessonProgress = getLessonProgress(progress, previousLesson.id);
  if (!previousLessonProgress) {
    return 'Урок временно недоступен.';
  }

  if (!previousLessonProgress.videoCompleted) {
    return `Следующее видео станет доступно после полного просмотра урока «${previousLesson.title}» и успешного прохождения теста.`;
  }

  if (!previousLessonProgress.quizPassed) {
    return `Следующее видео станет доступно после успешного прохождения теста по уроку «${previousLesson.title}».`;
  }

  return 'Следующий урок пока недоступен.';
}

export function updateLessonVideoProgress(course, progress, lessonId, watchRatio, options = {}) {
  const lesson = getLessonById(course, lessonId);
  if (!lesson || !isLessonAccessible(course, progress, lessonId)) {
    return persistProgress(course, progress);
  }

  const updatedProgress = cloneProgress(progress);
  const lessonProgress = updatedProgress.lessons[lessonId];
  const videoItems = getLessonVideoItems(lesson);
  const videoId = resolveVideoIdForUpdate(lesson, lessonProgress, options.videoId);

  if (!videoId || !isVideoPartUnlocked(videoItems, lessonProgress.videoParts, videoId)) {
    return persistProgress(course, updatedProgress);
  }

  const ratio = clampNumber(watchRatio, 0, 1);
  const durationSeconds = clampNumber(
    options.durationSeconds ?? options.duration ?? 0,
    0,
    Number.MAX_SAFE_INTEGER
  );
  const currentTimeSeconds = clampNumber(
    options.currentTimeSeconds ?? options.currentTime ?? 0,
    0,
    Number.MAX_SAFE_INTEGER
  );
  const partProgress = ensureVideoPartProgress(lessonProgress.videoParts[videoId]);
  const furthestByRatio = durationSeconds > 0 ? ratio * durationSeconds : 0;

  partProgress.watchRatio = Math.max(partProgress.watchRatio, ratio);
  partProgress.lastKnownDurationSeconds = Math.max(partProgress.lastKnownDurationSeconds, durationSeconds);
  partProgress.furthestTimeSeconds = Math.max(
    partProgress.furthestTimeSeconds,
    currentTimeSeconds,
    furthestByRatio
  );

  if (partProgress.watchRatio >= getVideoCompletionThreshold(lesson, videoId)) {
    partProgress.watchRatio = 1;
    partProgress.completed = true;
    partProgress.completedAt = partProgress.completedAt || now();
    partProgress.furthestTimeSeconds = Math.max(
      partProgress.furthestTimeSeconds,
      partProgress.lastKnownDurationSeconds
    );
  }

  lessonProgress.videoParts[videoId] = partProgress;
  applyDerivedLessonVideoProgress(lesson, lessonProgress, {
    preferredVideoId: lessonProgress.activeVideoId,
    autoAdvanceFromVideoId: videoId
  });

  return persistProgress(course, updatedProgress);
}

export function markLessonVideoComplete(course, progress, lessonId, options = {}) {
  return updateLessonVideoProgress(course, progress, lessonId, 1, options);
}

export function setActiveLessonVideo(course, progress, lessonId, videoId) {
  const lesson = getLessonById(course, lessonId);
  if (!lesson || !isLessonAccessible(course, progress, lessonId)) {
    return persistProgress(course, progress);
  }

  const updatedProgress = cloneProgress(progress);
  const lessonProgress = updatedProgress.lessons[lessonId];
  const videoItems = getLessonVideoItems(lesson);
  if (!videoItems.some((item) => item.id === videoId)) {
    return persistProgress(course, updatedProgress);
  }

  if (!isVideoPartUnlocked(videoItems, lessonProgress.videoParts, videoId)) {
    return persistProgress(course, updatedProgress);
  }

  lessonProgress.activeVideoId = videoId;
  return persistProgress(course, updatedProgress);
}

export function submitLessonQuiz(course, progress, lessonId, answers) {
  const lesson = getLessonById(course, lessonId);
  if (!lesson || !isLessonAccessible(course, progress, lessonId)) {
    return {
      progress: persistProgress(course, progress),
      error: 'Урок пока недоступен.'
    };
  }

  const lessonProgress = getLessonProgress(progress, lessonId);
  if (!lessonProgress?.videoCompleted) {
    return {
      progress: persistProgress(course, progress),
      error: 'Сначала нужно полностью досмотреть видео.'
    };
  }

  const result = gradeAssessment(lesson.quiz, answers);
  const updatedProgress = cloneProgress(progress);
  const targetLesson = updatedProgress.lessons[lessonId];

  targetLesson.quizAttempts += 1;
  targetLesson.quizLastScore = result.correctCount;
  targetLesson.quizBestScore = Math.max(targetLesson.quizBestScore, result.correctCount);
  targetLesson.quizPassed = targetLesson.quizPassed || result.passed;
  targetLesson.quizPassedAt = targetLesson.quizPassed ? targetLesson.quizPassedAt || now() : null;
  targetLesson.lastAnswers = sanitizeAnswers(answers);

  return {
    progress: persistProgress(course, updatedProgress),
    result
  };
}

export function submitFinalExam(course, progress, answers) {
  if (!canOpenFinalExam(progress)) {
    return {
      progress: persistProgress(course, progress),
      error: 'Финальный экзамен пока недоступен.'
    };
  }

  const result = gradeAssessment(course.finalExam, answers);
  const updatedProgress = cloneProgress(progress);
  const finalExam = updatedProgress.finalExam;

  finalExam.attempts += 1;
  finalExam.lastScore = result.correctCount;
  finalExam.bestScore = Math.max(finalExam.bestScore, result.correctCount);
  finalExam.passed = finalExam.passed || result.passed;
  finalExam.passedAt = finalExam.passed ? finalExam.passedAt || now() : null;
  finalExam.lastAnswers = sanitizeAnswers(answers);

  return {
    progress: persistProgress(course, updatedProgress),
    result
  };
}

export function getNextStep(course, progress) {
  const nextLesson = course.lessons.find((lesson) => {
    const lessonProgress = getLessonProgress(progress, lesson.id);
    return lessonProgress?.isUnlocked && !lessonProgress.quizPassed;
  });

  if (nextLesson) {
    return {
      type: 'lesson',
      lesson: nextLesson
    };
  }

  if (progress.finalExam.isUnlocked && !progress.finalExam.passed) {
    return {
      type: 'finalExam'
    };
  }

  if (progress.finalExam.passed) {
    return {
      type: 'completed'
    };
  }

  return {
    type: 'dashboard'
  };
}

export function getCourseSummary(course, progress) {
  const watchedVideos = course.lessons.filter((lesson) => progress.lessons[lesson.id].videoCompleted).length;
  const passedLessonQuizzes = course.lessons.filter((lesson) => progress.lessons[lesson.id].quizPassed).length;
  const favoriteLessons = course.lessons.filter((lesson) => progress.lessons[lesson.id].isFavorite).length;
  const completedLessons = course.lessons.filter((lesson) => {
    const lessonProgress = progress.lessons[lesson.id];
    return lessonProgress.videoCompleted && lessonProgress.quizPassed;
  }).length;
  const totalMilestones = course.lessons.length * 2 + 1;
  const completedMilestones = watchedVideos + passedLessonQuizzes + (progress.finalExam.passed ? 1 : 0);
  const overallPercentage = Math.round((completedMilestones / totalMilestones) * 100);

  return {
    totalLessons: course.lessons.length,
    watchedVideos,
    passedLessonQuizzes,
    favoriteLessons,
    completedLessons,
    overallPercentage,
    readyForFinalExam: progress.finalExam.isUnlocked,
    finalExamPassed: progress.finalExam.passed,
    nextStep: getNextStep(course, progress)
  };
}

function persistProgress(course, sourceProgress) {
  const normalized = normalizeProgress(course, sourceProgress);
  writeStoredProgress(normalized);
  return normalized;
}

function normalizeProgress(course, sourceProgress) {
  const initialProgress = createInitialProgress(course);
  const normalized = {
    version: STORAGE_VERSION,
    courseId: course.id,
    lessons: {},
    finalExam: initialProgress.finalExam,
    courseCompleted: false,
    courseCompletedAt: null,
    updatedAt: now()
  };

  course.lessons.forEach((lesson, index) => {
    const initialLessonProgress = initialProgress.lessons[lesson.id];
    const incomingLessonProgress = sourceProgress?.lessons?.[lesson.id] ?? {};
    const previousLessonId = course.lessons[index - 1]?.id;
    const previousLessonProgress = previousLessonId ? normalized.lessons[previousLessonId] : null;
    const videoParts = normalizeVideoParts(lesson, incomingLessonProgress);
    const quizBestScore = clampInteger(
      incomingLessonProgress.quizBestScore,
      0,
      lesson.quiz.questions.length
    );
    const quizLastScore = clampInteger(
      incomingLessonProgress.quizLastScore,
      0,
      lesson.quiz.questions.length
    );
    const quizPassed = Boolean(
      incomingLessonProgress.quizPassed ||
        quizBestScore >= lesson.quiz.passingScore ||
        quizLastScore >= lesson.quiz.passingScore
    );

    const normalizedLesson = {
      ...initialLessonProgress,
      ...incomingLessonProgress,
      isUnlocked:
        index === 0 ? true : Boolean(previousLessonProgress?.videoCompleted && previousLessonProgress?.quizPassed),
      isFavorite: Boolean(incomingLessonProgress.isFavorite),
      videoParts,
      quizAttempts: clampInteger(incomingLessonProgress.quizAttempts, 0, Number.MAX_SAFE_INTEGER),
      quizBestScore,
      quizLastScore,
      quizPassed,
      quizPassedAt: quizPassed ? incomingLessonProgress.quizPassedAt || now() : null,
      lastAnswers: sanitizeAnswers(incomingLessonProgress.lastAnswers)
    };

    applyDerivedLessonVideoProgress(lesson, normalizedLesson, {
      preferredVideoId: incomingLessonProgress.activeVideoId
    });
    normalized.lessons[lesson.id] = normalizedLesson;
  });

  const allLessonsCompleted = course.lessons.every((lesson) => {
    const lessonProgress = normalized.lessons[lesson.id];
    return lessonProgress.videoCompleted && lessonProgress.quizPassed;
  });
  const incomingFinalExam = sourceProgress?.finalExam ?? {};
  const finalBestScore = clampInteger(
    incomingFinalExam.bestScore,
    0,
    course.finalExam.questions.length
  );
  const finalLastScore = clampInteger(
    incomingFinalExam.lastScore,
    0,
    course.finalExam.questions.length
  );
  const finalPassed = Boolean(
    incomingFinalExam.passed ||
      finalBestScore >= course.finalExam.passingScore ||
      finalLastScore >= course.finalExam.passingScore
  );

  normalized.finalExam = {
    ...initialProgress.finalExam,
    ...incomingFinalExam,
    isUnlocked: allLessonsCompleted,
    attempts: clampInteger(incomingFinalExam.attempts, 0, Number.MAX_SAFE_INTEGER),
    bestScore: finalBestScore,
    lastScore: finalLastScore,
    passed: finalPassed,
    passedAt: finalPassed ? incomingFinalExam.passedAt || now() : null,
    lastAnswers: sanitizeAnswers(incomingFinalExam.lastAnswers)
  };
  normalized.courseCompleted = normalized.finalExam.passed;
  normalized.courseCompletedAt = normalized.courseCompleted
    ? normalized.finalExam.passedAt || sourceProgress?.courseCompletedAt || now()
    : null;
  normalized.updatedAt = now();

  return normalized;
}

function createInitialProgress(course) {
  return {
    version: STORAGE_VERSION,
    courseId: course.id,
    lessons: Object.fromEntries(
      course.lessons.map((lesson, index) => [lesson.id, createInitialLessonProgress(index, lesson)])
    ),
    finalExam: createInitialFinalExamProgress(),
    courseCompleted: false,
    courseCompletedAt: null,
    updatedAt: now()
  };
}

function createInitialLessonProgress(index, lesson) {
  const videoItems = getLessonVideoItems(lesson);

  return {
    isUnlocked: index === 0,
    isFavorite: false,
    activeVideoId: videoItems[0]?.id ?? null,
    videoParts: Object.fromEntries(
      videoItems.map((item) => [item.id, createInitialVideoPartProgress()])
    ),
    videoWatchRatio: 0,
    videoLastKnownDurationSeconds: 0,
    videoFurthestTimeSeconds: 0,
    videoCompleted: false,
    videoCompletedAt: null,
    quizAttempts: 0,
    quizBestScore: 0,
    quizLastScore: 0,
    quizPassed: false,
    quizPassedAt: null,
    lastAnswers: {}
  };
}

function createInitialVideoPartProgress() {
  return {
    watchRatio: 0,
    lastKnownDurationSeconds: 0,
    furthestTimeSeconds: 0,
    completed: false,
    completedAt: null
  };
}

function createInitialFinalExamProgress() {
  return {
    isUnlocked: false,
    attempts: 0,
    bestScore: 0,
    lastScore: 0,
    passed: false,
    passedAt: null,
    lastAnswers: {}
  };
}

function normalizeVideoParts(lesson, incomingLessonProgress) {
  const videoItems = getLessonVideoItems(lesson);
  const incomingVideoParts =
    incomingLessonProgress?.videoParts && typeof incomingLessonProgress.videoParts === 'object'
      ? incomingLessonProgress.videoParts
      : {};
  const legacyVideoPart = {
    watchRatio: clampNumber(incomingLessonProgress?.videoWatchRatio, 0, 1),
    lastKnownDurationSeconds: clampNumber(
      incomingLessonProgress?.videoLastKnownDurationSeconds,
      0,
      Number.MAX_SAFE_INTEGER
    ),
    furthestTimeSeconds: clampNumber(
      incomingLessonProgress?.videoFurthestTimeSeconds,
      0,
      Number.MAX_SAFE_INTEGER
    ),
    completed: Boolean(incomingLessonProgress?.videoCompleted),
    completedAt: incomingLessonProgress?.videoCompletedAt || null
  };

  return Object.fromEntries(
    videoItems.map((item, index) => {
      const incomingPart = incomingVideoParts[item.id] ?? (index === 0 ? legacyVideoPart : {});
      const watchRatio = clampNumber(
        incomingPart.watchRatio ?? incomingPart.videoWatchRatio,
        0,
        1
      );
      const lastKnownDurationSeconds = clampNumber(
        incomingPart.lastKnownDurationSeconds ??
          incomingPart.videoLastKnownDurationSeconds ??
          item.durationSeconds,
        0,
        Number.MAX_SAFE_INTEGER
      );
      const furthestTimeSeconds = clampNumber(
        incomingPart.furthestTimeSeconds ?? incomingPart.videoFurthestTimeSeconds,
        0,
        Number.MAX_SAFE_INTEGER
      );
      const completed = Boolean(
        incomingPart.completed ||
          incomingPart.videoCompleted ||
          watchRatio >= getVideoCompletionThreshold(lesson, item.id)
      );

      return [
        item.id,
        {
          watchRatio: completed ? 1 : watchRatio,
          lastKnownDurationSeconds,
          furthestTimeSeconds: completed
            ? Math.max(furthestTimeSeconds, lastKnownDurationSeconds)
            : Math.max(furthestTimeSeconds, watchRatio * lastKnownDurationSeconds),
          completed,
          completedAt: completed
            ? incomingPart.completedAt || incomingPart.videoCompletedAt || now()
            : null
        }
      ];
    })
  );
}

function applyDerivedLessonVideoProgress(lesson, lessonProgress, options = {}) {
  const summary = summarizeLessonVideoProgress(lesson, lessonProgress.videoParts);

  lessonProgress.videoWatchRatio = summary.watchRatio;
  lessonProgress.videoLastKnownDurationSeconds = summary.lastKnownDurationSeconds;
  lessonProgress.videoFurthestTimeSeconds = summary.furthestTimeSeconds;
  lessonProgress.videoCompleted = summary.completed;
  lessonProgress.videoCompletedAt = summary.completed
    ? summary.completedAt || lessonProgress.videoCompletedAt || now()
    : null;
  lessonProgress.activeVideoId = resolveActiveVideoId(lesson, lessonProgress.videoParts, options);
}

function summarizeLessonVideoProgress(lesson, videoParts) {
  const videoItems = getLessonVideoItems(lesson);
  if (videoItems.length === 0) {
    return {
      watchRatio: 0,
      lastKnownDurationSeconds: 0,
      furthestTimeSeconds: 0,
      completed: false,
      completedAt: null
    };
  }

  let totalWeight = 0;
  let watchedWeight = 0;
  let totalDurationSeconds = 0;
  let furthestTimeSeconds = 0;

  videoItems.forEach((item) => {
    const partProgress = ensureVideoPartProgress(videoParts[item.id]);
    const weight = getVideoProgressWeight(item, partProgress);
    const partDuration = Math.max(partProgress.lastKnownDurationSeconds, item.durationSeconds);
    const normalizedFurthest = partProgress.completed
      ? Math.max(partProgress.furthestTimeSeconds, partDuration)
      : Math.max(partProgress.furthestTimeSeconds, partProgress.watchRatio * partDuration);

    totalWeight += weight;
    watchedWeight += partProgress.completed ? weight : weight * partProgress.watchRatio;
    totalDurationSeconds += partDuration;
    furthestTimeSeconds += normalizedFurthest;
  });

  const completed = videoItems.every((item) => ensureVideoPartProgress(videoParts[item.id]).completed);
  const completedAt = completed
    ? videoItems
        .map((item) => ensureVideoPartProgress(videoParts[item.id]).completedAt)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null
    : null;

  return {
    watchRatio: completed ? 1 : totalWeight > 0 ? watchedWeight / totalWeight : 0,
    lastKnownDurationSeconds: totalDurationSeconds,
    furthestTimeSeconds,
    completed,
    completedAt
  };
}

function resolveActiveVideoId(lesson, videoParts, options = {}) {
  const videoItems = getLessonVideoItems(lesson);
  const unlockedVideoItems = videoItems.filter((item) => isVideoPartUnlocked(videoItems, videoParts, item.id));
  const preferredVideoId = options.preferredVideoId;
  const autoAdvanceFromVideoId = options.autoAdvanceFromVideoId;

  if (autoAdvanceFromVideoId) {
    const currentItem = unlockedVideoItems.find((item) => item.id === autoAdvanceFromVideoId);
    if (currentItem && ensureVideoPartProgress(videoParts[currentItem.id]).completed) {
      return (
        unlockedVideoItems.find((item) => !ensureVideoPartProgress(videoParts[item.id]).completed)?.id ??
        currentItem.id
      );
    }
  }

  if (preferredVideoId && unlockedVideoItems.some((item) => item.id === preferredVideoId)) {
    return preferredVideoId;
  }

  return (
    unlockedVideoItems.find((item) => !ensureVideoPartProgress(videoParts[item.id]).completed)?.id ??
    unlockedVideoItems[0]?.id ??
    videoItems[0]?.id ??
    null
  );
}

function resolveVideoIdForUpdate(lesson, lessonProgress, requestedVideoId) {
  const videoItems = getLessonVideoItems(lesson);
  if (requestedVideoId && videoItems.some((item) => item.id === requestedVideoId)) {
    return requestedVideoId;
  }

  if (lessonProgress?.activeVideoId && videoItems.some((item) => item.id === lessonProgress.activeVideoId)) {
    return lessonProgress.activeVideoId;
  }

  return videoItems[0]?.id ?? null;
}

function isVideoPartUnlocked(videoItems, videoParts, videoId) {
  const targetIndex = videoItems.findIndex((item) => item.id === videoId);
  if (targetIndex <= 0) {
    return targetIndex === 0;
  }

  return videoItems
    .slice(0, targetIndex)
    .every((item) => ensureVideoPartProgress(videoParts[item.id]).completed);
}

function ensureVideoPartProgress(source) {
  return {
    ...createInitialVideoPartProgress(),
    ...(source ?? {})
  };
}

function getVideoCompletionThreshold(lesson, videoId) {
  const videoItem = getLessonVideoItems(lesson).find((item) => item.id === videoId);
  return clampNumber(
    videoItem?.completionThreshold ?? lesson.video?.completionThreshold ?? 1,
    0.1,
    1
  );
}

function getVideoProgressWeight(videoItem, partProgress) {
  return Math.max(videoItem.durationSeconds, partProgress.lastKnownDurationSeconds, 1);
}

function gradeAssessment(assessment, answers) {
  let correctCount = 0;

  assessment.questions.forEach((question) => {
    if (answers[question.id] === question.correctOptionId) {
      correctCount += 1;
    }
  });

  return {
    totalQuestions: assessment.questions.length,
    correctCount,
    requiredCorrect: assessment.passingScore,
    percentage: Math.round((correctCount / assessment.questions.length) * 100),
    passed: correctCount >= assessment.passingScore
  };
}

function sanitizeAnswers(value) {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter((entry) => typeof entry[0] === 'string' && typeof entry[1] === 'string')
      .map(([key, optionId]) => [key, optionId])
  );
}

function readStoredProgress() {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return memoryProgressFallback;
    }

    return JSON.parse(rawValue);
  } catch (_) {
    return memoryProgressFallback;
  }
}

function writeStoredProgress(progress) {
  memoryProgressFallback = progress;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (_) {
    memoryProgressFallback = progress;
  }
}

function clampNumber(value, min, max) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function clampInteger(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(Math.round(value), min), max);
}

function cloneProgress(progress) {
  return JSON.parse(JSON.stringify(progress));
}

function now() {
  return new Date().toISOString();
}
