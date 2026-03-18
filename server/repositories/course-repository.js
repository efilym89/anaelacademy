export function getCourseBundle(database, courseId) {
  const course = database
    .prepare(`
      SELECT id, title, description, final_exam_json, created_at, updated_at
      FROM courses
      WHERE id = ?
    `)
    .get(courseId);

  if (!course) {
    return null;
  }

  const days = database
    .prepare(`
      SELECT id, course_id, day_number, title, description, lesson_count, created_at, updated_at
      FROM course_days
      WHERE course_id = ?
      ORDER BY day_number ASC
    `)
    .all(courseId);

  const lessons = database
    .prepare(`
      SELECT
        id,
        course_id,
        day_id,
        day_number,
        lesson_number,
        course_order,
        title,
        description,
        short_description,
        full_description,
        speaker_name,
        objectives_json,
        quiz_json,
        video_path,
        presentation_path,
        cover_image_path,
        cover_alt,
        video_duration_seconds,
        duration_label,
        status,
        placeholder_note,
        completion_threshold,
        created_at,
        updated_at
      FROM lessons
      WHERE course_id = ?
      ORDER BY course_order ASC
    `)
    .all(courseId);

  return { course, days, lessons };
}

export function getCourseStats(database, courseId) {
  return {
    courseCount: database.prepare('SELECT COUNT(*) AS total FROM courses WHERE id = ?').get(courseId).total,
    lessonCount: database
      .prepare('SELECT COUNT(*) AS total FROM lessons WHERE course_id = ?')
      .get(courseId).total
  };
}

export function replaceCourseData(database, course) {
  const now = timestamp();
  const insertCourse = database.prepare(`
    INSERT INTO courses (id, title, description, final_exam_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertDay = database.prepare(`
    INSERT INTO course_days (id, course_id, day_number, title, description, lesson_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertLesson = database.prepare(`
    INSERT INTO lessons (
      id,
      course_id,
      day_id,
      day_number,
      lesson_number,
      course_order,
      title,
      description,
      short_description,
      full_description,
      speaker_name,
      objectives_json,
      quiz_json,
      video_path,
      presentation_path,
      cover_image_path,
      cover_alt,
      video_duration_seconds,
      duration_label,
      status,
      placeholder_note,
      completion_threshold,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  database.exec('BEGIN');

  try {
    database.prepare('DELETE FROM lessons').run();
    database.prepare('DELETE FROM course_days').run();
    database.prepare('DELETE FROM courses').run();

    insertCourse.run(
      course.id,
      course.title,
      course.description,
      JSON.stringify(course.finalExam),
      now,
      now
    );

    course.days.forEach((day) => {
      insertDay.run(
        day.id,
        course.id,
        day.number,
        day.title,
        day.description ?? '',
        day.lessonIds.length,
        now,
        now
      );
    });

    course.lessons.forEach((lesson) => {
      insertLesson.run(
        lesson.id,
        course.id,
        `day-${lesson.dayNumber}`,
        lesson.dayNumber,
        lesson.lessonNumber,
        lesson.order,
        lesson.title,
        lesson.description ?? '',
        lesson.shortDescription ?? lesson.description ?? '',
        lesson.fullDescription ?? lesson.description ?? '',
        lesson.speakerName ?? '',
        JSON.stringify(lesson.objectives ?? []),
        JSON.stringify(lesson.quiz),
        null,
        null,
        lesson.cover?.relativePath ? lesson.cover.relativePath.replace(/^storage\//u, '') : null,
        lesson.cover?.alt ?? '',
        lesson.durationSeconds ?? null,
        lesson.duration ?? null,
        lesson.status ?? 'published',
        lesson.video?.placeholderNote ?? '',
        lesson.video?.completionThreshold ?? 1,
        now,
        now
      );
    });

    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

export function updateLessonStorage(database, update) {
  database
    .prepare(`
      UPDATE lessons
      SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        short_description = COALESCE(?, short_description),
        full_description = COALESCE(?, full_description),
        speaker_name = COALESCE(?, speaker_name),
        objectives_json = COALESCE(?, objectives_json),
        video_path = ?,
        presentation_path = ?,
        cover_image_path = COALESCE(?, cover_image_path),
        cover_alt = COALESCE(?, cover_alt),
        video_duration_seconds = COALESCE(?, video_duration_seconds),
        duration_label = COALESCE(?, duration_label),
        status = COALESCE(?, status),
        placeholder_note = COALESCE(?, placeholder_note),
        updated_at = ?
      WHERE id = ?
    `)
    .run(
      update.title ?? null,
      update.description ?? null,
      update.shortDescription ?? null,
      update.fullDescription ?? null,
      update.speakerName ?? null,
      update.objectivesJson ?? null,
      update.videoPath ?? null,
      update.presentationPath ?? null,
      update.coverImagePath ?? null,
      update.coverAlt ?? null,
      update.videoDurationSeconds ?? null,
      update.durationLabel ?? null,
      update.status ?? null,
      update.placeholderNote ?? null,
      timestamp(),
      update.lessonId
    );
}

function timestamp() {
  return new Date().toISOString();
}
