import { Router } from 'express';
import { query, withTransaction } from '../db/index.js';
import { requireAdmin } from '../auth.js';
import { normalizeFileField } from '../uploads.js';
import {
  CATEGORIES,
  SOURCES,
  STATUSES,
  intIn,
  merchantOut,
  oneOf,
  textIn,
} from '../mappers.js';

export const merchantsRouter = Router();

const SELECT = 'SELECT * FROM merchants';
const ORDER = 'ORDER BY created_at DESC, id DESC';

/** A merchant marked Inactive belongs in the archive, wherever it came from. */
const bodyToRow = (body) => {
  const status = oneOf(textIn(body.status, 'Live'), STATUSES);
  return {
    name: textIn(body.name).trim(),
    category: oneOf(textIn(body.category), CATEGORIES),
    sub: textIn(body.sub),
    offerType: textIn(body.offerType),
    offerDesc: textIn(body.offerDesc),
    offers: intIn(body.offers, 1),
    offerSource: oneOf(textIn(body.offerSource), SOURCES),
    status,
    city: textIn(body.city),
    logo: normalizeFileField(body.logo),
    reason: textIn(body.reason),
    expiryLabel: textIn(body.expiryLabel),
    archived: status === 'Inactive',
  };
};

async function syncMerchantCount(client) {
  await client.query(
    'UPDATE kpi SET merchants = (SELECT count(*) FROM merchants WHERE NOT archived) WHERE id = 1',
  );
}

merchantsRouter.get('/', async (req, res, next) => {
  try {
    const archived = req.query.archived === 'true';
    const { rows } = await query(`${SELECT} WHERE archived = $1 ${ORDER}`, [archived]);
    res.json(rows.map(merchantOut));
  } catch (err) {
    next(err);
  }
});

merchantsRouter.post('/', requireAdmin, async (req, res, next) => {
  try {
    const m = bodyToRow(req.body || {});
    if (!m.name) return res.status(400).json({ error: 'Merchant name is required.' });

    const row = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO merchants
           (name, category, sub, offer_type, offer_desc, offers, offer_source,
            status, city, logo, reason, expiry_label, archived)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [
          m.name, m.category, m.sub, m.offerType, m.offerDesc, m.offers, m.offerSource,
          m.status, m.city, m.logo, m.reason, m.expiryLabel, m.archived,
        ],
      );
      await syncMerchantCount(client);
      return rows[0];
    });
    res.status(201).json(merchantOut(row));
  } catch (err) {
    next(err);
  }
});

merchantsRouter.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const m = bodyToRow(req.body || {});
    if (!m.name) return res.status(400).json({ error: 'Merchant name is required.' });

    const row = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE merchants SET
           name = $2, category = $3, sub = $4, offer_type = $5, offer_desc = $6,
           offers = $7, offer_source = $8, status = $9, city = $10, logo = $11,
           reason = $12, expiry_label = $13, archived = $14, updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [
          req.params.id, m.name, m.category, m.sub, m.offerType, m.offerDesc, m.offers,
          m.offerSource, m.status, m.city, m.logo, m.reason, m.expiryLabel, m.archived,
        ],
      );
      await syncMerchantCount(client);
      return rows[0];
    });
    if (!row) return res.status(404).json({ error: 'Merchant not found.' });
    res.json(merchantOut(row));
  } catch (err) {
    next(err);
  }
});

merchantsRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const deleted = await withTransaction(async (client) => {
      const { rowCount } = await client.query('DELETE FROM merchants WHERE id = $1', [
        req.params.id,
      ]);
      await syncMerchantCount(client);
      return rowCount;
    });
    if (!deleted) return res.status(404).json({ error: 'Merchant not found.' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
