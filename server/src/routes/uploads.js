import { Router } from 'express';
import { requireAdmin } from '../auth.js';
import { storeDataUri } from '../files.js';

export const uploadsRouter = Router();

// The admin forms read files with FileReader and post the resulting data: URI;
// the server stores the bytes and hands back a URL to keep on the row.
uploadsRouter.post('/', requireAdmin, async (req, res, next) => {
  try {
    res.status(201).json({ url: await storeDataUri(req.body?.data) });
  } catch (err) {
    next(err);
  }
});
