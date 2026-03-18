import { DatabaseSync } from 'node:sqlite';
import { config, ensureRuntimeDirectories } from '../config.js';

let database;

export function getDatabase() {
  if (!database) {
    ensureRuntimeDirectories();
    database = new DatabaseSync(config.databasePath);
    database.exec('PRAGMA foreign_keys = ON;');
    database.exec('PRAGMA journal_mode = WAL;');
  }

  return database;
}
