import jwt from 'jsonwebtoken';
import db from '../config/database.js';

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized. Token missing.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'spms_jwt_secret_key_2026_dev');
    
    const userRes = await db.query(
      'SELECT id, full_name, email, phone, role, profile_image, is_verified FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User belonging to this token no longer exists.' });
    }

    req.user = userRes.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.', error: err.message });
  }
};

export { protect };
