import { Router } from 'express';
import { query } from '../db/index.js';
import { requireAdmin } from '../auth.js';
import { textIn, updateOut } from '../mappers.js';

export const updatesRouter = Router();

const TYPES = ['live', 'merchant', 'offers', 'campaign', 'update'];

const bodyToRow = (b) => ({
  type: TYPES.includes(b.type) ? b.type : 'update',
  title: textIn(b.title).trim(),
  detail: textIn(b.detail),
  time: textIn(b.time),
});

updatesRouter.get('/', async (_req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM updates ORDER BY position ASC, id DESC');
    res.json(rows.map(updateOut));
  } catch (err) {
    next(err);
  }
});

updatesRouter.post('/', requireAdmin, async (req, res, next) => {
  try {
    const u = bodyToRow(req.body || {});
    if (!u.title) return res.status(400).json({ error: 'Title is required.' });
    // New updates lead the feed, like the "Just now" entries they usually are.
    const { rows } = await query(
      `INSERT INTO updates (type, title, detail, time_label, position)
       VALUES ($1,$2,$3,$4, COALESCE((SELECT min(position) FROM updates), 0) - 1)
       RETURNING *`,
      [u.type, u.title, u.detail, u.time],
    );
    res.status(201).json(updateOut(rows[0]));
  } catch (err) {
    next(err);
  }
});

updatesRouter.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const u = bodyToRow(req.body || {});
    if (!u.title) return res.status(400).json({ error: 'Title is required.' });
    const { rows } = await query(
      `UPDATE updates SET type = $2, title = $3, detail = $4, time_label = $5
       WHERE id = $1 RETURNING *`,
      [req.params.id, u.type, u.title, u.detail, u.time],
    );
    if (!rows.length) return res.status(404).json({ error: 'Update not found.' });
    res.json(updateOut(rows[0]));
  } catch (err) {
    next(err);
  }
});

updatesRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await query('DELETE FROM updates WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Update not found.' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
