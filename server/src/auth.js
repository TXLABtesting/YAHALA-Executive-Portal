import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { query } from './db/index.js';

const COOKIE = 'yahala_session';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: config.sessionMaxAgeMs,
  path: '/',
};

export function issueSession(res, role) {
  const token = jwt.sign({ role }, config.jwtSecret, {
    expiresIn: Math.floor(config.sessionMaxAgeMs / 1000),
  });
  res.cookie(COOKIE, token, cookieOptions);
  return token;
}

export function clearSession(res) {
  res.clearCookie(COOKIE, { ...cookieOptions, maxAge: undefined });
}

export function readSession(req) {
  const token = req.cookies?.[COOKIE];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    return payload.role === 'admin' || payload.role === 'viewer' ? payload : null;
  } catch {
    return null;
  }
}

/** Populates req.session for every request; never rejects. */
export function attachSession(req, _res, next) {
  req.session = readSession(req);
  next();
}

export function requireAuth(req, res, next) {
  if (!req.session) return res.status(401).json({ error: 'Not signed in.' });
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.session) return res.status(401).json({ error: 'Not signed in.' });
  if (req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access required.' });
  }
  next();
}

export async function verifyAdminPassword(username, password) {
  const { rows } = await query(
    'SELECT password_hash FROM credentials WHERE username = $1 AND role = $2',
    [String(username || '').trim().toLowerCase(), 'admin'],
  );
  if (!rows.length) return false;
  return bcrypt.compare(String(password || ''), rows[0].password_hash);
}

export async function setAdminPassword(username, password) {
  const hash = await bcrypt.hash(String(password), 12);
  await query(
    `INSERT INTO credentials (username, password_hash, role)
     VALUES ($1, $2, 'admin')
     ON CONFLICT (username) DO UPDATE
       SET password_hash = EXCLUDED.password_hash, updated_at = now()`,
    [String(username).trim().toLowerCase(), hash],
  );
}
