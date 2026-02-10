const academyData = {
  quickActions: [
    {
      id: 'qa-consult',
      title: 'Скрипт первичной консультации',
      subtitle: 'Как провести безопасный бриф клиента',
      tag: 'Сервис',
      readTime: '5 мин',
      content: [
        'Начните с уточнения цели клиента и зоны, с которой он хочет начать процедуру.',
        'Спросите о лекарствах, недавних косметологических процедурах, раздражении и аллергиях.',
        'Объясните ощущения во время процедуры, правила ухода после и когда обращаться к врачу.'
      ]
    },
    {
      id: 'qa-hygiene',
      title: 'Минимальный гигиенический протокол',
      subtitle: 'Базовые шаги перед каждой процедурой',
      tag: 'Безопасность',
      readTime: '4 мин',
      content: [
        'Обработайте руки до и после каждого клиента (мыло + вода или антисептик).',
        'Подготовьте чистую рабочую поверхность и одноразовые расходники.',
        'Не используйте один и тот же аппликатор повторно в ёмкости с воском.'
      ]
    },
    {
      id: 'qa-aftercare',
      title: 'Памятка по уходу после депиляции',
      subtitle: 'Чтобы снизить риск раздражения и вросших волос',
      tag: 'Уход',
      readTime: '6 мин',
      content: [
        'Избегать горячей ванны, интенсивного трения и плотной одежды в первые сутки.',
        'Через 24–48 часов добавить мягкую эксфолиацию по переносимости кожи.',
        'При признаках инфекции (усиливающаяся боль, гной, температура) рекомендовать медицинскую консультацию.'
      ]
    }
  ],
  tasks: [
    {
      id: 'task-intro',
      title: 'Вводный стандарт сервиса',
      subtitle: 'Пройти чек-лист коммуникации мастера',
      content: [
        'Приветствие клиента по имени и подтверждение его ожиданий.',
        'Кратко озвучить план процедуры и длительность.',
        'Согласовать домашний уход и дату следующего визита.'
      ]
    },
    {
      id: 'task-risk',
      title: 'Проверка противопоказаний',
      subtitle: 'Повторить базовый screening перед процедурой',
      content: [
        'Соберите информацию о ретиноидах, недавних пилингах и повреждениях кожи.',
        'Если есть сомнения по безопасности — пауза и направление на консультацию врача.',
        'Записывайте все существенные ответы в карточку клиента.'
      ]
    },
    {
      id: 'task-script',
      title: 'Скрипт сложного диалога',
      subtitle: 'Отработка возражений клиента',
      content: [
        'Подтвердите эмоции клиента: “Понимаю, что это может вызывать беспокойство”.',
        'Дайте понятное объяснение шагов процедуры и мер безопасности.',
        'Предложите альтернативу: тест на небольшом участке или перенос визита.'
      ]
    }
  ],
  courses: [
    {
      id: 'course-basic',
      title: 'Основы депиляции и безопасности',
      progress: '65%',
      duration: '2 ч 20 мин',
      summary: 'Как подготовить кожу, безопасно провести процедуру и выстроить post-care.',
      lessons: [
        {
          id: 'lesson-types',
          title: 'Методы удаления волос: что выбрать',
          text: 'Бритва, воск, шугаринг и лазер отличаются по скорости, риску раздражения и длительности эффекта.'
        },
        {
          id: 'lesson-hands',
          title: 'Гигиена рук и рабочего места',
          text: 'Стабильная гигиена снижает риск передачи микробов и повышает доверие клиентов.'
        },
        {
          id: 'lesson-after',
          title: 'После процедуры: инструкции клиенту',
          text: 'Четкая памятка на первые 24–48 часов уменьшает жалобы на раздражение и вросшие волосы.'
        }
      ]
    },
    {
      id: 'course-service',
      title: 'Сервис и коммуникация с клиентом',
      progress: '30%',
      duration: '1 ч 40 мин',
      summary: 'Как объяснять процедуру, работать с вопросами и сохранять спокойный тон общения.',
      lessons: [
        {
          id: 'lesson-dialog',
          title: 'Структура консультации',
          text: 'Открытые вопросы в начале + короткое резюме перед процедурой помогают выровнять ожидания.'
        },
        {
          id: 'lesson-objections',
          title: 'Работа с возражениями',
          text: 'Используйте формулу: признать сомнение → объяснить логику → предложить контролируемый шаг.'
        }
      ]
    }
  ],
  library: [
    {
      id: 'lib-aad-hair',
      title: 'Советы дерматологов по безопасному удалению волос',
      tag: 'AAD',
      meta: 'Открытый источник',
      source: 'https://www.aad.org/public/everyday-care/skin-care-basics/hair/how-remove-hair-safely',
      points: [
        'Американская академия дерматологии рекомендует учитывать тип кожи и чувствительность зоны перед процедурой.',
        'При бритье важна чистая острая бритва и использование геля/крема для снижения травматизации.',
        'При выраженном раздражении после удаления волос следует сделать паузу и обсудить дальнейший уход со специалистом.'
      ]
    },
    {
      id: 'lib-nhs-ingrown',
      title: 'Профилактика вросших волос',
      tag: 'NHS',
      meta: 'Открытый источник',
      source: 'https://www.nhs.uk/conditions/ingrown-hairs/',
      points: [
        'NHS отмечает, что вросшие волосы часто связаны с техникой удаления и трением.',
        'Рекомендуются мягкое отшелушивание и отказ от слишком тесной одежды после процедуры.',
        'При признаках инфекции (сильное воспаление/боль) требуется медицинская оценка.'
      ]
    },
    {
      id: 'lib-cdc-hygiene',
      title: 'Гигиена рук в клиентском сервисе',
      tag: 'CDC',
      meta: 'Открытый источник',
      source: 'https://www.cdc.gov/clean-hands/about/handwashing.html',
      points: [
        'CDC подчеркивает, что мытьё рук — один из ключевых способов предотвращения распространения инфекций.',
        'Обработка рук должна выполняться до и после контакта с клиентом.',
        'Если нет видимых загрязнений, допустим антисептик на спиртовой основе.'
      ]
    }
  ],
  profileActions: [
    {
      id: 'profile-growth',
      title: 'План развития на 30 дней',
      subtitle: 'Чеклист новичка по неделям',
      content: [
        'Неделя 1: базовые стандарты, техника безопасности, shadow-смены.',
        'Неделя 2: самостоятельные процедуры под супервизией.',
        'Неделя 3–4: закрепление навыков и тест по качеству сервиса.'
      ]
    },
    {
      id: 'profile-cert',
      title: 'Как получить сертификат Академии',
      subtitle: 'Требования и шаги',
      content: [
        'Завершить обязательные курсы и пройти итоговый тест не ниже 80%.',
        'Выполнить минимум 10 процедур с наставником и обратной связью.',
        'Подтвердить знание протоколов ухода и contraindication screening.'
      ]
    }
  ]
};

const view = document.querySelector('#view');
const tabs = Array.from(document.querySelectorAll('.tab'));

const state = {
  currentTab: 'home'
};

tabs.forEach((button) => {
  button.addEventListener('click', () => {
    tabs.forEach((tab) => tab.classList.remove('active'));
    button.classList.add('active');
    state.currentTab = button.dataset.tab;
    renderTab(state.currentTab);
  });
});

view.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-action]');
  if (!trigger) {
    return;
  }

  const action = trigger.dataset.action;
  const id = trigger.dataset.id;

  if (action === 'open-detail') {
    openDetail(trigger.dataset.group, id);
  }

  if (action === 'open-lesson') {
    openLesson(trigger.dataset.courseId, id);
  }

  if (action === 'go-back') {
    renderTab(state.currentTab);
  }
});

renderTab(state.currentTab);
initTelegram();

function renderTab(tab) {
  const map = {
    home: renderHome,
    courses: renderCourses,
    library: renderLibrary,
    profile: renderProfile
  };

  map[tab]();
}

function renderHome() {
  const quick = academyData.quickActions
    .map(
      (item) => `
      <button class="card action-card" data-action="open-detail" data-group="quickActions" data-id="${item.id}">
        <span class="pill info">${item.tag}</span>
        <h4>${item.title}</h4>
        <p class="muted">${item.subtitle}</p>
        <p class="meta-line">Читать ${item.readTime}</p>
      </button>
    `
    )
    .join('');

  const tasks = academyData.tasks
    .map(
      (task) => `
      <button class="list-item action-card" data-action="open-detail" data-group="tasks" data-id="${task.id}">
        <strong>${task.title}</strong>
        <p class="muted">${task.subtitle}</p>
      </button>
    `
    )
    .join('');

  view.innerHTML = `
    <section class="section hero page-enter">
      <p class="label">Добро пожаловать 👋</p>
      <h2>Все знания компании в одном месте</h2>
      <p>Откройте любую карточку: внутри уже есть обучающий материал, который можно читать прямо в приложении.</p>
    </section>

    <section class="section page-enter">
      <div class="section-title"><h3>Быстрый доступ</h3></div>
      <div class="cards">${quick}</div>
    </section>

    <section class="section page-enter">
      <div class="section-title"><h3>Ближайшие задачи</h3></div>
      <div class="list">${tasks}</div>
    </section>
  `;
}

function renderCourses() {
  const courses = academyData.courses
    .map(
      (course) => `
      <button class="card action-card" data-action="open-detail" data-group="courses" data-id="${course.id}">
        <h4>${course.title}</h4>
        <p class="muted">${course.summary}</p>
        <div class="meta"><span>Прогресс: ${course.progress}</span><span>${course.duration}</span></div>
      </button>
    `
    )
    .join('');

  view.innerHTML = `
    <section class="section page-enter">
      <div class="section-title"><h3>Текущие курсы</h3><span class="muted">${academyData.courses.length} программы</span></div>
      <div class="cards">${courses}</div>
    </section>
  `;
}

function renderLibrary() {
  const items = academyData.library
    .map(
      (item) => `
      <button class="card action-card" data-action="open-detail" data-group="library" data-id="${item.id}">
        <span class="pill success">${item.tag}</span>
        <h4>${item.title}</h4>
        <p class="muted">${item.meta}</p>
      </button>
    `
    )
    .join('');

  view.innerHTML = `
    <section class="section page-enter">
      <div class="section-title"><h3>База знаний из открытых источников</h3><span class="muted">${academyData.library.length} материала</span></div>
      <div class="cards">${items}</div>
    </section>
  `;
}

function renderProfile() {
  const actions = academyData.profileActions
    .map(
      (item) => `
      <button class="card action-card" data-action="open-detail" data-group="profileActions" data-id="${item.id}">
        <h4>${item.title}</h4>
        <p class="muted">${item.subtitle}</p>
      </button>
    `
    )
    .join('');

  view.innerHTML = `
    <section class="section profile page-enter">
      <div class="avatar">AA</div>
      <h3>Алексей, мастер-стажёр</h3>
      <p class="muted">Прогресс обучения: 38%</p>
      <div class="progress"><span style="width: 38%"></span></div>
    </section>

    <section class="section page-enter">
      <div class="section-title"><h3>Статистика</h3></div>
      <div class="stats">
        <article><p class="big">12</p><p class="muted">уроков пройдено</p></article>
        <article><p class="big">3</p><p class="muted">теста сдано</p></article>
        <article><p class="big">2</p><p class="muted">сертификата</p></article>
      </div>
    </section>

    <section class="section page-enter">
      <div class="section-title"><h3>Полезное</h3></div>
      <div class="cards">${actions}</div>
    </section>
  `;
}

function openDetail(group, id) {
  const item = academyData[group].find((entry) => entry.id === id);
  if (!item) {
    return;
  }

  if (group === 'courses') {
    renderCourseDetail(item);
    return;
  }

  if (group === 'library') {
    renderLibraryDetail(item);
    return;
  }

  renderSimpleDetail(item);
}

function renderSimpleDetail(item) {
  const paragraphs = item.content.map((line) => `<li>${line}</li>`).join('');

  view.innerHTML = `
    <section class="section page-enter">
      <button class="back-btn" data-action="go-back">← Назад</button>
      <h3 class="detail-title">${item.title}</h3>
      ${item.subtitle ? `<p class="muted">${item.subtitle}</p>` : ''}
      <ul class="detail-list">${paragraphs}</ul>
    </section>
  `;
}

function renderCourseDetail(course) {
  const lessons = course.lessons
    .map(
      (lesson) => `
      <button class="card action-card" data-action="open-lesson" data-course-id="${course.id}" data-id="${lesson.id}">
        <h4>${lesson.title}</h4>
        <p class="muted">Открыть конспект урока</p>
      </button>
    `
    )
    .join('');

  view.innerHTML = `
    <section class="section page-enter">
      <button class="back-btn" data-action="go-back">← Назад</button>
      <h3 class="detail-title">${course.title}</h3>
      <p class="muted">${course.summary}</p>
      <div class="meta"><span>Прогресс: ${course.progress}</span><span>${course.duration}</span></div>
    </section>

    <section class="section page-enter">
      <div class="section-title"><h3>Уроки курса</h3></div>
      <div class="cards">${lessons}</div>
    </section>
  `;
}

function openLesson(courseId, lessonId) {
  const course = academyData.courses.find((item) => item.id === courseId);
  const lesson = course?.lessons.find((item) => item.id === lessonId);
  if (!course || !lesson) {
    return;
  }

  view.innerHTML = `
    <section class="section page-enter">
      <button class="back-btn" data-action="open-detail" data-group="courses" data-id="${course.id}">← К курсу</button>
      <p class="muted">${course.title}</p>
      <h3 class="detail-title">${lesson.title}</h3>
      <p>${lesson.text}</p>
    </section>
  `;
}

function renderLibraryDetail(item) {
  const points = item.points.map((line) => `<li>${line}</li>`).join('');
  view.innerHTML = `
    <section class="section page-enter">
      <button class="back-btn" data-action="go-back">← Назад</button>
      <h3 class="detail-title">${item.title}</h3>
      <p class="muted">Источник: ${item.tag}</p>
      <ul class="detail-list">${points}</ul>
      <a class="source-link" href="${item.source}" target="_blank" rel="noopener noreferrer">Открыть источник</a>
    </section>
  `;
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
