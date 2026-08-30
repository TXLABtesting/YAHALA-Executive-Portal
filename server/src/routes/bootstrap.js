import { Router } from 'express';
import { query } from '../db/index.js';
import {
  launchOut,
  merchantOut,
  newsletterOut,
  redeemerOut,
  updateOut,
} from '../mappers.js';
import { readAccommodation, readKpis, readSettings, readSpotlight } from './dashboard.js';

export const bootstrapRouter = Router();

// One round trip for everything the portal renders on load. The dashboard is
// read by every signed-in role; only writes are restricted to admins.
bootstrapRouter.get('/', async (_req, res, next) => {
  try {
    const [
      merchants,
      archive,
      newsletters,
      launches,
      updates,
      redeemers,
      kpis,
      spotlight,
      accommodation,
      settings,
    ] = await Promise.all([
      query('SELECT * FROM merchants WHERE NOT archived ORDER BY created_at DESC, id DESC'),
      query('SELECT * FROM merchants WHERE archived ORDER BY created_at DESC, id DESC'),
      query('SELECT * FROM newsletters ORDER BY issue_date DESC NULLS LAST, id DESC'),
      query('SELECT * FROM launches ORDER BY expected_date ASC NULLS LAST, position ASC, id ASC'),
      query('SELECT * FROM updates ORDER BY position ASC, id DESC'),
      query('SELECT * FROM redeemers ORDER BY redemptions DESC, name ASC'),
      readKpis(),
      readSpotlight(),
      readAccommodation(),
      readSettings(),
    ]);

    res.json({
      merchants: merchants.rows.map(merchantOut),
      archive: archive.rows.map(merchantOut),
      newsletters: newsletters.rows.map(newsletterOut),
      launches: launches.rows.map(launchOut),
      updates: updates.rows.map(updateOut),
      redeemers: redeemers.rows.map(redeemerOut),
      kpis,
      spotlight,
      accommodation,
      layout: settings.layout || 'A',
    });
  } catch (err) {
    next(err);
  }
});
