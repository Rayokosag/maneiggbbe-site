const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { getDb } = require('../database');
const { signToken } = require('../jwt');

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
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const db = getDb();
  const result = db.exec('SELECT * FROM admins WHERE username = ?', [username]);

  if (result.length === 0 || result[0].values.length === 0) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Convert result to object
  const columns = result[0].columns;
  const values = result[0].values[0];
  const admin = {};
  columns.forEach((col, i) => admin[col] = values[i]);

  const validPassword = bcrypt.compareSync(password, admin.password_hash);

  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Generate JWT token
  const token = signToken({ id: admin.id, username: admin.username, role: 'admin' });

  res.json({
    success: true,
    token,
    username: admin.username,
    loginTime: new Date().toISOString()
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ success: true });
});

module.exports = router;
