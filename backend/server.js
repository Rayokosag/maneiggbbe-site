const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const { initDatabase } = require('./database');
const { initOAuth } = require('./oauth');

const app = express();
const PORT = process.env.PORT || 3000;
const isTest = process.env.NODE_ENV === 'test';
const isProduction = process.env.NODE_ENV === 'production';

// Require SESSION_SECRET in production
if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required in production');
}

// Trust proxy (required for Koyeb/cloud deployments)
app.set('trust proxy', 1);

// HTTPS redirect (behind reverse proxy)
if (isProduction) {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Security middleware with HSTS and CSP
app.use(helmet({
  hsts: { maxAge: 31536000, includeSubDomains: true },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
      // Map tiles (OSM by default; MapTiler/Carto allowed for the prod swap)
      imgSrc: ["'self'", "data:", "blob:", "cdn.jsdelivr.net",
        "*.tile.openstreetmap.org", "*.basemaps.cartocdn.com", "api.maptiler.com"],
      // Geocoding/autocomplete called directly from the browser
      connectSrc: ["'self'", "nominatim.openstreetmap.org", "api.maptiler.com", "api.geoapify.com"]
    }
  },
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

// CORS with origin whitelist
app.use(cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'maneiggbbe-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 }
}));

// Google OAuth (no-op if credentials not set)
initOAuth(app);

// CSRF protection for state-changing requests
app.use((req, res, next) => {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) return next();

  // Skip for multipart/form-data (file uploads)
  const contentType = req.headers['content-type'] || '';
  if (contentType.startsWith('multipart/form-data')) return next();

  if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
    return res.status(403).json({ error: 'CSRF validation failed' });
  }
  next();
});

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '..', 'frontend')));

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
      res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(err.status || 500).json({
        error: isProduction
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
