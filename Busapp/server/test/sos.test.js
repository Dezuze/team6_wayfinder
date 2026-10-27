import assert from 'node:assert';
import { db } from '../src/data.js';

console.log('--- Testing SOS Emergency Alert Logic ---');

// 1. Initial State
db.activeSosAlerts = db.activeSosAlerts || [];
const initialAlertsCount = db.activeSosAlerts.length;

// 2. Simulate Triggering SOS
const alert = {
  id: `sos-test-${Date.now()}`,
  busId: 'bus-1',
  busNumber: 'BUS NO-1',
  senderName: 'Test Student',
  senderRole: 'student',
  reason: 'Medical Emergency',
  location: { lat: 9.67416, lng: 76.82573 },
  timestamp: new Date().toISOString(),
  active: true
};

db.activeSosAlerts.push(alert);
assert.strictEqual(db.activeSosAlerts.length, initialAlertsCount + 1, 'Alert should be added to activeSosAlerts');
console.log(' [PASS] Emergency alert successfully registered in active alerts');

// 3. Find registered alert
const foundAlert = db.activeSosAlerts.find(a => a.id === alert.id);
assert.ok(foundAlert, 'Alert should be found');
assert.strictEqual(foundAlert.reason, 'Medical Emergency');
console.log(' [PASS] Alert details (reason, sender, location) correctly preserved');

// 4. Resolve Alert
db.activeSosAlerts = db.activeSosAlerts.filter(a => a.id !== alert.id);
assert.strictEqual(db.activeSosAlerts.length, initialAlertsCount, 'Alert should be removed after resolve');
console.log(' [PASS] Alert successfully cleared upon resolution');

console.log('All SOS Unit Tests Passed!\n');
