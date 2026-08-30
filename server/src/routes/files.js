import { Router } from 'express';
import { readFile } from '../files.js';

export const filesRouter = Router();

// URLs are content-hashed, so a stored file never changes and can be cached
// indefinitely by the browser.
filesRouter.get('/:name', async (req, res, next) => {
  try {
    const hash = String(req.params.name).replace(/\.[a-z0-9]+$/i, '');
    if (!/^[0-9a-f]{32}$/.test(hash)) return res.status(404).json({ error: 'Not found.' });

    const file = await readFile(hash);
    if (!file) return res.status(404).json({ error: 'Not found.' });

    res.set('Content-Type', file.mime);
    res.set('Cache-Control', 'private, max-age=31536000, immutable');
    res.set('X-Content-Type-Options', 'nosniff');
    res.send(file.bytes);
  } catch (err) {
    next(err);
  }
});
