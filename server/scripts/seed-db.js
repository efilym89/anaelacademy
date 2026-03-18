import { config } from '../config.js';
import { initializeCourseData } from '../services/course-service.js';

initializeCourseData({ forceReseed: true });

console.log(`SQLite база подготовлена: ${config.databasePath}`);
console.log(`Папка storage подготовлена: ${config.storageRoot}`);
