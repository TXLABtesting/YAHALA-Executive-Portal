import crypto from 'node:crypto';
import { query } from './db/index.js';

const EXTENSIONS = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'application/pdf': '.pdf',
};

const BY_EXTENSION = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
};

const MAX_BYTES = 8 * 1024 * 1024;

export const mimeForExtension = (ext) => BY_EXTENSION[String(ext).toLowerCase()] || null;

/**
 * Stores bytes in the files table and returns the URL they are served from.
 * The name is the content hash, so storing the same bytes twice is free.
 * Pass a transaction client as `db` to write on that connection.
 */
export async function storeBuffer(buffer, mime, db = { query }) {
  const extension = EXTENSIONS[mime];
  if (!extension) {
    throw Object.assign(new Error(`Unsupported file type: ${mime}`), { status: 415 });
  }
  if (!buffer.length) throw Object.assign(new Error('Empty file.'), { status: 400 });
  if (buffer.length > MAX_BYTES) {
    throw Object.assign(new Error('File is larger than 8 MB.'), { status: 413 });
  }

  const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 32);
  await db.query(
    `INSERT INTO files (hash, mime, extension, bytes, size)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (hash) DO NOTHING`,
    [hash, mime, extension, buffer, buffer.length],
  );
  return `/uploads/${hash}${extension}`;
}

export async function storeDataUri(dataUri, db) {
  const match = /^data:([a-zA-Z0-9/+.-]+);base64,([\s\S]+)$/.exec(String(dataUri || ''));
  if (!match) throw Object.assign(new Error('Expected a base64 data: URI.'), { status: 400 });
  return storeBuffer(Buffer.from(match[2], 'base64'), match[1], db);
}

/**
 * Accepts whatever the client sends for a file field and returns a value safe
 * to store: a data: URI is saved and replaced by its URL, an existing URL or
 * null passes through unchanged.
 */
export async function normalizeFileField(value, db) {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value);
  if (str.startsWith('data:')) return storeDataUri(str, db);
  return str;
}

export async function readFile(hash) {
  const { rows } = await query('SELECT mime, bytes FROM files WHERE hash = $1', [hash]);
  return rows[0] || null;
}
