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
          ${buildLessonCover(lesson, 'hero')}
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

  view.innerHTML = `
    <section class="screen-stack">
      <button class="back-link" id="backToHomeFromPresentations" type="button">К главной</button>

      <section class="hero-panel hero-panel--soft">
        <div class="section-title">
          <div>
            <p class="eyebrow">Презентации</p>
            <h2>Материалы к урокам</h2>
          </div>
          <span class="badge">${items.length}</span>
        </div>
        <p class="muted">Раздел уже встроен в маршруты и готов к подключению реальных материалов. Если файла пока нет, карточка останется как заготовка.</p>
      </section>

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
            <p class="eyebrow">Библиотека материалов</p>
            <h3>Карточки презентаций</h3>
          </div>
          <span class="badge">${items.filter((item) => item.presentation?.href).length} доступно</span>
        </div>
        <div class="lesson-feed">
          ${
            items.length
              ? items.map((lesson) => buildPresentationCard(lesson)).join('')
              : buildEmptyState(
                  'Материалы не найдены',
                  'Либо поиск не дал результатов, либо презентации еще не подключены. Маршрут уже готов и позже примет реальные данные.'
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
  return getFilteredLessons(academyCourse.lessons, searchQuery, 'newest');
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
    const availablePresentations = academyCourse.lessons.filter((lesson) => lesson.presentation?.href).length;
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
        ${buildLessonCover(lesson, 'card')}
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

function buildPresentationCard(lesson) {
  const isAvailable = Boolean(lesson.presentation?.href);
  const lessonProgress = getLessonProgress(progress, lesson.id);

  return `
    <article class="lesson-card ${isAvailable ? '' : 'lesson-card--locked'}">
      <div class="lesson-card__cover">
        ${buildLessonCover(lesson, 'card')}
        ${renderFavoriteButton(lesson.id, lessonProgress.isFavorite)}
      </div>
      <div class="lesson-card__body">
        <div class="lesson-card__meta">
          <span class="lesson-order">День ${lesson.dayNumber} · Урок ${lesson.lessonNumber}</span>
          ${renderStatusChip(isAvailable ? 'Доступно' : 'Скоро', isAvailable ? 'success' : 'muted')}
        </div>
        <h3>${escapeHtml(lesson.title)}</h3>
        <p class="muted">${escapeHtml(lesson.presentation?.description || lesson.shortDescription || lesson.description)}</p>
        <div class="detail-actions detail-actions--library">
          <button class="button ${isAvailable ? '' : 'button--disabled'}" type="button" ${
            isAvailable ? `data-open-lesson="${escapeHtml(lesson.id)}"` : 'disabled'
          }>
            ${isAvailable ? 'Открыть материал' : 'Материал скоро'}
          </button>
          ${
            isAvailable
              ? `
                <a
                  class="button button--secondary"
                  href="${escapeHtml(lesson.presentation.href)}"
                  download="${escapeHtml(lesson.presentation.fileName || 'presentation.pptx')}"
                >
                  Скачать PPTX
                </a>
              `
              : ''
          }
        </div>
      </div>
    </article>
  `;
}

function buildLessonCover(lesson, variant) {
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
              <span class="video-playlist__meta">
                <span class="video-playlist__order">Видео ${videoItem.order}</span>
                <strong>${escapeHtml(videoItem.title)}</strong>
                <span class="muted">${escapeHtml(videoItem.durationLabel || 'Длительность уточняется')}</span>
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

  const video = document.querySelector('#lessonVideo');
  if (!video) {
    return;
  }

  const videoId = video.dataset.videoId;
  const activeVideo =
    getLessonVideoItems(lesson).find((item) => item.id === videoId) ?? getActiveVideoItem(lesson, lessonProgress);
  const activeVideoProgress = getVideoItemProgress(lessonProgress, activeVideo.id);
  let lastPersistedBucket = Math.floor(activeVideoProgress.watchRatio * 20);
  let isCorrectingSeek = false;
  let lastSeekWarningAt = 0;
  let lastRateWarningAt = 0;
  const completionThreshold = activeVideo.completionThreshold ?? 1;

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
  video.addEventListener('ratechange', enforcePlaybackRate);

  video.addEventListener('loadedmetadata', () => {
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
  video.addEventListener('ended', persistVideoProgress);
  video.addEventListener('error', () => {
    showToast('Не удалось воспроизвести видео. Для надежности используйте MP4.');
  });
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
        <div class="action-row">
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
  const formData = new FormData(form);

  return questions.reduce((accumulator, question) => {
    const selectedOptionId = formData.get(question.id);
    if (typeof selectedOptionId === 'string') {
      accumulator[question.id] = selectedOptionId;
    }
    return accumulator;
  }, {});
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
