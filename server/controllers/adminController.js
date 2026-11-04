import bcrypt from 'bcryptjs';
import db from '../config/database.js';
import { getAccessibleLotIds } from '../middleware/scope.js';

// Admin: users who have booked in this admin's lots (never other owners' customers)
export const getUsers = async (req, res, next) => {
  try {
    const lotIds = await getAccessibleLotIds(req.user);
    const result = await db.query(
      `SELECT
         u.id, u.full_name, u.email, u.phone, u.role, u.is_verified, u.created_at,
         COUNT(b.id)::int AS bookings_count,
         COALESCE(
           json_agg(DISTINCT jsonb_build_object('id', v.id, 'vehicle_number', v.vehicle_number, 'vehicle_type', v.vehicle_type))
             FILTER (WHERE v.id IS NOT NULL), '[]'
         ) AS vehicles
       FROM users u
       JOIN bookings b ON b.user_id = u.id
       JOIN parking_slots s ON b.slot_id = s.id
       LEFT JOIN vehicles v ON u.id = v.user_id
       WHERE s.lot_id = ANY($1::uuid[]) AND u.role = 'USER'
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
      [lotIds]
    );
    res.status(200).json({ success: true, users: result.rows });
  } catch (err) {
    next(err);
  }
};

// Admin / Security: scanned entry history for accessible lots only
export const getScanHistory = async (req, res, next) => {
  try {
    const lotIds = await getAccessibleLotIds(req.user);
    const result = await db.query(
      `SELECT
         b.id, b.booking_status, b.booking_type, b.entry_time, b.created_at, b.total_amount, b.ticket_code,
         COALESCE(u.full_name, 'Walk-in guest') AS "userName",
         COALESCE(v.vehicle_number, b.guest_vehicle_number) AS "vehicleNo",
         s.slot_number AS "slotCode",
         l.name AS "lotName"
       FROM bookings b
       JOIN parking_slots s ON b.slot_id = s.id
       JOIN parking_lots l ON s.lot_id = l.id
       LEFT JOIN users u ON b.user_id = u.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.booking_status IN ('active', 'completed', 'reserved') AND s.lot_id = ANY($1::uuid[])
       ORDER BY b.created_at DESC
       LIMIT 50`,
      [lotIds]
    );

    const history = result.rows.map((b) => ({
      id: b.id,
      bookingId: b.ticket_code || `BK-${b.id.substring(0, 6).toUpperCase()}`,
      userName: b.userName || 'N/A',
      vehicleNo: b.vehicleNo || 'N/A',
      slotCode: b.slotCode || 'N/A',
      lotName: b.lotName || 'N/A',
      timestamp: b.entry_time ? new Date(b.entry_time).toLocaleString() : new Date(b.created_at).toLocaleString(),
      amountPaid: `₹${Number(b.total_amount || 0)}`,
      status: b.booking_status === 'completed' ? 'Completed' : 'Validated'
    }));

    res.status(200).json({ success: true, history });
  } catch (err) {
    next(err);
  }
};

// Admin: audit logs for this admin and their own security staff
export const getAdminLogs = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT l.*, json_build_object('full_name', u.full_name, 'email', u.email) AS admin
       FROM admin_logs l
       JOIN users u ON l.admin_id = u.id
       WHERE u.id = $1 OR u.managed_by = $1
       ORDER BY l.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.status(200).json({ success: true, logs: result.rows });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Security staff (each guard belongs to one admin and is tied to exactly one lot)
// ---------------------------------------------------------------------------
const SECURITY_COLUMNS = `
  u.id, u.full_name, u.email, u.phone, u.is_active, u.assigned_lot_id, u.created_at,
  l.name AS assigned_lot_name
`;

const ownsLot = async (adminId, lotId) => {
  if (!lotId) return false;
  const r = await db.query('SELECT 1 FROM parking_lots WHERE id = $1 AND admin_id = $2', [lotId, adminId]);
  return r.rows.length > 0;
};

export const getSecurityStaff = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT ${SECURITY_COLUMNS}
       FROM users u LEFT JOIN parking_lots l ON u.assigned_lot_id = l.id
       WHERE u.role = 'SECURITY' AND u.managed_by = $1
       ORDER BY u.created_at DESC`,
      [req.user.id]
    );
    res.status(200).json({ success: true, staff: result.rows });
  } catch (err) {
    next(err);
  }
};

export const createSecurityStaff = async (req, res, next) => {
  try {
    const { full_name, email, password, phone, assigned_lot_id } = req.body;

    if (!full_name || !email || !password || !assigned_lot_id) {
      return res.status(400).json({ success: false, message: 'Name, email, password and an assigned lot are required.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }
    if (!(await ownsLot(req.user.id, assigned_lot_id))) {
      return res.status(403).json({ success: false, message: 'You can only assign security staff to your own lots.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const exists = await db.query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, await bcrypt.genSalt(12));
    const created = await db.query(
      `INSERT INTO users (full_name, email, password_hash, phone, role, is_verified, managed_by, assigned_lot_id)
       VALUES ($1, $2, $3, $4, 'SECURITY', true, $5, $6)
       RETURNING id`,
      [String(full_name).trim(), normalizedEmail, passwordHash, phone || null, req.user.id, assigned_lot_id]
    );

    await db.query(
      `INSERT INTO admin_logs (admin_id, action, target_table, target_id, description)
       VALUES ($1, 'SECURITY_CREATED', 'users', $2, $3)`,
      [req.user.id, created.rows[0].id, `Created security account ${normalizedEmail}.`]
    );

    const row = await db.query(
      `SELECT ${SECURITY_COLUMNS} FROM users u LEFT JOIN parking_lots l ON u.assigned_lot_id = l.id WHERE u.id = $1`,
      [created.rows[0].id]
    );
    res.status(201).json({ success: true, message: 'Security account created.', staff: row.rows[0] });
  } catch (err) {
    next(err);
  }
};

// Update name/phone, reassign lot, activate/deactivate, reset password - own staff only
export const updateSecurityStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { full_name, phone, assigned_lot_id, is_active, password } = req.body;

    const own = await db.query("SELECT id FROM users WHERE id = $1 AND role = 'SECURITY' AND managed_by = $2", [id, req.user.id]);
    if (own.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Security account not found.' });
    }

    if (assigned_lot_id && !(await ownsLot(req.user.id, assigned_lot_id))) {
      return res.status(403).json({ success: false, message: 'You can only assign security staff to your own lots.' });
    }
    if (password !== undefined && password !== '' && String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const passwordHash = password ? await bcrypt.hash(password, await bcrypt.genSalt(12)) : null;

    await db.query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           phone = COALESCE($2, phone),
           assigned_lot_id = COALESCE($3, assigned_lot_id),
           is_active = COALESCE($4, is_active),
           password_hash = COALESCE($5, password_hash),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6`,
      [full_name?.trim() || null, phone ?? null, assigned_lot_id || null, typeof is_active === 'boolean' ? is_active : null, passwordHash, id]
    );

    const row = await db.query(
      `SELECT ${SECURITY_COLUMNS} FROM users u LEFT JOIN parking_lots l ON u.assigned_lot_id = l.id WHERE u.id = $1`,
      [id]
    );
    res.status(200).json({ success: true, message: 'Security account updated.', staff: row.rows[0] });
  } catch (err) {
    next(err);
  }
};
