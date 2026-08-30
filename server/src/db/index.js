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
  connectionString: config.databaseUrl,
  ...(needsSsl ? { ssl: { rejectUnauthorized: Boolean(process.env.PGSSLROOTCERT) } } : null),
});

export function query(text, params) {
  return pool.query(text, params);
}

/** Runs `fn` inside a transaction, rolling back on any error. */
export async function withTransaction(fn) {
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
