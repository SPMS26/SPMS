const db = require('../config/database');

exports.getUserNotifications = async (req, res, next) => {
  try {
    const listRes = await db.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );

    const countRes = await db.query(
      'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );

    res.status(200).json({
      success: true,
      unreadCount: countRes.rows[0].count,
      notifications: listRes.rows
    });
  } catch (err) {
    next(err);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === 'all') {
      await db.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [req.user.id]);
    } else {
      await db.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    }

    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
};
