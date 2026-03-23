import {
  dashboardData as fallbackDashboardData,
  createFallbackCourseData
} from './shared/course-blueprint.js';

export const dashboardData = {
  brand: {
    eyebrow: '',
    title: '',
    subtitle: ''
  },
  categories: [],
  inviteLink: ''
};

export const academyCourse = {
  id: '',
  title: '',
  description: '',
  days: [],
  lessons: [],
  finalExam: {
    id: '',
    title: '',
    description: '',
    passingScore: 0,
    questions: []
  },
  meta: {}
};

export async function hydrateCourseData() {
  const bootstrapSources = [
    {
      source: 'api',
      url: new URL('./api/bootstrap', import.meta.url)
    },
    {
      source: 'static-bootstrap',
      url: new URL('./bootstrap-course.json', import.meta.url)
    }
  ];

  for (const bootstrapSource of bootstrapSources) {
    try {
      const response = await fetch(bootstrapSource.url, {
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Bootstrap request failed with status ${response.status}`);
      }

      const payload = await response.json();
      replaceObject(dashboardData, payload.dashboard);
      replaceObject(academyCourse, payload.course);

      return {
        source: bootstrapSource.source,
        course: academyCourse,
        dashboard: dashboardData
      };
    } catch (_) {
      // Try the next source.
    }
  }

  const payload = createStaticFallbackPayload();
  replaceObject(dashboardData, payload.dashboard);
  replaceObject(academyCourse, payload.course);

  return {
    source: 'static-fallback',
    course: academyCourse,
    dashboard: dashboardData
  };
}

function createStaticFallbackPayload() {
  const fallbackCourse = createFallbackCourseData();
  fallbackCourse.meta = {
    ...(fallbackCourse.meta ?? {}),
    source: 'static-fallback',
    database: 'none',
    storageProvider: 'static'
  };

  return {
    dashboard: clonePlain(fallbackDashboardData),
    course: clonePlain(fallbackCourse)
  };
}

function replaceObject(target, source) {
  Object.keys(target).forEach((key) => {
    delete target[key];
  });

  Object.assign(target, clonePlain(source));
}

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value));
}
