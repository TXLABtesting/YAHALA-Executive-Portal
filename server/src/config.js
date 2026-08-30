import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  databaseUrl:
    process.env.DATABASE_URL || 'postgres://yahala:yahala_dev@127.0.0.1:5432/yahala',
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || 'yahala-development-secret',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  rootDir: path.resolve(here, '..'),
  uploadDir: path.resolve(here, '..', 'uploads'),
  // Built frontend, served by the API in production (npm run build in ../web).
  webDistDir: path.resolve(here, '..', '..', 'web', 'dist'),
  sessionMaxAgeMs: 12 * 60 * 60 * 1000,
};
