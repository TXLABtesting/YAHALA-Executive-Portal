/**
 * Regenerates db/import.sql — the whole database (schema and content) as one
 * script that can be pasted into a hosted SQL console.
 *
 *   npm run export:sql
 *
 * Runs pg_dump against DATABASE_URL, strips the psql meta-commands a browser
 * SQL console cannot execute, and leaves the credentials table empty so no
 * password ever lands in the file.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../src/config.js';
import { pool, query } from '../src/db/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(here, '..', '..', 'db', 'import.sql');

const HEADER = `-- ===========================================================================
--  YAHALA Executive Portal — database import
-- ===========================================================================
--  Run this ONCE against an empty database.
--  In Supabase: SQL Editor -> New query -> paste all of this -> Run.
--
--  It creates every table and loads the portal's content.
--
--  It deliberately creates NO administrator account. The first sign-in with
--  the ADMIN_USERNAME / ADMIN_PASSWORD you set on your hosting platform
--  creates one and stores its hash, so the password never appears in a file.
--
--  To reset that password later: change ADMIN_PASSWORD on the platform, run
--    DELETE FROM credentials;
--  here, and sign in again with the new password.
-- ===========================================================================

`;

const { rows } = await query('SELECT count(*)::int AS n FROM credentials');
if (rows[0].n > 0) {
  console.error(
    'Refusing to export: the credentials table has rows, and their hashes would\n' +
      'end up in the file. Run `DELETE FROM credentials;` first (the first sign-in\n' +
      'recreates the account from ADMIN_PASSWORD).',
  );
  await pool.end();
  process.exit(1);
}

const dump = execFileSync(
  'pg_dump',
  ['--inserts', '--no-owner', '--no-privileges', '--no-comments', config.databaseUrl],
  { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
);

// `\restrict` and friends are psql commands, not SQL; a browser console chokes.
const sql = dump
  .split('\n')
  .filter((line) => !line.startsWith('\\'))
  .join('\n');

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, HEADER + sql);

const kb = Math.round(fs.statSync(target).size / 1024);
console.log(`Wrote ${path.relative(process.cwd(), target)} (${kb} KB)`);
await pool.end();
