import assert from 'node:assert/strict';
import {
  hashPassword,
  verifyPassword,
  createAuthToken,
  verifyAuthToken,
  signPassQr,
  verifyPassQr,
  sanitizeString,
  isValidCoordinate
} from '../src/utils/security.js';
import {
  checkLoginRateLimit,
  recordFailedLogin,
  resetLoginAttempts
} from '../src/utils/rateLimit.js';

console.log('====================================================');
console.log('   HopSpot Comprehensive Security & Defense Tests   ');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(description, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(` [PASS] ${description}`);
    passedTests++;
  } catch (err) {
    console.error(` [FAIL] ${description}`);
    console.error(`       Error: ${err.message}`);
  }
}

// ----------------- TEST SUITE 1: PASSWORD ENCRYPTION & HASHING -----------------
console.log('--- Test Suite 1: Password Encryption & Hashing ---');

runTest('Passwords must never be plaintext and should use scrypt with salt', () => {
  const plain = 'secretPass123!@#';
  const hashed = hashPassword(plain);

  assert.ok(hashed.startsWith('scrypt:'), 'Hash must start with scrypt algorithm identifier');
  const parts = hashed.split(':');
  assert.equal(parts.length, 3, 'Hash must contain algorithm, salt, and key');
  assert.notEqual(hashed, plain, 'Stored password must never equal plain password');
  assert.ok(parts[1].length >= 32, 'Salt must be at least 16 bytes (32 hex characters)');
});

runTest('Two hashes of the same password must produce different salts (salt uniqueness)', () => {
  const plain = 'myPassword2026';
  const hashA = hashPassword(plain);
  const hashB = hashPassword(plain);

  assert.notEqual(hashA, hashB, 'Hashes must differ due to unique cryptographically random salts');
});

runTest('Verification should succeed for correct password and fail for wrong password', () => {
  const plain = 'correctHorseBatteryStaple';
  const hashed = hashPassword(plain);

  const correctResult = verifyPassword(plain, hashed);
  assert.equal(correctResult.valid, true, 'Correct password must verify to true');

  const wrongResult = verifyPassword('wrongPassword', hashed);
  assert.equal(wrongResult.valid, false, 'Wrong password must verify to false');
});

runTest('Legacy plaintext passwords must be identified for automatic hash upgrade', () => {
  const legacyPlain = 'password123';
  const result = verifyPassword('password123', legacyPlain);

  assert.equal(result.valid, true, 'Legacy password must match for authentication');
  assert.equal(result.needsRehash, true, 'Legacy password must be flagged to automatically upgrade to scrypt');
});

// ----------------- TEST SUITE 2: CRYPTOGRAPHIC QR PASS SIGNING -----------------
console.log('\n--- Test Suite 2: Cryptographic QR Pass Signatures ---');

runTest('Legitimate student pass QR code should contain verifiable HMAC signature', () => {
  const passId = 'S1001';
  const validUntil = '2026-12-31';
  const entitlement = 'All Routes';

  const qr = signPassQr(passId, validUntil, entitlement);
  assert.ok(qr.startsWith('HOPSPOT:S1001:'), 'QR string must follow signed format');

  const verification = verifyPassQr(qr, validUntil, entitlement);
  assert.equal(verification.valid, true, 'Genuine QR code must verify as valid');
  assert.equal(verification.passId, passId, 'Extracted passId must match');
});

runTest('Forged or counterfeit QR pass must be detected and rejected', () => {
  const validUntil = '2026-12-31';
  const entitlement = 'All Routes';

  // Attacker creates a counterfeit QR with arbitrary fake HMAC
  const forgedQr = 'HOPSPOT:S9999:deadbeef12345678';
  const verification = verifyPassQr(forgedQr, validUntil, entitlement);

  assert.equal(verification.valid, false, 'Counterfeit QR code must be rejected');
  assert.ok(verification.reason.includes('Counterfeit'), 'Reason must indicate counterfeit or modified QR');
});

runTest('Modified entitlement or expiration date must invalidate the QR signature', () => {
  const passId = 'S2002';
  const validUntil = '2026-05-30';
  const entitlement = 'Route 1 Only';

  const genuineQr = signPassQr(passId, validUntil, entitlement);

  // Attacker presents the genuine QR but claims "All Routes"
  const tamperedCheck = verifyPassQr(genuineQr, validUntil, 'All Routes');
  assert.equal(tamperedCheck.valid, false, 'Altered entitlement claim must fail HMAC verification');
});

// ----------------- TEST SUITE 3: TAMPER-PROOF AUTHENTICATION TOKENS -----------------
console.log('\n--- Test Suite 3: Tamper-Proof Auth Tokens ---');

runTest('Valid token should encode and decode user claims', () => {
  const user = { id: 'admin-1', username: 'admin', role: 'admin', name: 'Fleet Administrator' };
  const token = createAuthToken(user);

  assert.ok(typeof token === 'string', 'Token must be a string');
  assert.equal(token.split('.').length, 3, 'Token must contain header, payload, and signature');

  const decoded = verifyAuthToken(token);
  assert.ok(decoded !== null, 'Decoded token must not be null');
  assert.equal(decoded.sub, 'admin-1');
  assert.equal(decoded.username, 'admin');
  assert.equal(decoded.role, 'admin');
});

runTest('Tampered token payload must be rejected by HMAC verification', () => {
  const user = { id: 'student-5', username: 'student', role: 'student', name: 'Student' };
  const token = createAuthToken(user);
  const parts = token.split('.');

  // Attacker alters role from "student" to "admin" in payload
  const rawPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  rawPayload.role = 'admin';
  const forgedPayload = Buffer.from(JSON.stringify(rawPayload)).toString('base64url');
  const tamperedToken = `${parts[0]}.${forgedPayload}.${parts[2]}`;

  const result = verifyAuthToken(tamperedToken);
  assert.equal(result, null, 'Tampered token must return null (invalid signature)');
});

runTest('Expired token must be rejected', () => {
  const user = { id: 'u1', username: 'test', role: 'student' };
  // Create token with negative expiration (-10 seconds)
  const expiredToken = createAuthToken(user, -10);

  const result = verifyAuthToken(expiredToken);
  assert.equal(result, null, 'Expired token must return null');
});

// ----------------- TEST SUITE 4: BRUTE-FORCE RATE LIMITING -----------------
console.log('\n--- Test Suite 4: Brute-Force Rate Limiting ---');

runTest('Repeated failed login attempts should trigger lock-out', () => {
  const testIp = '198.51.100.42';
  resetLoginAttempts(testIp);

  // Initial check must be allowed
  let check = checkLoginRateLimit(testIp);
  assert.equal(check.allowed, true);

  // Simulate 8 failed attempts
  for (let i = 0; i < 8; i++) {
    recordFailedLogin(testIp);
  }

  // 9th attempt should be blocked
  check = checkLoginRateLimit(testIp);
  assert.equal(check.allowed, false, 'IP must be locked after excessive failed attempts');
  assert.ok(check.remainingSeconds > 0, 'Must provide remaining cooldown seconds');

  // Reset allows IP again
  resetLoginAttempts(testIp);
  check = checkLoginRateLimit(testIp);
  assert.equal(check.allowed, true, 'Resetting attempts restores access');
});

// ----------------- TEST SUITE 5: INPUT SANITIZATION & XSS DEFENSE -----------------
console.log('\n--- Test Suite 5: Input Sanitization & XSS Defense ---');

runTest('Harmful script tags and HTML injection must be stripped', () => {
  const dirty = '<script>alert("XSS")</script>John Doe<img src=x onerror=alert(1)>';
  const cleaned = sanitizeString(dirty);

  assert.ok(!cleaned.includes('<script>'), 'Script tags must be stripped');
  assert.ok(!cleaned.includes('<img'), 'HTML angle brackets must be removed');
  assert.ok(cleaned.includes('John Doe'), 'Valid text must be preserved');
});

runTest('Geographic coordinates outside valid earth bounds must be rejected', () => {
  assert.equal(isValidCoordinate(9.67416, 76.82573), true, 'Valid Kerala coordinates must pass');
  assert.equal(isValidCoordinate(95.0, 76.0), false, 'Latitude > 90 must fail');
  assert.equal(isValidCoordinate(-95.0, 76.0), false, 'Latitude < -90 must fail');
  assert.equal(isValidCoordinate(9.0, 200.0), false, 'Longitude > 180 must fail');
  assert.equal(isValidCoordinate(NaN, 76.0), false, 'NaN latitude must fail');
});

// ----------------- TEST SUMMARY -----------------
console.log('\n====================================================');
console.log(` Security Test Results: ${passedTests} / ${totalTests} Passed`);
if (passedTests === totalTests) {
  console.log(' All Security Defenses Verified and Hardened Successfully!');
} else {
  console.error(` ${totalTests - passedTests} test(s) failed.`);
  process.exit(1);
}
console.log('====================================================\n');
