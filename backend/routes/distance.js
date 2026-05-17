const express = require('express');
const router = express.Router();
const { lookupPostalCode, calculateDistance, calculatePrice } = require('../distance');
const { validateDistanceCalc } = require('../validation');

// GET /api/distance?from=V6B&to=V5K
router.get('/', (req, res) => {
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: 'Both "from" and "to" postal codes are required' });
  }

  const result = calculateDistance(from, to);
  if (!result) {
    return res.status(404).json({ error: 'One or both postal codes not found in our service area' });
  }

  res.json(result);
});

// GET /api/distance/zip/:zip
router.get('/zip/:zip', (req, res) => {
  const location = lookupPostalCode(req.params.zip);
  if (!location) {
    return res.status(404).json({ error: 'Postal code not found in our service area' });
  }

  res.json(location);
});

// POST /api/distance/calculate-price
router.post('/calculate-price', validateDistanceCalc, (req, res) => {
  const { from, to, weight, speed } = req.body;

  const distResult = calculateDistance(from, to);
  if (!distResult) {
    return res.status(404).json({ error: 'One or both postal codes not found in our service area' });
  }

  const pricing = calculatePrice(distResult.distanceKm, weight, speed || 'standard');

  res.json({
    ...distResult,
    weight,
    speed: speed || 'standard',
    pricing
  });
});

module.exports = router;
