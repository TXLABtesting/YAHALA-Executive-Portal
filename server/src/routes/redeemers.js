import { Router } from 'express';
import { query } from '../db/index.js';
import { requireAdmin } from '../auth.js';
import { intIn, redeemerOut, textIn } from '../mappers.js';

export const redeemersRouter = Router();

redeemersRouter.get('/', async (_req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM redeemers ORDER BY redemptions DESC, name ASC',
    );
    res.json(rows.map(redeemerOut));
  } catch (err) {
    next(err);
  }
});

redeemersRouter.post('/', requireAdmin, async (req, res, next) => {
  try {
    const name = textIn(req.body?.name).trim();
    if (!name) return res.status(400).json({ error: 'User name is required.' });
    const { rows } = await query(
      'INSERT INTO redeemers (name, redemptions) VALUES ($1,$2) RETURNING *',
      [name, intIn(req.body?.redemptions)],
    );
    res.status(201).json(redeemerOut(rows[0]));
  } catch (err) {
    next(err);
  }
});

redeemersRouter.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const name = textIn(req.body?.name).trim();
    if (!name) return res.status(400).json({ error: 'User name is required.' });
    const { rows } = await query(
      'UPDATE redeemers SET name = $2, redemptions = $3 WHERE id = $1 RETURNING *',
      [req.params.id, name, intIn(req.body?.redemptions)],
    );
    if (!rows.length) return res.status(404).json({ error: 'Redeemer not found.' });
    res.json(redeemerOut(rows[0]));
  } catch (err) {
    next(err);
  }
});

redeemersRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await query('DELETE FROM redeemers WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Redeemer not found.' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
