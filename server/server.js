const express = require('express');
const cors = require('cors');
const path = require('path');

const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from parent directory (the frontend)
app.use(express.static(path.join(__dirname, '..')));

// Initialize database and start server
async function start() {
  try {
    await initDatabase();
    console.log('Database initialized');

    // Load routes after database is ready
    const authRoutes = require('./routes/auth');
    const packageRoutes = require('./routes/packages');

    app.use('/api/auth', authRoutes);
    app.use('/api/packages', packageRoutes);

    // Serve index.html for root
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'index.html'));
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ error: 'Something went wrong!' });
    });

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
