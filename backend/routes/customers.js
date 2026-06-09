const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
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

const isTest = process.env.NODE_ENV === 'test';

// Rate limiters for auth routes (disabled in test)
if (!isTest) {
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many attempts, please try again later.' }
  });
  router.use('/register', authLimiter);
  router.use('/login', authLimiter);
  router.use('/forgot-password', authLimiter);
}

// POST /api/customers/register
router.post('/register', validateCustomerRegistration, async (req, res) => {
  const { name, email, password, phone } = req.body;
  const db = getDb();

  try {
    const existing = await db.get('SELECT id FROM customers WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ error: 'Registration failed. Please try again or use a different email.' });
    }

    const hash = await bcrypt.hash(password, 10);
    await db.run(
      'INSERT INTO customers (name, email, password_hash, phone) VALUES (?, ?, ?, ?)',
      [name, email, hash, phone || null]
    );
    saveDatabase();

    const customer = await db.get('SELECT * FROM customers WHERE email = ?', [email]);
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
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const db = getDb();
    const customer = await db.get('SELECT * FROM customers WHERE email = ?', [email]);

    if (!customer) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!customer.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, customer.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/customers/profile - Get customer profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const customer = await db.get('SELECT * FROM customers WHERE id = ?', [req.user.id]);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      createdAt: customer.created_at,
      isGoogleUser: !customer.password_hash && !!customer.google_id
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/customers/profile - Update customer profile
router.put('/profile', authenticateToken, validateProfileUpdate, async (req, res) => {
  const { name, email, phone } = req.body;
  const db = getDb();

  try {
    if (email) {
      const existing = await db.get('SELECT id FROM customers WHERE email = ? AND id != ?', [email, req.user.id]);
      if (existing) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }

    const updates = [];
    const values = [];
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (email !== undefined) { updates.push('email = ?'); values.push(email); }
    if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.user.id);
    await db.run(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`, values);
    saveDatabase();

    const customer = await db.get('SELECT * FROM customers WHERE id = ?', [req.user.id]);

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
router.put('/password', authenticateToken, validatePasswordChange, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const db = getDb();

  try {
    const customer = await db.get('SELECT * FROM customers WHERE id = ?', [req.user.id]);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (!customer.password_hash) {
      return res.status(400).json({ error: 'This account uses Google Sign-In. Set a password via forgot password.' });
    }

    const validPassword = await bcrypt.compare(currentPassword, customer.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE customers SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
    saveDatabase();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// GET /api/customers/packages - List customer's packages
router.get('/packages', authenticateToken, async (req, res) => {
  const db = getDb();
  const { page = 1, limit = 20 } = req.query;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  try {
    const countResult = await db.get('SELECT COUNT(*) as count FROM packages WHERE customer_id = ?', [req.user.id]);
    const total = countResult?.count || 0;

    const packages = await db.all(
      'SELECT * FROM packages WHERE customer_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [req.user.id, limitNum, offset]
    );

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
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// GET /api/customers/packages/stats - Customer package stats
router.get('/packages/stats', authenticateToken, async (req, res) => {
  const db = getDb();
  const id = req.user.id;

  try {
    const total = await db.get('SELECT COUNT(*) as count FROM packages WHERE customer_id = ?', [id]);
    const inTransit = await db.get("SELECT COUNT(*) as count FROM packages WHERE customer_id = ? AND status = 'In Transit'", [id]);
    const delivered = await db.get("SELECT COUNT(*) as count FROM packages WHERE customer_id = ? AND status = 'Delivered'", [id]);
    const pending = await db.get("SELECT COUNT(*) as count FROM packages WHERE customer_id = ? AND status = 'Pending Pickup'", [id]);

    res.json({
      total: total?.count || 0,
      inTransit: inTransit?.count || 0,
      delivered: delivered?.count || 0,
      pending: pending?.count || 0
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// POST /api/customers/forgot-password - Request password reset
router.post('/forgot-password', validateForgotPassword, async (req, res) => {
  const { email } = req.body;
  const db = getDb();

  try {
    const customer = await db.get('SELECT * FROM customers WHERE email = ?', [email]);

    if (customer) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      await db.run(
        'INSERT INTO password_reset_tokens (customer_id, token, expires_at) VALUES (?, ?, ?)',
        [customer.id, token, expiresAt]
      );
      saveDatabase();

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
  } catch (error) {
    console.error('Error in forgot password:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /api/customers/reset-password - Reset password with token
router.post('/reset-password', validatePasswordReset, async (req, res) => {
  const { token, password } = req.body;
  const db = getDb();

  try {
    const resetToken = await db.get(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0',
      [token]
    );

    if (!resetToken) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    if (new Date(resetToken.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    const hash = await bcrypt.hash(password, 10);
    await db.run('UPDATE customers SET password_hash = ? WHERE id = ?', [hash, resetToken.customer_id]);
    await db.run('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [resetToken.id]);
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

  passport.authenticate('google', { failureRedirect: `/${redirectPage}?error=auth_failed` })(req, res, async () => {
    const db = getDb();
    const googleUser = req.user;

    try {
      let customer = await db.get('SELECT * FROM customers WHERE google_id = ?', [googleUser.googleId]);

      if (!customer && googleUser.email) {
        customer = await db.get('SELECT * FROM customers WHERE email = ?', [googleUser.email]);
        if (customer) {
          await db.run('UPDATE customers SET google_id = ? WHERE id = ?', [googleUser.googleId, customer.id]);
          saveDatabase();
        }
      }

      if (!customer) {
        await db.run(
          'INSERT INTO customers (name, email, google_id) VALUES (?, ?, ?)',
          [googleUser.name, googleUser.email, googleUser.googleId]
        );
        saveDatabase();
        customer = await db.get('SELECT * FROM customers WHERE google_id = ?', [googleUser.googleId]);
      }

      const token = signToken({ id: customer.id, email: customer.email, role: 'customer' });
      res.redirect(`/${redirectPage}?token=${token}&name=${encodeURIComponent(customer.name)}`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`/${redirectPage}?error=auth_failed`);
    }
  });
});

module.exports = router;
