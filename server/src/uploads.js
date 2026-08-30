import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

const EXTENSIONS = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'application/pdf': '.pdf',
};

const MAX_BYTES = 8 * 1024 * 1024;

export function ensureUploadDir() {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

/**
 * Stores a `data:` URI on disk and returns its public URL. Files are named by
 * content hash, so re-uploading the same image is free and idempotent.
 */
export function storeDataUri(dataUri) {
  const match = /^data:([a-zA-Z0-9/+.-]+);base64,([\s\S]+)$/.exec(String(dataUri || ''));
  if (!match) throw Object.assign(new Error('Expected a base64 data: URI.'), { status: 400 });

  const [, mime, base64] = match;
  const ext = EXTENSIONS[mime];
  if (!ext) throw Object.assign(new Error(`Unsupported file type: ${mime}`), { status: 415 });

  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length) throw Object.assign(new Error('Empty file.'), { status: 400 });
  if (buffer.length > MAX_BYTES) {
    throw Object.assign(new Error('File is larger than 8 MB.'), { status: 413 });
  }

  const name = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 32) + ext;
  ensureUploadDir();
  const target = path.join(config.uploadDir, name);
  if (!fs.existsSync(target)) fs.writeFileSync(target, buffer);
  return `/uploads/${name}`;
}

/**
 * Accepts whatever the client sends for an image/file field and returns a value
 * safe to store: a data: URI becomes an uploaded file, an existing URL or null
 * passes through unchanged.
 */
export function normalizeFileField(value) {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value);
  if (str.startsWith('data:')) return storeDataUri(str);
  return str;
}
