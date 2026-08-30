import { Router } from 'express';
import { requireAdmin } from '../auth.js';
import { storeDataUri } from '../uploads.js';

export const uploadsRouter = Router();

// The admin forms read files with FileReader and post the resulting data: URI;
// the server writes it to disk and hands back a stable URL to store in a row.
uploadsRouter.post('/', requireAdmin, (req, res, next) => {
  try {
    res.status(201).json({ url: storeDataUri(req.body?.data) });
  } catch (err) {
    next(err);
  }
});
