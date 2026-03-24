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

### Cloudflare

Проект подготовлен для Cloudflare Workers Static Assets как статический SPA с fallback на локальные данные без `/api/bootstrap`.

Что уже настроено:

- статическая сборка: `npm run pages:build`
- готовый каталог артефактов: `dist-pages/`
- конфигурация Cloudflare: `wrangler.jsonc`
- локальный предпросмотр через Wrangler: `npm run cloudflare:dev`
- ручной деплой через Wrangler: `npm run cloudflare:deploy`
- `workers.dev` и preview URLs включены в `wrangler.jsonc`

#### Вариант 1. Git integration в Cloudflare Workers

Если проект подключен через Git в Cloudflare Workers, укажите в `Settings -> Builds`:

- Build command: `npm run pages:build`
- Deploy command: `npx wrangler deploy`
- Branch: `main`

После этого Cloudflare будет собирать `dist-pages` и публиковать его как статические assets Worker'а.

Если сейчас по ссылке открывается `hello world`, это означает, что Cloudflare развернул дефолтный Worker, а не наш собранный фронт. После обновления build settings нужно запустить новый deploy или `Retry deployment`.

Публичный адрес будет вида:

`https://<project-name>.<account-subdomain>.workers.dev`

#### Вариант 2. Direct deploy через Wrangler

По официальной схеме Cloudflare Worker со статическими asset'ами можно задеплоить напрямую из локальной машины:

```bash
npx wrangler login
npm run cloudflare:deploy
```

Продакшен-URL будет на `workers.dev`, если для Worker включен публичный маршрут.

#### Важно

- Workers Builds использует отдельный Build command в настройках Cloudflare. По официальной документации Cloudflare не применяет `build.command` из Wrangler-конфига для Git-based build'ов, поэтому команду сборки нужно задать именно в Dashboard.
- Для статического деплоя не нужен локальный Node-сервер: приложение берет данные из `shared/course-blueprint.js`, если `/api/bootstrap` недоступен.

#### Видео для mini app без chunk-proxy

Если mini app должна забирать видео напрямую, задайте `PUBLIC_VIDEO_ORIGIN` перед `npm run pages:build`.
Тогда статическая сборка:

- подставит этот origin только в `video.src`;
- перестанет копировать видеофайлы в `dist-pages/storage`;
- не будет собирать `__video_proxy__`-чанки для видео.

Пример:

```bash
PUBLIC_VIDEO_ORIGIN=https://media.example.com npm run pages:build
```

Внешний media-origin должен отдавать те же пути вида `/storage/day-N/lesson-N/video.mp4`, поддерживать HTTP Range и CORS для webview.

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
