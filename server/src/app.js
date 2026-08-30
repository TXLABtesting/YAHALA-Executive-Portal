import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { attachSession, requireAuth } from './auth.js';
import { ensureUploadDir } from './uploads.js';
import { authRouter } from './routes/auth.js';
import { bootstrapRouter } from './routes/bootstrap.js';
import { dashboardRouter } from './routes/dashboard.js';
import { launchesRouter } from './routes/launches.js';
import { merchantsRouter } from './routes/merchants.js';
import { newslettersRouter } from './routes/newsletters.js';
import { redeemersRouter } from './routes/redeemers.js';
import { updatesRouter } from './routes/updates.js';
import { uploadsRouter } from './routes/uploads.js';

export function createApp() {
  const app = express();
  ensureUploadDir();

  app.set('trust proxy', 1);
  // Logos and newsletter covers are data: URIs on the wire before they are
  // written to disk, so the JSON body limit has to clear an 8 MB file.
  app.use(express.json({ limit: '12mb' }));
  app.use(cookieParser());
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
    }),
  );
  app.use(attachSession);

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
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

  app.use('/uploads', express.static(config.uploadDir, { maxAge: '30d' }));

  // In production the API also serves the built frontend.
  if (fs.existsSync(config.webDistDir)) {
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
    res.status(status).json({ error: err.message || 'Server error.' });
  });

  return app;
}
