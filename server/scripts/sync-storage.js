import { syncStorageWithDatabase } from '../services/course-service.js';

const updates = syncStorageWithDatabase();

console.log(`Синхронизировано уроков: ${updates.length}`);
updates.forEach((update) => {
  console.log(
    `${update.lessonId}: folder=${update.folder} video=${update.videoPath || '-'} presentation=${update.presentationPath || '-'}`
  );
});
