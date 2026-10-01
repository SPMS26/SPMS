import db from '../config/database.js';

// Submit Incident Report (FR26 Raw SQL)
export const createReport = async (req, res, next) => {
  try {
    const { category, incident_type, description, booking_id, slot_id } = req.body;
    const type = category || incident_type || 'Other Issue';

    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const result = await db.query(
      `INSERT INTO incident_reports (user_id, booking_id, slot_id, incident_type, description, image_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [req.user.id, booking_id || null, slot_id || null, type, description, imageUrl]
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
    if (req.user.role !== 'ADMIN') {
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

    const isSolved = status === 'solved';
    const result = await db.query(
      `UPDATE incident_reports
       SET status = COALESCE($1, status),
           admin_response = COALESCE($2, admin_response),
           resolved_by = CASE WHEN $3 = true THEN $4 ELSE resolved_by END,
           resolved_at = CASE WHEN $3 = true THEN CURRENT_TIMESTAMP ELSE resolved_at END
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
