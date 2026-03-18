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

## Публичный деплой

### GitHub Pages

Для GitHub Pages уже есть workflow в `.github/workflows/deploy-pages.yml`.

### Cloudflare Pages

Проект подготовлен для Cloudflare Pages как статический SPA с fallback на локальные данные без `/api/bootstrap`.

Что уже настроено:

- статическая сборка: `npm run pages:build`
- готовый каталог артефактов: `dist-pages/`
- конфигурация Cloudflare: `wrangler.jsonc`
- локальный предпросмотр через Wrangler: `npm run cloudflare:dev`
- ручной деплой через Wrangler: `npm run cloudflare:deploy`

#### Вариант 1. Git integration в Cloudflare Pages

При создании проекта в Cloudflare Pages укажите:

- Framework preset: `None`
- Production branch: `main`
- Build command: `npm run pages:build`
- Build output directory: `dist-pages`
- Root directory: оставить пустым

После этого Cloudflare будет автоматически собирать и публиковать сайт из GitHub.

#### Вариант 2. Direct Upload через Wrangler

По официальной схеме Cloudflare Direct Upload сначала создается Pages project, затем заливается каталог со статическими файлами.

```bash
npx wrangler login
npx wrangler pages project create
npm run cloudflare:deploy
```

Продакшен-URL будет вида `<project-name>.pages.dev`.

#### Важно

- Git integration и Direct Upload у Cloudflare — разные режимы проекта, и Cloudflare не дает потом переключить один режим в другой без создания нового проекта.
- Для статического деплоя не нужен локальный Node-сервер: приложение на Pages берет данные из `shared/course-blueprint.js`, если `/api/bootstrap` недоступен.

## Структура

```text
.
├── app.js
├── course-data.js
├── progress-store.js
├── index.html
├── styles.css
├── wrangler.jsonc
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
