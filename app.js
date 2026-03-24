import { academyCourse, dashboardData, hydrateCourseData } from './course-data.js';
import {
  canOpenFinalExam,
  getCourseSummary,
  getLessonById,
  getLessonProgress,
  getLessonStatus,
  getLessonTestStatus,
  getLessonUnlockReason,
  getLessonVideoItems,
  isLessonAccessible,
  loadCourseProgress,
  markLessonVideoComplete,
  setActiveLessonVideo,
  submitFinalExam,
  submitLessonQuiz,
  toggleLessonFavorite,
  updateLessonVideoProgress
} from './progress-store.js';

const tabTitles = {
  home: 'Главная',
  community: 'Сообщество',
  chats: 'Чаты',
  favorites: 'Избранное',
  ambassadors: 'Профиль'
};

const PLATFORM_TITLE = 'Академия Annaelle';
const PLATFORM_TAGLINE = 'Знания, сервис, результат';

const defaultCategories = [
  {
    id: 'courses',
    title: 'Курсы',
    type: 'courses',
    description: 'Видеоуроки, тесты и последовательное открытие уроков',
    badge: 'Курс',
    isActive: true,
    sortOrder: 1
  },
  {
    id: 'presentations',
    title: 'Презентации',
    type: 'presentations',
    description: 'Материалы к урокам и визуальная поддержка обучения',
    badge: 'Материалы',
    isActive: true,
    sortOrder: 2
  },
  {
    id: 'protocols',
    title: 'Протоколы',
    type: 'placeholder',
    description: 'Раздел появится в одном из следующих обновлений',
    badge: 'Скоро',
    isActive: false,
    sortOrder: 3
  },
  {
    id: 'cases',
    title: 'Кейсы',
    type: 'placeholder',
    description: 'Библиотека разборов и сценариев готовится к публикации',
    badge: 'Скоро',
    isActive: false,
    sortOrder: 4
  }
];

const sectionIcons = {
  courses: 'CR',
  presentations: 'PR',
  protocols: 'PL',
  cases: 'CS'
};

const coverAccentLabels = {
  bronze: 'Акцент Bronze',
  sand: 'Акцент Sand',
  olive: 'Акцент Olive',
  charcoal: 'Акцент Charcoal'
};

const statusMeta = {
  locked: { label: 'Заблокирован', type: 'muted' },
  available: { label: 'Доступен', type: 'warning' },
  watched: { label: 'Видео просмотрено', type: 'warning' },
  completed: { label: 'Пройден', type: 'success' }
};

const testStatusMeta = {
  not_started: { label: 'Тест не начат', type: 'muted' },
  failed: { label: 'Нужна повторная попытка', type: 'warning' },
  passed: { label: 'Тест пройден', type: 'success' }
};

const view = document.querySelector('#view');
const tabs = Array.from(document.querySelectorAll('.tab'));

let progress = null;
let pendingToast = '';
let viewportResizeBound = false;
let telegramViewportEventsBound = false;
let pendingRouteScrollReset = false;
let lessonVideoLifecycleCleanup = null;
let videoPreviewObserver = null;
const videoPreviewCache = new Map();
const SEEK_TOLERANCE_SECONDS = 1.5;
const uiState = {
  homeSearch: '',
  courseSearch: '',
  presentationSearch: '',
  favoritesSearch: ''
};

tabs.forEach((button) => {
  button.addEventListener('click', () => {
    navigateToTab(button.dataset.tab);
  });
});

window.addEventListener('hashchange', () => {
  if (!progress) {
    return;
  }

  pendingRouteScrollReset = true;
  renderCurrentRoute();
});

window.addEventListener('storage', () => {
  if (!progress) {
    return;
  }

  progress = loadCourseProgress(academyCourse);
  renderCurrentRoute();
});

ensureViewportSync();
bootstrapApp();

async function bootstrapApp() {
  document.title = 'Академия студий лазерной эпиляции Annaelle';
  renderLoadingState('Подключаем курс, медиа и текущий прогресс...');

  document.title = PLATFORM_TITLE;

  try {
    await hydrateCourseData();
    progress = loadCourseProgress(academyCourse);
    applyBranding();
    ensureInitialRoute();
    renderCurrentRoute();
    initTelegram();
  } catch (error) {
    renderFatalState(
      `Не удалось загрузить курс из локальной базы. Проверьте запуск сервера и SQLite. ${error.message}`
    );
  }
}

function applyBranding() {
  const brand = dashboardData.brand ?? {};
  const eyebrow = document.querySelector('#brandEyebrow');
  const title = document.querySelector('#brandTitle');
  const subtitle = document.querySelector('#brandSubtitle');

  if (eyebrow) {
    eyebrow.textContent = brand.eyebrow || 'Учебная платформа';
  }

  if (title) {
    title.textContent = brand.title || academyCourse.title || 'Академия студий лазерной эпиляции Annaelle';
  }

  if (title) {
    title.textContent = PLATFORM_TITLE;
  }

  if (subtitle) {
    subtitle.textContent =
      brand.subtitle ||
      academyCourse.description ||
      'Мобильная программа обучения для команды студий Annaelle';
  }
  if (subtitle) {
    subtitle.textContent = PLATFORM_TAGLINE;
  }
}

function renderLoadingState(message) {
  view.innerHTML = `
    <section class="screen-stack">
      <section class="section section--loading">
        <div class="section-title">
          <div>
            <p class="eyebrow">Подготовка</p>
            <h2>Загружаем академию</h2>
          </div>
          <span class="badge">SQLite</span>
        </div>
        <p class="muted">${escapeHtml(message)}</p>
        <div class="progress">
          <span style="width: 42%"></span>
        </div>
      </section>
    </section>
  `;
}

function renderFatalState(message) {
  view.innerHTML = `
    <section class="screen-stack">
      <section class="section">
        <div class="section-title">
          <div>
            <p class="eyebrow">Ошибка загрузки</p>
            <h2>Курс недоступен</h2>
          </div>
          <span class="badge">Ошибка</span>
        </div>
        <div class="notice notice--warning">${escapeHtml(message)}</div>
        <div class="hero-actions">
          <button class="button" id="retryBootstrap" type="button">Повторить подключение</button>
        </div>
      </section>
    </section>
  `;

  document.querySelector('#retryBootstrap')?.addEventListener('click', () => {
    bootstrapApp();
  });
}

function ensureInitialRoute() {
  if (!window.location.hash) {
    navigateToRoute({ tab: 'home', screen: 'home' }, { replace: true });
  }
}

function navigateToTab(tab) {
  if (tab === 'home') {
    navigateToRoute({ tab: 'home', screen: 'home' });
    return;
  }

  if (tab === 'favorites') {
    navigateToRoute({ tab: 'favorites', screen: 'favorites' });
    return;
  }

  navigateToRoute({ tab, screen: 'placeholder' });
}

function navigateToRoute(route, options = {}) {
  const hash = buildRouteHash(route);
  pendingRouteScrollReset = true;

  if (options.replace) {
    window.history.replaceState(null, '', hash);
    renderCurrentRoute();
    return;
  }

  if (window.location.hash === hash) {
    renderCurrentRoute();
    return;
  }

  window.location.hash = hash;
}

function buildRouteHash(route) {
  if (route.tab === 'favorites') {
    return '#/favorites';
  }

  if (route.tab && route.tab !== 'home') {
    return `#/${route.tab}`;
  }

  if (route.screen === 'courses') {
    return '#/home/courses';
  }

  if (route.screen === 'presentations') {
    return '#/home/presentations';
  }

  if (route.screen === 'presentation' && route.lessonId) {
    return `#/home/presentation/${encodeURIComponent(route.lessonId)}`;
  }

  if (route.screen === 'lesson' && route.lessonId) {
    return `#/home/lesson/${encodeURIComponent(route.lessonId)}`;
  }

  if (route.screen === 'player' && route.lessonId) {
    return `#/home/player/${encodeURIComponent(route.lessonId)}`;
  }

  if (route.screen === 'test' && route.lessonId) {
    return `#/home/test/${encodeURIComponent(route.lessonId)}`;
  }

  if (route.screen === 'final-exam') {
    return '#/home/final-exam';
  }

  return '#/home';
}

function parseRoute() {
  const segments = window.location.hash.replace(/^#\/?/u, '').split('/').filter(Boolean);

  if (segments[0] === 'favorites') {
    return { tab: 'favorites', screen: 'favorites' };
  }

  if (segments[0] === 'lesson' && segments[1]) {
    return { tab: 'home', screen: 'lesson', lessonId: decodeURIComponent(segments[1]) };
  }

  if (segments[0] === 'player' && segments[1]) {
    return { tab: 'home', screen: 'player', lessonId: decodeURIComponent(segments[1]) };
  }

  if (segments[0] === 'test' && segments[1]) {
    return { tab: 'home', screen: 'test', lessonId: decodeURIComponent(segments[1]) };
  }

  if (segments[0] === 'final-exam') {
    return { tab: 'home', screen: 'final-exam' };
  }

  const tab = tabTitles[segments[0]] ? segments[0] : 'home';
  if (tab !== 'home') {
    return { tab, screen: 'placeholder' };
  }

  if (segments[1] === 'courses') {
    return { tab: 'home', screen: 'courses' };
  }

  if (segments[1] === 'presentations') {
    return { tab: 'home', screen: 'presentations' };
  }

  if (segments[1] === 'presentation' && segments[2]) {
    return { tab: 'home', screen: 'presentation', lessonId: decodeURIComponent(segments[2]) };
  }

  if (segments[1] === 'lesson' && segments[2]) {
    return { tab: 'home', screen: 'lesson', lessonId: decodeURIComponent(segments[2]) };
  }

  if (segments[1] === 'player' && segments[2]) {
    return { tab: 'home', screen: 'player', lessonId: decodeURIComponent(segments[2]) };
  }

  if (segments[1] === 'test' && segments[2]) {
    return { tab: 'home', screen: 'test', lessonId: decodeURIComponent(segments[2]) };
  }

  if (segments[1] === 'final-exam') {
    return { tab: 'home', screen: 'final-exam' };
  }

  return { tab: 'home', screen: 'home' };
}

function getGuardedRoute(route) {
  if (route.tab === 'favorites' || route.tab !== 'home') {
    return { route };
  }

  if (route.screen === 'final-exam' && !canOpenFinalExam(progress)) {
    return {
      route: { tab: 'home', screen: 'courses' },
      message: 'Итоговый экзамен откроется после завершения всех уроков и тестов.'
    };
  }

  if (!['lesson', 'player', 'test'].includes(route.screen)) {
    return { route };
  }

  const lesson = getLessonById(academyCourse, route.lessonId);
  if (!lesson) {
    return {
      route: { tab: 'home', screen: 'courses' },
      message: 'Урок не найден.'
    };
  }

  if (!isLessonAccessible(academyCourse, progress, lesson.id)) {
    return {
      route: { tab: 'home', screen: 'courses' },
      message: getLessonUnlockReason(academyCourse, progress, lesson.id)
    };
  }

  if (route.screen === 'test') {
    const lessonProgress = getLessonProgress(progress, lesson.id);
    if (!lessonProgress?.videoCompleted) {
      return {
        route: { tab: 'home', screen: 'player', lessonId: lesson.id },
        message: 'Сначала нужно полностью досмотреть видеоурок.'
      };
    }
  }

  return { route };
}

function renderCurrentRoute() {
  if (!progress) {
    renderLoadingState('Загружаем данные курса...');
    return;
  }

  progress = loadCourseProgress(academyCourse);
  applyBranding();
  const route = parseRoute();
  const guard = getGuardedRoute(route);

  if (buildRouteHash(route) !== buildRouteHash(guard.route)) {
    if (guard.message) {
      pendingToast = guard.message;
    }
    navigateToRoute(guard.route, { replace: true });
    return;
  }

  setActiveTab(guard.route.tab);

  if (guard.route.tab === 'favorites') {
    renderFavorites();
  } else if (guard.route.tab !== 'home') {
    renderBottomTabPlaceholder(guard.route.tab);
  } else if (guard.route.screen === 'courses') {
    renderCourses();
  } else if (guard.route.screen === 'presentations') {
    renderPresentationLibrary();
  } else if (guard.route.screen === 'presentation') {
    renderPresentationDetail(guard.route.lessonId);
  } else if (guard.route.screen === 'lesson') {
    renderLessonDetail(guard.route.lessonId);
  } else if (guard.route.screen === 'player') {
    renderLessonPlayer(guard.route.lessonId);
  } else if (guard.route.screen === 'test') {
    renderLessonTest(guard.route.lessonId);
  } else if (guard.route.screen === 'final-exam') {
    renderFinalExam();
  } else {
    renderHome();
  }

  if (pendingRouteScrollReset) {
    scrollViewportToTop();
    pendingRouteScrollReset = false;
  }

  if (pendingToast) {
    showToast(pendingToast);
    pendingToast = '';
  }
}

function scrollViewportToTop() {
  const resetScroll = () => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.scrollingElement?.scrollTo?.(0, 0);
    document.querySelector('.app-shell')?.scrollTo?.(0, 0);
  };

  resetScroll();
  window.requestAnimationFrame(resetScroll);
}

function setActiveTab(active) {
  tabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === active);
  });
}

function renderHome() {
  const summary = getCourseSummary(academyCourse, progress);
  const categories = getFilteredCategories(uiState.homeSearch);
  const content = categories.length
    ? categories.map((category) => buildHomeCategoryCard(category)).join('')
    : buildEmptyState(
        'Ничего не найдено',
        'Попробуйте изменить запрос. Разделы академии останутся здесь и будут готовы к дальнейшему расширению.'
      );

  view.innerHTML = `
    <section class="screen-stack screen-stack--home">
      <section class="hero-panel hero-panel--home">
        <div class="section-title section-title--home">
          <div>
            <p class="eyebrow">Главный раздел</p>
            <h2>${escapeHtml(dashboardData.brand?.title || academyCourse.title)}</h2>
          </div>
          <span class="badge">${summary.overallPercentage}%</span>
        </div>
        <p class="muted">${escapeHtml(dashboardData.brand?.subtitle || academyCourse.description)}</p>
        <div class="stats-strip stats-strip--home">
          <article class="metric-card">
            <strong>${summary.totalLessons}</strong>
            <span>Уроков</span>
          </article>
          <article class="metric-card">
            <strong>${summary.completedLessons}</strong>
            <span>Завершено</span>
          </article>
          <article class="metric-card">
            <strong>${summary.favoriteLessons}</strong>
            <span>В избранном</span>
          </article>
        </div>
      </section>

      <section class="section section--compact section--home-search">
        <label class="search" for="homeSearchInput">
          <input
            id="homeSearchInput"
            type="search"
            placeholder="Поиск по разделам"
            value="${escapeHtml(uiState.homeSearch)}"
          />
        </label>
      </section>

      <section class="section section--home-hub">
        <div class="section-title section-title--home">
          <div>
            <p class="eyebrow">Навигация по блокам</p>
            <h3>Разделы академии</h3>
          </div>
          <span class="badge">4 блока</span>
        </div>
        <div class="hub-grid hub-grid--home">
          ${content}
        </div>
      </section>
    </section>
  `;

  view.querySelector('.hero-panel--home .eyebrow')?.replaceChildren('Мой прогресс');
  view.querySelector('.hero-panel--home h2')?.remove();
  const homeHeroSubtitle = view.querySelector('.hero-panel--home .muted');
  if (homeHeroSubtitle) {
    homeHeroSubtitle.textContent = PLATFORM_TAGLINE;
  }

  bindHomeActions();
}

function renderCourses() {
  const summary = getCourseSummary(academyCourse, progress);
  const lessons = getFilteredLessons(academyCourse.lessons, uiState.courseSearch, 'course');

  view.innerHTML = `
    <section class="screen-stack">
      <button class="back-link" id="backHome" type="button">К главной</button>

      <section class="hero-panel hero-panel--accent">
        <div class="section-title">
          <div>
            <p class="eyebrow">Курсы</p>
            <h2>${escapeHtml(academyCourse.title)}</h2>
          </div>
          <span class="badge">${summary.completedLessons}/${summary.totalLessons}</span>
        </div>
        <p class="muted">${escapeHtml(academyCourse.description)}</p>
        <div class="stats-strip">
          <article class="metric-card">
            <strong>${summary.watchedVideos}</strong>
            <span>Просмотрено</span>
          </article>
          <article class="metric-card">
            <strong>${summary.passedLessonQuizzes}</strong>
            <span>Тестов сдано</span>
          </article>
          <article class="metric-card">
            <strong>${summary.favoriteLessons}</strong>
            <span>Избранное</span>
          </article>
        </div>
      </section>

      <section class="section section--compact">
        <div class="filters-bar">
          <label class="search" for="courseSearchInput">
            <input
              id="courseSearchInput"
              type="search"
              placeholder="Поиск по урокам"
              value="${escapeHtml(uiState.courseSearch)}"
            />
          </label>
          <label class="filter-select" for="courseSortSelect">
            <span class="muted">Сортировка</span>
            <select id="courseSortSelect">
              <option value="newest" ${uiState.courseSort === 'newest' ? 'selected' : ''}>Сначала новые</option>
              <option value="course" ${uiState.courseSort === 'course' ? 'selected' : ''}>По порядку курса</option>
            </select>
          </label>
        </div>
      </section>

      <section class="section">
        <div class="section-title">
          <div>
            <p class="eyebrow">Список уроков</p>
            <h3>Уроки и статусы доступа</h3>
          </div>
          <span class="badge">${lessons.length}</span>
        </div>
        <div class="lesson-feed">
          ${
            lessons.length
              ? lessons.map((lesson) => buildCourseLessonCard(lesson)).join('')
              : buildEmptyState(
                  'Уроки не найдены',
                  'Попробуйте сбросить поиск или сортировку. Данные продолжают загружаться из текущей базы курса.'
                )
          }
        </div>
      </section>

      ${buildFinalExamTeaser(summary)}
    </section>
  `;

  view.querySelector('.hero-panel--accent h2')?.remove();
  view.querySelector('.hero-panel--accent .stats-strip')?.classList.add('stats-strip--courses');
  view.querySelector('.filter-select')?.remove();
  view.querySelector('.filters-bar')?.classList.add('filters-bar--single');

  document.querySelector('#backHome')?.addEventListener('click', () => {
    navigateToRoute({ tab: 'home', screen: 'home' });
  });

  document.querySelector('#courseSearchInput')?.addEventListener('input', (event) => {
    uiState.courseSearch = event.target.value;
    renderCourses();
  });

  bindNavigationActions(view);
}

function renderLessonDetail(lessonId) {
  renderLessonExperience(lessonId);
  return;
  const lesson = getLessonById(academyCourse, lessonId);
  if (!lesson) {
    navigateToRoute({ tab: 'home', screen: 'courses' }, { replace: true });
    return;
  }

  const lessonProgress = getLessonProgress(progress, lesson.id);
  const status = getLessonStatus(academyCourse, progress, lesson.id);
  const statusInfo = statusMeta[status];
  const testInfo = testStatusMeta[getLessonTestStatus(progress, lesson.id)];

  view.innerHTML = `
    <section class="screen-stack">
      <button class="back-link" id="backToCourses" type="button">К списку уроков</button>

      <section class="section lesson-detail">
        <div class="lesson-detail__media">
          ${buildGeneratedLessonCover(lesson, 'hero')}
          ${renderFavoriteButton(lesson.id, lessonProgress.isFavorite)}
        </div>
        <div class="lesson-detail__content">
          <div class="section-title">
            <div>
              <p class="eyebrow">День ${lesson.dayNumber} · Урок ${lesson.lessonNumber}</p>
              <h2>${escapeHtml(lesson.title)}</h2>
            </div>
          </div>

          <div class="status-row">
            ${renderStatusChip(statusInfo.label, statusInfo.type)}
            ${renderStatusChip(testInfo.label, testInfo.type)}
            ${renderStatusChip(lesson.duration || '00:00', 'muted')}
            ${lesson.speakerName ? renderStatusChip(`Спикер: ${lesson.speakerName}`, 'muted') : ''}
          </div>

          <p class="lesson-detail__description">${escapeHtml(lesson.fullDescription || lesson.shortDescription || lesson.description)}</p>

          <div class="notice ${
            status === 'completed' ? 'notice--success' : status === 'watched' ? 'notice--warning' : ''
          }">
            ${escapeHtml(getLessonStatusDescription(lesson, lessonProgress))}
          </div>

          <div class="detail-actions">
            <button class="button" type="button" data-open-player="${escapeHtml(lesson.id)}">Смотреть</button>
            <button
              class="button button--secondary ${lessonProgress.videoCompleted ? '' : 'button--disabled'}"
              type="button"
              data-open-test="${escapeHtml(lesson.id)}"
              ${lessonProgress.videoCompleted ? '' : 'disabled'}
            >
              Пройти тест
            </button>
          </div>
        </div>
      </section>
    </section>
  `;

  document.querySelector('#backToCourses')?.addEventListener('click', () => {
    navigateToRoute({ tab: 'home', screen: 'courses' });
  });
  bindNavigationActions(view);
}

function renderLessonPlayer(lessonId) {
  renderLessonExperience(lessonId);
  return;
  const lesson = getLessonById(academyCourse, lessonId);
  if (!lesson) {
    navigateToRoute({ tab: 'home', screen: 'courses' }, { replace: true });
    return;
  }

  const lessonProgress = getLessonProgress(progress, lesson.id);

  view.innerHTML = `
    <section class="screen-stack">
      <div class="page-actions">
        <button class="back-link" id="backToLessonDetails" type="button">К описанию урока</button>
        <button class="back-link" id="backToCoursesFromPlayer" type="button">К списку уроков</button>
      </div>

      <section class="section">
        <div class="section-title">
          <div>
            <p class="eyebrow">Видеоурок</p>
            <h2>${escapeHtml(lesson.title)}</h2>
          </div>
          <span class="badge">${escapeHtml(lesson.duration || '00:00')}</span>
        </div>
        <p class="muted">${escapeHtml(lesson.shortDescription || lesson.description)}</p>
      </section>

      <section class="section" id="videoPanel">
        ${buildVideoPanel(lesson, lessonProgress)}
      </section>

      <section class="section">
        <div class="section-title">
          <div>
            <p class="eyebrow">Следующий шаг</p>
            <h3>Порядок прохождения</h3>
          </div>
        </div>
        <div class="notice ${lessonProgress.videoCompleted ? 'notice--success' : 'notice--soft'}">
          ${
            lessonProgress.videoCompleted
              ? 'Видео просмотрено полностью. Кнопка теста уже активна.'
              : 'Тест станет доступен сразу после полного просмотра видеоурока. Перемотка вперед и ускорение отключены.'
          }
        </div>
        <div class="detail-actions">
          <button
            class="button ${lessonProgress.videoCompleted ? '' : 'button--disabled'}"
            type="button"
            data-open-test="${escapeHtml(lesson.id)}"
            ${lessonProgress.videoCompleted ? '' : 'disabled'}
          >
            Пройти тест
          </button>
        </div>
      </section>
    </section>
  `;

  document.querySelector('#backToLessonDetails')?.addEventListener('click', () => {
    navigateToRoute({ tab: 'home', screen: 'lesson', lessonId: lesson.id });
  });

  document.querySelector('#backToCoursesFromPlayer')?.addEventListener('click', () => {
    navigateToRoute({ tab: 'home', screen: 'courses' });
  });

  bindNavigationActions(view);
  bindLessonVideoActions(lesson, lessonProgress);
}

function renderLessonExperience(lessonId) {
  const lesson = getLessonById(academyCourse, lessonId);
  if (!lesson) {
    navigateToRoute({ tab: 'home', screen: 'courses' }, { replace: true });
    return;
  }

  const lessonProgress = getLessonProgress(progress, lesson.id);
  view.innerHTML = buildLessonExperienceMarkup(lesson, lessonProgress);

  document.querySelector('#backToCoursesFromLesson')?.addEventListener('click', () => {
    navigateToRoute({ tab: 'home', screen: 'courses' });
  });

  bindNavigationActions(view);
  bindLessonVideoActions(lesson, lessonProgress);
}

function buildLessonExperienceMarkup(lesson, lessonProgress) {
  return `
    <section class="screen-stack screen-stack--lesson">
      <button class="back-link" id="backToCoursesFromLesson" type="button">К списку уроков</button>
      ${buildLessonHeroPanel(lesson, lessonProgress)}
      ${buildLessonPlaybackSection(lesson, lessonProgress)}
    </section>
  `;
}

function buildLessonHeroPanel(lesson, lessonProgress) {
  const status = getLessonStatus(academyCourse, progress, lesson.id);
  const statusInfo = statusMeta[status];
  const testInfo = testStatusMeta[getLessonTestStatus(progress, lesson.id)];
  const videoItems = getLessonVideoItems(lesson);
  const activeVideo = getActiveVideoItem(lesson, lessonProgress);
  const activeVideoProgress = getVideoItemProgress(lessonProgress, activeVideo.id);
  const summary = getVideoProgressSummary(lesson, lessonProgress);
  const overallProgressPercent = Math.round(summary.watchRatio * 100);
  const videoMeta = getVideoSourceMeta(activeVideo.src);
  const nextStepLabel = lessonProgress.quizPassed
    ? 'Урок завершен'
    : lessonProgress.videoCompleted
      ? 'Тест открыт'
      : 'Досмотреть видео';
  const playbackMeta = [
    {
      label: 'Длительность',
      value: activeVideo.durationLabel || lesson.duration || '00:00'
    },
    {
      label: 'Следующий шаг',
      value: nextStepLabel
    },
    {
      label: 'Порядок',
      value:
        videoItems.length > 1
          ? `Видео ${activeVideo.order} из ${videoItems.length}`
          : 'Одно видео'
    }
  ];
  const playLabel = activeVideoProgress.completed ? 'Пересмотреть видео' : 'Смотреть видео';
  const testLabel = lessonProgress.quizPassed ? 'Открыть тест' : 'Пройти тест';

  return `
    <section class="section lesson-hero-panel">
      <div class="lesson-hero-panel__layout">
        ${buildLessonHeroMedia(lesson, lessonProgress, activeVideo, videoMeta)}
        <div class="lesson-hero-panel__content">
          <div class="section-title section-title--lesson-hero">
            <div>
              <p class="eyebrow">День ${lesson.dayNumber} · Урок ${lesson.lessonNumber}</p>
              <h2>${escapeHtml(lesson.title)}</h2>
            </div>
            <span class="badge">${escapeHtml(activeVideo.durationLabel || lesson.duration || '00:00')}</span>
          </div>

          <div class="status-row status-row--hero">
            ${renderStatusChip(statusInfo.label, statusInfo.type)}
            ${renderStatusChip(
              lessonProgress.videoCompleted ? 'Видео просмотрено' : 'Видео не завершено',
              lessonProgress.videoCompleted ? 'success' : 'muted'
            )}
            ${renderStatusChip(testInfo.label, testInfo.type)}
            ${videoItems.length > 1 ? renderStatusChip(`Видео ${activeVideo.order} из ${videoItems.length}`, 'muted') : ''}
          </div>

          <p class="lesson-hero-panel__summary">${escapeHtml(lesson.shortDescription || lesson.description)}</p>

          <div class="lesson-hero-panel__meta">
            ${playbackMeta
              .map(
                (item) => `
                  <article class="lesson-hero-panel__meta-item">
                    <small>${escapeHtml(item.label)}</small>
                    <strong>${escapeHtml(item.value)}</strong>
                  </article>
                `
              )
              .join('')}
          </div>

          <div class="lesson-hero-panel__facts">
            <article class="lesson-hero-panel__fact">
              <small>Сейчас</small>
              <strong>${escapeHtml(activeVideo.title)}</strong>
            </article>
            <article class="lesson-hero-panel__fact">
              <small>Прогресс урока</small>
              <strong>${overallProgressPercent}%</strong>
            </article>
            <article class="lesson-hero-panel__fact">
              <small>Просмотрено</small>
              <strong>${summary.completedCount}/${summary.totalCount}</strong>
            </article>
            <article class="lesson-hero-panel__fact">
              <small>Следующий шаг</small>
              <strong>${lessonProgress.videoCompleted ? (lessonProgress.quizPassed ? 'Урок завершен' : 'Пройти тест') : 'Досмотреть видео'}</strong>
            </article>
          </div>

          <p class="lesson-hero-panel__hint">${escapeHtml(
            getLessonPlaybackHint(lesson, lessonProgress, activeVideo, videoMeta)
          )}</p>

          <div class="detail-actions detail-actions--hero">
            <button
              class="button ${videoMeta.hasSource ? '' : 'button--disabled'}"
              type="button"
              data-play-lesson-video
              ${videoMeta.hasSource ? '' : 'disabled'}
            >
              ${playLabel}
            </button>
            <button
              class="button button--secondary ${lessonProgress.videoCompleted ? '' : 'button--disabled'}"
              type="button"
              data-open-test="${escapeHtml(lesson.id)}"
              ${lessonProgress.videoCompleted ? '' : 'disabled'}
            >
              ${testLabel}
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
}

function buildLessonHeroMedia(lesson, lessonProgress, activeVideo, videoMeta) {
  const videoItems = getLessonVideoItems(lesson);
  const activeVideoProgress = getVideoItemProgress(lessonProgress, activeVideo.id);
  const posterUrl = getGeneratedLessonPreviewDataUrl(lesson, {
    variant: 'player',
    videoItem: activeVideo
  });
  const statusLabel = !videoMeta.hasSource
    ? 'Без видео'
    : activeVideoProgress.completed
      ? 'Просмотрено'
      : 'Готово';
  const statusTone = !videoMeta.hasSource ? 'muted' : activeVideoProgress.completed ? 'success' : 'warning';
  const videoOrderLabel = videoItems.length > 1 ? `Видео ${activeVideo.order}` : 'Урок';
  return `
    <div class="lesson-player-card" data-video-shell data-video-state="${videoMeta.hasSource ? 'idle' : 'missing'}">
      <div class="lesson-player-card__media">
        ${
          videoMeta.hasSource
            ? `
              <video
                id="lessonVideo"
                class="lesson-player-card__video"
                data-video-id="${escapeHtml(activeVideo.id)}"
                src="${escapeHtml(activeVideo.src)}"
                controls
                controlsList="nodownload noplaybackrate"
                disablepictureinpicture
                playsinline
                webkit-playsinline="true"
                preload="metadata"
                poster="${escapeHtml(posterUrl)}"
                aria-label="${escapeHtml(`Видео урока ${lesson.title}`)}"
              ></video>
            `
            : `
              <img
                class="lesson-player-card__poster"
                src="${escapeHtml(posterUrl)}"
                alt="${escapeHtml(`Превью урока ${lesson.title}`)}"
              />
              <div class="lesson-player-card__placeholder">
                <span class="lesson-player-card__play-icon" aria-hidden="true"></span>
                <strong>Видео пока недоступно</strong>
                <p>${escapeHtml(
                  activeVideo.placeholderNote || 'Как только файл будет подключен, урок запустится прямо в этом блоке.'
                )}</p>
              </div>
            `
        }

        <div class="lesson-player-card__topbar">
          <span class="cover-badge">${escapeHtml(videoOrderLabel)}</span>
          <div class="lesson-player-card__actions">
            <span class="lesson-player-card__pill lesson-player-card__pill--${statusTone}">${escapeHtml(statusLabel)}</span>
            ${renderFavoriteButton(lesson.id, lessonProgress.isFavorite)}
          </div>
        </div>

        <div class="lesson-player-card__feedback" data-video-feedback hidden>
          <strong data-video-feedback-title></strong>
          <p data-video-feedback-text></p>
        </div>
      </div>
    </div>
  `;
}

function getLessonPlaybackHint(lesson, lessonProgress, activeVideo, videoMeta) {
  if (!videoMeta.hasSource) {
    return activeVideo.placeholderNote || 'Видео-файл пока не подключен. Остальные материалы урока при этом доступны.';
  }

  if (lessonProgress.quizPassed) {
    return 'Урок уже завершен. Видео можно пересматривать прямо здесь, статус прохождения сохранен.';
  }

  if (lessonProgress.videoCompleted) {
    return 'Видео уже засчитано. Теперь можно спокойно открыть тест или пересмотреть урок еще раз.';
  }

  return 'Видео запускается прямо в этом блоке. После полного просмотра автоматически откроется доступ к тесту.';
}

function getVideoSourceMeta(videoSrc) {
  const normalizedSrc = String(videoSrc || '').trim();
  const extensionMatch = /\.([a-z0-9]+)(?:$|[?#])/iu.exec(normalizedSrc.toLowerCase());
  const extension = extensionMatch ? `.${extensionMatch[1]}` : '';
  const mimeTypes = {
    '.m3u8': 'application/vnd.apple.mpegurl',
    '.m4v': 'video/mp4',
    '.mkv': 'video/x-matroska',
    '.mov': 'video/quicktime',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm'
  };

  return {
    src: normalizedSrc,
    extension,
    mimeType: mimeTypes[extension] || '',
    hasSource: Boolean(normalizedSrc),
    isHls: extension === '.m3u8',
    isLimitedInWebView: extension === '.mkv' || extension === '.mov'
  };
}

function renderLessonTest(lessonId) {
  const lesson = getLessonById(academyCourse, lessonId);
  if (!lesson) {
    navigateToRoute({ tab: 'home', screen: 'courses' }, { replace: true });
    return;
  }

  const lessonProgress = getLessonProgress(progress, lesson.id);

  view.innerHTML = `
    <section class="screen-stack">
      <div class="page-actions">
        <button class="back-link" id="backToPlayer" type="button">К видеоуроку</button>
        <button class="back-link" id="backToLesson" type="button">К описанию</button>
      </div>

      <section class="section">
        <div class="section-title">
          <div>
            <p class="eyebrow">Тест по уроку</p>
            <h2>${escapeHtml(lesson.title)}</h2>
          </div>
          <span class="badge">${lesson.quiz?.questions?.length ?? 0} вопросов</span>
        </div>
        <div class="status-row">
          ${renderStatusChip(lessonProgress.videoCompleted ? 'Видео просмотрено' : 'Видео не завершено', lessonProgress.videoCompleted ? 'success' : 'muted')}
          ${renderStatusChip(testStatusMeta[getLessonTestStatus(progress, lesson.id)].label, testStatusMeta[getLessonTestStatus(progress, lesson.id)].type)}
        </div>
      </section>

      <section id="lessonQuiz">
        ${buildLessonQuiz(lesson, lessonProgress)}
      </section>
    </section>
  `;

  document.querySelector('#backToPlayer')?.addEventListener('click', () => {
    navigateToRoute({ tab: 'home', screen: 'player', lessonId: lesson.id });
  });

  document.querySelector('#backToLesson')?.addEventListener('click', () => {
    navigateToRoute({ tab: 'home', screen: 'lesson', lessonId: lesson.id });
  });

  bindNavigationActions(view);
  bindLessonQuizActions(lesson);
}

function renderPresentationLibrary() {
  const items = getFilteredPresentations(uiState.presentationSearch);
  const groupedItems = academyCourse.days
    .map((day) => ({
      ...day,
      lessons: items.filter((lesson) => lesson.dayNumber === day.number)
    }))
    .filter((day) => day.lessons.length > 0);
  const availableCount = items.length;

  view.innerHTML = `
    <section class="screen-stack">
      <button class="back-link" id="backToHomeFromPresentations" type="button">К главной</button>

      <section class="section section--compact">
        <label class="search" for="presentationSearchInput">
          <input
            id="presentationSearchInput"
            type="search"
            placeholder="Поиск по презентациям"
            value="${escapeHtml(uiState.presentationSearch)}"
          />
        </label>
      </section>

      <section class="section">
        <div class="section-title">
          <div>
            <p class="eyebrow">Библиотека</p>
            <h3>Материалы по дням обучения</h3>
          </div>
          <span class="badge">${availableCount} доступно</span>
        </div>
        <div class="presentation-library">
          ${
            items.length
              ? groupedItems.map((day) => buildPresentationDaySection(day)).join('')
              : buildEmptyState(
                  'Материалы не найдены',
                  'Либо поиск не дал результатов, либо для этих уроков ещё не подготовлены PDF-материалы.'
                )
          }
        </div>
      </section>
    </section>
  `;

  document.querySelector('#backToHomeFromPresentations')?.addEventListener('click', () => {
    navigateToRoute({ tab: 'home', screen: 'home' });
  });

  document.querySelector('#presentationSearchInput')?.addEventListener('input', (event) => {
    uiState.presentationSearch = event.target.value;
    renderPresentationLibrary();
  });

  bindNavigationActions(view);
}

function renderPresentationDetail(lessonId) {
  const lesson = getLessonById(academyCourse, lessonId);
  if (!lesson) {
    navigateToRoute({ tab: 'home', screen: 'presentations' }, { replace: true });
    return;
  }

  const viewerHref = getPresentationViewerHref(lesson);
  const downloadHref = getPresentationDownloadHref(lesson);
  const downloadFileName = getPresentationDownloadFileName(lesson);
  const sourceHref = getPresentationSourceHref(lesson);
  const sourceFileName = getPresentationSourceFileName(lesson);
  const pdfEmbedHref = buildEmbeddedPdfUrl(viewerHref);
  const lessonProgress = getLessonProgress(progress, lesson.id);

  view.innerHTML = `
    <section class="screen-stack">
      <div class="page-actions">
        <button class="back-link" id="backToPresentationLibrary" type="button">К библиотеке</button>
        <button class="back-link" id="backToLessonFromPresentation" type="button">К уроку</button>
      </div>

      <section class="hero-panel hero-panel--soft">
        <div class="section-title">
          <div>
            <p class="eyebrow">Презентация к уроку</p>
            <h2>${escapeHtml(lesson.title)}</h2>
          </div>
          <span class="badge">${escapeHtml(hasPresentationViewer(lesson) ? 'PDF' : 'Материал')}</span>
        </div>
        <p class="muted">${escapeHtml(lesson.presentation?.description || lesson.shortDescription || lesson.description)}</p>
        <div class="status-row">
          ${renderStatusChip(`День ${lesson.dayNumber} · Урок ${lesson.lessonNumber}`, 'muted')}
          ${sourceHref ? renderStatusChip('Есть PPTX', 'warning') : ''}
          ${lessonProgress.isFavorite ? renderStatusChip('В избранном', 'success') : ''}
        </div>
      </section>

      <section class="section">
        ${
          viewerHref
            ? `
              <div class="presentation-viewer">
                <div class="presentation-toolbar">
                  <div class="status-row status-row--tight">
                    ${renderStatusChip('Встроенный просмотр', 'success')}
                    ${sourceHref ? renderStatusChip('Исходник сохранён', 'warning') : ''}
                  </div>
                  <div class="detail-actions detail-actions--library">
                    <a class="button" href="${escapeHtml(viewerHref)}" target="_blank" rel="noopener">Открыть PDF</a>
                    <a class="button button--secondary" href="${escapeHtml(downloadHref)}" download="${escapeHtml(downloadFileName)}">Скачать PDF</a>
                    ${
                      sourceHref
                        ? `<a class="button button--secondary" href="${escapeHtml(sourceHref)}" download="${escapeHtml(sourceFileName)}">Исходник PPTX</a>`
                        : ''
                    }
                  </div>
                </div>
                <div class="presentation-frame">
                  <iframe
                    src="${escapeHtml(pdfEmbedHref)}"
                    title="${escapeHtml(`Презентация к уроку ${lesson.title}`)}"
                    loading="lazy"
                    referrerpolicy="no-referrer"
                  ></iframe>
                </div>
              </div>
            `
            : buildEmptyState(
                'PDF пока недоступен',
                sourceHref
                  ? 'Для этого урока пока доступен только исходный PPTX-файл. Его можно скачать и открыть отдельно.'
                  : 'Для этого урока материал ещё не подготовлен.'
              )
        }
      </section>

      <section class="section">
        <div class="section-title">
          <div>
            <p class="eyebrow">Кратко</p>
            <h3>Что внутри материала</h3>
          </div>
          <span class="badge">${escapeHtml(lesson.duration || '00:00')}</span>
        </div>
        <p class="muted">${escapeHtml(lesson.fullDescription || lesson.shortDescription || lesson.description)}</p>
        ${
          lesson.objectives?.length
            ? `
              <div class="objectives">
                ${lesson.objectives.map((objective) => `<span class="objective-pill">${escapeHtml(objective)}</span>`).join('')}
              </div>
            `
            : ''
        }
      </section>
    </section>
  `;

  document.querySelector('#backToPresentationLibrary')?.addEventListener('click', () => {
    navigateToRoute({ tab: 'home', screen: 'presentations' });
  });

  document.querySelector('#backToLessonFromPresentation')?.addEventListener('click', () => {
    navigateToRoute({ tab: 'home', screen: 'lesson', lessonId: lesson.id });
  });

  bindNavigationActions(view);
}

function renderFavorites() {
  const favoriteLessons = getFilteredLessons(
    academyCourse.lessons.filter((lesson) => getLessonProgress(progress, lesson.id)?.isFavorite),
    uiState.favoritesSearch,
    'newest'
  );

  view.innerHTML = `
    <section class="screen-stack">
      <section class="hero-panel hero-panel--favorites">
        <div class="section-title">
          <div>
            <p class="eyebrow">Избранное</p>
            <h2>Сохраненные уроки</h2>
          </div>
          <span class="badge">${favoriteLessons.length}</span>
        </div>
        <p class="muted">Избранное сохраняется независимо от прогресса по курсу и остается доступным в нижней навигации.</p>
      </section>

      <section class="section section--compact">
        <label class="search" for="favoritesSearchInput">
          <input
            id="favoritesSearchInput"
            type="search"
            placeholder="Поиск по избранному"
            value="${escapeHtml(uiState.favoritesSearch)}"
          />
        </label>
      </section>

      <section class="section">
        <div class="lesson-feed">
          ${
            favoriteLessons.length
              ? favoriteLessons.map((lesson) => buildCourseLessonCard(lesson)).join('')
              : buildEmptyState(
                  'Избранное пока пустое',
                  'Добавьте уроки звездочкой из списка курсов, и они появятся здесь.',
                  'Открыть курсы',
                  'courses'
                )
          }
        </div>
      </section>
    </section>
  `;

  document.querySelector('#favoritesSearchInput')?.addEventListener('input', (event) => {
    uiState.favoritesSearch = event.target.value;
    renderFavorites();
  });

  bindNavigationActions(view);
}

function renderBottomTabPlaceholder(tab) {
  view.innerHTML = `
    <section class="screen-stack">
      <section class="hero-panel hero-panel--placeholder">
        <div class="section-title">
          <div>
            <p class="eyebrow">Раздел</p>
            <h2>${escapeHtml(tabTitles[tab] || 'Раздел')}</h2>
          </div>
          <span class="badge">Скоро</span>
        </div>
        <p class="muted">Нижняя навигация сохранена. Этот раздел пока не был частью текущей итерации, но место под него оставлено в существующей архитектуре.</p>
      </section>
    </section>
  `;
}

function getFilteredCategories(query) {
  const categories = getCategories();
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) {
    return categories;
  }

  return categories.filter((category) =>
    [category.title, category.description, category.badge].some((value) =>
      normalizeSearch(value).includes(normalizedQuery)
    )
  );
}

function getCategories() {
  const source =
    Array.isArray(dashboardData.categories) && dashboardData.categories.length
      ? dashboardData.categories
      : defaultCategories;

  return source
    .slice()
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
    .slice(0, 4);
}

function getFilteredLessons(sourceLessons, searchQuery, sortMode) {
  const normalizedQuery = normalizeSearch(searchQuery);
  const filteredLessons = normalizedQuery
    ? sourceLessons.filter((lesson) => matchesLessonSearch(lesson, normalizedQuery))
    : sourceLessons.slice();

  filteredLessons.sort((left, right) => {
    if (sortMode === 'course') {
      return left.order - right.order;
    }

    return getLessonSortValue(right) - getLessonSortValue(left);
  });

  return filteredLessons;
}

function getFilteredPresentations(searchQuery) {
  return getFilteredLessons(
    academyCourse.lessons.filter((lesson) => hasPresentationAsset(lesson)),
    searchQuery,
    'course'
  );
}

function hasPresentationAsset(lesson) {
  return Boolean(getPresentationViewerHref(lesson) || getPresentationSourceHref(lesson));
}

function hasPresentationViewer(lesson) {
  return Boolean(getPresentationViewerHref(lesson));
}

function getPresentationViewerHref(lesson) {
  const presentation = lesson.presentation ?? {};
  return presentation.viewerHref || (presentation.format === 'pdf' ? presentation.href || '' : '');
}

function getPresentationDownloadHref(lesson) {
  const presentation = lesson.presentation ?? {};
  return presentation.downloadHref || getPresentationViewerHref(lesson) || presentation.href || '';
}

function getPresentationDownloadFileName(lesson) {
  const presentation = lesson.presentation ?? {};
  return presentation.downloadFileName || presentation.fileName || 'presentation.pdf';
}

function getPresentationSourceHref(lesson) {
  const presentation = lesson.presentation ?? {};
  return presentation.sourceHref || (presentation.format === 'pptx' ? presentation.href || '' : '');
}

function getPresentationSourceFileName(lesson) {
  const presentation = lesson.presentation ?? {};
  return presentation.sourceFileName || (presentation.format === 'pptx' ? presentation.fileName || '' : '');
}

function buildEmbeddedPdfUrl(href) {
  if (!href) {
    return '';
  }

  return href.includes('#') ? `${href}&view=FitH` : `${href}#view=FitH`;
}

function matchesLessonSearch(lesson, normalizedQuery) {
  return [
    lesson.title,
    lesson.shortDescription,
    lesson.fullDescription,
    lesson.description,
    lesson.speakerName,
    ...(lesson.objectives ?? [])
  ]
    .filter(Boolean)
    .some((value) => normalizeSearch(value).includes(normalizedQuery));
}

function getLessonSortValue(lesson) {
  const timestamp = Date.parse(lesson.publishedAt || lesson.updatedAt || lesson.createdAt || '');
  if (Number.isFinite(timestamp) && timestamp > 0) {
    return timestamp;
  }

  return Number.isFinite(lesson.order) ? lesson.order : 0;
}

function buildHomeCategoryCard(category) {
  const badge = resolveCategoryBadge(category);
  const icon = sectionIcons[category.id] || category.title.slice(0, 2).toUpperCase();
  const interactiveAttrs = category.isActive
    ? `data-open-section="${escapeHtml(category.type)}"`
    : `data-open-placeholder="${escapeHtml(category.id)}"`;

  return `
    <button
      class="tile tile--action ${category.isActive ? '' : 'tile--inactive'}"
      type="button"
      ${interactiveAttrs}
    >
      <span class="tile__icon">${escapeHtml(icon)}</span>
      <div class="count">${escapeHtml(badge)}</div>
      <div class="tile__body">
        <h3>${escapeHtml(category.title)}</h3>
        <p class="muted tile-note">${escapeHtml(category.description)}</p>
      </div>
    </button>
  `;
}

function resolveCategoryBadge(category) {
  if (category.type === 'courses') {
    return String(academyCourse.lessons.length);
  }

  if (category.type === 'presentations') {
    const availablePresentations = academyCourse.lessons.filter((lesson) => hasPresentationAsset(lesson)).length;
    return availablePresentations > 0 ? String(availablePresentations) : 'Go';
  }

  return category.badge || 'Soon';
}

function buildCourseLessonCard(lesson) {
  const lessonProgress = getLessonProgress(progress, lesson.id);
  const status = getLessonStatus(academyCourse, progress, lesson.id);
  const statusInfo = statusMeta[status];
  const testInfo = testStatusMeta[getLessonTestStatus(progress, lesson.id)];

  return `
    <article
      class="lesson-card lesson-card--interactive ${status === 'locked' ? 'lesson-card--locked' : ''}"
      data-open-lesson-card="${escapeHtml(lesson.id)}"
      role="button"
      tabindex="0"
    >
      <div class="lesson-card__cover">
        ${buildGeneratedLessonCover(lesson, 'card')}
        ${renderFavoriteButton(lesson.id, lessonProgress.isFavorite)}
      </div>
      <div class="lesson-card__body">
        <div class="lesson-card__meta">
          <span class="lesson-order">День ${lesson.dayNumber} · Урок ${lesson.lessonNumber}</span>
          <span class="badge">${escapeHtml(lesson.duration || '00:00')}</span>
        </div>
        <div class="lesson-card__header">
          <div>
            <h3>${escapeHtml(lesson.title)}</h3>
            <p class="muted">${escapeHtml(lesson.shortDescription || lesson.description)}</p>
          </div>
        </div>
        <div class="status-row">
          ${renderStatusChip(statusInfo.label, statusInfo.type)}
          ${renderStatusChip(testInfo.label, testInfo.type)}
        </div>
        <p class="card-note">${escapeHtml(getLessonStatusDescription(lesson, lessonProgress))}</p>
      </div>
    </article>
  `;
}

function buildPresentationDaySection(day) {
  return `
    <section class="presentation-day">
      <div class="section-title section-title--compact">
        <div>
          <p class="eyebrow">День ${day.number}</p>
          <h3>${escapeHtml(day.title)}</h3>
        </div>
        <span class="badge">${day.lessons.length}</span>
      </div>
      <div class="lesson-feed">
        ${day.lessons.map((lesson) => buildPresentationCard(lesson)).join('')}
      </div>
    </section>
  `;
}

function buildPresentationCard(lesson) {
  const viewerHref = getPresentationViewerHref(lesson);
  const downloadHref = getPresentationDownloadHref(lesson);
  const downloadFileName = getPresentationDownloadFileName(lesson);
  const isAvailable = Boolean(viewerHref || downloadHref);
  const lessonProgress = getLessonProgress(progress, lesson.id);

  return `
    <article class="lesson-card ${isAvailable ? '' : 'lesson-card--locked'}">
      <div class="lesson-card__body">
        <div class="lesson-card__meta">
          <span class="lesson-order">День ${lesson.dayNumber} · Урок ${lesson.lessonNumber}</span>
          <span class="badge">${escapeHtml(lesson.duration || '00:00')}</span>
        </div>
        <div class="presentation-card__heading">
          <h3>${escapeHtml(lesson.title)}</h3>
          ${renderFavoriteButton(lesson.id, lessonProgress.isFavorite)}
        </div>
        <p class="muted">${escapeHtml(lesson.presentation?.description || lesson.shortDescription || lesson.description)}</p>
        <div class="detail-actions detail-actions--library">
          ${
            isAvailable
              ? `
                <a class="button" href="${escapeHtml(viewerHref || downloadHref)}" target="_blank" rel="noopener">
                  ${escapeHtml(viewerHref ? 'Открыть PDF' : 'Открыть материал')}
                </a>
              `
              : `<button class="button button--disabled" type="button" disabled>Материал скоро</button>`
          }
          ${
            downloadHref
              ? `
                <a
                  class="button button--secondary"
                  href="${escapeHtml(downloadHref)}"
                  download="${escapeHtml(downloadFileName)}"
                >
                  ${escapeHtml(viewerHref ? 'Скачать PDF' : 'Скачать материал')}
                </a>
              `
              : ''
          }
          <button class="button button--secondary ${isAvailable ? '' : 'button--disabled'}" type="button" ${
            isAvailable ? `data-open-lesson="${escapeHtml(lesson.id)}"` : 'disabled'
          }>
            К уроку
          </button>
        </div>
      </div>
    </article>
  `;
}

function getLessonPrimaryVideoSource(lesson) {
  return getLessonVideoItems(lesson)[0]?.src || lesson.video?.src || '';
}

function buildLessonCoverLegacy(lesson, variant) {
  const accent = lesson.cover?.accent || 'bronze';
  const title = lesson.title || 'Урок';
  const badge = lesson.cover?.badge || `Урок ${lesson.order}`;
  const alt = lesson.cover?.alt || `Обложка урока «${title}»`;

  if (lesson.cover?.src) {
    return `
      <div class="lesson-cover lesson-cover--${escapeHtml(variant)} lesson-cover--image">
        <img src="${escapeHtml(lesson.cover.src)}" alt="${escapeHtml(alt)}" />
        <div class="lesson-cover__overlay">
          <span class="cover-badge">${escapeHtml(badge)}</span>
          <strong>${escapeHtml(title)}</strong>
        </div>
      </div>
    `;
  }

  return `
    <div class="lesson-cover lesson-cover--${escapeHtml(variant)} lesson-cover--${escapeHtml(accent)}">
      <div class="lesson-cover__art" aria-hidden="true">
        <span>${escapeHtml(title.slice(0, 1))}</span>
      </div>
      <div class="lesson-cover__overlay">
        <span class="cover-badge">${escapeHtml(badge)}</span>
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(coverAccentLabels[accent] || 'Обложка')}</small>
      </div>
    </div>
  `;
}

function buildLessonCoverFallback(lesson, variant) {
  const accent = lesson.cover?.accent || 'bronze';
  const title = lesson.title || 'РЈСЂРѕРє';
  const badge = lesson.cover?.badge || `РЈСЂРѕРє ${lesson.order}`;
  const alt = lesson.cover?.alt || `РћР±Р»РѕР¶РєР° СѓСЂРѕРєР° В«${title}В»`;
  const previewSource = getLessonPrimaryVideoSource(lesson);
  const fallbackVisual = lesson.cover?.src
    ? `<img class="lesson-cover__fallback-image" src="${escapeHtml(lesson.cover.src)}" alt="${escapeHtml(alt)}" />`
    : `
      <div class="lesson-cover__art" aria-hidden="true">
        <span>${escapeHtml(title.slice(0, 1))}</span>
      </div>
    `;
  const previewImage = previewSource
    ? '<img class="lesson-cover__preview-image" data-video-preview-image src="" alt="" aria-hidden="true" loading="lazy" />'
    : '';

  return `
    <div
      class="lesson-cover lesson-cover--${escapeHtml(variant)} lesson-cover--${escapeHtml(accent)} lesson-cover--preview"
      ${previewSource ? `data-video-preview-src="${escapeHtml(previewSource)}"` : ''}
    >
      <div class="lesson-cover__visual">
        ${fallbackVisual}
        ${previewImage}
      </div>
      <div class="lesson-cover__overlay">
        <span class="cover-badge">${escapeHtml(badge)}</span>
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(coverAccentLabels[accent] || 'РћР±Р»РѕР¶РєР°')}</small>
      </div>
    </div>
  `;
}

function buildVideoPlaylistPreview(lesson, videoItem) {
  const fallbackImage = lesson.cover?.src || '';
  const fallbackVisual = fallbackImage
    ? `<img class="video-playlist__fallback-image" src="${escapeHtml(fallbackImage)}" alt="" aria-hidden="true" />`
    : `<span class="video-playlist__fallback-badge">${escapeHtml(String(videoItem.order).padStart(2, '0'))}</span>`;
  const previewImage = videoItem.src
    ? '<img class="video-playlist__preview-image" data-video-preview-image src="" alt="" aria-hidden="true" loading="lazy" />'
    : '';

  return `
    <span
      class="video-playlist__preview"
      ${videoItem.src ? `data-video-preview-src="${escapeHtml(videoItem.src)}"` : ''}
      aria-hidden="true"
    >
      ${fallbackVisual}
      ${previewImage}
      <span class="video-playlist__play-indicator"></span>
    </span>
  `;
}

function buildLessonCover(lesson, variant) {
  const accent = lesson.cover?.accent || 'bronze';
  const title = lesson.title || '\u0423\u0440\u043e\u043a';
  const badge = lesson.cover?.badge || `\u0423\u0440\u043e\u043a ${lesson.order}`;
  const alt = lesson.cover?.alt || `\u041e\u0431\u043b\u043e\u0436\u043a\u0430 \u0443\u0440\u043e\u043a\u0430 \u00ab${title}\u00bb`;
  const previewSource = getLessonPrimaryVideoSource(lesson);
  const fallbackVisual = lesson.cover?.src
    ? `<img class="lesson-cover__fallback-image" src="${escapeHtml(lesson.cover.src)}" alt="${escapeHtml(alt)}" />`
    : `
      <div class="lesson-cover__art" aria-hidden="true">
        <span>${escapeHtml(title.slice(0, 1))}</span>
      </div>
    `;
  const previewImage = previewSource
    ? '<img class="lesson-cover__preview-image" data-video-preview-image src="" alt="" aria-hidden="true" loading="lazy" />'
    : '';

  return `
    <div
      class="lesson-cover lesson-cover--${escapeHtml(variant)} lesson-cover--${escapeHtml(accent)} lesson-cover--preview"
      ${previewSource ? `data-video-preview-src="${escapeHtml(previewSource)}"` : ''}
    >
      <div class="lesson-cover__visual">
        ${fallbackVisual}
        ${previewImage}
      </div>
      <div class="lesson-cover__overlay">
        <span class="cover-badge">${escapeHtml(badge)}</span>
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(coverAccentLabels[accent] || '\u041e\u0431\u043b\u043e\u0436\u043a\u0430')}</small>
      </div>
    </div>
  `;
}

const generatedLessonPreviewCache = new Map();
const generatedLessonPreviewPalettes = {
  bronze: {
    base: '#141821',
    glow: '#cb9d61',
    accent: '#f2c98a',
    secondary: '#8d633d',
    chip: '#f5ddb5'
  },
  sand: {
    base: '#19161b',
    glow: '#d5b58a',
    accent: '#f4e1c4',
    secondary: '#8f6f52',
    chip: '#f4dfbf'
  },
  olive: {
    base: '#141a1a',
    glow: '#7fa683',
    accent: '#d8e6cb',
    secondary: '#4d6e59',
    chip: '#d7e7cd'
  },
  charcoal: {
    base: '#141720',
    glow: '#7d8da7',
    accent: '#dde2eb',
    secondary: '#485465',
    chip: '#e2e7ef'
  }
};

const generatedLessonThemePresets = [
  { label: 'Продажи', keywords: ['продаж', 'цены', 'сделк', 'возраж', 'удержан', 'продукт'] },
  { label: 'Клиент', keywords: ['клиент', 'контакт', 'потребност', 'встреч', 'консульт'] },
  { label: 'Аппарат', keywords: ['аппарат', 'технолог', 'режим', 'параметр', 'настрой'] },
  { label: 'Практика', keywords: ['процедур', 'зон', 'реакц', 'ошиб', 'мастер'] },
  { label: 'Бренд', keywords: ['бренд', 'ценност', 'компан', 'стандарт'] },
  { label: 'Старт', keywords: ['привет', 'ввод', 'итог', 'экзам', 'задание', 'подготов'] }
];

function buildGeneratedLessonCover(lesson, variant) {
  const title = lesson.title || 'Урок';
  const badge = lesson.cover?.badge || `Урок ${lesson.order}`;
  const alt = lesson.cover?.alt || `Обложка урока «${title}»`;
  const previewUrl = getGeneratedLessonPreviewDataUrl(lesson, { variant });

  return `
    <div class="lesson-cover lesson-cover--${escapeHtml(variant)} lesson-cover--image">
      <img src="${escapeHtml(previewUrl)}" alt="${escapeHtml(alt)}" />
      <div class="lesson-cover__overlay">
        <span class="cover-badge">${escapeHtml(badge)}</span>
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(resolveGeneratedLessonThemeLabel(lesson))}</small>
      </div>
    </div>
  `;
}

function buildGeneratedVideoPlaylistPreview(lesson, videoItem) {
  const previewUrl = getGeneratedLessonPreviewDataUrl(lesson, {
    variant: 'playlist',
    videoItem,
    compact: true
  });

  return `
    <span class="video-playlist__preview" aria-hidden="true">
      <img class="video-playlist__preview-image" src="${escapeHtml(previewUrl)}" alt="" />
      <span class="video-playlist__play-indicator"></span>
    </span>
  `;
}

function getGeneratedLessonPreviewDataUrl(lesson, options = {}) {
  const key = [
    options.variant || 'card',
    options.compact ? 'compact' : 'regular',
    lesson.id,
    lesson.title || '',
    lesson.shortDescription || '',
    lesson.cover?.accent || '',
    options.videoItem?.id || '',
    options.videoItem?.title || ''
  ].join('::');

  if (generatedLessonPreviewCache.has(key)) {
    return generatedLessonPreviewCache.get(key);
  }

  const previewUrl = createGeneratedLessonPreviewDataUrl(lesson, options);
  generatedLessonPreviewCache.set(key, previewUrl);
  return previewUrl;
}

function createGeneratedLessonPreviewDataUrl(lesson, options = {}) {
  const compact = Boolean(options.compact);
  const playerVariant = options.variant === 'player';
  const palette =
    generatedLessonPreviewPalettes[lesson.cover?.accent || 'bronze'] || generatedLessonPreviewPalettes.bronze;
  const title = (options.videoItem?.title || lesson.title || 'Урок').trim();
  const subtitle = (lesson.shortDescription || lesson.description || '').trim();
  const themeLabel = resolveGeneratedLessonThemeLabel(lesson);
  const titleLines = splitGeneratedPreviewLines(title, compact ? 18 : 22, compact ? 2 : 3);
  const subtitleLines = splitGeneratedPreviewLines(subtitle, compact ? 28 : 38, compact ? 1 : 2);
  const titleFontSize = compact ? 38 : options.variant === 'hero' ? 58 : 50;
  const subtitleFontSize = compact ? 18 : 22;
  const chipFontSize = compact ? 18 : 20;
  const titleMarkup = titleLines
    .map(
      (line, index) =>
        `<tspan x="76" dy="${index === 0 ? 0 : Math.round(titleFontSize * 1.06)}">${escapeSvgContent(line)}</tspan>`
    )
    .join('');
  const subtitleMarkup = subtitleLines
    .map(
      (line, index) =>
        `<tspan x="76" dy="${index === 0 ? 0 : Math.round(subtitleFontSize * 1.24)}">${escapeSvgContent(line)}</tspan>`
    )
    .join('');

  if (playerVariant) {
    const artOnlySvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" role="img" aria-label="${escapeSvgContent(title)}">
        <defs>
          <linearGradient id="playerBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${palette.base}" />
            <stop offset="56%" stop-color="${palette.secondary}" />
            <stop offset="100%" stop-color="${palette.base}" />
          </linearGradient>
          <radialGradient id="playerGlowA" cx="22%" cy="18%" r="60%">
            <stop offset="0%" stop-color="${palette.glow}" stop-opacity="0.62" />
            <stop offset="100%" stop-color="${palette.glow}" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="playerGlowB" cx="82%" cy="18%" r="54%">
            <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.32" />
            <stop offset="100%" stop-color="${palette.accent}" stop-opacity="0" />
          </radialGradient>
          <linearGradient id="playerSheen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="rgba(255,255,255,0.18)" />
            <stop offset="100%" stop-color="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <rect width="1200" height="675" rx="36" fill="url(#playerBg)" />
        <rect x="18" y="18" width="1164" height="639" rx="30" fill="rgba(10,12,16,0.08)" stroke="rgba(255,255,255,0.08)" />
        <circle cx="248" cy="124" r="296" fill="url(#playerGlowA)" />
        <circle cx="972" cy="112" r="256" fill="url(#playerGlowB)" />
        <path d="M93 498C223 410 347 383 493 397C657 413 771 505 945 503C1017 502 1086 485 1146 451" fill="none" stroke="${palette.accent}" stroke-opacity="0.26" stroke-width="26" stroke-linecap="round" />
        <path d="M112 222C254 188 333 220 435 298C548 384 639 421 761 417C853 414 941 375 1086 268" fill="none" stroke="rgba(255,255,255,0.09)" stroke-width="16" stroke-linecap="round" />
        <circle cx="600" cy="340" r="128" fill="rgba(11,13,17,0.18)" stroke="rgba(255,255,255,0.08)" />
        <circle cx="600" cy="340" r="92" fill="rgba(11,13,17,0.42)" stroke="rgba(255,255,255,0.14)" />
        <polygon points="572,289 572,391 656,340" fill="rgba(255,255,255,0.92)" />
        <rect x="94" y="90" width="188" height="18" rx="9" fill="rgba(255,255,255,0.12)" />
        <rect x="94" y="122" width="122" height="12" rx="6" fill="rgba(255,255,255,0.09)" />
        <rect x="958" y="92" width="148" height="18" rx="9" fill="rgba(255,255,255,0.1)" />
        <rect x="990" y="124" width="116" height="12" rx="6" fill="rgba(255,255,255,0.08)" />
        <rect x="94" y="562" width="236" height="16" rx="8" fill="rgba(255,255,255,0.1)" />
        <rect x="94" y="594" width="170" height="12" rx="6" fill="rgba(255,255,255,0.08)" />
        <rect x="864" y="550" width="242" height="42" rx="21" fill="rgba(7,10,14,0.22)" stroke="rgba(255,255,255,0.12)" />
        <rect x="892" y="565" width="86" height="12" rx="6" fill="rgba(255,255,255,0.14)" />
        <rect x="992" y="565" width="86" height="12" rx="6" fill="rgba(255,255,255,0.09)" />
        <path d="M18 18H1182V173C1072 112 949 84 809 92C666 101 542 151 410 150C281 149 157 102 18 46V18Z" fill="url(#playerSheen)" />
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(artOnlySvg)}`;

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" role="img" aria-label="${escapeSvgContent(title)}">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${palette.base}" />
            <stop offset="56%" stop-color="${palette.secondary}" />
            <stop offset="100%" stop-color="${palette.base}" />
          </linearGradient>
          <radialGradient id="glowA" cx="22%" cy="18%" r="60%">
            <stop offset="0%" stop-color="${palette.glow}" stop-opacity="0.62" />
            <stop offset="100%" stop-color="${palette.glow}" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="glowB" cx="82%" cy="18%" r="54%">
            <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.32" />
            <stop offset="100%" stop-color="${palette.accent}" stop-opacity="0" />
          </radialGradient>
          <linearGradient id="sheen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="rgba(255,255,255,0.18)" />
            <stop offset="100%" stop-color="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <rect width="1200" height="675" rx="36" fill="url(#bg)" />
        <rect x="18" y="18" width="1164" height="639" rx="30" fill="rgba(10,12,16,0.08)" stroke="rgba(255,255,255,0.08)" />
        <circle cx="248" cy="124" r="296" fill="url(#glowA)" />
        <circle cx="972" cy="112" r="256" fill="url(#glowB)" />
        <path d="M93 498C223 410 347 383 493 397C657 413 771 505 945 503C1017 502 1086 485 1146 451" fill="none" stroke="${palette.accent}" stroke-opacity="0.26" stroke-width="26" stroke-linecap="round" />
        <text x="106" y="103" fill="${palette.chip}" font-size="20" font-weight="700" font-family="Segoe UI, Arial, sans-serif" letter-spacing="1.2">${escapeSvgContent(
          themeLabel.toUpperCase()
        )}</text>
        <rect x="904" y="68" width="220" height="54" rx="27" fill="rgba(7,10,14,0.22)" stroke="rgba(255,255,255,0.12)" />
        <text x="938" y="103" fill="rgba(255,255,255,0.84)" font-size="20" font-weight="600" font-family="Segoe UI, Arial, sans-serif">${escapeSvgContent(
          `День ${lesson.dayNumber} • Урок ${lesson.lessonNumber}`
        )}</text>
        <circle cx="600" cy="340" r="92" fill="rgba(11,13,17,0.42)" stroke="rgba(255,255,255,0.14)" />
        <polygon points="572,289 572,391 656,340" fill="rgba(255,255,255,0.92)" />
        <rect x="76" y="521" width="430" height="58" rx="29" fill="rgba(7,10,14,0.26)" stroke="rgba(255,255,255,0.12)" />
        <text x="108" y="558" fill="rgba(255,255,255,0.88)" font-size="26" font-weight="700" font-family="Segoe UI, Arial, sans-serif">${escapeSvgContent(
          title.slice(0, 34)
        )}</text>
        <text x="76" y="623" fill="rgba(255,255,255,0.38)" font-size="20" font-weight="600" font-family="Segoe UI, Arial, sans-serif" letter-spacing="2.2">ANNAELLE ACADEMY</text>
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" role="img" aria-label="${escapeSvgContent(title)}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette.base}" />
          <stop offset="52%" stop-color="${palette.secondary}" />
          <stop offset="100%" stop-color="${palette.base}" />
        </linearGradient>
        <radialGradient id="glowA" cx="22%" cy="18%" r="60%">
          <stop offset="0%" stop-color="${palette.glow}" stop-opacity="0.58" />
          <stop offset="100%" stop-color="${palette.glow}" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="glowB" cx="95%" cy="8%" r="60%">
          <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.3" />
          <stop offset="100%" stop-color="${palette.accent}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="675" rx="36" fill="url(#bg)" />
      <rect x="18" y="18" width="1164" height="639" rx="30" fill="rgba(10,12,16,0.08)" stroke="rgba(255,255,255,0.08)" />
      <circle cx="248" cy="124" r="296" fill="url(#glowA)" />
      <circle cx="1040" cy="92" r="270" fill="url(#glowB)" />
      <circle cx="1010" cy="590" r="210" fill="${palette.glow}" fill-opacity="0.1" />
      <rect x="76" y="68" width="220" height="54" rx="27" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.16)" />
      <text x="106" y="103" fill="${palette.chip}" font-size="${chipFontSize}" font-weight="700" font-family="Segoe UI, Arial, sans-serif" letter-spacing="1.2">${escapeSvgContent(
        themeLabel.toUpperCase()
      )}</text>
      <rect x="918" y="68" width="206" height="54" rx="27" fill="rgba(7,10,14,0.22)" stroke="rgba(255,255,255,0.12)" />
      <text x="950" y="103" fill="rgba(255,255,255,0.84)" font-size="${chipFontSize}" font-weight="600" font-family="Segoe UI, Arial, sans-serif">${escapeSvgContent(
        `День ${lesson.dayNumber} • Урок ${lesson.lessonNumber}`
      )}</text>
      <text x="76" y="206" fill="rgba(255,255,255,0.96)" font-size="${titleFontSize}" font-weight="800" font-family="Segoe UI, Arial, sans-serif">${titleMarkup}</text>
      <text x="76" y="${compact ? 402 : 448}" fill="rgba(247,241,232,0.8)" font-size="${subtitleFontSize}" font-weight="500" font-family="Segoe UI, Arial, sans-serif">${subtitleMarkup}</text>
      <rect x="76" y="553" width="324" height="46" rx="23" fill="rgba(7,10,14,0.26)" stroke="rgba(255,255,255,0.12)" />
      <text x="104" y="583" fill="rgba(255,255,255,0.78)" font-size="20" font-weight="600" font-family="Segoe UI, Arial, sans-serif">Annaelle Academy</text>
      <text x="76" y="633" fill="rgba(255,255,255,0.34)" font-size="18" font-weight="600" font-family="Segoe UI, Arial, sans-serif" letter-spacing="2.4">PREMIUM LEARNING</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function resolveGeneratedLessonThemeLabel(lesson) {
  const haystack = `${lesson.title || ''} ${lesson.shortDescription || ''} ${lesson.description || ''}`.toLowerCase();
  const preset = generatedLessonThemePresets.find((item) =>
    item.keywords.some((keyword) => haystack.includes(keyword))
  );

  return preset?.label || 'Академия';
}

function splitGeneratedPreviewLines(text, maxChars, maxLines) {
  const normalized = String(text || '')
    .replace(/\s+/gu, ' ')
    .trim();

  if (!normalized) {
    return ['Annaelle Academy'];
  }

  const words = normalized.split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxChars) {
      currentLine = candidate;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
    }
    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  const limitedLines = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    const lastIndex = limitedLines.length - 1;
    limitedLines[lastIndex] = `${limitedLines[lastIndex].slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
  }

  return limitedLines;
}

function escapeSvgContent(value) {
  return String(value)
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;');
}

function buildFinalExamTeaser(summary) {
  return `
    <section class="section ${summary.readyForFinalExam ? '' : 'section--locked'}">
      <div class="section-title">
        <div>
          <p class="eyebrow">Итог курса</p>
          <h3>${escapeHtml(academyCourse.finalExam.title)}</h3>
        </div>
        <span class="badge">${academyCourse.finalExam.questions.length} вопросов</span>
      </div>
      <p class="muted">${escapeHtml(academyCourse.finalExam.description)}</p>
      <div class="status-row">
        ${renderStatusChip(summary.readyForFinalExam ? 'Экзамен доступен' : 'Пока заблокирован', summary.readyForFinalExam ? 'success' : 'muted')}
        ${renderStatusChip(progress.finalExam.passed ? 'Сдан' : 'Не сдан', progress.finalExam.passed ? 'success' : 'muted')}
      </div>
      <div class="hero-actions">
        <button class="button ${summary.readyForFinalExam ? '' : 'button--disabled'}" type="button" ${
          summary.readyForFinalExam ? 'data-open-final-exam' : 'disabled'
        }>
          ${summary.readyForFinalExam ? 'Открыть итоговый экзамен' : 'Сначала завершите уроки'}
        </button>
      </div>
    </section>
  `;
}

function buildEmptyState(title, description, actionLabel = '', action = '') {
  return `
    <article class="empty-state">
      <div>
        <h3>${escapeHtml(title)}</h3>
        <p class="muted">${escapeHtml(description)}</p>
      </div>
      ${
        actionLabel && action
          ? `<button class="button button--secondary" type="button" data-empty-action="${escapeHtml(action)}">${escapeHtml(actionLabel)}</button>`
          : ''
      }
    </article>
  `;
}

function getLessonStatusDescription(lesson, lessonProgress) {
  const status = getLessonStatus(academyCourse, progress, lesson.id);

  if (status === 'completed') {
    const nextLesson = academyCourse.lessons.find((item) => item.order === lesson.order + 1);
    return nextLesson
      ? `Урок завершен. Следующий урок «${nextLesson.title}» уже открыт.`
      : 'Урок завершен. Все этапы урока пройдены, можно переходить к итоговой проверке.';
  }

  if (status === 'watched') {
    return 'Видео засчитано. Чтобы завершить урок и открыть следующий, нужно успешно пройти тест.';
  }

  if (status === 'locked') {
    return getLessonUnlockReason(academyCourse, progress, lesson.id);
  }

  return 'Урок открыт. Полностью посмотрите видео и после этого переходите к тесту.';
}

function renderFavoriteButton(lessonId, isFavorite) {
  return `
    <button
      class="favorite-button ${isFavorite ? 'favorite-button--active' : ''}"
      type="button"
      data-toggle-favorite="${escapeHtml(lessonId)}"
      aria-label="${escapeHtml(isFavorite ? 'Убрать из избранного' : 'Добавить в избранное')}"
    >
      ${isFavorite ? '★' : '☆'}
    </button>
  `;
}

function bindHomeActions() {
  document.querySelector('#homeSearchInput')?.addEventListener('input', (event) => {
    uiState.homeSearch = event.target.value;
    renderHome();
  });

  document.querySelectorAll('[data-open-section]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.openSection;
      if (target === 'courses') {
        navigateToRoute({ tab: 'home', screen: 'courses' });
        return;
      }

      if (target === 'presentations') {
        navigateToRoute({ tab: 'home', screen: 'presentations' });
      }
    });
  });

  document.querySelectorAll('[data-open-placeholder]').forEach((button) => {
    button.addEventListener('click', () => {
      showToast('Раздел скоро появится.');
    });
  });
}

function bindNavigationActions(scope) {
  bindFavoriteActions(scope);

  scope.querySelectorAll('[data-open-lesson-card]').forEach((card) => {
    card.addEventListener('click', (event) => {
      if (event.target.closest('[data-toggle-favorite]')) {
        return;
      }

      openLessonFromDataset(card.dataset.openLessonCard);
    });

    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openLessonFromDataset(card.dataset.openLessonCard);
      }
    });
  });

  scope.querySelectorAll('[data-open-lesson]').forEach((button) => {
    button.addEventListener('click', () => {
      openLessonFromDataset(button.dataset.openLesson);
    });
  });

  scope.querySelectorAll('[data-open-player]').forEach((button) => {
    button.addEventListener('click', () => {
      const lessonId = button.dataset.openPlayer;
      if (lessonId) {
        navigateToRoute({ tab: 'home', screen: 'player', lessonId });
      }
    });
  });

  scope.querySelectorAll('[data-open-test]').forEach((button) => {
    button.addEventListener('click', () => {
      const lessonId = button.dataset.openTest;
      if (!lessonId) {
        return;
      }

      const lessonProgress = getLessonProgress(progress, lessonId);
      if (!lessonProgress?.videoCompleted) {
        showToast('Тест станет доступен только после полного просмотра видео.');
        return;
      }

      navigateToRoute({ tab: 'home', screen: 'test', lessonId });
    });
  });

  scope.querySelectorAll('[data-open-final-exam]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!canOpenFinalExam(progress)) {
        showToast('Итоговый экзамен откроется после завершения всех уроков и тестов.');
        return;
      }

      navigateToRoute({ tab: 'home', screen: 'final-exam' });
    });
  });

  scope.querySelectorAll('[data-empty-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.emptyAction;
      if (action === 'courses') {
        navigateToRoute({ tab: 'home', screen: 'courses' });
      }
    });
  });
}

function bindFavoriteActions(scope) {
  scope.querySelectorAll('[data-toggle-favorite]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const lessonId = button.dataset.toggleFavorite;
      if (!lessonId) {
        return;
      }

      progress = toggleLessonFavorite(academyCourse, progress, lessonId);
      renderCurrentRoute();
    });
  });
}

function openLessonFromDataset(lessonId) {
  if (!lessonId) {
    return;
  }

  if (!isLessonAccessible(academyCourse, progress, lessonId)) {
    showToast(getLessonUnlockReason(academyCourse, progress, lessonId));
    return;
  }

  navigateToRoute({ tab: 'home', screen: 'lesson', lessonId });
}

function hydrateVideoPreviewElements(scope) {
  const previewNodes = Array.from(scope.querySelectorAll('[data-video-preview-src]'));
  videoPreviewObserver?.disconnect();
  videoPreviewObserver = null;

  if (previewNodes.length === 0) {
    return;
  }

  if (!('IntersectionObserver' in window)) {
    previewNodes.forEach((node) => {
      requestVideoPreviewForElement(node);
    });
    return;
  }

  videoPreviewObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        observer.unobserve(entry.target);
        requestVideoPreviewForElement(entry.target);
      });
    },
    {
      rootMargin: '180px 0px'
    }
  );

  previewNodes.forEach((node) => {
    if (node instanceof HTMLVideoElement) {
      requestVideoPreviewForElement(node);
      return;
    }

    videoPreviewObserver.observe(node);
  });
}

function requestVideoPreviewForElement(node) {
  const previewSource = node.dataset.videoPreviewSrc?.trim();
  if (!previewSource || node.dataset.videoPreviewState === 'loading' || node.dataset.videoPreviewState === 'ready') {
    return;
  }

  const cachedPreview = videoPreviewCache.get(previewSource);
  if (typeof cachedPreview === 'string' && cachedPreview) {
    applyVideoPreview(node, cachedPreview);
    return;
  }

  if (cachedPreview === null) {
    node.dataset.videoPreviewState = 'failed';
    return;
  }

  node.dataset.videoPreviewState = 'loading';
  requestVideoPreview(previewSource).then((previewUrl) => {
    if (!node.isConnected) {
      return;
    }

    if (!previewUrl) {
      node.dataset.videoPreviewState = 'failed';
      return;
    }

    applyVideoPreview(node, previewUrl);
  });
}

function requestVideoPreview(previewSource) {
  const cachedPreview = videoPreviewCache.get(previewSource);
  if (typeof cachedPreview === 'string' || cachedPreview === null) {
    return Promise.resolve(cachedPreview);
  }

  if (cachedPreview) {
    return cachedPreview;
  }

  const pendingPreview = extractVideoPreviewFrame(previewSource)
    .then((previewUrl) => {
      const resolvedPreview = previewUrl || null;
      videoPreviewCache.set(previewSource, resolvedPreview);
      return resolvedPreview;
    })
    .catch(() => {
      videoPreviewCache.set(previewSource, null);
      return null;
    });

  videoPreviewCache.set(previewSource, pendingPreview);
  return pendingPreview;
}

function extractVideoPreviewFrame(previewSource) {
  return new Promise((resolve) => {
    const previewVideo = document.createElement('video');
    let settled = false;

    const finish = (result) => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeoutId);
      previewVideo.pause();
      previewVideo.removeAttribute('src');
      previewVideo.load();
      resolve(result);
    };

    const captureFrame = () => {
      try {
        const sourceWidth = previewVideo.videoWidth || 0;
        const sourceHeight = previewVideo.videoHeight || 0;
        if (!sourceWidth || !sourceHeight) {
          finish(null);
          return;
        }

        const targetWidth = Math.min(sourceWidth, 480);
        const targetHeight = Math.max(1, Math.round((targetWidth / sourceWidth) * sourceHeight));
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const context = canvas.getContext('2d');
        if (!context) {
          finish(null);
          return;
        }

        context.drawImage(previewVideo, 0, 0, targetWidth, targetHeight);
        finish(canvas.toDataURL('image/jpeg', 0.76));
      } catch {
        finish(null);
      }
    };

    const timeoutId = window.setTimeout(() => {
      finish(null);
    }, 7000);

    previewVideo.muted = true;
    previewVideo.playsInline = true;
    previewVideo.preload = 'metadata';
    previewVideo.crossOrigin = 'anonymous';

    previewVideo.addEventListener('loadeddata', captureFrame, { once: true });
    previewVideo.addEventListener('error', () => finish(null), { once: true });

    previewVideo.src = previewSource;
    previewVideo.load();
  });
}

function applyVideoPreview(node, previewUrl) {
  node.dataset.videoPreviewState = 'ready';
  node.classList.add('is-ready');

  if (node instanceof HTMLVideoElement) {
    node.poster = previewUrl;
    return;
  }

  const previewImage = node.querySelector('[data-video-preview-image]');
  if (previewImage) {
    previewImage.src = previewUrl;
  }
}

function getVideoItemProgress(lessonProgress, videoId) {
  return {
    watchRatio: 0,
    lastKnownDurationSeconds: 0,
    furthestTimeSeconds: 0,
    completed: false,
    completedAt: null,
    ...(lessonProgress.videoParts?.[videoId] ?? {})
  };
}

function isVideoItemUnlocked(videoItems, lessonProgress, videoId) {
  const targetIndex = videoItems.findIndex((item) => item.id === videoId);
  if (targetIndex <= 0) {
    return targetIndex === 0;
  }

  return videoItems
    .slice(0, targetIndex)
    .every((item) => getVideoItemProgress(lessonProgress, item.id).completed);
}

function getActiveVideoItem(lesson, lessonProgress) {
  const videoItems = getLessonVideoItems(lesson);
  return (
    videoItems.find((item) => item.id === lessonProgress.activeVideoId) ??
    videoItems.find((item) => isVideoItemUnlocked(videoItems, lessonProgress, item.id)) ??
    videoItems[0]
  );
}

function getVideoItemStatus(videoItems, lessonProgress, videoItem) {
  const partProgress = getVideoItemProgress(lessonProgress, videoItem.id);
  if (partProgress.completed) {
    return { label: 'Просмотрено', type: 'success', state: 'completed' };
  }

  if (isVideoItemUnlocked(videoItems, lessonProgress, videoItem.id)) {
    return { label: 'Доступно', type: 'warning', state: 'available' };
  }

  return { label: 'Заблокировано', type: 'muted', state: 'locked' };
}

function getVideoProgressWeight(videoItem, partProgress) {
  return Math.max(videoItem.durationSeconds || 0, partProgress.lastKnownDurationSeconds || 0, 1);
}

function getVideoProgressSummary(lesson, lessonProgress, overrides = {}) {
  const videoItems = getLessonVideoItems(lesson);
  let totalWeight = 0;
  let watchedWeight = 0;
  let completedCount = 0;

  videoItems.forEach((item) => {
    const baseProgress = getVideoItemProgress(lessonProgress, item.id);
    const override = overrides[item.id] ?? {};
    const watchRatio = clampValue(override.watchRatio ?? baseProgress.watchRatio, 0, 1);
    const lastKnownDurationSeconds = clampValue(
      override.lastKnownDurationSeconds ?? baseProgress.lastKnownDurationSeconds,
      0,
      Number.MAX_SAFE_INTEGER
    );
    const completed = Boolean(override.completed ?? baseProgress.completed);
    const weight = getVideoProgressWeight(item, {
      ...baseProgress,
      lastKnownDurationSeconds
    });

    totalWeight += weight;
    watchedWeight += completed ? weight : weight * watchRatio;
    if (completed) {
      completedCount += 1;
    }
  });

  const watchRatio =
    totalWeight > 0
      ? watchedWeight / totalWeight
      : videoItems.length > 0
        ? completedCount / videoItems.length
        : 0;

  return {
    watchRatio: completedCount === videoItems.length && videoItems.length > 0 ? 1 : watchRatio,
    completedCount,
    totalCount: videoItems.length
  };
}

function buildLessonPlaybackSection(lesson, lessonProgress) {
  const videoItems = getLessonVideoItems(lesson);
  const activeVideo = getActiveVideoItem(lesson, lessonProgress);
  const activeVideoProgress = getVideoItemProgress(lessonProgress, activeVideo.id);
  const summary = getVideoProgressSummary(lesson, lessonProgress);
  const overallProgressPercent = Math.round(summary.watchRatio * 100);
  const activeProgressPercent = Math.round(activeVideoProgress.watchRatio * 100);
  const thresholdPercent = Math.round((activeVideo.completionThreshold ?? 1) * 100);
  const seekProtectionNotice = buildVideoSeekProtectionNotice(activeVideoProgress);
  const videoFormatNotice = buildVideoFormatNotice(activeVideo.src);
  const hasSequence = videoItems.length > 1;
  const sequenceBadge = `${summary.completedCount}/${summary.totalCount}`;
  const lessonFlowNotice = lessonProgress.videoCompleted
    ? 'Видео засчитано. Тест уже открыт, а урок можно спокойно пересмотреть еще раз.'
    : `Тест откроется только после честного просмотра ${thresholdPercent}% видео. Перемотка вперед и ускорение остаются заблокированными.`;

  return `
    ${
      hasSequence
        ? `
          <section class="section lesson-playback-section" id="videoPanel">
            <div class="section-title section-title--compact">
              <div>
                <p class="eyebrow">Порядок урока</p>
                <h3>Следующие видео</h3>
              </div>
              <span class="badge">${sequenceBadge}</span>
            </div>

            <div class="video-playlist" role="tablist" aria-label="Последовательность видео урока">
              ${videoItems
                .map((videoItem) => {
                  const status = getVideoItemStatus(videoItems, lessonProgress, videoItem);
                  const isActive = videoItem.id === activeVideo.id;
                  const disabled = status.state === 'locked';

                  return `
                    <button
                      class="video-playlist__item ${isActive ? 'video-playlist__item--active' : ''} ${
                        status.state === 'completed' ? 'video-playlist__item--completed' : ''
                      } ${status.state === 'locked' ? 'video-playlist__item--locked' : ''}"
                      type="button"
                      data-select-video="${escapeHtml(videoItem.id)}"
                      ${disabled ? 'disabled' : ''}
                    >
                      <span class="video-playlist__body">
                        ${buildGeneratedVideoPlaylistPreview(lesson, videoItem)}
                        <span class="video-playlist__meta">
                          <span class="video-playlist__order">Видео ${videoItem.order}</span>
                          <strong>${escapeHtml(videoItem.title)}</strong>
                          <span class="muted">${escapeHtml(videoItem.durationLabel || 'Длительность уточняется')}</span>
                        </span>
                      </span>
                      ${renderStatusChip(status.label, status.type)}
                    </button>
                  `;
                })
                .join('')}
            </div>
          </section>
        `
        : ''
    }

    <section class="section lesson-playback-section lesson-playback-section--summary">
      <div class="notice ${lessonProgress.videoCompleted ? 'notice--success' : 'notice--soft'}">
        ${escapeHtml(lessonFlowNotice)}
      </div>
      ${videoFormatNotice}
    </section>
  `;

  return `
    <section class="section lesson-playback-section" id="videoPanel">
      <div class="section-title">
        <div>
          <p class="eyebrow">Видеоматериалы</p>
          <h3>Видео идут по порядку урока</h3>
        </div>
        <span class="badge">${overallProgressPercent}%</span>
      </div>

      <div class="video-playlist" role="tablist" aria-label="Последовательность видео урока">
        ${videoItems
          .map((videoItem) => {
            const status = getVideoItemStatus(videoItems, lessonProgress, videoItem);
            const isActive = videoItem.id === activeVideo.id;
            const disabled = status.state === 'locked';

            return `
              <button
                class="video-playlist__item ${isActive ? 'video-playlist__item--active' : ''} ${
                  status.state === 'completed' ? 'video-playlist__item--completed' : ''
                } ${status.state === 'locked' ? 'video-playlist__item--locked' : ''}"
                type="button"
                data-select-video="${escapeHtml(videoItem.id)}"
                ${disabled ? 'disabled' : ''}
              >
                <span class="video-playlist__body">
                  ${buildGeneratedVideoPlaylistPreview(lesson, videoItem)}
                  <span class="video-playlist__meta">
                    <span class="video-playlist__order">Видео ${videoItem.order}</span>
                    <strong>${escapeHtml(videoItem.title)}</strong>
                    <span class="muted">${escapeHtml(videoItem.durationLabel || 'Длительность уточняется')}</span>
                  </span>
                </span>
                ${renderStatusChip(status.label, status.type)}
              </button>
            `;
          })
          .join('')}
      </div>

      <div class="video-progress-stack">
        <div class="video-progress-line">
          <span class="video-progress-line__label">Текущее видео</span>
          <div class="inline-progress">
            <div class="progress progress--thin">
              <span id="videoProgressFill" style="width: ${activeProgressPercent}%"></span>
            </div>
            <span class="progress-caption" id="videoProgressCaption">${activeProgressPercent}%</span>
          </div>
        </div>
        <div class="video-progress-line">
          <span class="video-progress-line__label">Общий прогресс блока</span>
          <div class="inline-progress">
            <div class="progress progress--thin">
              <span id="videoOverallProgressFill" style="width: ${overallProgressPercent}%"></span>
            </div>
            <span class="progress-caption" id="videoOverallProgressCaption">${overallProgressPercent}%</span>
          </div>
        </div>
      </div>

      <p class="muted">
        Видео считается завершенным после ${thresholdPercent}% воспроизведения. Перемотка вперед открывается только в пределах уже просмотренного фрагмента.
      </p>
      ${seekProtectionNotice}
      ${videoFormatNotice}
    </section>
  `;
}

function buildVideoPanel(lesson, lessonProgress) {
  const videoItems = getLessonVideoItems(lesson);
  const activeVideo = getActiveVideoItem(lesson, lessonProgress);
  const activeVideoProgress = getVideoItemProgress(lessonProgress, activeVideo.id);
  const summary = getVideoProgressSummary(lesson, lessonProgress);
  const overallProgressPercent = Math.round(summary.watchRatio * 100);
  const activeProgressPercent = Math.round(activeVideoProgress.watchRatio * 100);
  const thresholdPercent = Math.round((activeVideo.completionThreshold ?? 1) * 100);
  const connectedVideoCount = videoItems.filter((item) => item.src).length;
  const seekProtectionNotice = buildVideoSeekProtectionNotice(activeVideoProgress);
  const videoFormatNotice = buildVideoFormatNotice(activeVideo.src);

  return `
    <div class="section-title">
      <div>
        <p class="eyebrow">Просмотр урока</p>
        <h3>Единый блок видео</h3>
      </div>
      <span class="badge">${overallProgressPercent}%</span>
    </div>
    <div class="video-summary">
      <article class="video-summary__card">
        <small>Активное видео</small>
        <strong>${escapeHtml(activeVideo.title)}</strong>
      </article>
      <article class="video-summary__card">
        <small>Просмотрено</small>
        <strong>${summary.completedCount}/${summary.totalCount}</strong>
      </article>
      <article class="video-summary__card">
        <small>Подключено файлов</small>
        <strong>${connectedVideoCount}/${videoItems.length}</strong>
      </article>
    </div>
    <div class="video-playlist" role="tablist" aria-label="Последовательность видео">
      ${videoItems
        .map((videoItem) => {
          const status = getVideoItemStatus(videoItems, lessonProgress, videoItem);
          const isActive = videoItem.id === activeVideo.id;
          const disabled = status.state === 'locked';

          return `
            <button
              class="video-playlist__item ${isActive ? 'video-playlist__item--active' : ''} ${
                status.state === 'completed' ? 'video-playlist__item--completed' : ''
              } ${status.state === 'locked' ? 'video-playlist__item--locked' : ''}"
              type="button"
              data-select-video="${escapeHtml(videoItem.id)}"
              ${disabled ? 'disabled' : ''}
            >
              <span class="video-playlist__body">
                ${buildGeneratedVideoPlaylistPreview(lesson, videoItem)}
                <span class="video-playlist__meta">
                <span class="video-playlist__order">Видео ${videoItem.order}</span>
                <strong>${escapeHtml(videoItem.title)}</strong>
                <span class="muted">${escapeHtml(videoItem.durationLabel || 'Длительность уточняется')}</span>
                </span>
              </span>
              ${renderStatusChip(status.label, status.type)}
            </button>
          `;
        })
        .join('')}
    </div>
    ${
      activeVideo.src
        ? `
          <div class="video-frame">
            <video
              id="lessonVideo"
              data-video-id="${escapeHtml(activeVideo.id)}"
              controls
              controlsList="nodownload noplaybackrate"
              disablepictureinpicture
              playsinline
              preload="metadata"
              poster="${escapeHtml(
                getGeneratedLessonPreviewDataUrl(lesson, {
                  variant: 'player',
                  videoItem: activeVideo
                })
              )}"
            >
              <source src="${escapeHtml(activeVideo.src)}" />
            </video>
          </div>
        `
        : `
          <div class="video-placeholder">
            <strong>${escapeHtml(activeVideo.title)}</strong>
            <p class="muted">${escapeHtml(activeVideo.placeholderNote || 'Видео будет добавлено позже')}</p>
            ${
              activeVideoProgress.completed
                ? '<div class="notice notice--success">Видео уже засчитано. Можно переходить к следующему шагу.</div>'
                : `<button class="button" id="simulateWatch" type="button" data-video-id="${escapeHtml(activeVideo.id)}">Засчитать просмотр текущего видео</button>`
            }
          </div>
        `
    }
    <div class="video-progress-stack">
      <div class="video-progress-line">
        <span class="video-progress-line__label">Текущее видео</span>
        <div class="inline-progress">
          <div class="progress progress--thin">
            <span id="videoProgressFill" style="width: ${activeProgressPercent}%"></span>
          </div>
          <span class="progress-caption" id="videoProgressCaption">${activeProgressPercent}%</span>
        </div>
      </div>
      <div class="video-progress-line">
        <span class="video-progress-line__label">Общий прогресс блока</span>
        <div class="inline-progress">
          <div class="progress progress--thin">
            <span id="videoOverallProgressFill" style="width: ${overallProgressPercent}%"></span>
          </div>
          <span class="progress-caption" id="videoOverallProgressCaption">${overallProgressPercent}%</span>
        </div>
      </div>
    </div>
    <p class="muted">
      Видео считается завершенным после ${thresholdPercent}% воспроизведения. Ускорение отключено, перемотка вперед доступна только в пределах уже просмотренного фрагмента.
    </p>
    ${seekProtectionNotice}
    ${videoFormatNotice}
  `;
}

function buildVideoSeekProtectionNotice(videoProgress) {
  if (videoProgress.completed) {
    return `
      <div class="notice notice--success">
        Текущее видео просмотрено полностью. Теперь его можно свободно пересматривать.
      </div>
    `;
  }

  return `
    <div class="notice notice--soft">
      Перемотка вперед и ускорение заблокированы до полного просмотра. Возврат назад доступен всегда.
    </div>
  `;
}

function buildVideoFormatNotice(videoSrc) {
  const videoMeta = getVideoSourceMeta(videoSrc);
  if (videoMeta.isHls) {
    return `
      <div class="notice notice--soft">
        Поток HLS будет воспроизводиться только в webview с нативной поддержкой HLS. Если видео не стартует, подготовьте MP4-версию для полной совместимости.
      </div>
    `;
  }

  if (videoMeta.isLimitedInWebView) {
    return `
      <div class="notice notice--warning">
        Формат ${escapeHtml(videoMeta.extension.toUpperCase())} может не воспроизводиться в Telegram WebView и на iPhone. Для стабильного inline-плеера предпочтителен MP4.
      </div>
    `;
  }

  if (!videoSrc) {
    return '';
  }

  const normalizedSrc = videoSrc.toLowerCase();
  if (normalizedSrc.endsWith('.mp4') || normalizedSrc.endsWith('.m4v') || normalizedSrc.endsWith('.webm')) {
    return '';
  }

  return `
    <div class="notice notice--warning">
      Формат видео может поддерживаться не во всех браузерах. Для стабильного просмотра предпочтителен MP4.
    </div>
  `;
}

function updateVideoProgressPreview(lesson, lessonProgress, videoId, ratio, options = {}) {
  const progressPercent = Math.round(clampValue(ratio, 0, 1) * 100);
  const videoItem = getLessonVideoItems(lesson).find((item) => item.id === videoId);
  const videoProgress = getVideoItemProgress(lessonProgress, videoId);
  const isCompleted =
    progressPercent >= Math.round(((videoItem?.completionThreshold ?? 1) * 100)) || videoProgress.completed;
  const summary = getVideoProgressSummary(lesson, lessonProgress, {
    [videoId]: {
      watchRatio: ratio,
      lastKnownDurationSeconds: options.durationSeconds ?? videoProgress.lastKnownDurationSeconds,
      completed: isCompleted
    }
  });
  const overallProgressPercent = Math.round(summary.watchRatio * 100);
  const fill = document.querySelector('#videoProgressFill');
  const caption = document.querySelector('#videoProgressCaption');
  const overallFill = document.querySelector('#videoOverallProgressFill');
  const overallCaption = document.querySelector('#videoOverallProgressCaption');

  if (fill) {
    fill.style.width = `${progressPercent}%`;
  }
  if (caption) {
    caption.textContent = `${progressPercent}%`;
  }
  if (overallFill) {
    overallFill.style.width = `${overallProgressPercent}%`;
  }
  if (overallCaption) {
    overallCaption.textContent = `${overallProgressPercent}%`;
  }
}

function bindLessonVideoActions(lesson, lessonProgress) {
  lessonVideoLifecycleCleanup?.();
  lessonVideoLifecycleCleanup = null;

  document.querySelectorAll('[data-select-video]').forEach((button) => {
    button.addEventListener('click', () => {
      const videoId = button.dataset.selectVideo;
      if (!videoId) {
        return;
      }

      progress = setActiveLessonVideo(academyCourse, progress, lesson.id, videoId);
      renderCurrentRoute();
    });
  });

  const simulateButton = document.querySelector('#simulateWatch');
  if (simulateButton) {
    simulateButton.addEventListener('click', () => {
      const videoId = simulateButton.dataset.videoId;
      const wasCompleted = progress.lessons[lesson.id].videoCompleted;
      progress = markLessonVideoComplete(academyCourse, progress, lesson.id, { videoId });

      const updatedLessonProgress = progress.lessons[lesson.id];
      const nextActiveVideo = getActiveVideoItem(lesson, updatedLessonProgress);
      if (!wasCompleted && updatedLessonProgress.videoCompleted) {
        showToast('Видеоурок завершен. Теперь можно переходить к тесту.');
        renderCurrentRoute();
        return;
      }

      if (videoId && nextActiveVideo.id !== videoId) {
        showToast(`Видео завершено. Открываю «${nextActiveVideo.title}».`);
      } else {
        showToast('Видео засчитано.');
      }

      renderCurrentRoute();
    });
  }

  const playButton = document.querySelector('[data-play-lesson-video]');
  if (playButton) {
    playButton.addEventListener('click', async () => {
      const inlineVideo = document.querySelector('#lessonVideo');
      if (!inlineVideo) {
        showToast('Видео пока недоступно в этом уроке.');
        return;
      }

      inlineVideo.scrollIntoView({ block: 'center', behavior: 'smooth' });
      try {
        if (inlineVideo.readyState < 2) {
          inlineVideo.load();
        }
        await inlineVideo.play();
      } catch {
        showToast('Если воспроизведение не стартовало автоматически, нажмите play на самом плеере.');
      }
    });
  }

  const video = document.querySelector('#lessonVideo');
  if (!video) {
    return;
  }

  const videoId = video.dataset.videoId;
  const activeVideo =
    getLessonVideoItems(lesson).find((item) => item.id === videoId) ?? getActiveVideoItem(lesson, lessonProgress);
  const activeVideoProgress = getVideoItemProgress(lessonProgress, activeVideo.id);
  const videoMeta = getVideoSourceMeta(activeVideo.src);
  const videoShell = document.querySelector('[data-video-shell]');
  const feedback = document.querySelector('[data-video-feedback]');
  const feedbackTitle = feedback?.querySelector('[data-video-feedback-title]');
  const feedbackText = feedback?.querySelector('[data-video-feedback-text]');
  let lastPersistedBucket = Math.floor(activeVideoProgress.watchRatio * 20);
  let isCorrectingSeek = false;
  let hasResolvedInitialVideoLoad = video.readyState >= HTMLMediaElement.HAVE_METADATA;
  let lastSeekWarningAt = 0;
  let lastRateWarningAt = 0;
  const completionThreshold = activeVideo.completionThreshold ?? 1;

  const setVideoShellState = (state, options = {}) => {
    if (videoShell) {
      videoShell.dataset.videoState = state;
    }

    if (!feedback || !feedbackTitle || !feedbackText) {
      return;
    }

    if (state === 'error') {
      feedback.hidden = false;
      feedbackTitle.textContent = options.title || 'Не удалось открыть видео';
      feedbackText.textContent =
        options.message || 'Источник недоступен или не поддерживается текущим webview.';
      return;
    }

    if (state === 'loading') {
      feedback.hidden = false;
      feedbackTitle.textContent = 'Подготавливаем видео';
      feedbackText.textContent = 'Плеер загрузится прямо в этом блоке.';
      return;
    }

    feedback.hidden = true;
    feedbackTitle.textContent = '';
    feedbackText.textContent = '';
  };

  const resolveInitialVideoLoad = (state = 'ready') => {
    hasResolvedInitialVideoLoad = true;
    setVideoShellState(state);
  };

  const enforcePlaybackRate = () => {
    if (video.playbackRate === 1) {
      return;
    }

    video.playbackRate = 1;
    video.defaultPlaybackRate = 1;
    const now = Date.now();
    if (now - lastRateWarningAt > 1400) {
      lastRateWarningAt = now;
      showToast('Ускорение воспроизведения отключено для этого урока.');
    }
  };

  if (videoMeta.isHls && !video.canPlayType(videoMeta.mimeType)) {
    setVideoShellState('error', {
      title: 'HLS не поддерживается',
      message: 'Этот поток не открывается в текущем webview. Для надежного просмотра подготовьте MP4-версию.'
    });
    return;
  }

  const persistVideoProgress = () => {
    if (!video.duration || isCorrectingSeek) {
      return;
    }

    const ratio = Math.min(video.currentTime / video.duration, 1);
    const bucket = Math.floor(ratio * 20);
    const wasCompleted = progress.lessons[lesson.id].videoCompleted;
    const wasCurrentVideoCompleted = getVideoItemProgress(progress.lessons[lesson.id], activeVideo.id).completed;

    updateVideoProgressPreview(lesson, progress.lessons[lesson.id], activeVideo.id, ratio, {
      durationSeconds: video.duration
    });

    if (bucket > lastPersistedBucket || ratio >= completionThreshold) {
      lastPersistedBucket = bucket;
      progress = updateLessonVideoProgress(academyCourse, progress, lesson.id, ratio, {
        videoId: activeVideo.id,
        currentTimeSeconds: video.currentTime,
        durationSeconds: video.duration
      });
    }

    const updatedLessonProgress = progress.lessons[lesson.id];
    const isCurrentVideoCompleted = getVideoItemProgress(updatedLessonProgress, activeVideo.id).completed;
    if (!wasCurrentVideoCompleted && isCurrentVideoCompleted) {
      const nextActiveVideo = getActiveVideoItem(lesson, updatedLessonProgress);
      if (!wasCompleted && updatedLessonProgress.videoCompleted) {
        showToast('Видеоурок просмотрен полностью. Можно проходить тест.');
        renderCurrentRoute();
        return;
      }

      if (nextActiveVideo.id !== activeVideo.id) {
        showToast(`«${activeVideo.title}» просмотрено. Открываю «${nextActiveVideo.title}».`);
        renderCurrentRoute();
      }
    }
  };

  const flushVideoProgress = () => {
    if (!video.duration || isCorrectingSeek) {
      return;
    }

    lastPersistedBucket = -1;
    persistVideoProgress();
  };

  const handleVisibilityFlush = () => {
    if (document.visibilityState === 'hidden') {
      flushVideoProgress();
    }
  };

  const bindLifecycleFlush = () => {
    lessonVideoLifecycleCleanup?.();
    document.addEventListener('visibilitychange', handleVisibilityFlush, { passive: true });
    window.addEventListener('pagehide', flushVideoProgress, { passive: true });
    lessonVideoLifecycleCleanup = () => {
      document.removeEventListener('visibilitychange', handleVisibilityFlush);
      window.removeEventListener('pagehide', flushVideoProgress);
    };
  };

  const correctForwardSeek = () => {
    const currentLessonProgress = progress.lessons[lesson.id];
    const currentVideoProgress = getVideoItemProgress(currentLessonProgress, activeVideo.id);
    if (!video.duration || currentVideoProgress.completed || isCorrectingSeek) {
      return;
    }

    const allowedTime = getAllowedVideoSeekTime(currentVideoProgress, video.duration);
    if (video.currentTime <= allowedTime + SEEK_TOLERANCE_SECONDS) {
      return;
    }

    isCorrectingSeek = true;
    const targetTime = Math.max(0, allowedTime);
    video.currentTime = targetTime;
    window.requestAnimationFrame(() => {
      isCorrectingSeek = false;
      updateVideoProgressPreview(
        lesson,
        progress.lessons[lesson.id],
        activeVideo.id,
        Math.min(targetTime / video.duration, 1),
        { durationSeconds: video.duration }
      );
    });

    const now = Date.now();
    if (now - lastSeekWarningAt > 1400) {
      lastSeekWarningAt = now;
      showToast('Перемотка вперед откроется только после просмотра этого фрагмента.');
    }
  };

  video.defaultPlaybackRate = 1;
  video.playbackRate = 1;
  setVideoShellState(hasResolvedInitialVideoLoad ? 'ready' : 'loading');
  video.addEventListener('ratechange', enforcePlaybackRate);
  video.addEventListener('loadstart', () => {
    setVideoShellState('loading');
  });
  video.addEventListener('waiting', () => {
    if (hasResolvedInitialVideoLoad) {
      return;
    }

    setVideoShellState('loading');
  });
  video.addEventListener('loadeddata', () => {
    resolveInitialVideoLoad('ready');
  });
  video.addEventListener('canplay', () => {
    resolveInitialVideoLoad('ready');
  });
  video.addEventListener('playing', () => {
    resolveInitialVideoLoad('playing');
  });
  video.addEventListener('pause', () => {
    if (video.ended) {
      return;
    }

    flushVideoProgress();
    setVideoShellState('ready');
  });

  video.addEventListener('loadedmetadata', () => {
    resolveInitialVideoLoad('ready');
    const currentLessonProgress = progress.lessons[lesson.id];
    const currentVideoProgress = getVideoItemProgress(currentLessonProgress, activeVideo.id);
    if (!video.duration) {
      return;
    }

    if (currentVideoProgress.completed) {
      updateVideoProgressPreview(lesson, currentLessonProgress, activeVideo.id, 1, {
        durationSeconds: video.duration
      });
      return;
    }

    const resumeTime = Math.max(
      0,
      Math.min(
        getAllowedVideoSeekTime(currentVideoProgress, video.duration),
        Math.max(video.duration - 0.25, 0)
      )
    );

    if (resumeTime > SEEK_TOLERANCE_SECONDS) {
      isCorrectingSeek = true;
      video.currentTime = resumeTime;
      window.requestAnimationFrame(() => {
        isCorrectingSeek = false;
      });
    }

    updateVideoProgressPreview(
      lesson,
      currentLessonProgress,
      activeVideo.id,
      Math.min(resumeTime / video.duration, 1),
      { durationSeconds: video.duration }
    );
  });

  video.addEventListener('seeking', correctForwardSeek);
  video.addEventListener('timeupdate', persistVideoProgress);
  video.addEventListener('ended', flushVideoProgress);
  video.addEventListener('error', () => {
    const extensionLabel = videoMeta.extension ? videoMeta.extension.toUpperCase() : 'VIDEO';
    setVideoShellState('error', {
      title: 'Не удалось открыть видео',
      message: videoMeta.isLimitedInWebView
        ? `Формат ${extensionLabel} может не поддерживаться этим webview. Для стабильного воспроизведения подготовьте MP4.`
        : 'Источник недоступен или текущий формат не поддерживается устройством.'
    });
    showToast('Не удалось воспроизвести видео. Для надежности используйте MP4.');
  });
  bindLifecycleFlush();
}

function getAllowedVideoSeekTime(videoProgress, durationSeconds) {
  if (!videoProgress || videoProgress.completed) {
    return durationSeconds;
  }

  const storedTime = Number.isFinite(videoProgress.furthestTimeSeconds)
    ? videoProgress.furthestTimeSeconds
    : 0;
  const ratioTime = Number.isFinite(durationSeconds) ? videoProgress.watchRatio * durationSeconds : 0;
  return Math.min(Math.max(storedTime, ratioTime, 0), durationSeconds);
}

function buildLessonQuiz(lesson, lessonProgress) {
  if (!lessonProgress.videoCompleted) {
    return `
      <article class="section">
        <div class="section-title">
          <div>
            <p class="eyebrow">Тест</p>
            <h3>${escapeHtml(lesson.quiz.title)}</h3>
          </div>
        </div>
        <div class="notice">
          Тест откроется только после полного просмотра видеоурока. Пока следующий урок остается заблокированным.
        </div>
      </article>
    `;
  }

  const nextLesson = academyCourse.lessons.find((item) => item.order === lesson.order + 1);
  const successActions = nextLesson
    ? `<button class="button" type="button" data-open-lesson="${escapeHtml(nextLesson.id)}">Открыть следующий урок</button>`
    : '<button class="button" type="button" data-open-final-exam>Перейти к итоговому экзамену</button>';

  return buildAssessmentMarkup({
    assessment: lesson.quiz,
    progressState: {
      attempts: lessonProgress.quizAttempts,
      bestScore: lessonProgress.quizBestScore,
      lastScore: lessonProgress.quizLastScore,
      passed: lessonProgress.quizPassed,
      lastAnswers: lessonProgress.lastAnswers
    },
    formId: 'lessonQuizForm',
    title: lesson.quiz.title,
    description:
      'Пока тест не сдан успешно, следующий урок остается заблокированным. После успешной сдачи доступ откроется автоматически.',
    submitLabel: 'Проверить ответы',
    successMessage: nextLesson
      ? `Тест пройден. Урок «${nextLesson.title}» уже открыт.`
      : 'Тест пройден. Можно переходить к итоговому экзамену.',
    successActions
  });
}

function bindLessonQuizActions(lesson) {
  const quizForm = document.querySelector('#lessonQuizForm');
  if (!quizForm) {
    return;
  }

  bindAssessmentOptionInteractions(quizForm);

  quizForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const answers = collectAnswers(quizForm, lesson.quiz.questions);
    const missingQuestions = getMissingQuestions(lesson.quiz.questions, answers);

    if (missingQuestions.length > 0) {
      showToast('Ответьте на все вопросы перед отправкой.');
      return;
    }

    const submission = submitLessonQuiz(academyCourse, progress, lesson.id, answers);
    if (submission.error) {
      showToast(submission.error);
      return;
    }

    progress = submission.progress;

    if (submission.result.passed) {
      showToast('Тест пройден. Следующий урок уже открыт.');
    } else {
      showToast(
        `Недостаточно верных ответов: ${submission.result.correctCount}/${submission.result.totalQuestions}. Попробуйте еще раз.`
      );
    }

    renderCurrentRoute();
  });
}

function renderFinalExam() {
  view.innerHTML = `
    <section class="screen-stack">
      <button class="back-link" id="backToCoursesFromExam" type="button">К курсам</button>
      <article class="section" id="examHero"></article>
      <section class="section">
        <div class="section-title">
          <div>
            <p class="eyebrow">Проверка готовности</p>
            <h3>Статус по урокам</h3>
          </div>
        </div>
        <div class="check-list" id="examChecklist"></div>
      </section>
      <section id="finalExamBody"></section>
    </section>
  `;

  document.querySelector('#backToCoursesFromExam')?.addEventListener('click', () => {
    navigateToRoute({ tab: 'home', screen: 'courses' });
  });

  document.querySelector('#examHero').innerHTML = buildFinalExamHero();
  document.querySelector('#examChecklist').innerHTML = buildExamChecklist();
  document.querySelector('#finalExamBody').innerHTML = buildFinalExamBody();

  bindNavigationActions(view);
  bindFinalExamActions();
}

function buildFinalExamHero() {
  const examStatus = progress.finalExam.passed ? 'Сдан' : progress.finalExam.isUnlocked ? 'Доступен' : 'Заблокирован';
  const heroMessage = progress.finalExam.passed
    ? 'Курс завершен. Итоговый экзамен успешно сдан.'
    : progress.finalExam.isUnlocked
      ? 'Все уроки завершены. Можно переходить к итоговой проверке.'
      : 'Экзамен откроется только после завершения всех уроков и тестов.';

  return `
    <div class="section-title">
      <div>
        <p class="eyebrow">Итоговый экзамен</p>
        <h2>${escapeHtml(academyCourse.finalExam.title)}</h2>
      </div>
      <span class="badge">${escapeHtml(examStatus)}</span>
    </div>
    <p class="muted">${escapeHtml(academyCourse.finalExam.description)}</p>
    <div class="status-row">
      ${renderStatusChip(progress.finalExam.isUnlocked ? 'Доступ открыт' : 'Ждет завершения курса', progress.finalExam.isUnlocked ? 'success' : 'muted')}
      ${renderStatusChip(progress.finalExam.attempts > 0 ? `Попыток: ${progress.finalExam.attempts}` : 'Попыток пока не было', progress.finalExam.attempts > 0 ? 'warning' : 'muted')}
      ${progress.finalExam.passed ? renderStatusChip(`Лучший результат: ${progress.finalExam.bestScore}/${academyCourse.finalExam.questions.length}`, 'success') : ''}
    </div>
    <div class="notice ${progress.finalExam.passed ? 'notice--success' : progress.finalExam.isUnlocked ? 'notice--warning' : ''}">
      ${escapeHtml(heroMessage)}
    </div>
  `;
}

function buildExamChecklist() {
  return academyCourse.lessons
    .map((lesson) => {
      const lessonProgress = progress.lessons[lesson.id];
      return `
        <article class="check-item">
          <div>
            <strong>День ${lesson.dayNumber}, урок ${lesson.lessonNumber}. ${escapeHtml(lesson.title)}</strong>
            <p class="muted">${escapeHtml(lesson.shortDescription || lesson.description)}</p>
          </div>
          <div class="status-row status-row--tight">
            ${renderStatusChip(lessonProgress.videoCompleted ? 'Видео просмотрено' : 'Видео не завершено', lessonProgress.videoCompleted ? 'success' : 'muted')}
            ${renderStatusChip(lessonProgress.quizPassed ? 'Тест пройден' : 'Тест не пройден', lessonProgress.quizPassed ? 'success' : 'muted')}
          </div>
        </article>
      `;
    })
    .join('');
}

function buildFinalExamBody() {
  if (!progress.finalExam.isUnlocked) {
    return `
      <article class="section">
        <div class="notice">
          Итоговый экзамен пока недоступен. Сначала нужно завершить все уроки и успешно пройти все тесты.
        </div>
      </article>
    `;
  }

  return buildAssessmentMarkup({
    assessment: academyCourse.finalExam,
    progressState: {
      attempts: progress.finalExam.attempts,
      bestScore: progress.finalExam.bestScore,
      lastScore: progress.finalExam.lastScore,
      passed: progress.finalExam.passed,
      lastAnswers: progress.finalExam.lastAnswers
    },
    formId: 'finalExamForm',
    title: academyCourse.finalExam.title,
    description: 'После успешной сдачи будет показан итоговый статус завершения курса.',
    submitLabel: 'Сдать экзамен',
    successMessage: 'Итоговый экзамен сдан. Курс завершен.',
    successActions: '<button class="button" type="button" data-open-home>Вернуться на главную</button>'
  });
}

function bindFinalExamActions() {
  document.querySelectorAll('[data-open-home]').forEach((button) => {
    button.addEventListener('click', () => {
      navigateToRoute({ tab: 'home', screen: 'home' });
    });
  });

  const examForm = document.querySelector('#finalExamForm');
  if (!examForm) {
    return;
  }

  bindAssessmentOptionInteractions(examForm);

  examForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const answers = collectAnswers(examForm, academyCourse.finalExam.questions);
    const missingQuestions = getMissingQuestions(academyCourse.finalExam.questions, answers);

    if (missingQuestions.length > 0) {
      showToast('Ответьте на все вопросы перед отправкой.');
      return;
    }

    const submission = submitFinalExam(academyCourse, progress, answers);
    if (submission.error) {
      showToast(submission.error);
      return;
    }

    progress = submission.progress;

    if (submission.result.passed) {
      showToast('Итоговый экзамен сдан. Курс завершен.');
    } else {
      showToast(
        `Экзамен не сдан: ${submission.result.correctCount}/${submission.result.totalQuestions}. Можно попробовать снова.`
      );
    }

    renderFinalExam();
  });
}

function buildAssessmentMarkup({
  assessment,
  progressState,
  formId,
  title,
  description,
  submitLabel,
  successMessage,
  successActions
}) {
  const attemptMessage =
    progressState.attempts > 0
      ? `Последняя попытка: ${progressState.lastScore}/${assessment.questions.length}. Лучший результат: ${progressState.bestScore}/${assessment.questions.length}. Для прохождения нужно ${assessment.passingScore} верных ответов.`
      : `Для прохождения нужно правильно ответить минимум на ${assessment.passingScore} из ${assessment.questions.length} вопросов.`;

  if (progressState.passed) {
    return `
      <article class="section section--success">
        <div class="section-title">
          <div>
            <p class="eyebrow">Результат</p>
            <h3>${escapeHtml(title)}</h3>
          </div>
          <span class="badge">Пройдено</span>
        </div>
        <p class="muted">${escapeHtml(successMessage)}</p>
        <div class="status-row">
          ${renderStatusChip(`Лучший результат: ${progressState.bestScore}/${assessment.questions.length}`, 'success')}
          ${renderStatusChip(`Попыток: ${progressState.attempts}`, 'warning')}
        </div>
        <div class="action-row action-row--result">
          ${successActions}
        </div>
      </article>
    `;
  }

  return `
    <article class="section">
      <div class="section-title">
        <div>
          <p class="eyebrow">Проверка знаний</p>
          <h3>${escapeHtml(title)}</h3>
        </div>
        <span class="badge">${assessment.questions.length} вопросов</span>
      </div>
      <p class="muted">${escapeHtml(description)}</p>
      <div class="notice notice--soft">
        ${escapeHtml(attemptMessage)}
      </div>
      <form class="assessment-form" id="${escapeHtml(formId)}">
        ${assessment.questions
          .map((question, index) =>
            buildQuestionMarkup(question, index, progressState.lastAnswers[question.id] ?? '')
          )
          .join('')}
        <button type="submit" class="button">${escapeHtml(submitLabel)}</button>
      </form>
    </article>
  `;
}

function buildQuestionMarkup(question, index, selectedOptionId) {
  return `
    <fieldset class="question-card">
      <legend>${index + 1}. ${escapeHtml(question.prompt)}</legend>
      <div class="answers">
        ${question.options
          .map(
            (option) => `
              <label class="answer-option">
                <input
                  type="radio"
                  name="${escapeHtml(question.id)}"
                  value="${escapeHtml(option.id)}"
                  ${selectedOptionId === option.id ? 'checked' : ''}
                />
                <span>${escapeHtml(option.label)}</span>
              </label>
            `
          )
          .join('')}
      </div>
    </fieldset>
  `;
}

function collectAnswers(form, questions) {
  const selectedAnswers = new Map(
    Array.from(form.querySelectorAll('input[type="radio"]:checked')).map((input) => [input.name, input.value])
  );

  return questions.reduce((accumulator, question) => {
    const selectedOptionId = selectedAnswers.get(question.id);
    if (typeof selectedOptionId === 'string') {
      accumulator[question.id] = selectedOptionId;
    }
    return accumulator;
  }, {});
}

function bindAssessmentOptionInteractions(scope) {
  scope.querySelectorAll('.answer-option').forEach((option) => {
    const input = option.querySelector('input[type="radio"]');
    if (!input) {
      return;
    }

    const syncGroupState = () => {
      const answersGroup = option.closest('.answers');
      if (!answersGroup) {
        return;
      }

      answersGroup.querySelectorAll('.answer-option').forEach((item) => {
        const itemInput = item.querySelector('input[type="radio"]');
        item.classList.toggle('answer-option--selected', Boolean(itemInput?.checked));
      });
    };

    option.addEventListener('click', () => {
      input.checked = true;
      syncGroupState();
    });

    input.addEventListener('change', syncGroupState);
    syncGroupState();
  });
}

function getMissingQuestions(questions, answers) {
  return questions.filter((question) => !answers[question.id]);
}

function renderStatusChip(label, type) {
  return `<span class="status-chip status-chip--${escapeHtml(type)}">${escapeHtml(label)}</span>`;
}

function normalizeSearch(value) {
  return String(value ?? '').trim().toLowerCase();
}

function clampValue(value, min, max) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/gu, (char) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };

    return entities[char];
  });
}

function initTelegram() {
  const webApp = window.Telegram?.WebApp;
  if (!webApp) {
    ensureViewportSync();
    return;
  }

  webApp.ready();
  webApp.expand();
  webApp.setHeaderColor?.('#121417');
  webApp.setBackgroundColor?.('#121417');
  webApp.setBottomBarColor?.('#121417');
  ensureViewportSync(webApp);
  window.requestAnimationFrame(() => syncViewportMetrics(webApp));

  const roleChip = document.querySelector('#roleChip');
  const firstName = webApp.initDataUnsafe?.user?.first_name;
  if (firstName && roleChip) {
    roleChip.textContent = firstName;
  }
}

function ensureViewportSync(webApp = window.Telegram?.WebApp) {
  syncViewportMetrics(webApp);

  const handleViewportChange = () => syncViewportMetrics(window.Telegram?.WebApp);

  if (!viewportResizeBound) {
    viewportResizeBound = true;
    window.addEventListener('resize', handleViewportChange, { passive: true });
  }

  if (webApp && !telegramViewportEventsBound) {
    telegramViewportEventsBound = true;
    webApp.onEvent?.('viewportChanged', handleViewportChange);
    webApp.onEvent?.('safeAreaChanged', handleViewportChange);
    webApp.onEvent?.('contentSafeAreaChanged', handleViewportChange);
  }
}

function syncViewportMetrics(webApp = window.Telegram?.WebApp) {
  const root = document.documentElement;
  const viewportHeight = resolveViewportPixels(webApp?.viewportHeight, window.innerHeight);
  const stableHeight = resolveViewportPixels(webApp?.viewportStableHeight, viewportHeight);
  const contentSafeArea = normalizeInsets(webApp?.contentSafeAreaInset);
  const safeArea = normalizeInsets(webApp?.safeAreaInset);
  const effectiveInsets = {
    top: contentSafeArea.top || safeArea.top,
    right: contentSafeArea.right || safeArea.right,
    bottom: contentSafeArea.bottom || safeArea.bottom,
    left: contentSafeArea.left || safeArea.left
  };

  root.style.setProperty('--app-height', `${viewportHeight}px`);
  root.style.setProperty('--app-stable-height', `${stableHeight}px`);
  root.style.setProperty('--safe-area-top', `${effectiveInsets.top}px`);
  root.style.setProperty('--safe-area-right', `${effectiveInsets.right}px`);
  root.style.setProperty('--safe-area-bottom', `${effectiveInsets.bottom}px`);
  root.style.setProperty('--safe-area-left', `${effectiveInsets.left}px`);
}

function normalizeInsets(insets) {
  return {
    top: normalizeInsetValue(insets?.top),
    right: normalizeInsetValue(insets?.right),
    bottom: normalizeInsetValue(insets?.bottom),
    left: normalizeInsetValue(insets?.left)
  };
}

function normalizeInsetValue(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 0;
  }

  return Math.round(numericValue);
}

function resolveViewportPixels(value, fallback) {
  const numericValue = Number(value);
  if (Number.isFinite(numericValue) && numericValue > 0) {
    return Math.round(numericValue);
  }

  const fallbackValue = Number(fallback);
  return Number.isFinite(fallbackValue) && fallbackValue > 0 ? Math.round(fallbackValue) : 0;
}

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('visible');
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => toast.classList.remove('visible'), 2200);
}
