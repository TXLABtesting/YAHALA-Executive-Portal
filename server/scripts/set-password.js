/**
 * Changes the shared administrator password.
 *   node scripts/set-password.js "new password" [username]
 */
import { setAdminPassword } from '../src/auth.js';
import { pool } from '../src/db/index.js';
import { config } from '../src/config.js';

const password = process.argv[2];
const username = process.argv[3] || config.adminUsername;

if (!password) {
  console.error('Usage: node scripts/set-password.js "new password" [username]');
  process.exit(1);
}

await setAdminPassword(username, password);
console.log(`Password updated for "${username}".`);
await pool.end();
