const { createClient } = require('@libsql/client/web');
const bcrypt = require('bcryptjs');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://maneigbbe-rayokosag.aws-us-west-2.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN
});

// Wrapper to match old interface
const db = {
  async run(sql, params = []) {
    return await client.execute({ sql, args: params });
  },
  async exec(sql) {
    return await client.execute(sql);
  },
  async get(sql, params = []) {
    const result = await client.execute({ sql, args: params });
    return result.rows[0] || null;
  },
  async all(sql, params = []) {
    const result = await client.execute({ sql, args: params });
    return result.rows;
  }
};

async function initDatabase() {
  console.log('Connecting to Turso database...');

  // Create tables
  await db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      totp_secret TEXT,
      totp_enabled INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add TOTP columns if they don't exist (migration for existing databases)
  try {
    await db.run('ALTER TABLE admins ADD COLUMN totp_secret TEXT');
  } catch (e) { /* column already exists */ }
  try {
    await db.run('ALTER TABLE admins ADD COLUMN totp_enabled INTEGER DEFAULT 0');
  } catch (e) { /* column already exists */ }

  await db.run(`
    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tracking_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER,
      sender_name TEXT NOT NULL,
      sender_phone TEXT NOT NULL,
      sender_address TEXT NOT NULL,
      sender_city TEXT NOT NULL,
      sender_zip TEXT NOT NULL,
      sender_email TEXT,
      recipient_name TEXT NOT NULL,
      recipient_phone TEXT NOT NULL,
      recipient_address TEXT NOT NULL,
      recipient_city TEXT NOT NULL,
      recipient_zip TEXT NOT NULL,
      recipient_email TEXT,
      weight REAL NOT NULL,
      speed TEXT NOT NULL,
      description TEXT,
      price TEXT NOT NULL,
      status TEXT DEFAULT 'Pending Pickup',
      request_date TEXT NOT NULL,
      expected_delivery TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      phone TEXT,
      google_id TEXT,
      email_verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: add email_verified for existing databases
  try {
    await db.run('ALTER TABLE customers ADD COLUMN email_verified INTEGER DEFAULT 0');
    // Mark existing customers as verified so they aren't locked out
    await db.run('UPDATE customers SET email_verified = 1 WHERE email_verified = 0');
  } catch (e) { /* column already exists */ }

  await db.run(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS timeline_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tracking_number TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      location TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed default admin if not exists
  const adminResult = await db.get("SELECT id FROM admins WHERE username = ?", ['admin']);
  if (!adminResult) {
    const hash = await bcrypt.hash('admin123', 10);
    await db.run('INSERT INTO admins (username, password_hash) VALUES (?, ?)', ['admin', hash]);
    console.log('Default admin created (admin/admin123)');
  }

  // Seed demo packages if none exist
  const countResult = await db.get('SELECT COUNT(*) as count FROM packages');
  const packageCount = countResult?.count || 0;

  if (packageCount === 0) {
    await seedDemoData();
    console.log('Demo packages seeded');
  }

  console.log('Database initialized (Turso)');
  return db;
}

function getDb() {
  return db;
}

function saveDatabase() {
  // Not needed for Turso
}

async function seedDemoData() {
  const demoPackages = [
    {
      tracking_number: 'MNG123456',
      sender_name: 'John Doe',
      sender_phone: '(555) 123-4567',
      sender_address: '123 Main St',
      sender_city: 'Vancouver',
      sender_zip: 'V6B 1A1',
      recipient_name: 'Jane Smith',
      recipient_phone: '(555) 987-6543',
      recipient_address: '456 Oak Ave',
      recipient_city: 'Burnaby',
      recipient_zip: 'V5H 2N9',
      weight: 2.5,
      speed: 'express',
      description: 'Electronics',
      price: '$12.99',
      status: 'In Transit',
      request_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      expected_delivery: 'Feb 15, 2026'
    },
    {
      tracking_number: 'MNG789012',
      sender_name: 'Alice Johnson',
      sender_phone: '(555) 234-5678',
      sender_address: '789 Pine Rd',
      sender_city: 'Richmond',
      sender_zip: 'V6Y 2B3',
      recipient_name: 'Bob Wilson',
      recipient_phone: '(555) 876-5432',
      recipient_address: '321 Elm St',
      recipient_city: 'Surrey',
      recipient_zip: 'V3T 4W2',
      weight: 5.0,
      speed: 'standard',
      description: 'Books',
      price: '$5.99',
      status: 'Delivered',
      request_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      expected_delivery: 'Feb 10, 2026'
    },
    {
      tracking_number: 'MNG345678',
      sender_name: 'Charlie Brown',
      sender_phone: '(555) 345-6789',
      sender_address: '555 Cedar Ln',
      sender_city: 'Vancouver',
      sender_zip: 'V5K 1A1',
      recipient_name: 'Diana Prince',
      recipient_phone: '(555) 765-4321',
      recipient_address: '999 Maple Dr',
      recipient_city: 'North Vancouver',
      recipient_zip: 'V7L 1A1',
      weight: 1.0,
      speed: 'overnight',
      description: 'Documents',
      price: '$24.99',
      status: 'Pending Pickup',
      request_date: new Date().toISOString(),
      expected_delivery: 'Feb 13, 2026'
    }
  ];

  for (const pkg of demoPackages) {
    await db.run(`
      INSERT INTO packages (
        tracking_number, sender_name, sender_phone, sender_address, sender_city, sender_zip,
        recipient_name, recipient_phone, recipient_address, recipient_city, recipient_zip,
        weight, speed, description, price, status, request_date, expected_delivery
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      pkg.tracking_number, pkg.sender_name, pkg.sender_phone, pkg.sender_address, pkg.sender_city, pkg.sender_zip,
      pkg.recipient_name, pkg.recipient_phone, pkg.recipient_address, pkg.recipient_city, pkg.recipient_zip,
      pkg.weight, pkg.speed, pkg.description, pkg.price, pkg.status, pkg.request_date, pkg.expected_delivery
    ]);

    const timeline = generateTimeline(pkg);
    for (const event of timeline) {
      await db.run(
        'INSERT INTO timeline_events (tracking_number, date, status, location, completed) VALUES (?, ?, ?, ?, ?)',
        [pkg.tracking_number, event.date, event.status, event.location, event.completed ? 1 : 0]
      );
    }
  }
}

function generateTimeline(pkg) {
  const events = [];
  const statuses = ['Pending Pickup', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered'];
  const currentIndex = statuses.indexOf(pkg.status);
  const baseDate = new Date(pkg.request_date);

  for (let i = 0; i <= currentIndex; i++) {
    const eventDate = new Date(baseDate);
    eventDate.setDate(eventDate.getDate() + i);
    events.push({
      date: eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: statuses[i],
      location: i === 0 ? `${pkg.sender_city}` : i === statuses.length - 1 ? `${pkg.recipient_city}` : 'Distribution Center',
      completed: true
    });
  }

  for (let i = currentIndex + 1; i < statuses.length; i++) {
    events.push({
      date: 'Pending',
      status: statuses[i],
      location: i === statuses.length - 1 ? `${pkg.recipient_city}` : 'TBD',
      completed: false
    });
  }

  return events;
}

module.exports = { initDatabase, getDb, saveDatabase };
