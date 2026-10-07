// Idempotent, additive migration: multi-owner (ADMIN) lots, SECURITY staff, walk-in bookings.
// Safe to run on every server start and on already-migrated databases.
export const multiOwnerSQL = `
-- users: ownership / staff scoping
ALTER TABLE users ADD COLUMN IF NOT EXISTS managed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_lot_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_name VARCHAR(150);

-- parking_lots: owner + setup details
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS opening_time TIME DEFAULT '00:00';
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS closing_time TIME DEFAULT '23:59';
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS default_hourly_price NUMERIC(10, 2) DEFAULT 30.00;
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS supported_vehicle_types VARCHAR(100) DEFAULT 'four_wheeler,two_wheeler';
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS pre_booking_fee NUMERIC(10, 2);
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_parking_lots_admin_id ON parking_lots(admin_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_assigned_lot_fk') THEN
    ALTER TABLE users ADD CONSTRAINT users_assigned_lot_fk
      FOREIGN KEY (assigned_lot_id) REFERENCES parking_lots(id) ON DELETE SET NULL;
  END IF;
END $$;

-- bookings: walk-in (guard created, optionally guest)
ALTER TABLE bookings ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN vehicle_id DROP NOT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_vehicle_number VARCHAR(20);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(20);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ticket_code VARCHAR(20);
CREATE INDEX IF NOT EXISTS idx_bookings_ticket_code ON bookings(ticket_code);

-- payments: platform-level (admin registration) payments have no booking
ALTER TABLE payments ALTER COLUMN booking_id DROP NOT NULL;

-- incident reports: route to the owning lot
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES parking_lots(id) ON DELETE SET NULL;
UPDATE incident_reports r SET lot_id = s.lot_id
  FROM parking_slots s WHERE r.lot_id IS NULL AND r.slot_id = s.id;
UPDATE incident_reports r SET lot_id = s.lot_id
  FROM bookings b JOIN parking_slots s ON b.slot_id = s.id
  WHERE r.lot_id IS NULL AND r.booking_id = b.id;

-- admin self-registration (account is created only after the fee is paid)
CREATE TABLE IF NOT EXISTS admin_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  organization_name VARCHAR(150) NOT NULL,
  fee_amount NUMERIC(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending_payment',
  payment_method VARCHAR(50),
  transaction_reference VARCHAR(255),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Existing single-admin data: lots belong to admin@spms.com; operator becomes SECURITY
UPDATE users SET organization_name = COALESCE(organization_name, 'SPMS Campus Parking')
  WHERE email = 'admin@spms.com' AND role = 'ADMIN';
UPDATE parking_lots SET admin_id = (SELECT id FROM users WHERE email = 'admin@spms.com' AND role = 'ADMIN')
  WHERE admin_id IS NULL;
UPDATE users SET role = 'SECURITY',
    managed_by = (SELECT id FROM users WHERE email = 'admin@spms.com'),
    assigned_lot_id = '44444444-4444-4444-4444-111111111111'
  WHERE email = 'operator@spms.com' AND role = 'ADMIN'
    AND EXISTS (SELECT 1 FROM parking_lots WHERE id = '44444444-4444-4444-4444-111111111111');
`;
