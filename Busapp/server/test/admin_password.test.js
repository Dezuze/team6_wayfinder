import assert from 'node:assert/strict';
import Fastify from 'fastify';
import adminRoutes from '../src/routes/admin.js';
import { db, dbGetPasses, dbAuthenticateUser } from '../src/db/index.js';
import { createAuthToken } from '../src/utils/security.js';

async function runTests() {
  console.log('--- Test Suite: Admin & Pass Password Updates ---');

  const fastify = Fastify({ logger: false });
  await fastify.register(adminRoutes);

  // Setup sample pass with a slash in ID (like 3468/24)
  const slashId = '3468/24';
  const existing = db.studentPasses.find(p => p.id === slashId);
  if (!existing) {
    db.studentPasses.push({
      id: slashId,
      username: slashId,
      password: 'scrypt:test',
      name: 'Wesly Philip Jacob',
      studentName: 'Wesly Philip Jacob',
      email: 'wesly@test.com',
      routeEntitlement: 'All Routes',
      validUntil: '2026-12-31',
      passStatus: 'Valid'
    });
  }

  const adminToken = createAuthToken({ id: 'admin-default', username: 'admin', role: 'admin' });

  // Test 1: Updating pass with unencoded slash /api/passes/3468/24
  const resUnencoded = await fastify.inject({
    method: 'PUT',
    url: `/api/passes/${slashId}`,
    headers: { authorization: `Bearer ${adminToken}` },
    payload: {
      password: 'newStudentPassPassword123'
    }
  });
  assert.equal(resUnencoded.statusCode, 200, `Expected 200, got ${resUnencoded.statusCode}: ${resUnencoded.body}`);
  const data1 = resUnencoded.json();
  assert.equal(data1.success, true);
  console.log(' [PASS] PUT /api/passes/3468/24 (unencoded slash) succeeds with 200 OK');

  // Test 2: Updating pass with encoded slash /api/passes/3468%2F24
  const resEncoded = await fastify.inject({
    method: 'PUT',
    url: `/api/passes/${encodeURIComponent(slashId)}`,
    headers: { authorization: `Bearer ${adminToken}` },
    payload: {
      password: 'secondUpdatedPassword456'
    }
  });
  assert.equal(resEncoded.statusCode, 200, `Expected 200, got ${resEncoded.statusCode}: ${resEncoded.body}`);
  const data2 = resEncoded.json();
  assert.equal(data2.success, true);
  console.log(' [PASS] PUT /api/passes/3468%2F24 (URI encoded slash) succeeds with 200 OK');

  // Test 3: Updating admin's own password via PUT /api/admin/password
  const resAdminPass = await fastify.inject({
    method: 'PUT',
    url: '/api/admin/password',
    headers: { authorization: `Bearer ${adminToken}` },
    payload: {
      newPassword: 'newAdminSecret2026!'
    }
  });
  assert.equal(resAdminPass.statusCode, 200, `Expected 200, got ${resAdminPass.statusCode}: ${resAdminPass.body}`);
  const data3 = resAdminPass.json();
  assert.equal(data3.success, true);
  console.log(' [PASS] PUT /api/admin/password updates admin credentials successfully');

  // Verify new admin password can authenticate
  const authResult = await dbAuthenticateUser('admin', 'newAdminSecret2026!', 'admin');
  assert.ok(authResult, 'Admin must be able to authenticate with newly set password');
  assert.equal(authResult.username, 'admin');
  console.log(' [PASS] Authenticated successfully with new admin password');

  console.log('\nAll password update tests passed successfully!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
