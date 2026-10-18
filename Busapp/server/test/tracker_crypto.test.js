import crypto from 'node:crypto';
import WebSocket from 'ws';

const TELEMETRY_SECRET_KEY = Buffer.from('TEAM6_WAYFINDER_SECRET_KEY_2026!', 'utf8');

function encryptTelemetry(plainObj, counter = 1) {
  const plainText = JSON.stringify(plainObj);
  const iv = Buffer.alloc(16);
  iv.writeUInt32LE(counter, 0);
  Buffer.from('TEAM6_NONCE1', 'utf8').copy(iv, 4);

  const cipher = crypto.createCipheriv('chacha20', TELEMETRY_SECRET_KEY, iv);
  let cipherHex = cipher.update(plainText, 'utf8', 'hex');
  cipherHex += cipher.final('hex');

  return {
    type: 'ENCRYPTED_TELEMETRY',
    iv: iv.toString('hex'),
    data: cipherHex
  };
}

console.log('Testing Encrypted Packet generation:');
const samplePayload = {
  type: 'DRIVER_LOCATION',
  busId: 'bus-7636158',
  driverName: 'Rahul Nair',
  driverUsername: 'driver.rahul',
  lat: 9.67416,
  lng: 76.82573,
  speed: 25,
  status: 'In Transit',
  bearing: 45
};

const packet = encryptTelemetry(samplePayload, 1);
console.log('Generated Packet:', JSON.stringify(packet, null, 2));

// Test decryption
const ivBuf = Buffer.from(packet.iv, 'hex');
const decipher = crypto.createDecipheriv('chacha20', TELEMETRY_SECRET_KEY, ivBuf);
let dec = decipher.update(packet.data, 'hex', 'utf8');
dec += decipher.final('utf8');
const recovered = JSON.parse(dec);
console.log('Recovered Object:', recovered);

if (recovered.busId === samplePayload.busId && recovered.lat === samplePayload.lat) {
  console.log('[SUCCESS] ChaCha20 Telemetry Encryption/Decryption verified!');
} else {
  console.error('[ERROR] Mismatch in payload!');
  process.exit(1);
}
