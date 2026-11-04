const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from '../config/database.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'spms_jwt_secret_key_2026_dev', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// @desc    Register a new user & default vehicle (Raw SQL)
// @route   POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { full_name, email, password, phone, vehicle_number, vehicle_type, vehicle_model, vehicle_color } = req.body;

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }

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
export const login = async (req, res, next) => {
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

    if (user.is_active === false) {
      return res.status(403).json({ success: false, message: 'This account has been deactivated. Contact your lot owner.' });
    }

    delete user.password_hash;

    const token = generateToken(user.id);

    const vehRes = await db.query('SELECT * FROM vehicles WHERE user_id = $1 ORDER BY created_at ASC', [user.id]);

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
export const getMe = async (req, res, next) => {
  try {
    const userRes = await db.query(
      'SELECT id, full_name, email, phone, role, profile_image, is_verified, organization_name, managed_by, assigned_lot_id, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const vehRes = await db.query('SELECT * FROM vehicles WHERE user_id = $1 ORDER BY created_at ASC', [req.user.id]);

    res.status(200).json({
      success: true,
      user: userRes.rows[0],
      vehicles: vehRes.rows
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Lot-owner (ADMIN) self registration with simulated fee payment
// ---------------------------------------------------------------------------
const getAdminFee = () => {
  const fee = parseFloat(process.env.ADMIN_REGISTRATION_FEE || '999');
  return Number.isFinite(fee) && fee > 0 ? fee : 999;
};

// @desc    Registration fee shown on the signup page
// @route   GET /api/auth/admin/config
export const getAdminRegistrationConfig = (req, res) => {
  res.status(200).json({ success: true, fee: getAdminFee(), currency: 'INR' });
};

// @desc    Step 1: store a pending admin registration (no login is created yet)
// @route   POST /api/auth/admin/register
export const registerAdmin = async (req, res, next) => {
  try {
    const { full_name, email, password, phone, organization_name } = req.body;

    if (!full_name || !email || !password || !organization_name) {
      return res.status(400).json({ success: false, message: 'Name, email, password and organization name are required.' });
    }
    if (!EMAIL_REGEX.test(String(email).trim())) {
      return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const exists = await db.query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, await bcrypt.genSalt(12));

    const reg = await db.query(
      `INSERT INTO admin_registrations (full_name, email, password_hash, phone, organization_name, fee_amount)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, full_name, email, phone, organization_name, fee_amount, status`,
      [String(full_name).trim(), normalizedEmail, passwordHash, phone || null, String(organization_name).trim(), getAdminFee()]
    );

    res.status(201).json({
      success: true,
      message: 'Details saved. Complete the registration fee payment to activate your lot owner account.',
      registration: reg.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Step 2: simulated gateway payment; creates the ADMIN account and logs in
// @route   POST /api/auth/admin/register/:id/pay
export const payAdminRegistration = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const regRes = await client.query('SELECT * FROM admin_registrations WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (regRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Registration not found.' });
    }
    const reg = regRes.rows[0];

    if (reg.status === 'paid') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'This registration has already been paid.' });
    }

    const exists = await client.query('SELECT id FROM users WHERE LOWER(email) = $1', [reg.email]);
    if (exists.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const paymentMethod = req.body.payment_method || 'simulated_card';
    const txnRef = `ADM-TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const userRes = await client.query(
      `INSERT INTO users (full_name, email, password_hash, phone, role, is_verified, organization_name)
       VALUES ($1, $2, $3, $4, 'ADMIN', true, $5)
       RETURNING id, full_name, email, phone, role, profile_image, is_verified, organization_name, created_at`,
      [reg.full_name, reg.email, reg.password_hash, reg.phone, reg.organization_name]
    );
    const user = userRes.rows[0];

    await client.query(
      `INSERT INTO payments (booking_id, amount, tax, payment_method, payment_status, payment_type, transaction_reference, paid_at)
       VALUES (NULL, $1, 0, $2, 'paid', 'admin_registration', $3, CURRENT_TIMESTAMP)`,
      [reg.fee_amount, paymentMethod, txnRef]
    );

    await client.query(
      `UPDATE admin_registrations
       SET status = 'paid', payment_method = $1, transaction_reference = $2, user_id = $3, paid_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [paymentMethod, txnRef, user.id, reg.id]
    );

    await client.query(
      `INSERT INTO admin_logs (admin_id, action, target_table, target_id, description)
       VALUES ($1, 'ADMIN_REGISTERED', 'users', $1, $2)`,
      [user.id, `Lot owner account created for ${reg.organization_name} (fee ₹${reg.fee_amount} paid, ref ${txnRef}).`]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Payment successful! Your lot owner account is active.',
      token: generateToken(user.id),
      user,
      receipt: {
        transaction_reference: txnRef,
        amount: reg.fee_amount,
        payment_method: paymentMethod,
        organization_name: reg.organization_name,
        paid_at: new Date()
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};
