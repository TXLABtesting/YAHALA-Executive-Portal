import { config } from './config.js';
import { query } from './db/index.js';

/**
 * Classifies a database failure into something an operator can act on, without
 * echoing the driver's message (which carries the host and user name).
 */
export function diagnose(err) {
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
  // Supabase's pooler (Supavisor) rejects an unknown tenant when the user name
  // is not in the postgres.<project-ref> form its URI uses.
  if (/tenant.*not found/i.test(message)) {
    return {
      database: 'authentication_failed',
      hint:
        'The connection pooler does not recognise that user. On the pooler the ' +
        'user name is postgres.<project-ref>, where the reference is your own ' +
        "project's (Supabase: Project Settings -> General -> Reference ID). Copy " +
        'the URI from the Connect dialog rather than typing it, and make sure no ' +
        'placeholder text is left in it.',
    };
  }
  if (/max client connections reached|too many clients/i.test(message)) {
    return {
      database: 'connection_limit',
      hint: 'The database refused more connections. Wait a moment and retry.',
    };
  }
  if (/timeout|ETIMEDOUT/i.test(message) || code === 'ETIMEDOUT') {
    return {
      database: 'unreachable',
      hint:
        'The connection timed out. Check the host and port, and prefer the ' +
        'connection pooler URI over the direct db.… host.',
    };
  }
  if (code === 'ECONNRESET' || code === 'EPIPE') {
    return {
      database: 'unreachable',
      hint: 'The connection was closed by the server. Check the host and port in DATABASE_URL.',
    };
  }
  if (/self.signed|certificate|SSL|TLS/i.test(message)) {
    return {
      database: 'tls_rejected',
      hint: 'TLS was refused. Make sure DATABASE_URL ends with ?sslmode=require.',
    };
  }
  // Nothing recognised. Report the driver's own words so the fault can be
  // identified at all — with anything password-shaped removed, and only ever
  // for a deployment that is already failing to reach its database.
  return {
    database: 'error',
    code: code || err.name || 'unknown',
    detail: message
      .replace(/password[^\s,;]*/gi, 'password=***')
      .replace(/\s+/g, ' ')
      .slice(0, 200),
    hint: 'The database could not be queried. Send this detail on for diagnosis.',
  };
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
