const data = {
  quickActions: [
    { title: 'Скрипты первого звонка', subtitle: 'Общение с новым клиентом', type: 'info' },
    { title: 'Регламент открытия салона', subtitle: 'Чеклист на утреннюю смену', type: 'success' },
    { title: 'Каталог услуг', subtitle: 'Зоны и рекомендации мастера', type: 'info' }
  ],
  tasks: [
    'Пройти вводный модуль по стандартам сервиса.',
    'Изучить памятку по противопоказаниям.',
    'Закрепить скрипт консультации клиента перед процедурой.'
  ],
  courses: [
    { title: 'База депиляции: старт', progress: '65%', duration: '2 ч 20 мин' },
    { title: 'Сервис и коммуникация', progress: '30%', duration: '1 ч 40 мин' },
    { title: 'Санитарные нормы салона', progress: '85%', duration: '1 ч 10 мин' },
    { title: 'Работа с возражениями', progress: '10%', duration: '50 мин' }
  ],
  library: [
    { title: 'Протокол подготовки кабинета', tag: 'Стандарт', meta: 'Обновлено вчера' },
    { title: 'Материалы и расходники', tag: 'Справочник', meta: 'Версия 2.1' },
    { title: 'FAQ по чувствительной коже', tag: 'FAQ', meta: '12 вопросов' },
    { title: 'Скрипт допродажи ухода', tag: 'Продажи', meta: '5 шаблонов' }
  ]
};

const view = document.querySelector('#view');
const tabs = Array.from(document.querySelectorAll('.tab'));

const renderMap = {
  home: renderHome,
  courses: renderCourses,
  library: renderLibrary,
  profile: renderProfile
};

tabs.forEach((button) => {
  button.addEventListener('click', () => {
    tabs.forEach((tab) => tab.classList.remove('active'));
    button.classList.add('active');
    const active = button.dataset.tab;
    renderMap[active]();
  });
});

renderHome();
initTelegram();

function cloneTemplate(id) {
  return document.querySelector(`#${id}`).content.cloneNode(true);
}

function renderHome() {
  view.innerHTML = '';
  view.append(cloneTemplate('home-template'));

  const quickActions = document.querySelector('#quickActions');
  quickActions.innerHTML = data.quickActions
    .map(
      ({ title, subtitle, type }) => `
      <article class="card">
        <span class="pill ${type}">${type === 'success' ? 'Регламент' : 'Материал'}</span>
        <h4>${title}</h4>
        <p class="muted">${subtitle}</p>
      </article>
    `
    )
    .join('');

  const taskList = document.querySelector('#taskList');
  taskList.innerHTML = data.tasks.map((task) => `<li>${task}</li>`).join('');
}

function renderCourses() {
  view.innerHTML = '';
  view.append(cloneTemplate('courses-template'));

  const courseList = document.querySelector('#courseList');
  courseList.innerHTML = data.courses
    .map(
      ({ title, progress, duration }) => `
      <article class="card">
        <h4>${title}</h4>
        <div class="meta">
          <span>Прогресс: ${progress}</span>
          <span>${duration}</span>
        </div>
      </article>
    `
    )
    .join('');
}

function renderLibrary() {
  view.innerHTML = '';
  view.append(cloneTemplate('library-template'));

  const libraryList = document.querySelector('#libraryList');
  libraryList.innerHTML = data.library
    .map(
      ({ title, tag, meta }) => `
      <article class="card">
        <span class="pill info">${tag}</span>
        <h4>${title}</h4>
        <p class="muted">${meta}</p>
      </article>
    `
    )
    .join('');
}

function renderProfile() {
  view.innerHTML = '';
  view.append(cloneTemplate('profile-template'));
}

function initTelegram() {
  const webApp = window.Telegram?.WebApp;
  if (!webApp) {
    return;
  }

  webApp.ready();
  webApp.expand();

  const roleChip = document.querySelector('#roleChip');
  const firstName = webApp.initDataUnsafe?.user?.first_name;
  if (firstName) {
    roleChip.textContent = firstName;
  }
}
