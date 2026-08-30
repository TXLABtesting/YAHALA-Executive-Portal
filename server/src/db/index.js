import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from '../config.js';

const here = path.dirname(fileURLToPath(import.meta.url));

// Managed Postgres (Render, Neon, Supabase, RDS) requires TLS. Their
// certificates are issued by the provider rather than a public CA, so verify
// only when a CA bundle is supplied via PGSSLROOTCERT.
const needsSsl =
  /[?&]sslmode=(require|verify-ca|verify-full)/.test(config.databaseUrl) ||
  process.env.PGSSL === 'true';

export const pool = new pg.Pool({
  connectionString: config.databaseUrl || undefined,
  // Each serverless instance keeps its own pool, so it may hold only one
  // connection; a long-running server can use several.
  max: Number(process.env.PGPOOL_MAX) || (process.env.VERCEL ? 1 : 10),
  ...(needsSsl ? { ssl: { rejectUnauthorized: Boolean(process.env.PGSSLROOTCERT) } } : null),
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
