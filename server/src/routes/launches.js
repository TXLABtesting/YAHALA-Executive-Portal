import { Router } from 'express';
import { query } from '../db/index.js';
import { requireAdmin } from '../auth.js';
import { CATEGORIES, STAGES, dateIn, launchOut, oneOf, textIn } from '../mappers.js';

export const launchesRouter = Router();

const bodyToRow = (b) => ({
  name: textIn(b.name).trim(),
  category: oneOf(textIn(b.category), CATEGORIES),
  date: dateIn(b.date),
  stage: oneOf(textIn(b.stage), STAGES),
});

launchesRouter.get('/', async (_req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM launches ORDER BY expected_date ASC NULLS LAST, position ASC, id ASC',
    );
    res.json(rows.map(launchOut));
  } catch (err) {
    next(err);
  }
});

launchesRouter.post('/', requireAdmin, async (req, res, next) => {
  try {
    const l = bodyToRow(req.body || {});
    if (!l.name) return res.status(400).json({ error: 'Merchant name is required.' });
    const { rows } = await query(
      `INSERT INTO launches (name, category, expected_date, stage)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [l.name, l.category, l.date, l.stage],
    );
    res.status(201).json(launchOut(rows[0]));
  } catch (err) {
    next(err);
  }
});

launchesRouter.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const l = bodyToRow(req.body || {});
    if (!l.name) return res.status(400).json({ error: 'Merchant name is required.' });
    const { rows } = await query(
      `UPDATE launches SET name = $2, category = $3, expected_date = $4, stage = $5
       WHERE id = $1 RETURNING *`,
      [req.params.id, l.name, l.category, l.date, l.stage],
    );
    if (!rows.length) return res.status(404).json({ error: 'Launch not found.' });
    res.json(launchOut(rows[0]));
  } catch (err) {
    next(err);
  }
});

launchesRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await query('DELETE FROM launches WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Launch not found.' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
