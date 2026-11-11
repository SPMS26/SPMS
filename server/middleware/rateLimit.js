import jwt from 'jsonwebtoken';
import db from '../config/database.js';

// Fixed-window rate limiting with two stores:
//  - 'db':     counters in Postgres, shared by every server instance. On Vercel each function instance has its
//              own memory, so limits that must hold (login, sign-up) live here.
//  - 'memory': counters in this process only. Cheap, no database round trip; good enough as a flood guard.
// If the database is unreachable the request is let through: a broken limiter must not lock everyone out.

// The visitor's IP. Vercel sets x-real-ip itself and overwrites any value the client sends, so it can't be spoofed
// there; anywhere else only the socket address is trusted.
export const clientIp = (req) =>
  (process.env.VERCEL && req.headers['x-real-ip']) || req.socket?.remoteAddress || 'unknown';

// Signed-in requests are counted per user, everything else per IP. The token is verified, so an attacker can't
// dodge the limit by sending made-up tokens.
export const userOrIp = (req) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const { id } = jwt.verify(header.slice(7), process.env.JWT_SECRET || 'spms_jwt_secret_key_2026_dev');
      if (id) return `user:${id}`;
    } catch {
      // invalid or expired: fall back to the IP; the route itself will reject the token
    }
  }
  return `ip:${clientIp(req)}`;
};

const memoryCounters = new Map();
let lastMemoryPrune = 0;

const hitMemory = (key, windowMs) => {
  const now = Date.now();
  if (now - lastMemoryPrune > 60 * 1000) {
    lastMemoryPrune = now;
    for (const [k, v] of memoryCounters) if (v.resetAt <= now) memoryCounters.delete(k);
  }
  let entry = memoryCounters.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { hits: 0, resetAt: now + windowMs };
    memoryCounters.set(key, entry);
  }
  entry.hits += 1;
  return { hits: entry.hits, resetAt: entry.resetAt };
};

let lastDbPrune = 0;

const hitDb = async (key, windowMs) => {
  const res = await db.query(
    `INSERT INTO rate_limits (key, hits, reset_at)
     VALUES ($1, 1, CURRENT_TIMESTAMP + make_interval(secs => $2::float8 / 1000))
     ON CONFLICT (key) DO UPDATE SET
       hits = CASE WHEN rate_limits.reset_at <= CURRENT_TIMESTAMP THEN 1 ELSE rate_limits.hits + 1 END,
       reset_at = CASE WHEN rate_limits.reset_at <= CURRENT_TIMESTAMP THEN EXCLUDED.reset_at ELSE rate_limits.reset_at END
     RETURNING hits, reset_at`,
    [key, windowMs]
  );
  // Old windows are dead rows; clear them out now and then rather than on every request
  if (Date.now() - lastDbPrune > 10 * 60 * 1000) {
    lastDbPrune = Date.now();
    db.query('DELETE FROM rate_limits WHERE reset_at < CURRENT_TIMESTAMP').catch(() => {});
  }
  return { hits: res.rows[0].hits, resetAt: new Date(res.rows[0].reset_at).getTime() };
};

/**
 * @param name      unique per limiter, so two limiters never share counters
 * @param windowMs  window length
 * @param max       requests allowed per key per window
 * @param keyBy     (req) => string | null; null skips limiting for that request
 * @param store     'db' or 'memory'
 * @param message   shown to the user when blocked
 */
export const rateLimit = ({ name, windowMs, max, keyBy = (req) => `ip:${clientIp(req)}`, store = 'memory', message }) =>
  async (req, res, next) => {
    // Tests and local scripts can switch limits off
    if (process.env.RATE_LIMIT_DISABLED === 'true') return next();

    const subject = keyBy(req);
    if (!subject) return next();
    const key = `${name}:${subject}`;

    let result;
    try {
      result = store === 'db' ? await hitDb(key, windowMs) : hitMemory(key, windowMs);
    } catch (err) {
      console.error(`[RateLimit] ${name} store error, allowing request:`, err.message);
      return next();
    }

    const retryAfterSec = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
    res.set('RateLimit-Limit', String(max));
    res.set('RateLimit-Remaining', String(Math.max(0, max - result.hits)));
    res.set('RateLimit-Reset', String(retryAfterSec));

    if (result.hits > max) {
      res.set('Retry-After', String(retryAfterSec));
      const minutes = Math.ceil(retryAfterSec / 60);
      return res.status(429).json({
        success: false,
        message: message || `Too many requests. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`
      });
    }
    next();
  };

const MINUTE = 60 * 1000;
const lowerEmail = (req) => (typeof req.body?.email === 'string' && req.body.email.trim()
  ? req.body.email.trim().toLowerCase()
  : null);

// Every API request: a flood guard, generous enough for the dashboards' polling
export const apiLimiter = rateLimit({
  name: 'api', windowMs: MINUTE, max: 300, keyBy: userOrIp, store: 'memory'
});

// Login: per IP stops one machine guessing many accounts, per email stops many machines guessing one account.
// The IP limits are loose because a whole campus or office can sit behind one address.
export const loginIpLimiter = rateLimit({
  name: 'login-ip', windowMs: 15 * MINUTE, max: 60, store: 'db',
  message: 'Too many login attempts from this network. Please try again in 15 minutes.'
});
export const loginEmailLimiter = rateLimit({
  name: 'login-email', windowMs: 15 * MINUTE, max: 8, store: 'db',
  keyBy: (req) => { const email = lowerEmail(req); return email && `email:${email}`; },
  message: 'Too many login attempts for this account. Please try again in 15 minutes.'
});

// Account creation (users and lot owners)
export const registerLimiter = rateLimit({
  name: 'register', windowMs: 60 * MINUTE, max: 20, store: 'db',
  message: 'Too many accounts created from this network. Please try again later.'
});

// Password changes: someone holding a stolen session shouldn't get unlimited guesses at the current password
export const passwordLimiter = rateLimit({
  name: 'password', windowMs: 15 * MINUTE, max: 5, keyBy: userOrIp, store: 'db',
  message: 'Too many password change attempts. Please try again in 15 minutes.'
});

// Bookings: stops a script from grabbing and releasing slots over and over
export const bookingLimiter = rateLimit({
  name: 'booking', windowMs: 10 * MINUTE, max: 20, keyBy: userOrIp, store: 'memory',
  message: 'Too many booking actions. Please wait a few minutes and try again.'
});

// Report uploads write images to disk
export const uploadLimiter = rateLimit({
  name: 'upload', windowMs: 60 * MINUTE, max: 10, keyBy: userOrIp, store: 'memory',
  message: 'Too many reports submitted. Please try again later.'
});
