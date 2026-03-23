import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const envFile = resolve(rootDir, '.env');
const fileEnv = readEnvFile(envFile);

export const config = {
  rootDir,
  port: toInteger(getEnvValue('APP_PORT', '4173'), 4173),
  databasePath: resolve(rootDir, getEnvValue('SQLITE_DB_PATH', 'data/anaelacademy.sqlite')),
  storageRoot: resolve(rootDir, getEnvValue('STORAGE_ROOT', 'storage')),
  publicStorageOrigin: normalizeOrigin(getEnvValue('PUBLIC_STORAGE_ORIGIN', '')),
  presentationPreviewRoot: resolve(
    rootDir,
    getEnvValue('PRESENTATION_PREVIEW_ROOT', 'data/presentation-previews')
  ),
  publicStoragePrefix: '/storage/',
  publicPresentationPreviewPrefix: '/presentation-previews/'
};

export function ensureRuntimeDirectories() {
  mkdirSync(dirname(config.databasePath), { recursive: true });
  mkdirSync(config.storageRoot, { recursive: true });
  mkdirSync(config.presentationPreviewRoot, { recursive: true });
}

function getEnvValue(name, fallback) {
  return process.env[name] ?? fileEnv[name] ?? fallback;
}

function readEnvFile(filepath) {
  if (!existsSync(filepath)) {
    return {};
  }

  return readFileSync(filepath, 'utf8')
    .split(/\r?\n/u)
    .reduce((accumulator, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return accumulator;
      }

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex < 0) {
        return accumulator;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      accumulator[key] = value;
      return accumulator;
    }, {});
}

function toInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/+$/u, '');
}
