import path from 'node:path';
import { randomUUID } from 'node:crypto';

export function sanitizeFilename(filename: string): string {
  return path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function buildStorageKey(folder: string, extension: string): string {
  const year = new Date().getUTCFullYear();
  const month = String(new Date().getUTCMonth() + 1).padStart(2, '0');
  return `${folder}/${year}/${month}/${randomUUID()}.${extension}`;
}
