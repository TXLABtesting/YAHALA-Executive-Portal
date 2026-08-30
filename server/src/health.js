import { config } from './config.js';
import { query } from './db/index.js';

/**
 * Classifies a database failure into something an operator can act on, without
 * echoing the driver's message (which carries the host and user name).
 */
function diagnose(err) {
  const code = err.code || '';
  const message = String(err.message || '');

  if (code === 'ENOTFOUND') {
    return {
      database: 'host_not_found',
      hint: 'The host in DATABASE_URL does not resolve. Check it for typos.',
    };
  }
  if (code === 'ENETUNREACH') {
    return {
      database: 'unreachable',
      hint:
        'The host resolved only to an IPv6 address. On Supabase use the connection ' +
        'pooler URI (aws-…pooler.supabase.com), not the direct db.… host.',
    };
  }
  if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT') {
    return {
      database: 'unreachable',
      hint: 'Nothing answered on that host and port. Check the host and port in DATABASE_URL.',
    };
  }
  if (code === '28P01' || code === '28000') {
    return {
      database: 'authentication_failed',
      hint:
        'The database rejected the user or password. Re-copy the URI and put your ' +
        'database password in place of [YOUR-PASSWORD]; if it contains @ : / or ? ' +
        'those characters have to be percent-encoded.',
    };
  }
  if (code === '3D000') {
    return { database: 'not_found', hint: 'That database name does not exist on the server.' };
  }
  if (code === '42P01') {
    return {
      database: 'connected',
      schema: 'missing',
      hint:
        'Connected, but the tables do not exist yet. Run db/import.sql in the ' +
        'Supabase SQL Editor (or `npm run migrate && npm run seed`).',
    };
  }
  if (/self.signed|certificate|SSL|TLS/i.test(message)) {
    return {
      database: 'tls_rejected',
      hint: 'TLS was refused. Make sure DATABASE_URL ends with ?sslmode=require.',
    };
  }
  return { database: 'error', hint: 'The database could not be queried. See the server logs.' };
}

/**
 * Reports whether the portal can actually serve requests. Deliberately readable
 * without a session: it exposes configuration state, never data or secrets.
 */
export async function readHealth() {
  if (!config.databaseUrl) {
    return {
      ok: false,
      database: 'not_configured',
      hint: 'DATABASE_URL is not set. Add it to the environment and redeploy.',
    };
  }

  try {
    const { rows } = await query(
      `SELECT (SELECT count(*)::int FROM merchants WHERE NOT archived) AS merchants,
              (SELECT count(*)::int FROM credentials) AS administrators`,
    );
    const { merchants, administrators } = rows[0];
    return {
      ok: true,
      database: 'connected',
      schema: 'ready',
      merchants,
      administrators,
      hint:
        merchants === 0
          ? 'The tables exist but hold no merchants — run the import script.'
          : administrators === 0
            ? 'Ready. The first sign-in with ADMIN_PASSWORD will create the administrator.'
            : undefined,
    };
  } catch (err) {
    console.error('Health check failed:', err);
    return { ok: false, ...diagnose(err) };
  }
}
