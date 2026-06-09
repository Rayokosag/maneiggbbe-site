const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const { authenticateToken, signToken, verifyToken } = require('../jwt');
const router = express.Router();
const { getDb } = require('../database');

const isTest = process.env.NODE_ENV === 'test';

// Rate limiting for login (disabled in test)
if (!isTest) {
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts, please try again later.' }
  });
  router.use('/login', loginLimiter);
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const db = getDb();
    const admin = await db.get('SELECT * FROM admins WHERE username = ?', [username]);

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, admin.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if 2FA is enabled
    if (admin.totp_enabled) {
      // Return a short-lived temp token for 2FA verification
      const tempToken = signToken({ id: admin.id, username: admin.username, purpose: '2fa' });
      return res.json({ requires2FA: true, tempToken });
    }

    // Generate JWT token
    const token = signToken({ id: admin.id, username: admin.username, role: 'admin' });

    res.json({
      success: true,
      token,
      username: admin.username,
      loginTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/login/verify-2fa
router.post('/login/verify-2fa', async (req, res) => {
  const { tempToken, totpCode } = req.body;

  if (!tempToken || !totpCode) {
    return res.status(400).json({ error: 'Temp token and TOTP code are required' });
  }

  try {
    const decoded = verifyToken(tempToken);
    if (!decoded || decoded.purpose !== '2fa') {
      return res.status(401).json({ error: 'Invalid or expired temp token' });
    }

    const db = getDb();
    const admin = await db.get('SELECT * FROM admins WHERE id = ?', [decoded.id]);

    if (!admin || !admin.totp_enabled || !admin.totp_secret) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = authenticator.check(totpCode, admin.totp_secret);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid 2FA code' });
    }

    const token = signToken({ id: admin.id, username: admin.username, role: 'admin' });

    res.json({
      success: true,
      token,
      username: admin.username,
      loginTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ error: '2FA verification failed' });
  }
});

// POST /api/auth/2fa/setup - Generate TOTP secret and QR code
router.post('/2fa/setup', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const admin = await db.get('SELECT * FROM admins WHERE id = ?', [req.user.id]);

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    if (admin.totp_enabled) {
      return res.status(400).json({ error: '2FA is already enabled' });
    }

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(admin.username, 'Maneigbbe Delivery', secret);

    // Store secret temporarily (not enabled until verified)
    await db.run('UPDATE admins SET totp_secret = ? WHERE id = ?', [secret, admin.id]);

    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    res.json({ secret, qrCode: qrCodeDataUrl });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: '2FA setup failed' });
  }
});

// POST /api/auth/2fa/verify-setup - Verify TOTP token and enable 2FA
router.post('/2fa/verify-setup', authenticateToken, async (req, res) => {
  const { totpCode } = req.body;

  if (!totpCode) {
    return res.status(400).json({ error: 'TOTP code is required' });
  }

  try {
    const db = getDb();
    const admin = await db.get('SELECT * FROM admins WHERE id = ?', [req.user.id]);

    if (!admin || !admin.totp_secret) {
      return res.status(400).json({ error: 'Run 2FA setup first' });
    }

    const isValid = authenticator.check(totpCode, admin.totp_secret);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid TOTP code' });
    }

    await db.run('UPDATE admins SET totp_enabled = 1 WHERE id = ?', [admin.id]);

    res.json({ success: true, message: '2FA enabled successfully' });
  } catch (error) {
    console.error('2FA verify-setup error:', error);
    res.status(500).json({ error: '2FA verification failed' });
  }
});

// POST /api/auth/2fa/disable - Disable 2FA
router.post('/2fa/disable', authenticateToken, async (req, res) => {
  const { totpCode } = req.body;

  if (!totpCode) {
    return res.status(400).json({ error: 'TOTP code is required to disable 2FA' });
  }

  try {
    const db = getDb();
    const admin = await db.get('SELECT * FROM admins WHERE id = ?', [req.user.id]);

    if (!admin || !admin.totp_enabled || !admin.totp_secret) {
      return res.status(400).json({ error: '2FA is not enabled' });
    }

    const isValid = authenticator.check(totpCode, admin.totp_secret);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid TOTP code' });
    }

    await db.run('UPDATE admins SET totp_enabled = 0, totp_secret = NULL WHERE id = ?', [admin.id]);

    res.json({ success: true, message: '2FA disabled successfully' });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

// PUT /api/auth/password - Change admin password
router.put('/password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  try {
    const db = getDb();
    const admin = await db.get('SELECT * FROM admins WHERE id = ?', [req.user.id]);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    const valid = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE admins SET password_hash = ? WHERE id = ?', [hash, admin.id]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ success: true });
});

module.exports = router;
