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
  const response = await fetch('/api/bootstrap', {
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
    source: 'api',
    course: academyCourse,
    dashboard: dashboardData
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
