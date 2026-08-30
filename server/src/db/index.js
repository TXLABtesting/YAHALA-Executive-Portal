import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from '../config.js';

const here = path.dirname(fileURLToPath(import.meta.url));

// Managed Postgres (Supabase, Neon, Render, RDS) requires TLS, and its
// certificate chain is usually not in the system trust store.
//
// The driver cannot be left to interpret `sslmode` itself: pg 8.23 treats
// `sslmode=require` as `verify-full` AND lets the connection string override an
// explicit `ssl` option, so a hosted database is rejected with
// "self-signed certificate". So the parameter is removed from the string and
// the TLS settings are stated here instead.
function buildPoolConfig(url) {
  if (!url) return { connectionString: undefined, ssl: false };

  const declared = /[?&]sslmode=([^&]*)/i.exec(url)?.[1]?.toLowerCase();
  const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);

  // TLS unless it is explicitly disabled or this is a local server.
  const useSsl =
    process.env.PGSSL === 'true' ||
    (declared ? declared !== 'disable' : !isLocal);

  const connectionString = url
    .replace(/([?&])sslmode=[^&]*(&|$)/gi, (_m, before, after) => (after === '&' ? before : ''))
    .replace(/[?&]$/, '');

  if (!useSsl) return { connectionString, ssl: false };

  // Verify the chain only when a CA bundle is supplied; otherwise encrypt
  // without verification, which is what `sslmode=require` means in libpq.
  const ca = process.env.PGSSLROOTCERT
    ? fs.readFileSync(process.env.PGSSLROOTCERT, 'utf8')
    : undefined;

  return { connectionString, ssl: { rejectUnauthorized: Boolean(ca), ...(ca ? { ca } : null) } };
}

export const pool = new pg.Pool({
  ...buildPoolConfig(config.databaseUrl),
  // Each serverless instance keeps its own pool, so it may hold only one
  // connection; a long-running server can use several.
  max: Number(process.env.PGPOOL_MAX) || (process.env.VERCEL ? 1 : 10),
});

function assertConfigured() {
  if (config.databaseUrl) return;
  throw Object.assign(
    new Error(
      'The database is not configured: DATABASE_URL is missing. Add it to the ' +
        'environment variables of your hosting platform and redeploy.',
    ),
    { status: 503, expose: true },
  );
}

export function query(text, params) {
  assertConfigured();
  return pool.query(text, params);
}

/** Runs `fn` inside a transaction, rolling back on any error. */
export async function withTransaction(fn) {
  assertConfigured();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function applySchema() {
  const sql = fs.readFileSync(path.join(here, 'schema.sql'), 'utf8');
  await pool.query(sql);
}
