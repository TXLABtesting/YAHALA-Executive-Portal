/**
 * Vercel serverless entry point.
 *
 * Vercel serves the built frontend from its CDN and rewrites /api/* and
 * /uploads/* here, so this function answers only those. The long-running
 * server (server/src/index.js) is unaffected and still used everywhere else.
 *
 * The module-level app is reused for every request a warm instance handles,
 * which keeps the database pool alive between invocations.
 */
import { createApp } from '../server/src/app.js';

export default createApp({ serveStatic: false });
