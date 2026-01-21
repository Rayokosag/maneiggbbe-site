const express = require('express');
const router = express.Router();
const { getDb, saveDatabase } = require('../database');

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

// Helper to get single object from result
function resultToObject(result) {
  const objects = resultToObjects(result);
  return objects.length > 0 ? objects[0] : null;
}

// Helper to format package with timeline
function formatPackage(pkg) {
  const db = getDb();
  const timelineResult = db.exec(
    'SELECT date, status, location, completed FROM timeline_events WHERE tracking_number = ? ORDER BY id',
    [pkg.tracking_number]
  );
  const timeline = resultToObjects(timelineResult);

  return {
    trackingNumber: pkg.tracking_number,
    sender: {
      name: pkg.sender_name,
      phone: pkg.sender_phone,
      address: pkg.sender_address,
      city: pkg.sender_city,
      zip: pkg.sender_zip
    },
    recipient: {
      name: pkg.recipient_name,
      phone: pkg.recipient_phone,
      address: pkg.recipient_address,
      city: pkg.recipient_city,
      zip: pkg.recipient_zip
    },
    package: {
      weight: pkg.weight,
      speed: pkg.speed,
      description: pkg.description
    },
    price: pkg.price,
    status: pkg.status,
    requestDate: pkg.request_date,
    expectedDelivery: pkg.expected_delivery,
    from: `${pkg.sender_city}, ${pkg.sender_zip.substring(0, 2)} ${pkg.sender_zip}`,
    to: `${pkg.recipient_city}, ${pkg.recipient_zip.substring(0, 2)} ${pkg.recipient_zip}`,
    timeline: timeline.map(t => ({
      date: t.date,
      status: t.status,
      location: t.location,
      completed: Boolean(t.completed)
    }))
  };
}

// GET /api/packages - List all packages
router.get('/', (req, res) => {
  const db = getDb();
  const result = db.exec('SELECT * FROM packages ORDER BY created_at DESC');
  const packages = resultToObjects(result);
  res.json(packages.map(formatPackage));
});

// GET /api/packages/stats - Get dashboard statistics
router.get('/stats', (req, res) => {
  const db = getDb();

  const totalResult = db.exec('SELECT COUNT(*) as count FROM packages');
  const inTransitResult = db.exec("SELECT COUNT(*) as count FROM packages WHERE status = 'In Transit'");
  const deliveredResult = db.exec("SELECT COUNT(*) as count FROM packages WHERE status = 'Delivered'");
  const pendingResult = db.exec("SELECT COUNT(*) as count FROM packages WHERE status = 'Pending Pickup'");

  res.json({
    total: totalResult[0]?.values[0][0] || 0,
    inTransit: inTransitResult[0]?.values[0][0] || 0,
    delivered: deliveredResult[0]?.values[0][0] || 0,
    pending: pendingResult[0]?.values[0][0] || 0
  });
});

// GET /api/packages/:trackingNumber - Get single package
router.get('/:trackingNumber', (req, res) => {
  const db = getDb();
  const result = db.exec('SELECT * FROM packages WHERE tracking_number = ?', [req.params.trackingNumber]);
  const pkg = resultToObject(result);

  if (!pkg) {
    return res.status(404).json({ error: 'Package not found' });
  }

  res.json(formatPackage(pkg));
});

// POST /api/packages - Create new package
router.post('/', (req, res) => {
  const { sender, recipient, package: pkgInfo, price, expectedDelivery } = req.body;
  const db = getDb();

  // Generate tracking number
  const trackingNumber = 'MNG' + Math.floor(100000 + Math.random() * 900000);
  const requestDate = new Date().toISOString();

  try {
    db.run(`
      INSERT INTO packages (
        tracking_number, sender_name, sender_phone, sender_address, sender_city, sender_zip,
        recipient_name, recipient_phone, recipient_address, recipient_city, recipient_zip,
        weight, speed, description, price, status, request_date, expected_delivery
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending Pickup', ?, ?)
    `, [
      trackingNumber,
      sender.name, sender.phone, sender.address, sender.city, sender.zip,
      recipient.name, recipient.phone, recipient.address, recipient.city, recipient.zip,
      pkgInfo.weight, pkgInfo.speed, pkgInfo.description || '',
      price, requestDate, expectedDelivery
    ]);

    // Insert initial timeline event
    const formattedDate = new Date().toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });

    db.run(
      'INSERT INTO timeline_events (tracking_number, date, status, location, completed) VALUES (?, ?, ?, ?, ?)',
      [trackingNumber, formattedDate, 'Pending Pickup', `${sender.city}, ${sender.zip.substring(0, 2)}`, 1]
    );

    // Add future timeline events as incomplete
    const futureStatuses = ['Picked Up', 'In Transit', 'Out for Delivery', 'Delivered'];
    for (const status of futureStatuses) {
      const location = status === 'Delivered'
        ? `${recipient.city}, ${recipient.zip.substring(0, 2)}`
        : 'TBD';
      db.run(
        'INSERT INTO timeline_events (tracking_number, date, status, location, completed) VALUES (?, ?, ?, ?, ?)',
        ['Pending', status, location, 0]
      );
    }

    saveDatabase();

    // Return created package
    const result = db.exec('SELECT * FROM packages WHERE tracking_number = ?', [trackingNumber]);
    const pkg = resultToObject(result);
    res.status(201).json(formatPackage(pkg));

  } catch (error) {
    console.error('Error creating package:', error);
    res.status(500).json({ error: 'Failed to create package' });
  }
});

// PUT /api/packages/:trackingNumber - Update package status
router.put('/:trackingNumber', (req, res) => {
  const { trackingNumber } = req.params;
  const { status, location } = req.body;
  const db = getDb();

  const result = db.exec('SELECT * FROM packages WHERE tracking_number = ?', [trackingNumber]);
  const pkg = resultToObject(result);

  if (!pkg) {
    return res.status(404).json({ error: 'Package not found' });
  }

  try {
    // Update package status
    db.run('UPDATE packages SET status = ? WHERE tracking_number = ?', [status, trackingNumber]);

    // Update timeline
    const formattedDate = new Date().toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });

    db.run(
      'UPDATE timeline_events SET completed = 1, date = ?, location = ? WHERE tracking_number = ? AND status = ?',
      [formattedDate, location || 'Distribution Center', trackingNumber, status]
    );

    // Mark all previous statuses as completed
    const statuses = ['Pending Pickup', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered'];
    const currentIndex = statuses.indexOf(status);
    for (let i = 0; i < currentIndex; i++) {
      db.run(
        'UPDATE timeline_events SET completed = 1 WHERE tracking_number = ? AND status = ? AND completed = 0',
        [trackingNumber, statuses[i]]
      );
    }

    saveDatabase();

    const updatedResult = db.exec('SELECT * FROM packages WHERE tracking_number = ?', [trackingNumber]);
    const updatedPkg = resultToObject(updatedResult);
    res.json(formatPackage(updatedPkg));

  } catch (error) {
    console.error('Error updating package:', error);
    res.status(500).json({ error: 'Failed to update package' });
  }
});

// DELETE /api/packages/:trackingNumber - Delete package
router.delete('/:trackingNumber', (req, res) => {
  const { trackingNumber } = req.params;
  const db = getDb();

  const result = db.exec('SELECT * FROM packages WHERE tracking_number = ?', [trackingNumber]);
  const pkg = resultToObject(result);

  if (!pkg) {
    return res.status(404).json({ error: 'Package not found' });
  }

  try {
    db.run('DELETE FROM timeline_events WHERE tracking_number = ?', [trackingNumber]);
    db.run('DELETE FROM packages WHERE tracking_number = ?', [trackingNumber]);
    saveDatabase();

    res.json({ success: true, message: 'Package deleted' });
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

module.exports = router;
