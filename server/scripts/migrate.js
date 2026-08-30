/**
 * Creates (or with --drop, recreates) every table in schema.sql.
 *   node scripts/migrate.js [--drop]
 */
import { applySchema, pool, query } from '../src/db/index.js';

const TABLES = [
  'spotlight_pool',
  'spotlight',
  'newsletters',
  'launches',
  'updates',
  'redeemers',
  'accommodation',
  'kpi',
  'settings',
  'merchants',
  'credentials',
];

async function main() {
  if (process.argv.includes('--drop')) {
    await query(`DROP TABLE IF EXISTS ${TABLES.join(', ')} CASCADE`);
    console.log('Dropped existing tables.');
  }
  await applySchema();
  console.log('Schema applied.');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
