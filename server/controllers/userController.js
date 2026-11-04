const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
import db from '../config/database.js';
import bcrypt from 'bcryptjs';
import { findLiveBooking } from '../services/bookingRules.js';

// Change User Password (Raw SQL)
export const changePassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    const userId = req.user.id;

    if (!password || password.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await db.query(
      `UPDATE users 
       SET password_hash = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id`,
      [passwordHash, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (err) {
    next(err);
  }
};

// Update User Profile (Raw SQL)
export const updateProfile = async (req, res, next) => {
  try {
    const { full_name, phone, email, profile_image } = req.body;

    if (email !== undefined && (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim()))) {
      return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }
    const userId = req.user.id;

    const userRes = await db.query(
      `UPDATE users 
       SET full_name = COALESCE($1, full_name), 
           phone = COALESCE($2, phone), 
           email = COALESCE($3, email),
           profile_image = COALESCE($4, profile_image),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, full_name, email, phone, role, profile_image`,
      [full_name, phone, email, profile_image, userId]
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: userRes.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// Get User Vehicles (Raw SQL)
export const getVehicles = async (req, res, next) => {
  try {
    const vehRes = await db.query(
      'SELECT * FROM vehicles WHERE user_id = $1 ORDER BY created_at ASC',
      [req.user.id]
    );
    res.status(200).json({ success: true, vehicles: vehRes.rows });
  } catch (err) {
    next(err);
  }
};

// Add New Vehicle (Raw SQL)
export const addVehicle = async (req, res, next) => {
  try {
    const { vehicle_number, vehicle_type, vehicle_model, vehicle_color, is_default } = req.body;

    const check = await db.query('SELECT id FROM vehicles WHERE vehicle_number = $1', [vehicle_number.toUpperCase()]);
    if (check.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Vehicle number already registered.' });
    }

    if (is_default) {
      await db.query('UPDATE vehicles SET is_default = false WHERE user_id = $1', [req.user.id]);
    }

    const vehRes = await db.query(
      `INSERT INTO vehicles (user_id, vehicle_number, vehicle_type, vehicle_model, vehicle_color, is_default)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, vehicle_number.toUpperCase(), vehicle_type || 'four_wheeler', vehicle_model, vehicle_color, !!is_default]
    );

    res.status(201).json({ success: true, vehicle: vehRes.rows[0] });
  } catch (err) {
    next(err);
  }
};

// Delete Vehicle (Raw SQL)
export const deleteVehicle = async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    const own = await client.query('SELECT id, vehicle_number FROM vehicles WHERE id = $1 AND user_id = $2 FOR UPDATE', [id, req.user.id]);
    if (own.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    // Never remove a vehicle that is in use
    const live = await findLiveBooking({ vehicleId: id });
    if (live) {
      await client.query('ROLLBACK');
      const inUse = ['active', 'parked'].includes(live.booking_status) ? 'is parked' : 'has a booking';
      return res.status(409).json({ success: false, message: `This vehicle ${inUse} at ${live.lot_name}, slot ${live.slot_number}, and cannot be removed yet.` });
    }

    // Past bookings and their payments stay; keep the plate on them so history still shows it
    await client.query('UPDATE bookings SET guest_vehicle_number = $1 WHERE vehicle_id = $2', [own.rows[0].vehicle_number, id]);
    await client.query('DELETE FROM vehicles WHERE id = $1', [id]);
    await client.query('COMMIT');

    res.status(200).json({ success: true, message: 'Vehicle removed successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// Set Default Vehicle
export const setDefaultVehicle = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE vehicles SET is_default = false WHERE user_id = $1', [req.user.id]);
    const result = await db.query(
      'UPDATE vehicles SET is_default = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    res.status(200).json({ success: true, message: 'Default vehicle updated', vehicle: result.rows[0] });
  } catch (err) {
    next(err);
  }
};
