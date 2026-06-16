const express = require('express');
const router = express.Router();
const { lookupPostalCode, calculateDistance, calculatePrice, getRoadRoute } = require('../distance');
const { validateDistanceCalc } = require('../validation');

// Greater Vancouver service-area bounding box. Keep in sync with the map's
// search viewbox in frontend/js/map-pickup.js.
const SERVICE_AREA = { minLat: 49.0, maxLat: 49.45, minLng: -123.35, maxLng: -122.5 };

function inServiceArea(lat, lng) {
  return lat >= SERVICE_AREA.minLat && lat <= SERVICE_AREA.maxLat &&
    lng >= SERVICE_AREA.minLng && lng <= SERVICE_AREA.maxLng;
}

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

// POST /api/distance/route  { from: {lat,lng}, to: {lat,lng} }
// Returns real road distance + duration (ETA) + route geometry from OSRM.
router.post('/route', async (req, res) => {
  const { from, to } = req.body || {};
  const valid = from && to &&
    typeof from.lat === 'number' && typeof from.lng === 'number' &&
    typeof to.lat === 'number' && typeof to.lng === 'number';

  if (!valid) {
    return res.status(400).json({ error: 'from {lat,lng} and to {lat,lng} are required' });
  }

  if (!inServiceArea(from.lat, from.lng) || !inServiceArea(to.lat, to.lng)) {
    return res.status(400).json({ error: 'Both locations must be within the Greater Vancouver service area' });
  }

  const route = await getRoadRoute(from.lat, from.lng, to.lat, to.lng);
  if (!route) {
    return res.status(502).json({ error: 'Routing service unavailable, please try again' });
  }

  res.json(route);
});

module.exports = router;
