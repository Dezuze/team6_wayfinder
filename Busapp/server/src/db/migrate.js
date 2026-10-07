import dotenv from 'dotenv';
import { initDatabase, isConnected } from './index.js';

dotenv.config();

console.log('--- HopSpot PostgreSQL Setup & Migration CLI ---');
console.log('Testing connection to PostgreSQL using DATABASE_URL...');

const success = await initDatabase();

if (success && isConnected()) {
  console.log('\n PostgreSQL connected successfully!');
  console.log(' All tables (routes, buses, student_passes, drivers, admins) and indexes are created.');
  console.log(' Seed data imported into PostgreSQL.');
  process.exit(0);
} else {
  console.error('\n Could not connect to PostgreSQL database.');
  console.error('Please check your .env configuration file in busapp/server/.env.');
  console.error('Make sure your PostgreSQL instance is running or your cloud DATABASE_URL is valid.');
  process.exit(1);
}
