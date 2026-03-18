export const dashboardData = {
  brand: {
    eyebrow: 'Учебная платформа',
    title: 'Академия студий лазерной эпиляции Annaelle',
    subtitle: 'Мобильная программа обучения для команды студий Annaelle'
  },
  categories: [
    {
      id: 'courses',
      title: 'Курсы',
      type: 'courses',
      description: 'Видеоуроки, тесты и пошаговое открытие модулей',
      badge: '21 урок',
      isActive: true,
      sortOrder: 1
    },
    {
      id: 'presentations',
      title: 'Презентации',
      type: 'presentations',
      description: 'Материалы к урокам и визуальные опорные файлы',
      badge: 'Материалы',
      isActive: true,
      sortOrder: 2
    },
    {
      id: 'protocols',
      title: 'Протоколы',
      type: 'placeholder',
      description: 'Скрипты и стандарты работы появятся в следующих релизах',
      badge: 'Скоро',
      isActive: false,
      sortOrder: 3
    },
    {
      id: 'cases',
      title: 'Кейсы',
      type: 'placeholder',
      description: 'Разборы ситуаций и библиотека практических сценариев',
      badge: 'Скоро',
      isActive: false,
      sortOrder: 4
    }
  ],
  inviteLink: 'https://t.me/share/url?url=academy-laser'
};

const lessonBlueprints = [
  {
    dayNumber: 1,
    lessonNumber: 1,
    title: 'Введение в курс и формат обучения',
    duration: '07:30',
    description:
      'Разбираем структуру программы, последовательность уроков и правила работы с локальной базой материалов.',
    objectives: [
      'Понять структуру курса на 2 дня и 21 урок',
      'Зафиксировать формат хранения видео и презентаций',
      'Подготовиться к последовательному прохождению материалов'
    ]
  },
  {
    dayNumber: 1,
    lessonNumber: 2,
    title: 'Подготовка рабочего места и оборудования',
    duration: '10:10',
    description:
      'Проверяем рабочую зону, технику и расходные материалы перед началом учебной практики.',
    objectives: [
      'Подготовить рабочее место без пропусков',
      'Проверить базовую готовность оборудования',
      'Снизить риск ошибок на старте обучения'
    ]
  },
  {
    dayNumber: 1,
    lessonNumber: 3,
    title: 'Стандарты безопасности и противопоказания',
    duration: '11:20',
    description:
      'Собираем ключевые требования к безопасности, ограничениям и предварительной оценке ситуации.',
    objectives: [
      'Запомнить критичные правила безопасности',
      'Научиться отсекать противопоказания',
      'Фиксировать риски до начала процедуры'
    ]
  },
  {
    dayNumber: 1,
    lessonNumber: 4,
    title: 'Первичная консультация клиента',
    duration: '09:40',
    description:
      'Отрабатываем сценарий первой консультации, сбор анамнеза и фиксацию ожиданий клиента.',
    objectives: [
      'Задать обязательные вопросы клиенту',
      'Собрать вводные для выбора протокола',
      'Корректно объяснить дальнейшие шаги'
    ]
  },
  {
    dayNumber: 1,
    lessonNumber: 5,
    title: 'Подготовка клиента к процедуре',
    duration: '08:50',
    description:
      'Показываем, как подготовить клиента к занятию и не потерять обязательные этапы перед стартом.',
    objectives: [
      'Проверить готовность клиента',
      'Соблюсти протокол подготовки',
      'Обеспечить понятный и безопасный старт'
    ]
  },
  {
    dayNumber: 1,
    lessonNumber: 6,
    title: 'Базовые настройки аппарата',
    duration: '12:00',
    description:
      'Разбираем стартовые параметры, режимы работы и проверку оборудования перед использованием.',
    objectives: [
      'Понять базовые параметры аппарата',
      'Не запускать оборудование без проверки',
      'Фиксировать выбранные настройки'
    ]
  },
  {
    dayNumber: 1,
    lessonNumber: 7,
    title: 'Выбор режима под задачу урока',
    duration: '09:15',
    description:
      'Учимся сопоставлять задачу урока, особенности клиента и рабочий режим аппарата.',
    objectives: [
      'Связать задачу урока с режимом работы',
      'Избегать шаблонного выбора настроек',
      'Учитывать вводные конкретного кейса'
    ]
  },
  {
    dayNumber: 1,
    lessonNumber: 8,
    title: 'Тестовый проход и контроль реакции',
    duration: '10:45',
    description:
      'Проводим тестовый участок, наблюдаем реакцию и корректируем действия до основной работы.',
    objectives: [
      'Провести тестовый проход по протоколу',
      'Считать реакцию и вовремя остановиться',
      'Подготовить решение по дальнейшей работе'
    ]
  },
  {
    dayNumber: 1,
    lessonNumber: 9,
    title: 'Типовые ошибки первого дня',
    duration: '08:35',
    description:
      'Разбираем ошибки новичков, признаки неправильной настройки и способы быстро исправить сценарий.',
    objectives: [
      'Распознать типовые ошибки первого дня',
      'Понять, как быстро скорректировать сценарий',
      'Не повторять критичные сбои в работе'
    ]
  },
  {
    dayNumber: 1,
    lessonNumber: 10,
    title: 'Итог дня 1 и контрольный разбор',
    duration: '07:55',
    description:
      'Подводим итоги первого дня, закрепляем основные правила и готовим переход к следующему блоку.',
    objectives: [
      'Подвести итоги первого дня обучения',
      'Закрепить ключевые правила и шаги',
      'Подготовиться к практическому блоку второго дня'
    ]
  },
  {
    dayNumber: 2,
    lessonNumber: 1,
    title: 'Старт второго дня и повтор ключевых правил',
    duration: '07:40',
    description:
      'Кратко повторяем обязательные требования и готовим участников ко второму дню курса.',
    objectives: [
      'Восстановить контекст после первого дня',
      'Повторить обязательные правила допуска',
      'Настроиться на практический блок'
    ]
  },
  {
    dayNumber: 2,
    lessonNumber: 2,
    title: 'Подбор параметров под разные сценарии',
    duration: '11:05',
    description:
      'Разбираем, как меняются параметры в зависимости от сценария, зоны и вводных условий.',
    objectives: [
      'Сравнить разные сценарии настройки',
      'Учитывать контекст при выборе параметров',
      'Избежать неверных универсальных решений'
    ]
  },
  {
    dayNumber: 2,
    lessonNumber: 3,
    title: 'Работа по зонам: лицо и малые участки',
    duration: '09:25',
    description:
      'Фокусируемся на малых зонах и аккуратной технике ведения процедуры на чувствительных участках.',
    objectives: [
      'Понять особенности малых зон',
      'Подобрать щадящий и точный сценарий',
      'Соблюдать аккуратную технику работы'
    ]
  },
  {
    dayNumber: 2,
    lessonNumber: 4,
    title: 'Работа по зонам: тело и крупные участки',
    duration: '10:30',
    description:
      'Показываем логику ведения процедуры на крупных зонах, темп работы и контроль повторов.',
    objectives: [
      'Выстроить последовательность работы на крупных зонах',
      'Поддерживать стабильный рабочий темп',
      'Избегать пропусков и лишних повторов'
    ]
  },
  {
    dayNumber: 2,
    lessonNumber: 5,
    title: 'Коммуникация во время процедуры',
    duration: '08:20',
    description:
      'Учимся сопровождать клиента во время работы, предупреждать о шагах и корректно реагировать на обратную связь.',
    objectives: [
      'Поддерживать спокойную коммуникацию',
      'Своевременно объяснять этапы работы',
      'Собирать обратную связь по самочувствию'
    ]
  },
  {
    dayNumber: 2,
    lessonNumber: 6,
    title: 'Работа с чувствительностью и дискомфортом',
    duration: '09:55',
    description:
      'Разбираем, как оценивать дискомфорт, когда снижать интенсивность и когда останавливать сценарий.',
    objectives: [
      'Распознавать признаки повышенной чувствительности',
      'Корректировать сценарий без риска',
      'Вовремя останавливать небезопасную работу'
    ]
  },
  {
    dayNumber: 2,
    lessonNumber: 7,
    title: 'Постпроцедурные рекомендации',
    duration: '07:50',
    description:
      'Формируем список рекомендаций после завершения процедуры и учимся объяснять ограничения клиенту.',
    objectives: [
      'Выдать понятные рекомендации после процедуры',
      'Объяснить ограничения и уход',
      'Закрепить дальнейшие действия клиента'
    ]
  },
  {
    dayNumber: 2,
    lessonNumber: 8,
    title: 'Документация и фиксация результатов',
    duration: '08:45',
    description:
      'Показываем, какие данные нужно сохранить после урока и как не потерять результаты обучения.',
    objectives: [
      'Фиксировать результаты по каждому уроку',
      'Сохранять важные параметры и замечания',
      'Поддерживать понятную историю прохождения'
    ]
  },
  {
    dayNumber: 2,
    lessonNumber: 9,
    title: 'Разбор сложных кейсов и отклонений',
    duration: '10:15',
    description:
      'Смотрим на нестандартные случаи, отклонения от привычного сценария и безопасные решения.',
    objectives: [
      'Разобрать нестандартные кейсы',
      'Понять границы самостоятельных решений',
      'Выбирать безопасный вариант действий'
    ]
  },
  {
    dayNumber: 2,
    lessonNumber: 10,
    title: 'Итоговая практика второго дня',
    duration: '12:20',
    description:
      'Объединяем все изученные шаги во второй день и проверяем стабильность практического сценария.',
    objectives: [
      'Собрать полный практический сценарий',
      'Проверить стабильность выполнения шагов',
      'Подготовиться к финальной проверке'
    ]
  },
  {
    dayNumber: 2,
    lessonNumber: 11,
    title: 'Финальное резюме курса и допуск к экзамену',
    duration: '06:55',
    description:
      'Подводим итог двухдневного обучения, закрываем вопросы и фиксируем готовность к финальному экзамену.',
    objectives: [
      'Собрать общую картину курса',
      'Убедиться в готовности к финальной проверке',
      'Зафиксировать завершение всех уроков'
    ]
  }
];

const fallbackVideoNote =
  'Видео можно добавить вручную в локальное storage. После загрузки файла выполните синхронизацию, и урок автоматически получит ссылку на видео.';

const lessonCoverAccents = ['bronze', 'sand', 'olive', 'charcoal'];

function buildLessonFullDescription(lessonBlueprint) {
  const focus = lessonBlueprint.objectives
    .slice(0, 2)
    .map((item) => item.replace(/\.$/u, '').trim())
    .filter(Boolean)
    .join(', ');

  return focus
    ? `${lessonBlueprint.description} В этом уроке команда Annaelle Academy делает акцент на следующих результатах: ${focus}.`
    : lessonBlueprint.description;
}

function getSpeakerName(dayNumber) {
  return dayNumber === 1 ? 'Аннаэль Academy Team' : 'Практикующий тренер Annaelle';
}

function getLessonPublishedAt(order) {
  const baseDate = new Date(Date.UTC(2025, 8, 1, 9, 0, 0));
  baseDate.setUTCDate(baseDate.getUTCDate() + order - 1);
  return baseDate.toISOString();
}

function getCoverAccent(order) {
  return lessonCoverAccents[(order - 1) % lessonCoverAccents.length];
}

export function createFallbackCourseData() {
  const lessons = lessonBlueprints.map((lessonBlueprint, index) => {
    const order = index + 1;
    const id = `lesson-${order}`;
    const shortDescription = lessonBlueprint.description;
    return {
      id,
      order,
      dayNumber: lessonBlueprint.dayNumber,
      lessonNumber: lessonBlueprint.lessonNumber,
      title: lessonBlueprint.title,
      duration: lessonBlueprint.duration,
      durationSeconds: null,
      description: shortDescription,
      shortDescription,
      fullDescription: buildLessonFullDescription(lessonBlueprint),
      speakerName: getSpeakerName(lessonBlueprint.dayNumber),
      categoryId: 'courses',
      isPublished: true,
      publishedAt: getLessonPublishedAt(order),
      objectives: lessonBlueprint.objectives,
      status: 'published',
      createdAt: null,
      updatedAt: null,
      storage: {
        provider: 'local',
        folder: `storage/day-${lessonBlueprint.dayNumber}/lesson-${lessonBlueprint.lessonNumber}`
      },
      cover: {
        src: '',
        relativePath: '',
        alt: `Обложка урока «${lessonBlueprint.title}»`,
        accent: getCoverAccent(order),
        badge: `Урок ${order}`
      },
      video: {
        src: '',
        relativePath: '',
        completionThreshold: 1,
        placeholderNote: fallbackVideoNote,
        durationSeconds: null
      },
      presentation: {
        href: '',
        relativePath: '',
        fileName: '',
        label: 'Скачать PPTX',
        description: `Материал к уроку ${order}`
      },
      quiz: createLessonQuiz({
        id,
        order,
        title: lessonBlueprint.title,
        dayNumber: lessonBlueprint.dayNumber,
        objective: lessonBlueprint.objectives[0]
      })
    };
  });

  const days = [1, 2].map((dayNumber) => {
    const dayLessons = lessons.filter((lesson) => lesson.dayNumber === dayNumber);
    return {
      id: `day-${dayNumber}`,
      number: dayNumber,
      title: dayNumber === 1 ? 'День 1. Базовая подготовка' : 'День 2. Практика и завершение',
      description:
        dayNumber === 1
          ? 'Первый день посвящен подготовке, безопасности и базовым рабочим сценариям.'
          : 'Второй день посвящен практике, сложным ситуациям и итоговому закреплению.',
      lessonIds: dayLessons.map((lesson) => lesson.id)
    };
  });

  return {
    id: 'annaelle-laser-academy',
    title: 'Академия студий лазерной эпиляции Annaelle',
    description:
      'Последовательная программа обучения для команды студий Annaelle: урок, просмотр видео, тест и только затем доступ к следующему модулю.',
    days,
    lessons,
    finalExam: createFinalExam(),
    meta: {
      source: 'fallback',
      database: 'memory',
      storageProvider: 'local',
      brand: 'Annaelle Laser Academy'
    }
  };
}

function createLessonQuiz({ id, order, title, dayNumber, objective }) {
  return {
    id: `${id}-quiz`,
    title: `Мини-тест по уроку ${order}`,
    passingScore: 2,
    questions: [
      {
        id: `${id}-q1`,
        prompt: 'К какому дню относится текущий урок?',
        options: [
          { id: `${id}-q1-a`, label: 'День 1' },
          { id: `${id}-q1-b`, label: 'День 2' },
          { id: `${id}-q1-c`, label: 'День 3' }
        ],
        correctOptionId: `${id}-q1-${dayNumber === 1 ? 'a' : 'b'}`
      },
      {
        id: `${id}-q2`,
        prompt: 'Что нужно сделать, чтобы открыть следующий урок?',
        options: [
          { id: `${id}-q2-a`, label: 'Полностью посмотреть видео и пройти мини-тест' },
          { id: `${id}-q2-b`, label: 'Просто открыть страницу урока' },
          { id: `${id}-q2-c`, label: 'Перейти сразу к финальному экзамену' }
        ],
        correctOptionId: `${id}-q2-a`
      },
      {
        id: `${id}-q3`,
        prompt: 'Где должна лежать презентация урока?',
        options: [
          { id: `${id}-q3-a`, label: 'В папке конкретного урока внутри storage' },
          { id: `${id}-q3-b`, label: 'Только в localStorage браузера' },
          { id: `${id}-q3-c`, label: 'Внутри app.js рядом с HTML' }
        ],
        correctOptionId: `${id}-q3-a`
      }
    ]
  };
}

function createFinalExam() {
  return {
    id: 'final-exam',
    title: 'Финальный экзамен по курсу',
    description:
      'Итоговая проверка по структуре курса, правилам доступа к материалам и базовым требованиям к прохождению.',
    passingScore: 3,
    questions: [
      {
        id: 'final-exam-q1',
        prompt: 'Сколько дней в текущем курсе?',
        options: [
          { id: 'final-exam-q1-a', label: '1 день' },
          { id: 'final-exam-q1-b', label: '2 дня' },
          { id: 'final-exam-q1-c', label: '5 дней' }
        ],
        correctOptionId: 'final-exam-q1-b'
      },
      {
        id: 'final-exam-q2',
        prompt: 'Сколько уроков входит в курс?',
        options: [
          { id: 'final-exam-q2-a', label: '21 урок' },
          { id: 'final-exam-q2-b', label: '10 уроков' },
          { id: 'final-exam-q2-c', label: '30 уроков' }
        ],
        correctOptionId: 'final-exam-q2-a'
      },
      {
        id: 'final-exam-q3',
        prompt: 'Где должны храниться локальные материалы урока?',
        options: [
          { id: 'final-exam-q3-a', label: 'В папке storage/day-N/lesson-N' },
          { id: 'final-exam-q3-b', label: 'Внутри app.js как base64' },
          { id: 'final-exam-q3-c', label: 'Только в localStorage браузера' }
        ],
        correctOptionId: 'final-exam-q3-a'
      },
      {
        id: 'final-exam-q4',
        prompt: 'Что открывает доступ к следующему уроку?',
        options: [
          { id: 'final-exam-q4-a', label: 'Только просмотр списка уроков' },
          { id: 'final-exam-q4-b', label: 'Полный просмотр видео и успешный мини-тест' },
          { id: 'final-exam-q4-c', label: 'Любая попытка отправить экзамен' }
        ],
        correctOptionId: 'final-exam-q4-b'
      }
    ]
  };
}
