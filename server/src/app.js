import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { attachSession, requireAuth } from './auth.js';
import { readHealth } from './health.js';
import { authRouter } from './routes/auth.js';
import { filesRouter } from './routes/files.js';
import { bootstrapRouter } from './routes/bootstrap.js';
import { dashboardRouter } from './routes/dashboard.js';
import { launchesRouter } from './routes/launches.js';
import { merchantsRouter } from './routes/merchants.js';
import { newslettersRouter } from './routes/newsletters.js';
import { redeemersRouter } from './routes/redeemers.js';
import { updatesRouter } from './routes/updates.js';
import { uploadsRouter } from './routes/uploads.js';

export function createApp({ serveStatic = !process.env.VERCEL } = {}) {
  const app = express();

  app.set('trust proxy', 1);
  // Logos and covers arrive as base64 data: URIs, which are about a third
  // larger than the file, so the body limit has to clear the upload limit.
  app.use(express.json({ limit: config.jsonBodyLimit }));
  app.use(cookieParser());
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
    }),
  );
  app.use(attachSession);

  // Open on purpose: it is the first thing to check when a deployment misbehaves.
  app.get('/api/health', async (_req, res) => {
    const health = await readHealth();
    res.status(health.ok ? 200 : 503).json(health);
  });
  app.use('/api/auth', authRouter);

  // Everything below needs a session — viewer for reads, admin for writes
  // (enforced per route by requireAdmin).
  app.use('/api/bootstrap', requireAuth, bootstrapRouter);
  app.use('/api/merchants', requireAuth, merchantsRouter);
  app.use('/api/newsletters', requireAuth, newslettersRouter);
  app.use('/api/launches', requireAuth, launchesRouter);
  app.use('/api/updates', requireAuth, updatesRouter);
  app.use('/api/redeemers', requireAuth, redeemersRouter);
  app.use('/api/uploads', requireAuth, uploadsRouter);
  app.use('/api', requireAuth, dashboardRouter);

  // Uploaded files are rows in the database, served behind the same session
  // check as the rest of the portal.
  app.use('/uploads', requireAuth, filesRouter);

  // In the single-process setup the API also serves the built frontend. On a
  // platform that serves the static build itself (Vercel), this is skipped.
  if (serveStatic && fs.existsSync(config.webDistDir)) {
    app.use(express.static(config.webDistDir, { index: false }));
    app.get(/^(?!\/api\/|\/uploads\/).*/, (_req, res) => {
      res.sendFile(path.join(config.webDistDir, 'index.html'));
    });
  }

  app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));

  // eslint-disable-next-line no-unused-vars -- Express needs the 4-arg shape.
  app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    // A server-side failure is logged in full but reported plainly, so an
    // internal message never reaches the sign-in screen. Errors marked
    // `expose` are deliberate operator-facing ones.
    const leaks = status >= 500 && !err.expose;
    res.status(status).json({ error: leaks ? 'Server error. Please try again.' : err.message });
  });

  return app;
}
