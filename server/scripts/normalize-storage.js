import { normalizeImportedStorage } from '../services/storage-normalizer.js';

const actions = normalizeImportedStorage();

console.log(`Storage normalized. Changes: ${actions.length}`);
actions.slice(0, 50).forEach((action) => console.log(action));
