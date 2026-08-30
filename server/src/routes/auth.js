import { Router } from 'express';
import { clearSession, issueSession, verifyAdminPassword } from '../auth.js';

export const authRouter = Router();

authRouter.get('/session', (req, res) => {
  res.json({ role: req.session?.role ?? null });
});

// The executive dashboard is read-only and shared, matching the portal's
// "Enter Executive Dashboard" button — no password, no write access.
authRouter.post('/viewer', (req, res) => {
  issueSession(res, 'viewer');
  res.json({ role: 'viewer' });
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    const ok = await verifyAdminPassword(username, password);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    issueSession(res, 'admin');
    res.json({ role: 'admin' });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', (_req, res) => {
  clearSession(res);
  res.json({ role: null });
});
