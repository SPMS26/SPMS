const db = require('../config/database');

// Get all parking lots with available slot count (Raw SQL)
exports.getAllLots = async (req, res, next) => {
  try {
    const queryStr = `
      SELECT 
        l.*,
        COUNT(CASE WHEN s.status = 'available' AND s.is_active = true THEN 1 END)::int AS available_slots,
        COUNT(CASE WHEN s.is_active = true THEN 1 END)::int AS total_slots
      FROM parking_lots l
      LEFT JOIN parking_slots s ON l.id = s.lot_id
      GROUP BY l.id
      ORDER BY l.name ASC
    `;

    const result = await db.query(queryStr);
    res.status(200).json({ success: true, lots: result.rows });
  } catch (err) {
    next(err);
  }
};

// Get single lot detail with slots (Raw SQL)
exports.getLotById = async (req, res, next) => {
  try {
    const lotRes = await db.query('SELECT * FROM parking_lots WHERE id = $1', [req.params.id]);
    if (lotRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Parking Lot not found' });
    }

    const slotRes = await db.query('SELECT * FROM parking_slots WHERE lot_id = $1 ORDER BY slot_number ASC', [req.params.id]);
    
    const lot = lotRes.rows[0];
    lot.slots = slotRes.rows;

    res.status(200).json({ success: true, lot });
  } catch (err) {
    next(err);
  }
};

// Admin: Create Parking Lot (Raw SQL)
exports.createLot = async (req, res, next) => {
  try {
    const { name, address, latitude, longitude, description } = req.body;
    const result = await db.query(
      `INSERT INTO parking_lots (name, address, latitude, longitude, description, total_slots, available_slots)
       VALUES ($1, $2, $3, $4, $5, 0, 0)
       RETURNING *`,
      [name, address, latitude, longitude, description]
    );

    res.status(201).json({ success: true, lot: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// Admin: Update Parking Lot (Raw SQL)
exports.updateLot = async (req, res, next) => {
  try {
    const { name, address, latitude, longitude, description } = req.body;
    const result = await db.query(
      `UPDATE parking_lots
       SET name = COALESCE($1, name),
           address = COALESCE($2, address),
           latitude = COALESCE($3, latitude),
           longitude = COALESCE($4, longitude),
           description = COALESCE($5, description),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [name, address, latitude, longitude, description, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Parking Lot not found' });
    }

    res.status(200).json({ success: true, lot: result.rows[0] });
  } catch (err) {
    next(err);
  }
};
