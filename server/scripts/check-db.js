/**
 * Verifies that DATABASE_URL reaches a working PostgreSQL server and reports
 * what is already there. Run this before deploying to confirm a connection
 * string (Supabase, Neon, Render, a local server) is correct:
 *
 *   DATABASE_URL="postgresql://..." node scripts/check-db.js
 */
import { config } from '../src/config.js';
import { pool, query } from '../src/db/index.js';

const redact = (url) => url.replace(/:\/\/([^:]+):[^@]+@/, '://$1:****@');

async function main() {
  console.log(`Connecting to ${redact(config.databaseUrl)}`);

  const { rows: info } = await query(
    'SELECT current_database() AS db, current_user AS "user", version() AS version',
  );
  console.log(`Connected  ${info[0].db} as ${info[0].user}`);
  console.log(`Server     ${info[0].version.split(',')[0]}`);

  const { rows: tables } = await query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`,
  );

  if (!tables.length) {
    console.log('Tables     none yet — run `npm run migrate` then `npm run seed`.');
  } else {
    console.log(`Tables     ${tables.map((t) => t.table_name).join(', ')}`);
    const { rows: counts } = await query(
      `SELECT (SELECT count(*)::int FROM merchants WHERE NOT archived) AS live,
              (SELECT count(*)::int FROM merchants WHERE archived) AS archived,
              (SELECT count(*)::int FROM files) AS files`,
    );
    console.log(
      `Data       ${counts[0].live} live merchants, ${counts[0].archived} archived, ${counts[0].files} files`,
    );
  }

  await pool.end();
}

main().catch(async (err) => {
  console.error(`\nCould not connect: ${err.message}`);
  if (err.code === 'ENOTFOUND') {
    console.error('The host in DATABASE_URL does not resolve — check it for typos.');
  } else if (err.code === 'ENETUNREACH') {
    console.error(
      'The host resolved only to an IPv6 address. On Supabase use the connection\n' +
        'pooler string (aws-…pooler.supabase.com) rather than the direct db.… host.',
    );
  } else if (/password|authentication/i.test(err.message)) {
    console.error('The user or password in DATABASE_URL was rejected.');
  } else if (/self.signed|certificate/i.test(err.message)) {
    console.error('TLS was rejected — make sure the URL ends with ?sslmode=require.');
  }
  await pool.end().catch(() => {});
  process.exit(1);
});
