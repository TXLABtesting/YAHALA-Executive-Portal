/**
 * Loads the portal's starting content into PostgreSQL: the merchant list
 * generated from the YAHALA and Entertainer spreadsheets (assets/data.js) plus
 * the dashboard defaults the prototype shipped with.
 *
 *   node scripts/seed.js [--force]
 *
 * Without --force the script refuses to run against a database that already
 * holds merchants, so it is safe to call from a setup script.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { setAdminPassword } from '../src/auth.js';
import { config } from '../src/config.js';
import { applySchema, pool, query, withTransaction } from '../src/db/index.js';
import { ensureUploadDir } from '../src/uploads.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const assetsDir = path.join(repoRoot, 'assets');

const force = process.argv.includes('--force');

/** Evaluates assets/data.js, which assigns onto `window`. */
function loadSeedData() {
  const file = path.join(assetsDir, 'data.js');
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  return {
    active: sandbox.window.YAHALA_SEED || [],
    archive: sandbox.window.YAHALA_ARCHIVE || [],
  };
}

/** Copies a bundled asset into the upload directory and returns its URL. */
function importAsset(relativePath) {
  const source = path.join(assetsDir, relativePath);
  if (!fs.existsSync(source)) return null;
  ensureUploadDir();
  const name = path.basename(relativePath);
  fs.copyFileSync(source, path.join(config.uploadDir, name));
  return `/uploads/${name}`;
}

const logoUrl = (logo) => (logo ? importAsset(path.relative('assets', logo) || logo) : null);

const DEFAULT_KPIS = {
  offers: 612,
  categories: 6,
  active: 48250,
  newUsers: 3180,
  redemptions: 126540,
};

const CURATED_SPOTLIGHT = [
  'Versace',
  'Mouawad Jewelry',
  'Michael Kors',
  'Lacoste',
  'Dsquared2',
  'Karl Lagerfeld',
  'Stella McCartney',
  'Faces',
];

const NEWSLETTERS = [
  {
    title: 'Summer Privileges',
    date: '2026-07-01',
    desc: "Merchant highlights, new partners and the season's most-redeemed offers across the network.",
    thumb: 'news_q3.jpg',
  },
  {
    title: 'Ramadan Collection',
    date: '2026-03-05',
    desc: 'Exclusive seasonal offers and curated experiences reserved for YAHALA members.',
    thumb: 'news_ramadan.jpg',
  },
  {
    title: 'Network Growth Report',
    date: '2026-04-18',
    desc: 'New merchants and category expansion across Fashion, Dining, Hotels and Leisure.',
    thumb: 'news_launch.jpg',
  },
];

const LAUNCHES = [
  { name: 'Atlantis The Royal', category: 'Hotel & Travel', date: '2026-07-20', stage: 'Ready for Launch' },
  { name: 'Nobu Dubai', category: 'Food & Drinks', date: '2026-08-02', stage: 'Offers Uploaded' },
  { name: 'Ounass', category: 'Fashion & Retail', date: '2026-08-14', stage: 'Artwork Received' },
  { name: 'Bvlgari Resort', category: 'Hotel & Travel', date: '2026-09-01', stage: 'Contract Signed' },
  { name: 'Rivoli EyeZone', category: 'Fashion & Retail', date: '2026-09-20', stage: 'Negotiation' },
];

const UPDATES = [
  { type: 'live', title: 'Versace is now live', detail: 'Fashion & Retail · 10% Off', time: '2h ago' },
  { type: 'offers', title: '12 new offers added', detail: 'Faces · Beauty', time: '5h ago' },
  { type: 'campaign', title: 'Ramadan Privileges campaign started', detail: 'Marketing', time: 'Yesterday' },
  { type: 'merchant', title: 'New merchant added: Nobu Dubai', detail: 'Food & Drinks', time: 'Yesterday' },
  { type: 'update', title: 'Mouawad Jewelry profile updated', detail: 'Featured merchant', time: '2 days ago' },
];

const REDEEMERS = [
  { name: 'Khalid Al Mansoori', redemptions: 142 },
  { name: 'Sara Haddad', redemptions: 128 },
  { name: 'Omar Farouk', redemptions: 117 },
  { name: 'Layla Nasser', redemptions: 103 },
  { name: 'James Whitfield', redemptions: 96 },
  { name: 'Aisha Rahman', redemptions: 88 },
  { name: 'Daniel Meyer', redemptions: 81 },
  { name: 'Fatima Zahra', redemptions: 74 },
];

const ACCOMMODATION = { total: 214, from: '2026-01-01', to: '2026-07-07' };

async function insertMerchants(client, rows, archived) {
  const ids = new Map();
  for (const m of rows) {
    const { rows: inserted } = await client.query(
      `INSERT INTO merchants
         (name, category, sub, offer_type, offer_desc, offers, offer_source,
          status, city, logo, reason, expiry_label, archived)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id, name`,
      [
        m.name || '',
        m.category || 'Fashion & Retail',
        m.sub || '',
        m.offerType || '',
        m.offerDesc || '',
        Number(m.offers) || 1,
        m.offerSource === 'Entertainer' ? 'Entertainer' : 'YAHALA Exclusive',
        archived ? 'Inactive' : m.status || 'Live',
        m.city || '',
        logoUrl(m.logo),
        m.reason || '',
        m.expiryLabel || '',
        archived,
      ],
    );
    if (!archived) ids.set(inserted[0].name.toLowerCase(), inserted[0].id);
  }
  return ids;
}

async function main() {
  await applySchema();

  const { rows: existing } = await query('SELECT count(*)::int AS n FROM merchants');
  if (existing[0].n > 0 && !force) {
    console.log(
      `Database already holds ${existing[0].n} merchants — nothing seeded. Re-run with --force to replace them.`,
    );
    await pool.end();
    return;
  }

  const { active, archive } = loadSeedData();

  await withTransaction(async (client) => {
    await client.query('DELETE FROM spotlight_pool');
    await client.query('UPDATE spotlight SET pinned_id = NULL WHERE id = 1');
    await client.query(
      'TRUNCATE merchants, newsletters, launches, updates, redeemers RESTART IDENTITY CASCADE',
    );

    const liveIds = await insertMerchants(client, active, false);
    await insertMerchants(client, archive, true);

    for (const [i, name] of CURATED_SPOTLIGHT.entries()) {
      const id = liveIds.get(name.toLowerCase());
      if (id) {
        await client.query(
          'INSERT INTO spotlight_pool (merchant_id, position) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [id, i],
        );
      }
    }

    for (const n of NEWSLETTERS) {
      await client.query(
        `INSERT INTO newsletters (title, issue_date, description, thumb)
         VALUES ($1,$2,$3,$4)`,
        [n.title, n.date, n.desc, importAsset(n.thumb)],
      );
    }

    for (const [i, l] of LAUNCHES.entries()) {
      await client.query(
        'INSERT INTO launches (name, category, expected_date, stage, position) VALUES ($1,$2,$3,$4,$5)',
        [l.name, l.category, l.date, l.stage, i],
      );
    }

    for (const [i, u] of UPDATES.entries()) {
      await client.query(
        'INSERT INTO updates (type, title, detail, time_label, position) VALUES ($1,$2,$3,$4,$5)',
        [u.type, u.title, u.detail, u.time, i],
      );
    }

    for (const [i, r] of REDEEMERS.entries()) {
      await client.query(
        'INSERT INTO redeemers (name, redemptions, position) VALUES ($1,$2,$3)',
        [r.name, r.redemptions, i],
      );
    }

    await client.query(
      `UPDATE kpi SET merchants = (SELECT count(*) FROM merchants WHERE NOT archived),
                      offers = $1, categories = $2, active = $3,
                      new_users = $4, redemptions = $5
       WHERE id = 1`,
      [
        DEFAULT_KPIS.offers,
        DEFAULT_KPIS.categories,
        DEFAULT_KPIS.active,
        DEFAULT_KPIS.newUsers,
        DEFAULT_KPIS.redemptions,
      ],
    );

    await client.query(
      'UPDATE accommodation SET total = $1, from_date = $2, to_date = $3 WHERE id = 1',
      [ACCOMMODATION.total, ACCOMMODATION.from, ACCOMMODATION.to],
    );
  });

  await setAdminPassword(config.adminUsername, config.adminPassword);

  const { rows: counts } = await query(
    `SELECT (SELECT count(*)::int FROM merchants WHERE NOT archived) AS live,
            (SELECT count(*)::int FROM merchants WHERE archived) AS archived`,
  );
  console.log(
    `Seeded ${counts[0].live} live merchants, ${counts[0].archived} archived, ` +
      `${NEWSLETTERS.length} newsletters, ${LAUNCHES.length} launches, ${REDEEMERS.length} redeemers.`,
  );
  console.log(`Administrator sign-in: ${config.adminUsername} / ${config.adminPassword}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
