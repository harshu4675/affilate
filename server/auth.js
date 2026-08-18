import crypto from 'node:crypto';

const DEV_DEFAULT_USERNAME = 'admin';
const DEV_DEFAULT_PASSWORD = 'talishh-admin';

export const SESSION_COOKIE = 'talishh_admin';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

const secret =
  process.env.AFFILATE_SESSION_SECRET && process.env.AFFILATE_SESSION_SECRET.length >= 16
    ? process.env.AFFILATE_SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

export function adminCredentials() {
  const username = process.env.ADMIN_USERNAME || DEV_DEFAULT_USERNAME;
  const password = process.env.ADMIN_PASSWORD || DEV_DEFAULT_PASSWORD;
  const usingDefaults = !process.env.ADMIN_PASSWORD;
  return { username, password, usingDefaults };
}

function safeEquals(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) {
    // Still run a comparison to keep timing roughly constant.
    crypto.timingSafeEqual(left, left);
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

export function verifyCredentials(username, password) {
  const expected = adminCredentials();
  const userOk = safeEquals(String(username || ''), expected.username);
  const passOk = safeEquals(String(password || ''), expected.password);
  return userOk && passOk;
}

function sign(payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSessionToken(username) {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${Buffer.from(String(username)).toString('base64url')}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const payload = `${parts[0]}.${parts[1]}`;
  if (!safeEquals(parts[2], sign(payload))) return null;
  const expiresAt = Number(parts[1]);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  let username = '';
  try {
    username = Buffer.from(parts[0], 'base64url').toString('utf8');
  } catch {
    return null;
  }
  if (!username) return null;
  return { username, expiresAt };
}

export function parseCookies(header) {
  const jar = {};
  if (!header || typeof header !== 'string') return jar;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!key) continue;
    try {
      jar[key] = decodeURIComponent(value);
    } catch {
      jar[key] = value;
    }
  }
  return jar;
}

function isSecureRequest(req) {
  if (req.secure) return true;
  const proto = String(req.get('x-forwarded-proto') || '').split(',')[0].trim();
  return proto === 'https';
}

export function setSessionCookie(req, res, token) {
  const attributes = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`
  ];
  if (isSecureRequest(req)) attributes.push('Secure');
  res.append('set-cookie', attributes.join('; '));
}

export function clearSessionCookie(req, res) {
  const attributes = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (isSecureRequest(req)) attributes.push('Secure');
  res.append('set-cookie', attributes.join('; '));
}

export function getSession(req) {
  const jar = parseCookies(req.headers.cookie);
  return readSessionToken(jar[SESSION_COOKIE]);
}

export function requireAdmin(req, res, next) {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({
      ok: false,
      error: { code: 'unauthorized', message: 'Admin sign in required.' }
    });
  }
  req.adminSession = session;
  return next();
}
