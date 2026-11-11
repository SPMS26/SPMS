import db from './database.js';
import { multiOwnerSQL } from './multiOwnerMigration.js';

const createTablesSQL = `
-- Enable UUID extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  profile_image VARCHAR(500),
  role VARCHAR(20) NOT NULL DEFAULT 'USER',
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_number VARCHAR(20) UNIQUE NOT NULL,
  vehicle_type VARCHAR(30) NOT NULL DEFAULT 'four_wheeler',
  vehicle_model VARCHAR(100),
  vehicle_color VARCHAR(30),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Parking Lots Table
CREATE TABLE IF NOT EXISTS parking_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  address VARCHAR(500),
  latitude FLOAT,
  longitude FLOAT,
  total_slots INT NOT NULL DEFAULT 0,
  available_slots INT NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Parking Slots Table
CREATE TABLE IF NOT EXISTS parking_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES parking_lots(id) ON DELETE CASCADE,
  slot_number VARCHAR(10) NOT NULL,
  slot_type VARCHAR(20) NOT NULL DEFAULT 'car',
  status VARCHAR(20) NOT NULL DEFAULT 'available',
  hourly_price NUMERIC(10, 2) NOT NULL DEFAULT 30.00,
  floor VARCHAR(20) NOT NULL DEFAULT 'GF',
  section VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lot_id, slot_number)
);

-- 5. Bookings Table (Normalized: No duplicate QR JSON stored)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES parking_slots(id) ON DELETE CASCADE,
  booking_type VARCHAR(30) NOT NULL,
  booking_status VARCHAR(30) NOT NULL DEFAULT 'reserved',
  booking_start TIMESTAMP WITH TIME ZONE,
  booking_end TIMESTAMP WITH TIME ZONE,
  entry_time TIMESTAMP WITH TIME ZONE,
  exit_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INT,
  total_amount NUMERIC(10, 2) DEFAULT 0,
  payment_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  tax NUMERIC(10, 2) DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'simulated',
  payment_status VARCHAR(20) DEFAULT 'pending',
  transaction_reference VARCHAR(255),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- 7. QR Codes Table (Pass Lifecycle & Revocation State Tracker)
CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  signature_hash VARCHAR(128) NOT NULL,
  version INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- 8. Slot Reassignments Table
CREATE TABLE IF NOT EXISTS slot_reassignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  old_slot_id UUID NOT NULL REFERENCES parking_slots(id),
  new_slot_id UUID NOT NULL REFERENCES parking_slots(id),
  changed_by UUID NOT NULL REFERENCES users(id),
  reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Incident Reports Table
CREATE TABLE IF NOT EXISTS incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot_id UUID REFERENCES parking_slots(id) ON DELETE SET NULL,
  incident_type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  image_url VARCHAR(500),
  status VARCHAR(30) DEFAULT 'pending',
  admin_response TEXT,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- 11. Admin Logs Table
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  target_table VARCHAR(50),
  target_id UUID,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. System Settings Table (Dynamic Configuration)
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value VARCHAR(255) NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Schema Additions
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pre_booking_fee NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS parking_charge NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_type VARCHAR(30) DEFAULT 'reservation';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Rate limit counters shared by every server instance (see middleware/rateLimit.js)
CREATE TABLE IF NOT EXISTS rate_limits (
  key VARCHAR(255) PRIMARY KEY,
  hits INT NOT NULL,
  reset_at TIMESTAMP WITH TIME ZONE NOT NULL
);
`;

async function initDb() {
  try {
    await db.query(createTablesSQL);
    await db.query(multiOwnerSQL);

    // Seed default PRE_BOOKING_FEE setting if not exists
    await db.query(
      `INSERT INTO system_settings (key, value, description)
       VALUES ('PRE_BOOKING_FEE', '10.00', 'Configurable pre-booking reservation fee in INR')
       ON CONFLICT (key) DO NOTHING`
    );

    // Seed default EXIT_PAYMENT_TIMEOUT_SECONDS setting if not exists
    await db.query(
      `INSERT INTO system_settings (key, value, description)
       VALUES ('EXIT_PAYMENT_TIMEOUT_SECONDS', '300', 'Configurable exit parking payment timeout in seconds')
       ON CONFLICT (key) DO NOTHING`
    );

    console.log('[Database] PostgreSQL tables & system_settings verified successfully using normalized DDL SQL.');
  } catch (err) {
    console.error('[Database] Error executing table DDL SQL:', err);
    throw err;
  }
}

export { initDb };
