import crypto from 'node:crypto';

// Secret key for JWT/HMAC token signing and QR pass signing
const JWT_SECRET = process.env.JWT_SECRET || process.env.APP_SECRET || 'hopspot-super-secret-key-production-hardened-2026';
const PASS_SECRET = process.env.PASS_SECRET || 'hopspot-qr-pass-hmac-signature-key-2026';

// ----------------- PASSWORD HASHING (SCRYPT + SALT) -----------------

/**
 * Hash a password securely with scrypt and a cryptographic 16-byte random salt.
 * Output format: "scrypt:salt:hash"
 */
export function hashPassword(plainPassword) {
  if (!plainPassword) return '';
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(plainPassword, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verify a plain password against a stored hash.
 * Supports "scrypt:salt:hash", legacy plaintext (with automatic upgrade flag), and timing-safe comparison.
 */
export function verifyPassword(plainPassword, storedPasswordOrHash) {
  if (!plainPassword || !storedPasswordOrHash) return { valid: false, needsRehash: false };

  // If already hashed with scrypt
  if (storedPasswordOrHash.startsWith('scrypt:')) {
    const parts = storedPasswordOrHash.split(':');
    if (parts.length !== 3) return { valid: false, needsRehash: false };
    const [, salt, originalHash] = parts;
    const derivedKey = crypto.scryptSync(plainPassword, salt, 64);
    const candidateHash = derivedKey.toString('hex');
    
    // Constant-time comparison to prevent timing attacks
    const bufA = Buffer.from(candidateHash, 'hex');
    const bufB = Buffer.from(originalHash, 'hex');
    if (bufA.length !== bufB.length) return { valid: false, needsRehash: false };
    
    const valid = crypto.timingSafeEqual(bufA, bufB);
    return { valid, needsRehash: false };
  }

  // Legacy plaintext compatibility (e.g. initial seed or existing database)
  const valid = plainPassword === storedPasswordOrHash;
  return { valid, needsRehash: valid };
}

// ----------------- AUTHENTICATION TOKENS (HMAC-SHA256) -----------------

/**
 * Create a tamper-proof signed session token
 */
export function createAuthToken(userPayload, expiresInSeconds = 86400) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: userPayload.id,
    username: userPayload.username,
    role: userPayload.role || 'student',
    name: userPayload.name,
    iat: now,
    exp: now + expiresInSeconds
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify and decode an authentication token
 */
export function verifyAuthToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  const bufA = Buffer.from(signature);
  const bufB = Buffer.from(expectedSignature);
  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
    return null; // Invalid signature / tampered token
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Token expired
    }
    return payload;
  } catch {
    return null;
  }
}

// ----------------- CRYPTOGRAPHIC STUDENT PASS QR SIGNING -----------------

/**
 * Create a cryptographically signed QR code payload for a student pass.
 * Prevents counterfeit / forged QR codes.
 */
export function signPassQr(passId, validUntil = '2026-12-31', entitlement = 'All Routes') {
  const data = `${passId}|${validUntil}|${entitlement}`;
  const hmac = crypto.createHmac('sha256', PASS_SECRET).update(data).digest('hex').slice(0, 16);
  return `HOPSPOT:${passId}:${hmac}`;
}

/**
 * Verify whether a scanned QR code payload is genuine or counterfeit.
 */
export function verifyPassQr(qrString, validUntil = '2026-12-31', entitlement = 'All Routes') {
  if (!qrString || typeof qrString !== 'string') return { valid: false, reason: 'Empty QR string' };
  
  // Format: HOPSPOT:<passId>:<signature>
  const parts = qrString.split(':');
  if (parts.length !== 3 || parts[0] !== 'HOPSPOT') {
    // Check legacy format PASS-<id>
    if (qrString.startsWith('PASS-')) {
      return { valid: true, passId: qrString.replace('PASS-', ''), legacy: true };
    }
    return { valid: false, reason: 'Invalid QR format' };
  }

  const passId = parts[1];
  const providedHmac = parts[2];
  const expectedHmac = crypto
    .createHmac('sha256', PASS_SECRET)
    .update(`${passId}|${validUntil}|${entitlement}`)
    .digest('hex')
    .slice(0, 16);

  const bufA = Buffer.from(providedHmac);
  const bufB = Buffer.from(expectedHmac);
  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
    return { valid: false, reason: 'Counterfeit signature - QR code has been forged or modified' };
  }

  return { valid: true, passId, legacy: false };
}

// ----------------- INPUT SANITIZATION & XSS DEFENSE -----------------

/**
 * Strip harmful script tags and escape HTML entities to prevent Stored XSS
 */
export function sanitizeString(input, maxLength = 255) {
  if (typeof input !== 'string') return '';
  let cleaned = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .trim();
  if (maxLength && cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }
  return cleaned;
}

/**
 * Validate latitude and longitude bounds (-90..90, -180..180)
 */
export function isValidCoordinate(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
