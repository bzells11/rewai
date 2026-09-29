// In-memory sliding-window limiters. Fine for a single long-lived process.

const buckets = new Map();

function hit(key, limit, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now - b.start > windowMs) {
    b = { start: now, count: 0 };
    buckets.set(key, b);
  }
  b.count++;
  return b.count <= limit;
}

// Purge stale buckets every 10 minutes so the map never grows unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (now - b.start > 60 * 60 * 1000) buckets.delete(k);
}, 10 * 60 * 1000).unref();

export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (typeof fwd === 'string' ? fwd.split(',')[0].trim() : req.ip) || 'unknown';
}

// General request limiter per IP: 240 requests per minute.
export function ipLimiter(req, res, next) {
  if (!hit(`ip:${clientIp(req)}`, 240, 60 * 1000)) {
    return res.status(429).json({ error: 'Too many requests. Slow down a little.' });
  }
  next();
}

// Expensive actions (load, send, replies): per session per hour, plus global per day.
const PER_SESSION_ACTIONS_HOUR = Number(process.env.DEMO_MAX_ACTIONS_PER_HOUR || 40);
const GLOBAL_ACTIONS_DAY = Number(process.env.DEMO_MAX_ACTIONS_PER_DAY || 5000);

export function actionLimiter(req, res, next) {
  const key = `action:${req.demoSessionId}`;
  if (!hit(key, PER_SESSION_ACTIONS_HOUR, 60 * 60 * 1000)) {
    return res.status(429).json({ error: 'This demo session hit its hourly limit. Try again in a bit.' });
  }
  if (!hit('action:global', GLOBAL_ACTIONS_DAY, 24 * 60 * 60 * 1000)) {
    return res.status(429).json({ error: 'The demo is at its daily limit. Please come back tomorrow.' });
  }
  next();
}
