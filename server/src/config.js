import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// Falling back to a local database is a convenience for development only. In a
// deployment it would surface as a puzzling ECONNREFUSED 127.0.0.1:5432, so
// there the missing variable is reported as what it is.
const isDeployed = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

export const config = {
  databaseUrl:
    process.env.DATABASE_URL ||
    (isDeployed ? '' : 'postgres://yahala:yahala_dev@127.0.0.1:5432/yahala'),
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || 'yahala-development-secret',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  rootDir: path.resolve(here, '..'),
  // Built frontend, served by the API in production (npm run build in ../web).
  webDistDir: path.resolve(here, '..', '..', 'web', 'dist'),
  sessionMaxAgeMs: 12 * 60 * 60 * 1000,
  // Vercel caps a serverless request body at 4.5 MB; everywhere else the
  // limit is ours to choose.
  maxUploadBytes:
    Number(process.env.MAX_UPLOAD_MB || (process.env.VERCEL ? 3 : 8)) * 1024 * 1024,
  get jsonBodyLimit() {
    return `${Math.ceil((this.maxUploadBytes * 1.4) / (1024 * 1024))}mb`;
  },
};
