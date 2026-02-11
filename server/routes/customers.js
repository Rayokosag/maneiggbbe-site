const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const router = express.Router();
const { getDb, saveDatabase } = require('../database');
const { signToken, authenticateToken } = require('../jwt');
const {
  validateCustomerRegistration,
  validateProfileUpdate,
  validatePasswordChange,
  validatePasswordReset,
  validateForgotPassword
} = require('../validation');
const { getPassport } = require('../oauth');
const { sendPasswordReset } = require('../email');

// Helper to convert SQL result to object
function resultToObject(result) {
  if (!result || result.length === 0) return null;
  const columns = result[0].columns;
  const values = result[0].values[0];
  if (!values) return null;
  const obj = {};
  columns.forEach((col, i) => obj[col] = values[i]);
  return obj;
}

// Helper to convert SQL result to array of objects
function resultToObjects(result) {
  if (!result || result.length === 0) return [];
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

// POST /api/customers/register
router.post('/register', validateCustomerRegistration, (req, res) => {
  const { name, email, password, phone } = req.body;
  const db = getDb();

  const existing = db.exec('SELECT id FROM customers WHERE email = ?', [email]);
  if (existing.length > 0 && existing[0].values.length > 0) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  try {
    const hash = bcrypt.hashSync(password, 10);
    db.run(
      'INSERT INTO customers (name, email, password_hash, phone) VALUES (?, ?, ?, ?)',
      [name, email, hash, phone || null]
    );
    saveDatabase();

    const result = db.exec('SELECT * FROM customers WHERE email = ?', [email]);
    const customer = resultToObject(result);

    const token = signToken({ id: customer.id, email: customer.email, role: 'customer' });

    res.status(201).json({
      success: true,
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone
      }
    });
  } catch (error) {
    console.error('Error registering customer:', error);
    res.status(500).json({ error: 'Failed to register' });
  }
});

// POST /api/customers/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = getDb();
  const result = db.exec('SELECT * FROM customers WHERE email = ?', [email]);
  const customer = resultToObject(result);

  if (!customer) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!customer.password_hash) {
    return res.status(401).json({ error: 'This account uses Google Sign-In' });
  }

  const validPassword = bcrypt.compareSync(password, customer.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken({ id: customer.id, email: customer.email, role: 'customer' });

  res.json({
    success: true,
    token,
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone
    }
  });
});

// GET /api/customers/profile - Get customer profile
router.get('/profile', authenticateToken, (req, res) => {
  const db = getDb();
  const result = db.exec('SELECT * FROM customers WHERE id = ?', [req.user.id]);
  const customer = resultToObject(result);

  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  res.json({
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    createdAt: customer.created_at
  });
});

// PUT /api/customers/profile - Update customer profile
router.put('/profile', authenticateToken, validateProfileUpdate, (req, res) => {
  const { name, email, phone } = req.body;
  const db = getDb();

  // Check if email is being changed and is already taken
  if (email) {
    const existing = db.exec('SELECT id FROM customers WHERE email = ? AND id != ?', [email, req.user.id]);
    if (existing.length > 0 && existing[0].values.length > 0) {
      return res.status(409).json({ error: 'Email already in use' });
    }
  }

  try {
    const updates = [];
    const values = [];
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (email !== undefined) { updates.push('email = ?'); values.push(email); }
    if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.user.id);
    db.run(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`, values);
    saveDatabase();

    const result = db.exec('SELECT * FROM customers WHERE id = ?', [req.user.id]);
    const customer = resultToObject(result);

    res.json({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/customers/password - Change password
router.put('/password', authenticateToken, validatePasswordChange, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const db = getDb();

  const result = db.exec('SELECT * FROM customers WHERE id = ?', [req.user.id]);
  const customer = resultToObject(result);

  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  if (!customer.password_hash) {
    return res.status(400).json({ error: 'This account uses Google Sign-In. Set a password via forgot password.' });
  }

  const validPassword = bcrypt.compareSync(currentPassword, customer.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  try {
    const hash = bcrypt.hashSync(newPassword, 10);
    db.run('UPDATE customers SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
    saveDatabase();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// GET /api/customers/packages - List customer's packages
router.get('/packages', authenticateToken, (req, res) => {
  const db = getDb();
  const { page = 1, limit = 20 } = req.query;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const countResult = db.exec('SELECT COUNT(*) FROM packages WHERE customer_id = ?', [req.user.id]);
  const total = countResult[0]?.values[0][0] || 0;

  const result = db.exec(
    'SELECT * FROM packages WHERE customer_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [req.user.id, limitNum, offset]
  );
  const packages = resultToObjects(result);

  res.json({
    packages: packages.map(pkg => ({
      trackingNumber: pkg.tracking_number,
      senderName: pkg.sender_name,
      recipientName: pkg.recipient_name,
      from: `${pkg.sender_city}, ${pkg.sender_zip}`,
      to: `${pkg.recipient_city}, ${pkg.recipient_zip}`,
      status: pkg.status,
      speed: pkg.speed,
      price: pkg.price,
      requestDate: pkg.request_date,
      expectedDelivery: pkg.expected_delivery
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }
  });
});

// GET /api/customers/packages/stats - Customer package stats
router.get('/packages/stats', authenticateToken, (req, res) => {
  const db = getDb();
  const id = req.user.id;

  const totalResult = db.exec('SELECT COUNT(*) FROM packages WHERE customer_id = ?', [id]);
  const inTransitResult = db.exec("SELECT COUNT(*) FROM packages WHERE customer_id = ? AND status = 'In Transit'", [id]);
  const deliveredResult = db.exec("SELECT COUNT(*) FROM packages WHERE customer_id = ? AND status = 'Delivered'", [id]);
  const pendingResult = db.exec("SELECT COUNT(*) FROM packages WHERE customer_id = ? AND status = 'Pending Pickup'", [id]);

  res.json({
    total: totalResult[0]?.values[0][0] || 0,
    inTransit: inTransitResult[0]?.values[0][0] || 0,
    delivered: deliveredResult[0]?.values[0][0] || 0,
    pending: pendingResult[0]?.values[0][0] || 0
  });
});

// POST /api/customers/forgot-password - Request password reset
router.post('/forgot-password', validateForgotPassword, async (req, res) => {
  const { email } = req.body;
  const db = getDb();

  // Always return success to prevent email enumeration
  const result = db.exec('SELECT * FROM customers WHERE email = ?', [email]);
  const customer = resultToObject(result);

  if (customer) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    db.run(
      'INSERT INTO password_reset_tokens (customer_id, token, expires_at) VALUES (?, ?, ?)',
      [customer.id, token, expiresAt]
    );
    saveDatabase();

    // Send reset email
    try {
      await sendPasswordReset({
        to: email,
        name: customer.name,
        token
      });
    } catch (err) {
      console.error('Failed to send password reset email:', err);
    }
  }

  res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
});

// POST /api/customers/reset-password - Reset password with token
router.post('/reset-password', validatePasswordReset, (req, res) => {
  const { token, password } = req.body;
  const db = getDb();

  const result = db.exec(
    'SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0',
    [token]
  );
  const resetToken = resultToObject(result);

  if (!resetToken) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  if (new Date(resetToken.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Reset token has expired' });
  }

  try {
    const hash = bcrypt.hashSync(password, 10);
    db.run('UPDATE customers SET password_hash = ? WHERE id = ?', [hash, resetToken.customer_id]);
    db.run('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [resetToken.id]);
    saveDatabase();

    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Google OAuth routes
router.get('/auth/google', (req, res, next) => {
  const passport = getPassport();
  if (!passport) {
    const from = req.query.from || 'customer-login.html';
    return res.redirect(`/${from}?error=oauth_not_configured`);
  }
  const state = req.query.from === 'register.html' ? 'register' : 'login';
  passport.authenticate('google', { scope: ['profile', 'email'], state })(req, res, next);
});

router.get('/auth/google/callback', (req, res, next) => {
  const passport = getPassport();
  if (!passport) {
    return res.redirect('/customer-login.html?error=oauth_not_configured');
  }

  const redirectPage = req.query.state === 'register' ? 'register.html' : 'customer-login.html';

  passport.authenticate('google', { failureRedirect: `/${redirectPage}?error=auth_failed` })(req, res, () => {
    const db = getDb();
    const googleUser = req.user;

    let result = db.exec('SELECT * FROM customers WHERE google_id = ?', [googleUser.googleId]);
    let customer = resultToObject(result);

    if (!customer && googleUser.email) {
      result = db.exec('SELECT * FROM customers WHERE email = ?', [googleUser.email]);
      customer = resultToObject(result);
      if (customer) {
        db.run('UPDATE customers SET google_id = ? WHERE id = ?', [googleUser.googleId, customer.id]);
        saveDatabase();
      }
    }

    if (!customer) {
      db.run(
        'INSERT INTO customers (name, email, google_id) VALUES (?, ?, ?)',
        [googleUser.name, googleUser.email, googleUser.googleId]
      );
      saveDatabase();
      result = db.exec('SELECT * FROM customers WHERE google_id = ?', [googleUser.googleId]);
      customer = resultToObject(result);
    }

    const token = signToken({ id: customer.id, email: customer.email, role: 'customer' });
    res.redirect(`/${redirectPage}?token=${token}&name=${encodeURIComponent(customer.name)}`);
  });
});

module.exports = router;
