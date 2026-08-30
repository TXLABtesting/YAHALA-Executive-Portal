import { Router } from 'express';
import { query } from '../db/index.js';
import { requireAdmin } from '../auth.js';
import { normalizeFileField } from '../files.js';
import { dateIn, newsletterOut, textIn } from '../mappers.js';

export const newslettersRouter = Router();

const bodyToRow = async (b) => ({
  title: textIn(b.title).trim(),
  date: dateIn(b.date),
  desc: textIn(b.desc),
  thumb: await normalizeFileField(b.thumb),
  pdf: await normalizeFileField(b.pdf),
  pdfName: textIn(b.pdfName),
});

newslettersRouter.get('/', async (_req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM newsletters ORDER BY issue_date DESC NULLS LAST, id DESC',
    );
    res.json(rows.map(newsletterOut));
  } catch (err) {
    next(err);
  }
});

newslettersRouter.post('/', requireAdmin, async (req, res, next) => {
  try {
    const n = await bodyToRow(req.body || {});
    if (!n.title) return res.status(400).json({ error: 'Title is required.' });
    const { rows } = await query(
      `INSERT INTO newsletters (title, issue_date, description, thumb, pdf, pdf_name)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [n.title, n.date, n.desc, n.thumb, n.pdf, n.pdfName],
    );
    res.status(201).json(newsletterOut(rows[0]));
  } catch (err) {
    next(err);
  }
});

newslettersRouter.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const n = await bodyToRow(req.body || {});
    if (!n.title) return res.status(400).json({ error: 'Title is required.' });
    const { rows } = await query(
      `UPDATE newsletters
         SET title = $2, issue_date = $3, description = $4, thumb = $5, pdf = $6, pdf_name = $7
       WHERE id = $1 RETURNING *`,
      [req.params.id, n.title, n.date, n.desc, n.thumb, n.pdf, n.pdfName],
    );
    if (!rows.length) return res.status(404).json({ error: 'Newsletter not found.' });
    res.json(newsletterOut(rows[0]));
  } catch (err) {
    next(err);
  }
});

newslettersRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await query('DELETE FROM newsletters WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Newsletter not found.' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
