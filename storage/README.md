# Локальное хранилище учебных материалов

Материалы раскладываются по папкам уроков:

```text
storage/
  day-1/
    lesson-1/
      cover.jpg
      video.mp4
      video-2.mp4
      presentation.pptx
      metadata.json
```

Поддерживаемые видеоформаты: `.mp4`, `.m4v`, `.mov`, `.webm`, `.mkv`.
Поддерживаемые форматы обложек: `.jpg`, `.jpeg`, `.png`, `.webp`, `.svg`, `.avif`.

Поддерживаемый формат презентации: `.pptx`.

`metadata.json` необязателен. Через него можно обновить метаданные урока без ручного редактирования SQLite:

```json
{
  "durationLabel": "12:40",
  "videoDurationSeconds": 760,
  "status": "published",
  "placeholderNote": "Видео загружается отдельно.",
  "title": "Кастомный заголовок урока",
  "description": "Обновленное описание урока",
  "shortDescription": "Короткое описание для карточки урока",
  "fullDescription": "Полный анонс темы для экрана деталей урока",
  "speakerName": "Имя спикера",
  "coverAlt": "Описание обложки урока",
  "objectives": [
    "Цель 1",
    "Цель 2",
    "Цель 3"
  ],
  "videoSequence": [
    {
      "id": "intro",
      "title": "Видео 1. Теория",
      "file": "video.mp4",
      "durationLabel": "06:20",
      "videoDurationSeconds": 380,
      "completionThreshold": 1
    },
    {
      "id": "practice",
      "title": "Видео 2. Практика",
      "file": "video-2.mp4",
      "durationLabel": "05:10",
      "videoDurationSeconds": 310,
      "completionThreshold": 1
    }
  ]
}
```

Если `videoSequence` не указан, урок продолжает работать в прежнем single-video режиме.
Для нескольких видео можно оставить основной файл `video.*` и добавить дополнительные файлы с любыми стабильными именами, которые затем указываются в `videoSequence[].file`.

После добавления файлов или `metadata.json` выполните:

```bash
npm run db:sync-storage
```

Если материалы пришли в другой структуре папок, например:

```text
storage/
  День первый/
    День первый Урок 1/
```

сначала выполните:

```bash
npm run storage:normalize
```

Скрипт автоматически приведет папки к формату `day-N/lesson-N`, переименует файлы в `video.*` и `presentation.pptx`, а затем можно запускать `npm run db:sync-storage`.
