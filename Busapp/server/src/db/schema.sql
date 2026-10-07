-- HopSpot PostgreSQL Database Schema

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_buses_route ON buses(route_id);
CREATE INDEX IF NOT EXISTS idx_buses_status ON buses(status);
CREATE INDEX IF NOT EXISTS idx_passes_email ON student_passes(email);
CREATE INDEX IF NOT EXISTS idx_passes_username ON student_passes(username);
CREATE INDEX IF NOT EXISTS idx_drivers_username ON drivers(username);
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
