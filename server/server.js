const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const isTest = process.env.NODE_ENV === 'test';

// Trust proxy (required for Koyeb/cloud deployments)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Rate limiting (disabled in test environment)
if (!isTest) {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' }
  });
  app.use('/api/', limiter);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'maneigbbe-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Serve static files from parent directory (the frontend)
app.use(express.static(path.join(__dirname, '..')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize database and start server
async function start() {
  try {
    await initDatabase();
    console.log('Database initialized');

    // Load routes after database is ready
    const authRoutes = require('./routes/auth');
    const packageRoutes = require('./routes/packages');
    const customerRoutes = require('./routes/customers');
    const distanceRoutes = require('./routes/distance');

    app.use('/api/auth', authRoutes);
    app.use('/api/packages', packageRoutes);
    app.use('/api/customers', customerRoutes);
    app.use('/api/distance', distanceRoutes);

    // Serve index.html for root
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'index.html'));
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production'
          ? 'Something went wrong!'
          : err.message || 'Something went wrong!'
      });
    });

    if (!isTest) {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
      });
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    if (!isTest) process.exit(1);
  }
}

start();

module.exports = app;
