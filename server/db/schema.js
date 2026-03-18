export function ensureSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      final_exam_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS course_days (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      day_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      lesson_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(course_id, day_number)
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      day_id TEXT NOT NULL REFERENCES course_days(id) ON DELETE CASCADE,
      day_number INTEGER NOT NULL,
      lesson_number INTEGER NOT NULL,
      course_order INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      short_description TEXT,
      full_description TEXT,
      speaker_name TEXT,
      objectives_json TEXT NOT NULL DEFAULT '[]',
      quiz_json TEXT NOT NULL,
      video_path TEXT,
      presentation_path TEXT,
      cover_image_path TEXT,
      cover_alt TEXT,
      video_duration_seconds INTEGER,
      duration_label TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      placeholder_note TEXT,
      completion_threshold REAL NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(course_id, course_order),
      UNIQUE(day_id, lesson_number)
    );

    CREATE INDEX IF NOT EXISTS idx_course_days_course_number
      ON course_days (course_id, day_number);

    CREATE INDEX IF NOT EXISTS idx_lessons_course_order
      ON lessons (course_id, course_order);
  `);

  ensureColumn(database, 'lessons', 'short_description', 'TEXT');
  ensureColumn(database, 'lessons', 'full_description', 'TEXT');
  ensureColumn(database, 'lessons', 'speaker_name', 'TEXT');
  ensureColumn(database, 'lessons', 'cover_image_path', 'TEXT');
  ensureColumn(database, 'lessons', 'cover_alt', 'TEXT');
}

function ensureColumn(database, tableName, columnName, definition) {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all();
  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}
