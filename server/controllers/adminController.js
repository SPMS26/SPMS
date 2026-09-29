import db from '../config/database.js';

// Admin: Get all registered users (Raw SQL)
export const getUsers = async (req, res, next) => {
  try {
    const queryStr = `
      SELECT 
        u.id, u.full_name, u.email, u.phone, u.role, u.is_verified, u.created_at,
        COALESCE(
          json_agg(
            json_build_object('id', v.id, 'vehicle_number', v.vehicle_number, 'vehicle_type', v.vehicle_type)
          ) FILTER (WHERE v.id IS NOT NULL), '[]'
        ) AS vehicles
      FROM users u
      LEFT JOIN vehicles v ON u.id = v.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `;

    const result = await db.query(queryStr);
    res.status(200).json({ success: true, users: result.rows });
  } catch (err) {
    next(err);
  }
};

// Admin: Get scanned entry history table (Raw SQL)
export const getScanHistory = async (req, res, next) => {
  try {
    const queryStr = `
      SELECT 
        b.id,
        b.booking_status,
        b.entry_time,
        b.created_at,
        b.total_amount,
        u.full_name AS "userName",
        v.vehicle_number AS "vehicleNo",
        s.slot_number AS "slotCode",
        l.name AS "lotName"
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN parking_slots s ON b.slot_id = s.id
      LEFT JOIN parking_lots l ON s.lot_id = l.id
      WHERE b.booking_status IN ('active', 'completed', 'reserved')
      ORDER BY b.created_at DESC
      LIMIT 50
    `;

    const result = await db.query(queryStr);

    const history = result.rows.map(b => ({
      id: b.id,
      bookingId: `BK-${b.id.substring(0, 6).toUpperCase()}`,
      userName: b.userName || 'Guest User',
      vehicleNo: b.vehicleNo || 'N/A',
      slotCode: b.slotCode || 'N/A',
      lotName: b.lotName || 'Central Parking',
      timestamp: b.entry_time ? new Date(b.entry_time).toLocaleString() : new Date(b.created_at).toLocaleString(),
      amountPaid: `₹${b.total_amount || 30}`,
      status: b.booking_status === 'completed' ? 'Completed' : 'Validated'
    }));

    res.status(200).json({ success: true, history });
  } catch (err) {
    next(err);
  }
};

// Admin: Get Audit Logs (Raw SQL)
export const getAdminLogs = async (req, res, next) => {
  try {
    const queryStr = `
      SELECT 
        l.*,
        json_build_object('full_name', u.full_name, 'email', u.email) AS admin
      FROM admin_logs l
      JOIN users u ON l.admin_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 50
    `;

    const result = await db.query(queryStr);
    res.status(200).json({ success: true, logs: result.rows });
  } catch (err) {
    next(err);
  }
};
