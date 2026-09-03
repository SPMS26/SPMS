const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'spms_jwt_secret_key_2026_dev', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// @desc    Register a new user & default vehicle (Raw SQL)
// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { full_name, email, password, phone, vehicle_number, vehicle_type, vehicle_model, vehicle_color } = req.body;

    const checkRes = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (checkRes.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'User with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const userRes = await db.query(
      `INSERT INTO users (full_name, email, password_hash, phone, role, is_verified) 
       VALUES ($1, $2, $3, $4, 'USER', true) 
       RETURNING id, full_name, email, phone, role, profile_image, is_verified, created_at`,
      [full_name, email, passwordHash, phone]
    );

    const user = userRes.rows[0];

    let vehicle = null;
    if (vehicle_number) {
      const vehRes = await db.query(
        `INSERT INTO vehicles (user_id, vehicle_number, vehicle_type, vehicle_model, vehicle_color, is_default)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING *`,
        [user.id, vehicle_number.toUpperCase(), vehicle_type || 'four_wheeler', vehicle_model, vehicle_color]
      );
      vehicle = vehRes.rows[0];
    }

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user,
      vehicle
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Authenticate user & return JWT token (Raw SQL)
// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    delete user.password_hash;

    const token = generateToken(user.id);

    const vehRes = await db.query('SELECT * FROM vehicles WHERE user_id = $1 ORDER BY is_default DESC', [user.id]);

    res.status(200).json({
      success: true,
      token,
      user,
      vehicles: vehRes.rows
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged in user profile (Raw SQL)
// @route   GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const userRes = await db.query(
      'SELECT id, full_name, email, phone, role, profile_image, is_verified, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const vehRes = await db.query('SELECT * FROM vehicles WHERE user_id = $1 ORDER BY is_default DESC', [req.user.id]);

    res.status(200).json({
      success: true,
      user: userRes.rows[0],
      vehicles: vehRes.rows
    });
  } catch (err) {
    next(err);
  }
};
