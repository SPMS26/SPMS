import db from '../config/database.js';
import settingService from '../services/settingService.js';
import { canAccessLot, forbidLot } from '../middleware/scope.js';
import { VEHICLE_TYPES, SLOT_TYPE_FOR_VEHICLE, normaliseSupportedTypes, parseSupportedTypes } from '../services/vehicleTypes.js';

const LOT_STATS_SQL = `
  l.*,
  o.organization_name AS owner_name,
  COUNT(CASE WHEN s.status = 'available' AND s.is_active = true THEN 1 END)::int AS available_slots,
  COUNT(CASE WHEN s.status = 'reserved' AND s.is_active = true THEN 1 END)::int AS reserved_slots,
  COUNT(CASE WHEN s.status = 'occupied' AND s.is_active = true THEN 1 END)::int AS occupied_slots,
  COUNT(CASE WHEN s.status = 'maintenance' AND s.is_active = true THEN 1 END)::int AS maintenance_slots,
  COUNT(CASE WHEN s.is_active = true THEN 1 END)::int AS total_slots,
  COALESCE(ARRAY_AGG(DISTINCT s.floor) FILTER (WHERE s.is_active = true), '{}') AS floors,
  MIN(s.hourly_price) FILTER (WHERE s.is_active = true) AS min_hourly_price,
  MAX(s.hourly_price) FILTER (WHERE s.is_active = true) AS max_hourly_price
`;

// Attach the effective pre-booking fee (per-lot override, else global setting)
const withEffectiveFee = async (lots) => {
  const globalFee = await settingService.getNumericSetting('PRE_BOOKING_FEE', 10.0);
  return lots.map((l) => ({
    ...l,
    effective_pre_booking_fee: l.pre_booking_fee !== null && l.pre_booking_fee !== undefined
      ? Number(l.pre_booking_fee)
      : globalFee
  }));
};

const parseTime = (v) => (v && /^\d{2}:\d{2}/.test(String(v)) ? String(v).slice(0, 5) : null);
const numOrNull = (v) => (v === '' || v === undefined || v === null ? null : Number(v));

const validateLotBody = (body, { partial = false } = {}) => {
  const errors = [];
  if (!partial && !String(body.name || '').trim()) errors.push('Lot name is required.');
  if (!partial && !String(body.address || '').trim()) errors.push('Address is required.');
  for (const f of ['default_hourly_price', 'pre_booking_fee']) {
    const n = numOrNull(body[f]);
    if (n !== null && (!Number.isFinite(n) || n < 0)) errors.push(`${f.replace(/_/g, ' ')} must be a non-negative number.`);
  }
  return errors;
};

// Public: all active lots from every owner, with live slot counts
// ?vehicle_type=four_wheeler|two_wheeler limits the list to lots that take that vehicle and have bays for it,
// and counts, floors and prices then cover only those bays
export const getAllLots = async (req, res, next) => {
  try {
    const vehicleType = VEHICLE_TYPES.includes(req.query.vehicle_type) ? req.query.vehicle_type : null;
    const slotType = vehicleType ? SLOT_TYPE_FOR_VEHICLE[vehicleType] : null;
    const result = await db.query(`
      SELECT ${LOT_STATS_SQL}
      FROM parking_lots l
      LEFT JOIN parking_slots s ON l.id = s.lot_id AND ($1::text IS NULL OR s.slot_type = $1::text)
      LEFT JOIN users o ON l.admin_id = o.id
      WHERE l.is_active = true
        AND ($2::text IS NULL OR $2::text = ANY(string_to_array(REPLACE(COALESCE(l.supported_vehicle_types, ''), ' ', ''), ',')))
      GROUP BY l.id, o.organization_name
      HAVING $1::text IS NULL OR COUNT(CASE WHEN s.is_active = true THEN 1 END) > 0
      ORDER BY l.name ASC
    `, [slotType, vehicleType]);
    res.status(200).json({ success: true, lots: await withEffectiveFee(result.rows) });
  } catch (err) {
    next(err);
  }
};

// Admin: lots owned by the logged-in admin (including inactive ones)
export const getMyLots = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT ${LOT_STATS_SQL}
      FROM parking_lots l
      LEFT JOIN parking_slots s ON l.id = s.lot_id
      LEFT JOIN users o ON l.admin_id = o.id
      WHERE l.admin_id = $1
      GROUP BY l.id, o.organization_name
      ORDER BY l.created_at ASC
    `, [req.user.id]);
    res.status(200).json({ success: true, lots: await withEffectiveFee(result.rows) });
  } catch (err) {
    next(err);
  }
};

// Get single lot detail with slots
export const getLotById = async (req, res, next) => {
  try {
    const lotRes = await db.query(
      `SELECT l.*, o.organization_name AS owner_name
       FROM parking_lots l LEFT JOIN users o ON l.admin_id = o.id
       WHERE l.id = $1`,
      [req.params.id]
    );
    if (lotRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Parking Lot not found' });
    }

    const slotRes = await db.query('SELECT * FROM parking_slots WHERE lot_id = $1 ORDER BY slot_number ASC', [req.params.id]);

    const [lot] = await withEffectiveFee([lotRes.rows[0]]);
    lot.slots = slotRes.rows;

    res.status(200).json({ success: true, lot });
  } catch (err) {
    next(err);
  }
};

// Admin: Create Parking Lot (owned by the logged-in admin)
export const createLot = async (req, res, next) => {
  try {
    const errors = validateLotBody(req.body);
    if (errors.length) return res.status(400).json({ success: false, message: errors[0] });
    const types = normaliseSupportedTypes(req.body.supported_vehicle_types);
    if (types.error) return res.status(400).json({ success: false, message: types.error });

    const b = req.body;
    const result = await db.query(
      `INSERT INTO parking_lots
         (name, address, latitude, longitude, description, total_slots, available_slots, admin_id,
          opening_time, closing_time, contact_phone, default_hourly_price, supported_vehicle_types, pre_booking_fee)
       VALUES ($1, $2, $3, $4, $5, 0, 0, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        String(b.name).trim(), String(b.address).trim(),
        numOrNull(b.latitude), numOrNull(b.longitude),
        b.description || null, req.user.id,
        parseTime(b.opening_time) || '00:00', parseTime(b.closing_time) || '23:59',
        b.contact_phone || null,
        numOrNull(b.default_hourly_price) ?? 30,
        types.value || 'four_wheeler,two_wheeler',
        numOrNull(b.pre_booking_fee)
      ]
    );

    await db.query(
      `INSERT INTO admin_logs (admin_id, action, target_table, target_id, description)
       VALUES ($1, 'LOT_CREATED', 'parking_lots', $2, $3)`,
      [req.user.id, result.rows[0].id, `Created parking lot "${result.rows[0].name}".`]
    );

    res.status(201).json({ success: true, lot: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// Admin: Update own Parking Lot
export const updateLot = async (req, res, next) => {
  try {
    if (!(await canAccessLot(req.user, req.params.id))) return forbidLot(res);

    const errors = validateLotBody(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ success: false, message: errors[0] });
    const types = normaliseSupportedTypes(req.body.supported_vehicle_types);
    if (types.error) return res.status(400).json({ success: false, message: types.error });

    // Dropping cars or bikes would strand the bays of that kind, so they must be removed first
    if (types.value) {
      const keep = parseSupportedTypes(types.value);
      const dropped = Object.entries(SLOT_TYPE_FOR_VEHICLE).filter(([vehicle]) => !keep.includes(vehicle)).map(([, slot]) => slot);
      if (dropped.length) {
        const left = await db.query(
          `SELECT slot_type, COUNT(*)::int AS n FROM parking_slots
           WHERE lot_id = $1 AND is_active = true AND slot_type = ANY($2::text[])
           GROUP BY slot_type`,
          [req.params.id, dropped]
        );
        if (left.rows.length) {
          const { slot_type, n } = left.rows[0];
          return res.status(409).json({
            success: false,
            message: `This lot still has ${n} ${slot_type} bay${n === 1 ? '' : 's'}. Remove them before the lot stops accepting ${slot_type === 'bike' ? 'bikes' : 'cars'}.`
          });
        }
      }
    }

    const b = req.body;
    const result = await db.query(
      `UPDATE parking_lots
       SET name = COALESCE($1, name),
           address = COALESCE($2, address),
           latitude = COALESCE($3, latitude),
           longitude = COALESCE($4, longitude),
           description = COALESCE($5, description),
           opening_time = COALESCE($6, opening_time),
           closing_time = COALESCE($7, closing_time),
           contact_phone = COALESCE($8, contact_phone),
           default_hourly_price = COALESCE($9, default_hourly_price),
           supported_vehicle_types = COALESCE($10, supported_vehicle_types),
           pre_booking_fee = COALESCE($11, pre_booking_fee),
           is_active = COALESCE($12, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $13
       RETURNING *`,
      [
        b.name?.trim() || null, b.address?.trim() || null,
        numOrNull(b.latitude), numOrNull(b.longitude),
        b.description ?? null, parseTime(b.opening_time), parseTime(b.closing_time),
        b.contact_phone ?? null,
        numOrNull(b.default_hourly_price),
        types.value,
        numOrNull(b.pre_booking_fee),
        typeof b.is_active === 'boolean' ? b.is_active : null,
        req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Parking Lot not found' });
    }

    res.status(200).json({ success: true, lot: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// Admin: Delete own lot. Lots with booking history are deactivated so history is preserved.
export const deleteLot = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!(await canAccessLot(req.user, id))) return forbidLot(res);

    const liveRes = await db.query(
      `SELECT 1 FROM bookings b JOIN parking_slots s ON b.slot_id = s.id
       WHERE s.lot_id = $1 AND b.booking_status IN ('pending_payment', 'reserved', 'active') LIMIT 1`,
      [id]
    );
    if (liveRes.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'This lot has active or upcoming bookings and cannot be removed.' });
    }

    const histRes = await db.query(
      'SELECT 1 FROM bookings b JOIN parking_slots s ON b.slot_id = s.id WHERE s.lot_id = $1 LIMIT 1',
      [id]
    );

    await db.query('UPDATE users SET assigned_lot_id = NULL WHERE assigned_lot_id = $1', [id]);

    if (histRes.rows.length > 0) {
      await db.query('UPDATE parking_lots SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
      return res.status(200).json({ success: true, deactivated: true, message: 'Lot deactivated (booking history kept).' });
    }

    await db.query('DELETE FROM parking_lots WHERE id = $1', [id]);
    res.status(200).json({ success: true, deactivated: false, message: 'Lot deleted.' });
  } catch (err) {
    next(err);
  }
};
