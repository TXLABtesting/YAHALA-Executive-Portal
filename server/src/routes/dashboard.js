import { Router } from 'express';
import { query, withTransaction } from '../db/index.js';
import { requireAdmin } from '../auth.js';
import { accommodationOut, dateIn, intIn, kpiOut } from '../mappers.js';

export const dashboardRouter = Router();

/* ----------------------------------------------------------------- KPIs -- */

export async function readKpis() {
  const { rows } = await query('SELECT * FROM kpi WHERE id = 1');
  return kpiOut(rows[0]);
}

dashboardRouter.get('/kpis', async (_req, res, next) => {
  try {
    res.json(await readKpis());
  } catch (err) {
    next(err);
  }
});

dashboardRouter.put('/kpis', requireAdmin, async (req, res, next) => {
  try {
    const b = req.body || {};
    const current = await readKpis();
    const next_ = {
      merchants: intIn(b.merchants, current.merchants),
      offers: intIn(b.offers, current.offers),
      categories: intIn(b.categories, current.categories),
      active: intIn(b.active, current.active),
      newUsers: intIn(b.newUsers, current.newUsers),
      redemptions: intIn(b.redemptions, current.redemptions),
    };
    const { rows } = await query(
      `UPDATE kpi SET merchants = $1, offers = $2, categories = $3,
                      active = $4, new_users = $5, redemptions = $6
       WHERE id = 1 RETURNING *`,
      [next_.merchants, next_.offers, next_.categories, next_.active, next_.newUsers, next_.redemptions],
    );
    res.json(kpiOut(rows[0]));
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------ spotlight -- */

export async function readSpotlight() {
  const [{ rows: settings }, { rows: pool }] = await Promise.all([
    query('SELECT * FROM spotlight WHERE id = 1'),
    query('SELECT merchant_id FROM spotlight_pool ORDER BY position ASC, merchant_id ASC'),
  ]);
  return {
    pool: pool.map((r) => r.merchant_id),
    pinnedId: settings[0]?.pinned_id ?? null,
    autoRotate: settings[0]?.auto_rotate ?? true,
  };
}

dashboardRouter.get('/spotlight', async (_req, res, next) => {
  try {
    res.json(await readSpotlight());
  } catch (err) {
    next(err);
  }
});

dashboardRouter.put('/spotlight', requireAdmin, async (req, res, next) => {
  try {
    const b = req.body || {};
    const pool = Array.isArray(b.pool) ? b.pool.map((id) => intIn(id, 0)).filter(Boolean) : [];
    const pinnedId = b.pinnedId === null || b.pinnedId === '' ? null : intIn(b.pinnedId, 0) || null;
    const autoRotate = b.autoRotate !== false;

    await withTransaction(async (client) => {
      // The pool is small and fully replaced on every edit; a delete + insert
      // keeps the stored order exactly as the admin arranged it.
      await client.query('DELETE FROM spotlight_pool');
      for (const [i, id] of pool.entries()) {
        await client.query(
          `INSERT INTO spotlight_pool (merchant_id, position) VALUES ($1, $2)
           ON CONFLICT (merchant_id) DO UPDATE SET position = EXCLUDED.position`,
          [id, i],
        );
      }
      const pinnedInPool = pinnedId && pool.includes(pinnedId) ? pinnedId : null;
      await client.query('UPDATE spotlight SET pinned_id = $1, auto_rotate = $2 WHERE id = 1', [
        pinnedInPool,
        autoRotate,
      ]);
    });
    res.json(await readSpotlight());
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------- accommodation -- */

export async function readAccommodation() {
  const { rows } = await query('SELECT * FROM accommodation WHERE id = 1');
  return accommodationOut(rows[0]);
}

dashboardRouter.get('/accommodation', async (_req, res, next) => {
  try {
    res.json(await readAccommodation());
  } catch (err) {
    next(err);
  }
});

dashboardRouter.put('/accommodation', requireAdmin, async (req, res, next) => {
  try {
    const b = req.body || {};
    const current = await readAccommodation();
    const { rows } = await query(
      'UPDATE accommodation SET total = $1, from_date = $2, to_date = $3 WHERE id = 1 RETURNING *',
      [intIn(b.total, current.total), dateIn(b.from), dateIn(b.to)],
    );
    res.json(accommodationOut(rows[0]));
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------- settings -- */

export async function readSettings() {
  const { rows } = await query('SELECT key, value FROM settings');
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

dashboardRouter.get('/settings', async (_req, res, next) => {
  try {
    res.json(await readSettings());
  } catch (err) {
    next(err);
  }
});

dashboardRouter.put('/settings/:key', requireAdmin, async (req, res, next) => {
  try {
    const value = String(req.body?.value ?? '');
    await query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [req.params.key, value],
    );
    res.json(await readSettings());
  } catch (err) {
    next(err);
  }
});
