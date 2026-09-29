import db from '../config/database.js';

// Update User Profile (Raw SQL)
export const updateProfile = async (req, res, next) => {
  try {
    const { full_name, phone, profile_image } = req.body;
    const userId = req.user.id;

    const userRes = await db.query(
      `UPDATE users 
       SET full_name = COALESCE($1, full_name), 
           phone = COALESCE($2, phone), 
           profile_image = COALESCE($3, profile_image),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, full_name, email, phone, role, profile_image`,
      [full_name, phone, profile_image, userId]
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
      'SELECT * FROM vehicles WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
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
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM vehicles WHERE id = $1 AND user_id = $2 RETURNING id', [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    res.status(200).json({ success: true, message: 'Vehicle removed successfully' });
  } catch (err) {
    next(err);
  }
};
