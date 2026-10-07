import pg from 'pg';
import dotenv from 'dotenv';
import { initialDb, db as fallbackDb, saveDb as saveFallbackDb } from '../data.js';
import { hashPassword, verifyPassword, signPassQr, createAuthToken } from '../utils/security.js';

dotenv.config();

const { Pool } = pg;

// Connection configuration
const connectionString = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === 'production';
const hasExplicitSSL = process.env.PGSSL === 'true' || (connectionString && connectionString.includes('sslmode=require'));

let pool = null;
let isPgConnected = false;

// Synchronized in-memory cache for ultra-fast WebSocket broadcasting and fallback persistence
export const db = fallbackDb;

// Initialize PostgreSQL Pool
export function getPool() {
  if (pool) return pool;

  try {
    const config = connectionString
      ? {
          connectionString,
          ssl: hasExplicitSSL ? { rejectUnauthorized: false } : undefined,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000
        }
      : {
          host: process.env.PGHOST || '127.0.0.1',
          port: parseInt(process.env.PGPORT || '5432', 10),
          user: process.env.PGUSER || 'postgres',
          password: process.env.PGPASSWORD || 'postgres',
          database: process.env.PGDATABASE || 'hopspot',
          ssl: hasExplicitSSL ? { rejectUnauthorized: false } : undefined,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000
        };

    pool = new Pool(config);

    pool.on('error', (err) => {
      console.error('[PostgreSQL Pool Error]:', err.message);
    });

    return pool;
  } catch (err) {
    console.error('[PostgreSQL Config Error]:', err.message);
    return null;
  }
}

// Check if PostgreSQL is connected
export function isConnected() {
  return isPgConnected;
}

// Initialize tables and run migrations
export async function initDatabase() {
  const p = getPool();
  if (!p) {
    console.warn('[PostgreSQL] No pool configured. Operating in fallback persistence mode.');
    return false;
  }

  try {
    const client = await p.connect();
    try {
      console.log('Testing PostgreSQL connection...');
      await client.query('SELECT NOW()');
      isPgConnected = true;
      console.log(' Connected to PostgreSQL database server successfully!');

      // Create Tables
      console.log('Migrating PostgreSQL database schema...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS routes (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          stops JSONB NOT NULL DEFAULT '[]'::jsonb,
          color VARCHAR(50) DEFAULT '#8b5cf6',
          waypoints JSONB DEFAULT '[]'::jsonb,
          path JSONB NOT NULL DEFAULT '[]'::jsonb,
          stop_coordinates JSONB DEFAULT '[]'::jsonb,
          distance_km NUMERIC,
          duration_min NUMERIC,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS buses (
          id VARCHAR(100) PRIMARY KEY,
          number VARCHAR(100) NOT NULL,
          route_id VARCHAR(100) REFERENCES routes(id) ON DELETE SET NULL,
          driver_name VARCHAR(255) DEFAULT 'Unassigned',
          status VARCHAR(50) DEFAULT 'Active',
          sos_reason TEXT,
          location JSONB,
          bearing NUMERIC DEFAULT 0,
          speed NUMERIC DEFAULT 0,
          is_live BOOLEAN DEFAULT false,
          last_updated TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS student_passes (
          id VARCHAR(100) PRIMARY KEY,
          username VARCHAR(100),
          password VARCHAR(255) DEFAULT 'student123',
          name VARCHAR(255) NOT NULL,
          student_name VARCHAR(255),
          email VARCHAR(255),
          route_entitlement VARCHAR(255) DEFAULT 'All Routes',
          valid_until VARCHAR(50) DEFAULT '2026-12-31',
          pass_status VARCHAR(50) DEFAULT 'Valid',
          qr_code_string VARCHAR(255),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS drivers (
          id VARCHAR(100) PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(255) DEFAULT 'password123',
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(100),
          assigned_bus_id VARCHAR(100),
          status VARCHAR(50) DEFAULT 'Active',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS admins (
          id VARCHAR(100) PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'admin',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_buses_route ON buses(route_id);
        CREATE INDEX IF NOT EXISTS idx_buses_status ON buses(status);
        CREATE INDEX IF NOT EXISTS idx_passes_email ON student_passes(email);
        CREATE INDEX IF NOT EXISTS idx_passes_username ON student_passes(username);
        CREATE INDEX IF NOT EXISTS idx_drivers_username ON drivers(username);
        CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
      `);

      // Seed tables if empty (with hashed passwords)
      await seedTablesIfEmpty(client);

      // Load PostgreSQL rows into synchronized in-memory cache
      await syncCacheFromPostgres(client);

      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    isPgConnected = false;
    console.warn(`\n[PostgreSQL Notice] Unable to connect to PostgreSQL server: ${err.message}`);
    console.warn('Set DATABASE_URL in .env to connect to your PostgreSQL instance (e.g. Neon, Supabase, or local Postgres).');
    console.warn('HopSpot is currently using the local storage engine as a fail-safe until PostgreSQL is reachable.\n');
    return false;
  }
}

// Auto-seed tables from initial dataset if empty
async function seedTablesIfEmpty(client) {
  // 1. Routes
  const { rows: routeRows } = await client.query('SELECT COUNT(*) FROM routes');
  if (parseInt(routeRows[0].count, 10) === 0 && initialDb.routes?.length) {
    console.log(`Seeding ${initialDb.routes.length} routes into PostgreSQL...`);
    for (const r of initialDb.routes) {
      await client.query(`
        INSERT INTO routes (id, name, stops, color, waypoints, path, stop_coordinates, distance_km, duration_min)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
      `, [
        r.id,
        r.name,
        JSON.stringify(r.stops || []),
        r.color || '#8b5cf6',
        JSON.stringify(r.waypoints || []),
        JSON.stringify(r.path || []),
        JSON.stringify(r.stopCoordinates || []),
        r.distanceKm || null,
        r.durationMin || null
      ]);
    }
  }

  // 2. Buses
  const { rows: busRows } = await client.query('SELECT COUNT(*) FROM buses');
  if (parseInt(busRows[0].count, 10) === 0 && initialDb.buses?.length) {
    console.log(`Seeding ${initialDb.buses.length} buses into PostgreSQL...`);
    for (const b of initialDb.buses) {
      await client.query(`
        INSERT INTO buses (id, number, route_id, driver_name, status, location, bearing, speed, is_live, last_updated)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING
      `, [
        b.id,
        b.number,
        b.routeId || null,
        b.driverName || 'Unassigned',
        b.status || 'Active',
        b.location ? JSON.stringify(b.location) : null,
        b.bearing || 0,
        b.speed || 0,
        false,
        new Date().toISOString()
      ]);
    }
  }

  // 3. Student Passes (passwords hashed with scrypt + salt, QR cryptographically signed)
  const { rows: passRows } = await client.query('SELECT COUNT(*) FROM student_passes');
  if (parseInt(passRows[0].count, 10) === 0 && initialDb.studentPasses?.length) {
    console.log(`Seeding ${initialDb.studentPasses.length} student passes into PostgreSQL...`);
    for (const p of initialDb.studentPasses) {
      const plainPass = p.password || 'student123';
      const secureHashed = hashPassword(plainPass);
      const signedQr = signPassQr(p.id, p.validUntil || '2026-12-31', p.routeEntitlement || 'All Routes');

      await client.query(`
        INSERT INTO student_passes (id, username, password, name, student_name, email, route_entitlement, valid_until, pass_status, qr_code_string)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING
      `, [
        p.id,
        p.username || p.id,
        secureHashed,
        p.name || p.studentName || 'Student',
        p.studentName || p.name || 'Student',
        p.email || `${(p.username || p.id).toLowerCase()}@student.edu`,
        p.routeEntitlement || 'All Routes',
        p.validUntil || '2026-12-31',
        p.passStatus || 'Valid',
        signedQr
      ]);
    }
  }

  // 4. Drivers (passwords hashed with scrypt + salt)
  const { rows: driverRows } = await client.query('SELECT COUNT(*) FROM drivers');
  if (parseInt(driverRows[0].count, 10) === 0 && initialDb.drivers?.length) {
    console.log(`Seeding ${initialDb.drivers.length} drivers into PostgreSQL...`);
    for (const d of initialDb.drivers) {
      const plainPass = d.password || 'password123';
      const secureHashed = hashPassword(plainPass);

      await client.query(`
        INSERT INTO drivers (id, username, password, name, phone, assigned_bus_id, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, [
        d.id,
        d.username,
        secureHashed,
        d.name || 'Driver',
        d.phone || '+1-555-0000',
        d.assignedBusId || null,
        d.status || 'Active'
      ]);
    }
  }

  // 5. Admins (password hashed with scrypt + salt)
  const { rows: adminRows } = await client.query('SELECT COUNT(*) FROM admins');
  if (parseInt(adminRows[0].count, 10) === 0 && initialDb.admins?.length) {
    console.log(`Seeding ${initialDb.admins.length} admins into PostgreSQL...`);
    for (const a of initialDb.admins) {
      const plainPass = a.password || 'password123';
      const secureHashed = hashPassword(plainPass);

      await client.query(`
        INSERT INTO admins (id, username, password, name, role)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `, [
        a.id,
        a.username,
        secureHashed,
        a.name || 'Administrator',
        a.role || 'admin'
      ]);
    }
  }
}

// Sync PostgreSQL data into the active in-memory cache
export async function syncCacheFromPostgres(clientOrPool = null) {
  const runner = clientOrPool || getPool();
  if (!runner || !isPgConnected) return;

  try {
    const { rows: routeRows } = await runner.query(`
      SELECT id, name, stops, color, waypoints, path,
             stop_coordinates AS "stopCoordinates",
             distance_km AS "distanceKm",
             duration_min AS "durationMin",
             created_at AS "createdAt",
             updated_at AS "updatedAt"
      FROM routes ORDER BY id ASC;
    `);
    db.routes = routeRows.map(r => ({
      ...r,
      stops: typeof r.stops === 'string' ? JSON.parse(r.stops) : r.stops,
      waypoints: typeof r.waypoints === 'string' ? JSON.parse(r.waypoints) : r.waypoints,
      path: typeof r.path === 'string' ? JSON.parse(r.path) : r.path,
      stopCoordinates: typeof r.stopCoordinates === 'string' ? JSON.parse(r.stopCoordinates) : (r.stopCoordinates || [])
    }));

    const { rows: busRows } = await runner.query(`
      SELECT id, number, route_id AS "routeId", driver_name AS "driverName",
             status, sos_reason AS "sosReason", location, bearing, speed,
             is_live AS "isLive", last_updated AS "lastUpdated"
      FROM buses ORDER BY id ASC;
    `);
    db.buses = busRows.map(b => ({
      ...b,
      location: typeof b.location === 'string' ? JSON.parse(b.location) : b.location,
      speed: Number(b.speed) || 0,
      bearing: Number(b.bearing) || 0
    }));

    const { rows: passRows } = await runner.query(`
      SELECT id, username, password, name, student_name AS "studentName", email,
             route_entitlement AS "routeEntitlement", valid_until AS "validUntil",
             pass_status AS "passStatus", qr_code_string AS "qrCodeString",
             created_at AS "createdAt"
      FROM student_passes ORDER BY id ASC;
    `);
    db.studentPasses = passRows;

    const { rows: driverRows } = await runner.query(`
      SELECT id, username, password, name, phone, assigned_bus_id AS "assignedBusId",
             status, created_at AS "createdAt"
      FROM drivers ORDER BY id ASC;
    `);
    db.drivers = driverRows;

    const { rows: adminRows } = await runner.query(`
      SELECT id, username, password, name, role, created_at AS "createdAt"
      FROM admins ORDER BY id ASC;
    `);
    db.admins = adminRows;

    console.log(`[PostgreSQL Synced] ${db.routes.length} routes, ${db.buses.length} buses, ${db.studentPasses.length} passes, ${db.drivers.length} drivers, ${db.admins.length} admins.`);
  } catch (err) {
    console.error('[PostgreSQL Cache Sync Error]:', err.message);
  }
}

// ----------------- DATABASE SERVICES (CRUD) -----------------

// BUSES
export async function dbGetBuses() {
  if (isPgConnected) {
    try {
      const p = getPool();
      const { rows } = await p.query(`
        SELECT id, number, route_id AS "routeId", driver_name AS "driverName",
               status, sos_reason AS "sosReason", location, bearing, speed,
               is_live AS "isLive", last_updated AS "lastUpdated"
        FROM buses ORDER BY id ASC;
      `);
      db.buses = rows.map(b => ({
        ...b,
        location: typeof b.location === 'string' ? JSON.parse(b.location) : b.location,
        speed: Number(b.speed) || 0,
        bearing: Number(b.bearing) || 0
      }));
      return db.buses;
    } catch (err) {
      console.error('dbGetBuses error:', err.message);
    }
  }
  return db.buses;
}

export async function dbUpsertBus(bus) {
  const existingIndex = db.buses.findIndex(b => b.id === bus.id);
  if (existingIndex >= 0) {
    db.buses[existingIndex] = { ...db.buses[existingIndex], ...bus };
  } else {
    db.buses.push(bus);
  }

  if (isPgConnected) {
    try {
      const p = getPool();
      await p.query(`
        INSERT INTO buses (id, number, route_id, driver_name, status, sos_reason, location, bearing, speed, is_live, last_updated)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          number = EXCLUDED.number,
          route_id = EXCLUDED.route_id,
          driver_name = EXCLUDED.driver_name,
          status = EXCLUDED.status,
          sos_reason = EXCLUDED.sos_reason,
          location = EXCLUDED.location,
          bearing = EXCLUDED.bearing,
          speed = EXCLUDED.speed,
          is_live = EXCLUDED.is_live,
          last_updated = EXCLUDED.last_updated;
      `, [
        bus.id,
        bus.number,
        bus.routeId || null,
        bus.driverName || 'Unassigned',
        bus.status || 'Active',
        bus.sosReason || null,
        bus.location ? JSON.stringify(bus.location) : null,
        bus.bearing || 0,
        bus.speed || 0,
        Boolean(bus.isLive),
        bus.lastUpdated || new Date().toISOString()
      ]);
    } catch (err) {
      console.error('dbUpsertBus PostgreSQL error:', err.message);
    }
  } else {
    saveFallbackDb();
  }

  return bus;
}

export async function dbDeleteBus(id) {
  const index = db.buses.findIndex(b => b.id === id);
  if (index >= 0) {
    db.buses.splice(index, 1);
  }

  if (isPgConnected) {
    try {
      const p = getPool();
      await p.query('DELETE FROM buses WHERE id = $1', [id]);
    } catch (err) {
      console.error('dbDeleteBus PostgreSQL error:', err.message);
    }
  } else {
    saveFallbackDb();
  }

  return true;
}

// ROUTES
export async function dbGetRoutes() {
  if (isPgConnected) {
    try {
      const p = getPool();
      const { rows } = await p.query(`
        SELECT id, name, stops, color, waypoints, path,
               stop_coordinates AS "stopCoordinates",
               distance_km AS "distanceKm",
               duration_min AS "durationMin",
               created_at AS "createdAt",
               updated_at AS "updatedAt"
        FROM routes ORDER BY created_at ASC;
      `);
      db.routes = rows.map(r => ({
        ...r,
        stops: typeof r.stops === 'string' ? JSON.parse(r.stops) : r.stops,
        waypoints: typeof r.waypoints === 'string' ? JSON.parse(r.waypoints) : r.waypoints,
        path: typeof r.path === 'string' ? JSON.parse(r.path) : r.path,
        stopCoordinates: typeof r.stopCoordinates === 'string' ? JSON.parse(r.stopCoordinates) : (r.stopCoordinates || [])
      }));
      return db.routes;
    } catch (err) {
      console.error('dbGetRoutes error:', err.message);
    }
  }
  return db.routes;
}

export async function dbUpsertRoute(route) {
  const existingIndex = db.routes.findIndex(r => r.id === route.id);
  if (existingIndex >= 0) {
    db.routes[existingIndex] = { ...db.routes[existingIndex], ...route };
  } else {
    db.routes.push(route);
  }

  if (isPgConnected) {
    try {
      const p = getPool();
      await p.query(`
        INSERT INTO routes (id, name, stops, color, waypoints, path, stop_coordinates, distance_km, duration_min)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          stops = EXCLUDED.stops,
          color = EXCLUDED.color,
          waypoints = EXCLUDED.waypoints,
          path = EXCLUDED.path,
          stop_coordinates = EXCLUDED.stop_coordinates,
          distance_km = EXCLUDED.distance_km,
          duration_min = EXCLUDED.duration_min,
          updated_at = NOW();
      `, [
        route.id,
        route.name,
        JSON.stringify(route.stops || []),
        route.color || '#8b5cf6',
        JSON.stringify(route.waypoints || []),
        JSON.stringify(route.path || []),
        JSON.stringify(route.stopCoordinates || []),
        route.distanceKm || null,
        route.durationMin || null
      ]);
    } catch (err) {
      console.error('dbUpsertRoute PostgreSQL error:', err.message);
    }
  } else {
    saveFallbackDb();
  }

  return route;
}

export async function dbDeleteRoute(id) {
  const index = db.routes.findIndex(r => r.id === id);
  if (index >= 0) {
    db.routes.splice(index, 1);
  }

  // Unassign buses referencing this route
  db.buses.forEach(b => {
    if (b.routeId === id) b.routeId = null;
  });

  if (isPgConnected) {
    try {
      const p = getPool();
      await p.query('UPDATE buses SET route_id = NULL WHERE route_id = $1', [id]);
      await p.query('DELETE FROM routes WHERE id = $1', [id]);
    } catch (err) {
      console.error('dbDeleteRoute PostgreSQL error:', err.message);
    }
  } else {
    saveFallbackDb();
  }

  return true;
}

// STUDENT PASSES
export async function dbGetPasses(includeSensitive = false) {
  let list = db.studentPasses;
  if (isPgConnected) {
    try {
      const p = getPool();
      const { rows } = await p.query(`
        SELECT id, username, password, name, student_name AS "studentName", email,
               route_entitlement AS "routeEntitlement", valid_until AS "validUntil",
               pass_status AS "passStatus", qr_code_string AS "qrCodeString",
               created_at AS "createdAt"
        FROM student_passes ORDER BY created_at ASC;
      `);
      db.studentPasses = rows;
      list = rows;
    } catch (err) {
      console.error('dbGetPasses error:', err.message);
    }
  }

  if (includeSensitive) return list;
  // Security Masking: Never return password hashes in public or admin listing API
  return list.map(({ password, ...safe }) => safe);
}

export async function dbUpsertPass(pass) {
  // Ensure password is securely hashed if provided
  let hashedPassword = pass.password;
  if (hashedPassword && !hashedPassword.startsWith('scrypt:')) {
    hashedPassword = hashPassword(hashedPassword);
  } else if (!hashedPassword) {
    const existing = db.studentPasses.find(p => p.id === pass.id);
    hashedPassword = existing?.password || hashPassword('student123');
  }

  // Ensure QR code is cryptographically signed
  const signedQr = signPassQr(
    pass.id,
    pass.validUntil || '2026-12-31',
    pass.routeEntitlement || 'All Routes'
  );

  const safeRecord = {
    ...pass,
    password: hashedPassword,
    qrCodeString: signedQr
  };

  const existingIndex = db.studentPasses.findIndex(p => p.id === pass.id);
  if (existingIndex >= 0) {
    db.studentPasses[existingIndex] = { ...db.studentPasses[existingIndex], ...safeRecord };
  } else {
    db.studentPasses.push(safeRecord);
  }

  if (isPgConnected) {
    try {
      const p = getPool();
      await p.query(`
        INSERT INTO student_passes (id, username, password, name, student_name, email, route_entitlement, valid_until, pass_status, qr_code_string)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          password = EXCLUDED.password,
          name = EXCLUDED.name,
          student_name = EXCLUDED.student_name,
          email = EXCLUDED.email,
          route_entitlement = EXCLUDED.route_entitlement,
          valid_until = EXCLUDED.valid_until,
          pass_status = EXCLUDED.pass_status,
          qr_code_string = EXCLUDED.qr_code_string;
      `, [
        safeRecord.id,
        safeRecord.username || safeRecord.id,
        safeRecord.password,
        safeRecord.name || safeRecord.studentName || 'Student',
        safeRecord.studentName || safeRecord.name || 'Student',
        safeRecord.email || `${(safeRecord.username || safeRecord.id).toLowerCase()}@student.edu`,
        safeRecord.routeEntitlement || 'All Routes',
        safeRecord.validUntil || '2026-12-31',
        safeRecord.passStatus || 'Valid',
        safeRecord.qrCodeString
      ]);
    } catch (err) {
      console.error('dbUpsertPass PostgreSQL error:', err.message);
    }
  } else {
    saveFallbackDb();
  }

  const { password, ...safeReturn } = safeRecord;
  return safeReturn;
}

export async function dbDeletePass(id) {
  const index = db.studentPasses.findIndex(p => p.id === id);
  if (index >= 0) {
    db.studentPasses.splice(index, 1);
  }

  if (isPgConnected) {
    try {
      const p = getPool();
      await p.query('DELETE FROM student_passes WHERE id = $1', [id]);
    } catch (err) {
      console.error('dbDeletePass PostgreSQL error:', err.message);
    }
  } else {
    saveFallbackDb();
  }

  return true;
}

// DRIVERS
export async function dbGetDrivers(includeSensitive = false) {
  let list = db.drivers;
  if (isPgConnected) {
    try {
      const p = getPool();
      const { rows } = await p.query(`
        SELECT id, username, password, name, phone, assigned_bus_id AS "assignedBusId",
               status, created_at AS "createdAt"
        FROM drivers ORDER BY created_at ASC;
      `);
      db.drivers = rows;
      list = rows;
    } catch (err) {
      console.error('dbGetDrivers error:', err.message);
    }
  }

  if (includeSensitive) return list;
  // Security Masking: Never return passwords in driver list
  return list.map(({ password, ...safe }) => safe);
}

export async function dbUpsertDriver(driver) {
  // Hash driver password if provided
  let hashedPassword = driver.password;
  if (hashedPassword && !hashedPassword.startsWith('scrypt:')) {
    hashedPassword = hashPassword(hashedPassword);
  } else if (!hashedPassword) {
    const existing = db.drivers.find(d => d.id === driver.id);
    hashedPassword = existing?.password || hashPassword('password123');
  }

  const safeRecord = {
    ...driver,
    password: hashedPassword
  };

  const existingIndex = db.drivers.findIndex(d => d.id === driver.id);
  if (existingIndex >= 0) {
    db.drivers[existingIndex] = { ...db.drivers[existingIndex], ...safeRecord };
  } else {
    db.drivers.push(safeRecord);
  }

  if (isPgConnected) {
    try {
      const p = getPool();
      await p.query(`
        INSERT INTO drivers (id, username, password, name, phone, assigned_bus_id, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          password = EXCLUDED.password,
          name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          assigned_bus_id = EXCLUDED.assigned_bus_id,
          status = EXCLUDED.status;
      `, [
        safeRecord.id,
        safeRecord.username,
        safeRecord.password,
        safeRecord.name || 'Driver',
        safeRecord.phone || '+1-555-0000',
        safeRecord.assignedBusId || null,
        safeRecord.status || 'Active'
      ]);
    } catch (err) {
      console.error('dbUpsertDriver PostgreSQL error:', err.message);
    }
  } else {
    saveFallbackDb();
  }

  const { password, ...safeReturn } = safeRecord;
  return safeReturn;
}

export async function dbDeleteDriver(id) {
  const index = db.drivers.findIndex(d => d.id === id);
  if (index >= 0) {
    db.drivers.splice(index, 1);
  }

  if (isPgConnected) {
    try {
      const p = getPool();
      await p.query('DELETE FROM drivers WHERE id = $1', [id]);
    } catch (err) {
      console.error('dbDeleteDriver PostgreSQL error:', err.message);
    }
  } else {
    saveFallbackDb();
  }

  return true;
}

// AUTH LOGIN WITH SECURE PASSWORD HASH VERIFICATION & AUTOMATIC UPGRADE
export async function dbAuthenticateUser(username, password, role) {
  const cleanUsername = (username || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();

  if (!cleanUsername || !cleanPassword) return null;

  // 1. Check Admin
  if (!role || role === 'admin') {
    let admin = null;
    if (isPgConnected) {
      try {
        const p = getPool();
        const { rows } = await p.query(
          'SELECT id, username, password, name, role FROM admins WHERE LOWER(username) = $1',
          [cleanUsername]
        );
        if (rows.length > 0) admin = rows[0];
      } catch (err) {
        console.error('Admin query error:', err.message);
      }
    }
    if (!admin) {
      admin = db.admins.find(a => a.username && a.username.toLowerCase() === cleanUsername);
    }

    if (admin) {
      const { valid, needsRehash } = verifyPassword(cleanPassword, admin.password);
      if (valid) {
        if (needsRehash) {
          admin.password = hashPassword(cleanPassword);
          if (isPgConnected) {
            getPool().query('UPDATE admins SET password = $1 WHERE id = $2', [admin.password, admin.id]).catch(() => {});
          } else {
            saveFallbackDb();
          }
        }
        const userObj = { id: admin.id, username: admin.username, name: admin.name, role: 'admin' };
        return { ...userObj, token: createAuthToken(userObj) };
      }
    }
  }

  // 2. Check Driver
  if (!role || role === 'driver') {
    let driver = null;
    if (isPgConnected) {
      try {
        const p = getPool();
        const { rows } = await p.query(
          'SELECT id, username, password, name, phone, assigned_bus_id AS "assignedBusId", status FROM drivers WHERE LOWER(username) = $1',
          [cleanUsername]
        );
        if (rows.length > 0) driver = rows[0];
      } catch (err) {
        console.error('Driver query error:', err.message);
      }
    }
    if (!driver) {
      driver = db.drivers.find(d => d.username && d.username.toLowerCase() === cleanUsername);
    }

    if (driver) {
      const { valid, needsRehash } = verifyPassword(cleanPassword, driver.password);
      if (valid) {
        if (needsRehash) {
          driver.password = hashPassword(cleanPassword);
          if (isPgConnected) {
            getPool().query('UPDATE drivers SET password = $1 WHERE id = $2', [driver.password, driver.id]).catch(() => {});
          } else {
            saveFallbackDb();
          }
        }
        const userObj = {
          id: driver.id,
          username: driver.username,
          name: driver.name,
          phone: driver.phone,
          assignedBusId: driver.assignedBusId,
          role: 'driver'
        };
        return { ...userObj, token: createAuthToken(userObj) };
      }
    }
  }

  // 3. Check Student Pass
  if (!role || role === 'student') {
    let student = null;
    if (isPgConnected) {
      try {
        const p = getPool();
        const { rows } = await p.query(`
          SELECT id, username, password, name, student_name AS "studentName", email,
                 route_entitlement AS "routeEntitlement", pass_status AS "passStatus"
          FROM student_passes
          WHERE (LOWER(username) = $1 OR LOWER(id) = $1 OR LOWER(email) = $1)
        `, [cleanUsername]);
        if (rows.length > 0) student = rows[0];
      } catch (err) {
        console.error('Student query error:', err.message);
      }
    }
    if (!student) {
      student = db.studentPasses.find(s => 
        (s.username && s.username.toLowerCase() === cleanUsername) ||
        (s.id && s.id.toLowerCase() === cleanUsername) || 
        (s.email && s.email.toLowerCase() === cleanUsername)
      );
    }

    if (student) {
      const { valid, needsRehash } = verifyPassword(cleanPassword, student.password);
      if (valid) {
        if (needsRehash) {
          student.password = hashPassword(cleanPassword);
          if (isPgConnected) {
            getPool().query('UPDATE student_passes SET password = $1 WHERE id = $2', [student.password, student.id]).catch(() => {});
          } else {
            saveFallbackDb();
          }
        }
        const userObj = {
          id: student.id,
          username: student.username || student.id,
          name: student.name || student.studentName || 'Student',
          role: 'student',
          email: student.email,
          passStatus: student.passStatus,
          routeEntitlement: student.routeEntitlement
        };
        return { ...userObj, token: createAuthToken(userObj) };
      }
    }
  }

  return null;
}
