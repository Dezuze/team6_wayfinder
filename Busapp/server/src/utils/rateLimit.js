// In-memory sliding-window rate limiter with IP tracking

const loginAttempts = new Map();
const generalLimits = new Map();

// Configuration
const LOGIN_MAX_ATTEMPTS = 8;
const LOGIN_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const LOGIN_BLOCK_TIME_MS = 5 * 60 * 1000; // 5 minute lock-out

const GENERAL_MAX_REQUESTS = 150;
const GENERAL_WINDOW_MS = 60 * 1000; // 1 minute

export function checkLoginRateLimit(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record) {
    return { allowed: true };
  }

  // Check if locked out
  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingSeconds,
      message: `Too many failed login attempts. Locked for security. Try again in ${remainingSeconds} seconds.`
    };
  }

  // Clear expired window
  if (now - record.firstAttempt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  if (record.attempts >= LOGIN_MAX_ATTEMPTS) {
    record.lockedUntil = now + LOGIN_BLOCK_TIME_MS;
    const remainingSeconds = Math.ceil(LOGIN_BLOCK_TIME_MS / 1000);
    return {
      allowed: false,
      remainingSeconds,
      message: `Too many failed login attempts. Account protection activated. Try again in ${remainingSeconds} seconds.`
    };
  }

  return { allowed: true };
}

export function recordFailedLogin(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { attempts: 0, firstAttempt: now };
  record.attempts += 1;
  loginAttempts.set(ip, record);
}

export function resetLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

export function checkGeneralRateLimit(ip) {
  const now = Date.now();
  const record = generalLimits.get(ip);

  if (!record || now - record.windowStart > GENERAL_WINDOW_MS) {
    generalLimits.set(ip, { windowStart: now, count: 1 });
    return { allowed: true };
  }

  record.count += 1;
  if (record.count > GENERAL_MAX_REQUESTS) {
    const remainingSeconds = Math.ceil((record.windowStart + GENERAL_WINDOW_MS - now) / 1000);
    return {
      allowed: false,
      remainingSeconds,
      message: 'Rate limit exceeded. Please slow down.'
    };
  }

  return { allowed: true };
}

// Clean up old entries every 10 minutes
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of loginAttempts.entries()) {
    if (rec.lockedUntil && rec.lockedUntil < now && now - rec.firstAttempt > LOGIN_WINDOW_MS) {
      loginAttempts.delete(ip);
    }
  }
  for (const [ip, rec] of generalLimits.entries()) {
    if (now - rec.windowStart > GENERAL_WINDOW_MS) {
      generalLimits.delete(ip);
    }
  }
}, 10 * 60 * 1000);

if (cleanupTimer && typeof cleanupTimer.unref === 'function') {
  cleanupTimer.unref();
}
