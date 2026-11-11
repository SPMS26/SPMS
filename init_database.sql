-- ============================================================================
-- Smart Parking Management System (SPMS)
-- Database Initialization & Seed Script
-- PostgreSQL Compatible
-- ============================================================================
-- Usage:
--   1. Connect to PostgreSQL:
--        psql -U postgres
--   2. (Optional) Create database if not exists:
--        CREATE DATABASE spms;
--   3. Run this script:
--        psql -U postgres -d spms -f init_database.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 2. DROP EXISTING TABLES (Clean Re-alignment)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS admin_logs CASCADE;
DROP TABLE IF EXISTS incident_reports CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS slot_reassignments CASCADE;
DROP TABLE IF EXISTS qr_codes CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS parking_slots CASCADE;
DROP TABLE IF EXISTS parking_lots CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ----------------------------------------------------------------------------
-- 3. SCHEMA DEFINITIONS (11 Normalized Tables)
-- ----------------------------------------------------------------------------

-- 3.1 Users
CREATE TABLE users (
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

-- 3.2 Vehicles
CREATE TABLE vehicles (
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

-- 3.3 Parking Lots
CREATE TABLE parking_lots (
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

-- 3.4 Parking Slots
CREATE TABLE parking_slots (
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

-- 3.5 Bookings
CREATE TABLE bookings (
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

-- 3.6 Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  tax NUMERIC(10, 2) DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'simulated',
  payment_status VARCHAR(20) DEFAULT 'pending',
  transaction_reference VARCHAR(255),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- 3.7 QR Codes
CREATE TABLE qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  signature_hash VARCHAR(128) NOT NULL,
  version INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- 3.8 Slot Reassignments
CREATE TABLE slot_reassignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  old_slot_id UUID NOT NULL REFERENCES parking_slots(id),
  new_slot_id UUID NOT NULL REFERENCES parking_slots(id),
  changed_by UUID NOT NULL REFERENCES users(id),
  reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3.9 Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3.10 Incident Reports
CREATE TABLE incident_reports (
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

-- 3.11 Admin Logs
CREATE TABLE admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  target_table VARCHAR(50),
  target_id UUID,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- INDEXES FOR HIGH-PERFORMANCE QUERIES
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_parking_slots_lot_id ON parking_slots(lot_id);
CREATE INDEX IF NOT EXISTS idx_parking_slots_status ON parking_slots(status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_slot_id ON bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_booking_id ON qr_codes(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_user_id ON incident_reports(user_id);

-- ----------------------------------------------------------------------------
-- 4. SEED DATA
-- ----------------------------------------------------------------------------

-- 4.1 Users
-- Passwords:
--   Super Admin & Operator: admin123 ($2a$10$6IpMnxnDAjljDxLyrAPFi.LyHxd74XSjyEEOqEZpHZ9nhawCbU436)
--   Users:                  user123  ($2a$10$9bRQRk7xgLrvRch7bNi9meSvymUtnIJL3IMufERhnO1/zHeOXGpna)
INSERT INTO users (id, full_name, email, password_hash, phone, role, is_verified, created_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Super Admin', 'admin@spms.com', '$2a$10$6IpMnxnDAjljDxLyrAPFi.LyHxd74XSjyEEOqEZpHZ9nhawCbU436', '+91 9876543210', 'ADMIN', true, CURRENT_TIMESTAMP),
  ('11111111-1111-1111-1111-222222222222', 'Security Operator', 'operator@spms.com', '$2a$10$6IpMnxnDAjljDxLyrAPFi.LyHxd74XSjyEEOqEZpHZ9nhawCbU436', '+91 9876500001', 'ADMIN', true, CURRENT_TIMESTAMP),
  ('22222222-2222-2222-2222-111111111111', 'Mehanna Reddy', 'mehanna@spms.com', '$2a$10$9bRQRk7xgLrvRch7bNi9meSvymUtnIJL3IMufERhnO1/zHeOXGpna', '+91 9123456789', 'USER', true, CURRENT_TIMESTAMP),
  ('22222222-2222-2222-2222-222222222222', 'Aditya Sharma', 'aditya@spms.com', '$2a$10$9bRQRk7xgLrvRch7bNi9meSvymUtnIJL3IMufERhnO1/zHeOXGpna', '+91 9988776655', 'USER', true, CURRENT_TIMESTAMP),
  ('22222222-2222-2222-2222-333333333333', 'Priya Patel', 'priya@spms.com', '$2a$10$9bRQRk7xgLrvRch7bNi9meSvymUtnIJL3IMufERhnO1/zHeOXGpna', '+91 9445566778', 'USER', true, CURRENT_TIMESTAMP);

-- 4.2 Vehicles
INSERT INTO vehicles (id, user_id, vehicle_number, vehicle_type, vehicle_model, vehicle_color, is_default)
VALUES
  ('33333333-3333-3333-3333-111111111111', '22222222-2222-2222-2222-111111111111', 'TS09 AB 1234', 'four_wheeler', 'Hyundai i20', 'White', true),
  ('33333333-3333-3333-3333-222222222222', '22222222-2222-2222-2222-222222222222', 'KA-01-MJ-8822', 'four_wheeler', 'Honda City', 'Silver', true),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-333333333333', 'MH-02-CP-9090', 'four_wheeler', 'Tata Nexon EV', 'Blue', true),
  ('33333333-3333-3333-3333-444444444444', '22222222-2222-2222-2222-111111111111', 'TS09 ZZ 9999', 'two_wheeler', 'Royal Enfield 350', 'Black', false);

-- 4.3 Parking Lots
INSERT INTO parking_lots (id, name, address, latitude, longitude, total_slots, available_slots, description)
VALUES
  ('44444444-4444-4444-4444-111111111111', 'Central Parking', 'Main Block, Campus', 17.3850, 78.4867, 40, 36, 'Main campus multi-level parking facility with fast entry and EV charging stations'),
  ('44444444-4444-4444-4444-222222222222', 'Science Block Parking', 'Science Block, Campus', 17.3870, 78.4890, 40, 39, 'Covered parking area adjacent to Science & Technology Innovation Center'),
  ('44444444-4444-4444-4444-333333333333', 'Library Parking', 'Library Building', 17.3830, 78.4840, 40, 40, 'Quiet parking zone near Central Library with shaded tree canopy'),
  ('44444444-4444-4444-4444-444444444444', 'Hostel Parking', 'Hostel Area', 17.3890, 78.4910, 40, 38, 'Resident student and visitor parking area near campus hostels');
DO $$
DECLARE
  v_lot_id UUID;
  v_lot_name TEXT;
  v_row TEXT;
  v_num INT;
  v_slot_num TEXT;
  v_floor TEXT;
  v_status TEXT;
  v_price NUMERIC(10,2);
BEGIN
  FOR v_lot_id, v_lot_name IN 
    SELECT id, name FROM parking_lots
  LOOP
    FOREACH v_row IN ARRAY ARRAY['A', 'B', 'C', 'D']
    LOOP
      IF v_row IN ('A', 'B') THEN
        v_floor := 'B1';
      ELSIF v_row = 'C' THEN
        v_floor := 'GF';
      ELSE
        v_floor := 'FF';
      END IF;

      FOR v_num IN 1..10
      LOOP
        v_slot_num := v_row || v_num::TEXT;
        v_status := 'available';

        IF v_lot_name = 'Central Parking' THEN
          IF v_slot_num IN ('A4', 'B8') THEN
            v_status := 'occupied';
          ELSIF v_slot_num = 'C5' THEN
            v_status := 'reserved';
          END IF;
        ELSIF v_lot_name = 'Hostel Parking' AND v_slot_num = 'D3' THEN
          v_status := 'occupied';
        ELSIF v_lot_name = 'Science Block Parking' AND v_slot_num = 'A1' THEN
          v_status := 'occupied';
        END IF;

        IF v_lot_name = 'Central Parking' THEN
          v_price := 30.00;
        ELSIF v_lot_name = 'Library Parking' THEN
          v_price := 20.00;
        ELSE
          v_price := 25.00;
        END IF;

        INSERT INTO parking_slots (lot_id, slot_number, slot_type, status, hourly_price, floor, section, is_active)
        VALUES (v_lot_id, v_slot_num, 'car', v_status, v_price, v_floor, v_row, true);
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- 4.5 Sample Bookings, Payments, and QR Codes
DO $$
DECLARE
  v_slot_c5 UUID;
  v_slot_b8 UUID;
  v_slot_a4 UUID;
  v_booking_id UUID := '55555555-5555-5555-5555-111111111111';
  v_booking2_id UUID := '55555555-5555-5555-5555-222222222222';
  v_booking3_id UUID := '55555555-5555-5555-5555-333333333333';
BEGIN
  SELECT id INTO v_slot_c5 FROM parking_slots 
  WHERE lot_id = '44444444-4444-4444-4444-111111111111' AND slot_number = 'C5';

  SELECT id INTO v_slot_b8 FROM parking_slots 
  WHERE lot_id = '44444444-4444-4444-4444-111111111111' AND slot_number = 'B8';

  SELECT id INTO v_slot_a4 FROM parking_slots 
  WHERE lot_id = '44444444-4444-4444-4444-111111111111' AND slot_number = 'A4';

  -- Booking 1: Live reserved booking for Mehanna
  INSERT INTO bookings (id, user_id, vehicle_id, slot_id, booking_type, booking_status, booking_start, booking_end, duration_minutes, total_amount, payment_status)
  VALUES (
    v_booking_id,
    '22222222-2222-2222-2222-111111111111',
    '33333333-3333-3333-3333-111111111111',
    v_slot_c5,
    'live_booking',
    'reserved',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '2 hours',
    120,
    30.00,
    'paid'
  );

  INSERT INTO payments (id, booking_id, amount, tax, payment_method, payment_status, transaction_reference, paid_at)
  VALUES (
    '66666666-6666-6666-6666-111111111111',
    v_booking_id,
    30.00,
    0,
    'upi',
    'paid',
    'UPI-TXN-948201',
    CURRENT_TIMESTAMP
  );

  INSERT INTO qr_codes (id, booking_id, signature_hash, version, is_active, expires_at)
  VALUES (
    '77777777-7777-7777-7777-111111111111',
    v_booking_id,
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    1,
    true,
    CURRENT_TIMESTAMP + INTERVAL '1 day'
  );

  -- Booking 2: Active parked vehicle for Aditya
  INSERT INTO bookings (id, user_id, vehicle_id, slot_id, booking_type, booking_status, booking_start, booking_end, entry_time, duration_minutes, total_amount, payment_status)
  VALUES (
    v_booking2_id,
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-222222222222',
    v_slot_b8,
    'live_booking',
    'parked',
    CURRENT_TIMESTAMP - INTERVAL '45 minutes',
    CURRENT_TIMESTAMP + INTERVAL '1 hour',
    CURRENT_TIMESTAMP - INTERVAL '40 minutes',
    105,
    30.00,
    'paid'
  );

  INSERT INTO payments (id, booking_id, amount, tax, payment_method, payment_status, transaction_reference, paid_at)
  VALUES (
    '66666666-6666-6666-6666-222222222222',
    v_booking2_id,
    30.00,
    0,
    'card',
    'paid',
    'CARD-TXN-831920',
    CURRENT_TIMESTAMP - INTERVAL '45 minutes'
  );

  INSERT INTO qr_codes (id, booking_id, signature_hash, version, is_active, expires_at)
  VALUES (
    '77777777-7777-7777-7777-222222222222',
    v_booking2_id,
    'f4c8996fb92427ae41e4649b934ca495991b7852b855e3b0c44298fc1c149a',
    1,
    true,
    CURRENT_TIMESTAMP + INTERVAL '1 day'
  );

  -- Booking 3: Completed past booking for Priya
  INSERT INTO bookings (id, user_id, vehicle_id, slot_id, booking_type, booking_status, booking_start, booking_end, entry_time, exit_time, duration_minutes, total_amount, payment_status)
  VALUES (
    v_booking3_id,
    '22222222-2222-2222-2222-333333333333',
    '33333333-3333-3333-3333-333333333333',
    v_slot_a4,
    'advanced_reservation',
    'completed',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '22 hours',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '22 hours',
    120,
    30.00,
    'paid'
  );

  INSERT INTO payments (id, booking_id, amount, tax, payment_method, payment_status, transaction_reference, paid_at)
  VALUES (
    '66666666-6666-6666-6666-333333333333',
    v_booking3_id,
    30.00,
    0,
    'netbanking',
    'paid',
    'NB-TXN-712894',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
  );

  INSERT INTO qr_codes (id, booking_id, signature_hash, version, is_active, expires_at)
  VALUES (
    '77777777-7777-7777-7777-333333333333',
    v_booking3_id,
    '3333333333333333333333333333333333333333333333333333333333333333',
    1,
    false,
    CURRENT_TIMESTAMP - INTERVAL '20 hours'
  );

  -- 4.6 Incident Reports
  INSERT INTO incident_reports (id, user_id, booking_id, slot_id, incident_type, description, status, created_at)
  VALUES (
    '88888888-8888-8888-8888-111111111111',
    '22222222-2222-2222-2222-111111111111',
    v_booking_id,
    v_slot_b8,
    'Blocked Slot',
    'Slot B8 was blocked by an unauthorized vehicle during peak morning hours.',
    'pending',
    CURRENT_TIMESTAMP - INTERVAL '20 minutes'
  );

  INSERT INTO incident_reports (id, user_id, incident_type, description, status, admin_response, resolved_by, created_at, resolved_at)
  VALUES (
    '88888888-8888-8888-8888-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'QR Scanner Failure',
    'QR Scanner camera at Gate 2 did not scan pass initially.',
    'solved',
    'Gate scanner optical lens cleaned and software recalibrated.',
    '11111111-1111-1111-1111-111111111111',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
  );

  -- 4.7 Slot Reassignments
  INSERT INTO slot_reassignments (id, booking_id, old_slot_id, new_slot_id, changed_by, reason, changed_at)
  VALUES (
    '99999999-9999-9999-9999-111111111111',
    v_booking_id,
    v_slot_b8,
    v_slot_c5,
    '11111111-1111-1111-1111-111111111111',
    'Automatic re-assignment due to reported physical obstruction on slot B8',
    CURRENT_TIMESTAMP - INTERVAL '15 minutes'
  );
END $$;

-- 4.8 Notifications
INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-111111111111', '22222222-2222-2222-2222-111111111111', 'Slot Booked Successfully', 'Your parking spot C5 in Central Parking (GF) is confirmed. Your QR pass is ready.', 'success', false, CURRENT_TIMESTAMP - INTERVAL '15 minutes'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-222222222222', '22222222-2222-2222-2222-222222222222', 'Vehicle Parked at Gate 1', 'Gate entry verified for Honda City (KA-01-MJ-8822) at Central Parking B8.', 'info', true, CURRENT_TIMESTAMP - INTERVAL '40 minutes'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-333333333333', '22222222-2222-2222-2222-333333333333', 'Payment Receipt', 'Payment of ₹30.00 confirmed for booking BK-712894.', 'payment', true, CURRENT_TIMESTAMP - INTERVAL '1 day');

-- 4.9 Admin Logs
INSERT INTO admin_logs (id, admin_id, action, target_table, description, created_at)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-111111111111', '11111111-1111-1111-1111-111111111111', 'INITIAL_SEED', 'database', 'Normalized PostgreSQL database seed data loaded successfully.', CURRENT_TIMESTAMP),
  ('bbbbbbbb-bbbb-bbbb-bbbb-222222222222', '11111111-1111-1111-1111-111111111111', 'GATE_CALIBRATION', 'parking_lots', 'Gate 2 scanner optical recalibration test successful.', CURRENT_TIMESTAMP - INTERVAL '1 day');

-- ----------------------------------------------------------------------------
-- 5. VERIFICATION NOTICE
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'SPMS PostgreSQL database initialization & seed complete!';
  RAISE NOTICE '-------------------------------------------------------';
  RAISE NOTICE 'Users:           admin@spms.com (admin123)';
  RAISE NOTICE '                 operator@spms.com (admin123)';
  RAISE NOTICE '                 mehanna@spms.com (user123)';
  RAISE NOTICE '                 aditya@spms.com (user123)';
  RAISE NOTICE '                 priya@spms.com (user123)';
  RAISE NOTICE '=======================================================';
END $$;
