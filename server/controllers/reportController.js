import db from '../config/database.js';
import { getAccessibleLotIds, canAccessLot, forbidLot } from '../middleware/scope.js';

// Submit Incident Report (FR26 Raw SQL)
export const createReport = async (req, res, next) => {
  try {
    const { category, incident_type, description, booking_id, slot_id, lot_id } = req.body;
    const type = category || incident_type || 'Other Issue';

    // Route the report to the owning lot via the slot, falling back to the booking's slot
    let lotId = null;
    if (lot_id) {
      const r = await db.query('SELECT id FROM parking_lots WHERE id = $1', [lot_id]);
      lotId = r.rows[0]?.id || null;
    }
    if (!lotId && slot_id) {
      const r = await db.query('SELECT lot_id FROM parking_slots WHERE id = $1', [slot_id]);
      lotId = r.rows[0]?.lot_id || null;
    }
    if (!lotId && booking_id) {
      const r = await db.query(
        'SELECT s.lot_id FROM bookings b JOIN parking_slots s ON b.slot_id = s.id WHERE b.id = $1 AND b.user_id = $2',
        [booking_id, req.user.id]
      );
      lotId = r.rows[0]?.lot_id || null;
    }

    const result = await db.query(
      `INSERT INTO incident_reports (user_id, booking_id, slot_id, lot_id, incident_type, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [req.user.id, booking_id || null, slot_id || null, lotId, type, description]
    );

    res.status(201).json({
      success: true,
      message: 'Incident report submitted successfully.',
      report: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// Get Incident Reports (Raw SQL)
export const getReports = async (req, res, next) => {
  try {
    let queryStr = `
      SELECT 
        r.*,
        json_build_object('id', u.id, 'full_name', u.full_name, 'email', u.email, 'phone', u.phone) AS user,
        json_build_object('id', s.id, 'slot_number', s.slot_number) AS slot,
        json_build_object('id', res.id, 'full_name', res.full_name) AS resolver
      FROM incident_reports r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN parking_slots s ON r.slot_id = s.id
      LEFT JOIN users res ON r.resolved_by = res.id
    `;

    const params = [];
    if (req.user.role === 'ADMIN' || req.user.role === 'SECURITY') {
      // Staff see only reports raised against the lots they operate
      queryStr += ' WHERE r.lot_id = ANY($1::uuid[])';
      params.push(await getAccessibleLotIds(req.user));
    } else {
      queryStr += ' WHERE r.user_id = $1';
      params.push(req.user.id);
    }

    queryStr += ' ORDER BY r.created_at DESC';

    const result = await db.query(queryStr, params);
    res.status(200).json({ success: true, reports: result.rows });
  } catch (err) {
    next(err);
  }
};

// Admin: Respond and resolve incident report (FR26 Raw SQL)
export const updateReportStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, admin_response } = req.body;
    if (!['pending', 'solved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be pending or solved.' });
    }

    const target = await db.query('SELECT lot_id FROM incident_reports WHERE id = $1', [id]);
    if (target.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Incident report not found' });
    }
    if (!(await canAccessLot(req.user, target.rows[0].lot_id))) return forbidLot(res);

    const isSolved = status === 'solved';
    const result = await db.query(
      `UPDATE incident_reports
       SET status = COALESCE($1, status),
           admin_response = COALESCE($2, admin_response),
           resolved_by = CASE WHEN $3 = true THEN $4::uuid ELSE NULL END,
           resolved_at = CASE WHEN $3 = true THEN CURRENT_TIMESTAMP ELSE NULL END
       WHERE id = $5
       RETURNING *`,
      [status, admin_response, isSolved, req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Incident report not found' });
    }

    res.status(200).json({
      success: true,
      message: `Report status updated to ${result.rows[0].status}`,
      report: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};
