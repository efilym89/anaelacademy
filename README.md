# Академия Косметологов - Annaelle — локальный курс с SQLite

Проект переведен с мок-данных на локальную временную базу SQLite и файловое хранилище `storage/`.

Что теперь есть:

- локальный Node-сервер без внешних зависимостей;
- SQLite с курсом на 2 дня и 21 урок;
- API `/api/bootstrap` для загрузки структуры курса в SPA;
- локальное хранилище видео и `.pptx` с подготовкой к миграции в облако;
- скрипт синхронизации файлов из `storage/` в БД;
- автоматическая нормализация импортированных папок с контентом.

## Запуск

```bash
npm run db:seed
npm start
```

Открыть: `http://localhost:4173`

## Структура

```text
.
├── app.js
├── course-data.js
├── progress-store.js
├── index.html
├── styles.css
├── shared/
│   └── course-blueprint.js
├── server/
│   ├── db/
│   ├── repositories/
│   ├── services/
│   └── scripts/
└── storage/
    └── README.md
```

## Ручное добавление материалов

1. Выполните `npm run db:seed`, чтобы создать SQLite и папки уроков.
2. Положите видео и презентацию в нужную папку:

```text
storage/day-1/lesson-1/video.mp4
storage/day-1/lesson-1/presentation.pptx
```

3. При необходимости добавьте `metadata.json` в ту же папку.
4. Выполните:

```bash
npm run db:sync-storage
```

После этого приложение начнет отдавать файлы по HTTP через `/storage/...`, а пути сохранятся в SQLite.

Если вы вставили контент в “человеческой” структуре вроде `День первый/День первый Урок 1/...`, проект тоже справится:

```bash
npm run storage:normalize
npm run db:sync-storage
```
