const express = require('express');
const router = express.Router();
const { getDb, saveDatabase } = require('../database');
const { sendPickupConfirmation, sendStatusUpdate } = require('../email');
const { upload, getPhotosForPackage } = require('../upload');
const { authenticateToken, verifyToken } = require('../jwt');
const { requireAdmin } = require('../roles');

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

// Helper to format package with timeline and photos
function formatPackage(pkg) {
  const db = getDb();
  const timelineResult = db.exec(
    'SELECT date, status, location, completed FROM timeline_events WHERE tracking_number = ? ORDER BY id',
    [pkg.tracking_number]
  );
  const timeline = resultToObjects(timelineResult);
  const photos = getPhotosForPackage(pkg.tracking_number);

  return {
    trackingNumber: pkg.tracking_number,
    sender: {
      name: pkg.sender_name,
      phone: pkg.sender_phone,
      address: pkg.sender_address,
      city: pkg.sender_city,
      zip: pkg.sender_zip,
      email: pkg.sender_email || null
    },
    recipient: {
      name: pkg.recipient_name,
      phone: pkg.recipient_phone,
      address: pkg.recipient_address,
      city: pkg.recipient_city,
      zip: pkg.recipient_zip,
      email: pkg.recipient_email || null
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
    photos,
    timeline: timeline.map(t => ({
      date: t.date,
      status: t.status,
      location: t.location,
      completed: Boolean(t.completed)
    }))
  };
}

// GET /api/packages - List all packages with pagination, filtering, sorting (admin only)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  const db = getDb();
  const { page = 1, limit = 20, status, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  // Validate sort parameters
  const allowedSortFields = ['created_at', 'tracking_number', 'status', 'sender_name', 'recipient_name', 'weight'];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  let whereClause = '';
  const params = [];

  if (status) {
    whereClause = 'WHERE status = ?';
    params.push(status);
  }

  // Get total count
  const countResult = db.exec(`SELECT COUNT(*) as count FROM packages ${whereClause}`, params);
  const total = countResult[0]?.values[0][0] || 0;

  // Get paginated results
  const query = `SELECT * FROM packages ${whereClause} ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`;
  const result = db.exec(query, [...params, limitNum, offset]);
  const packages = resultToObjects(result);

  res.json({
    packages: packages.map(formatPackage),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }
  });
});

// GET /api/packages/stats - Get dashboard statistics (admin only)
router.get('/stats', authenticateToken, requireAdmin, (req, res) => {
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

// POST /api/packages - Create new package (public, optionally associates customer)
router.post('/', async (req, res) => {
  const { sender, recipient, package: pkgInfo, price, expectedDelivery } = req.body;
  const db = getDb();

  // Generate tracking number
  const trackingNumber = 'MNG' + Math.floor(100000 + Math.random() * 900000);
  const requestDate = new Date().toISOString();

  // Optionally extract customer_id from JWT if logged in
  let customerId = null;
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    if (token) {
      const decoded = verifyToken(token);
      if (decoded && decoded.role === 'customer') {
        customerId = decoded.id;
      }
    }
  }

  try {
    db.run(`
      INSERT INTO packages (
        tracking_number, customer_id, sender_name, sender_phone, sender_address, sender_city, sender_zip, sender_email,
        recipient_name, recipient_phone, recipient_address, recipient_city, recipient_zip, recipient_email,
        weight, speed, description, price, status, request_date, expected_delivery
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending Pickup', ?, ?)
    `, [
      trackingNumber, customerId,
      sender.name, sender.phone, sender.address, sender.city, sender.zip, sender.email || null,
      recipient.name, recipient.phone, recipient.address, recipient.city, recipient.zip, recipient.email || null,
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
        [trackingNumber, 'Pending', status, location, 0]
      );
    }

    saveDatabase();

    // Send confirmation email if sender email provided
    if (sender.email) {
      sendPickupConfirmation({
        to: sender.email,
        trackingNumber,
        senderName: sender.name,
        recipientName: recipient.name,
        expectedDelivery
      }).catch(err => console.error('Failed to send confirmation email:', err));
    }

    // Return created package
    const result = db.exec('SELECT * FROM packages WHERE tracking_number = ?', [trackingNumber]);
    const pkg = resultToObject(result);
    res.status(201).json(formatPackage(pkg));

  } catch (error) {
    console.error('Error creating package:', error);
    res.status(500).json({ error: 'Failed to create package' });
  }
});

// PATCH /api/packages/:trackingNumber - Partial update (admin only)
router.patch('/:trackingNumber', authenticateToken, requireAdmin, (req, res) => {
  const { trackingNumber } = req.params;
  const db = getDb();

  const result = db.exec('SELECT * FROM packages WHERE tracking_number = ?', [trackingNumber]);
  const pkg = resultToObject(result);

  if (!pkg) {
    return res.status(404).json({ error: 'Package not found' });
  }

  const allowedFields = {
    sender_name: 'sender_name', sender_phone: 'sender_phone',
    sender_address: 'sender_address', sender_city: 'sender_city',
    sender_zip: 'sender_zip', sender_email: 'sender_email',
    recipient_name: 'recipient_name', recipient_phone: 'recipient_phone',
    recipient_address: 'recipient_address', recipient_city: 'recipient_city',
    recipient_zip: 'recipient_zip', recipient_email: 'recipient_email',
    weight: 'weight', speed: 'speed', description: 'description',
    price: 'price', expected_delivery: 'expected_delivery'
  };

  const updates = [];
  const values = [];

  for (const [key, col] of Object.entries(allowedFields)) {
    if (req.body[key] !== undefined) {
      updates.push(`${col} = ?`);
      values.push(req.body[key]);
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  try {
    values.push(trackingNumber);
    db.run(`UPDATE packages SET ${updates.join(', ')} WHERE tracking_number = ?`, values);
    saveDatabase();

    const updatedResult = db.exec('SELECT * FROM packages WHERE tracking_number = ?', [trackingNumber]);
    const updatedPkg = resultToObject(updatedResult);
    res.json(formatPackage(updatedPkg));
  } catch (error) {
    console.error('Error updating package:', error);
    res.status(500).json({ error: 'Failed to update package' });
  }
});

// PUT /api/packages/:trackingNumber - Update package status (admin only)
router.put('/:trackingNumber', authenticateToken, requireAdmin, async (req, res) => {
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

    // Send status update email if recipient email exists
    if (pkg.recipient_email) {
      sendStatusUpdate({
        to: pkg.recipient_email,
        trackingNumber,
        status,
        recipientName: pkg.recipient_name
      }).catch(err => console.error('Failed to send status update email:', err));
    }

    const updatedResult = db.exec('SELECT * FROM packages WHERE tracking_number = ?', [trackingNumber]);
    const updatedPkg = resultToObject(updatedResult);
    res.json(formatPackage(updatedPkg));

  } catch (error) {
    console.error('Error updating package:', error);
    res.status(500).json({ error: 'Failed to update package' });
  }
});

// POST /api/packages/:trackingNumber/photos - Upload package photos
router.post('/:trackingNumber/photos', upload.array('photos', 5), (req, res) => {
  const { trackingNumber } = req.params;
  const db = getDb();

  const result = db.exec('SELECT * FROM packages WHERE tracking_number = ?', [trackingNumber]);
  const pkg = resultToObject(result);

  if (!pkg) {
    return res.status(404).json({ error: 'Package not found' });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No photos uploaded' });
  }

  const photoUrls = req.files.map(f => `/uploads/${trackingNumber}/${f.filename}`);

  res.json({
    success: true,
    photos: photoUrls,
    message: `${req.files.length} photo(s) uploaded successfully`
  });
});

// DELETE /api/packages/:trackingNumber - Delete package (admin only)
router.delete('/:trackingNumber', authenticateToken, requireAdmin, (req, res) => {
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
