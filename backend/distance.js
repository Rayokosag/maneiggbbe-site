// Vancouver Metro area postal code database with approximate coordinates
const postalCodeDB = {
  'V5K': { lat: 49.2827, lng: -123.0438, area: 'East Vancouver' },
  'V5L': { lat: 49.2761, lng: -123.0650, area: 'East Vancouver' },
  'V5M': { lat: 49.2590, lng: -123.0340, area: 'East Vancouver' },
  'V5N': { lat: 49.2485, lng: -123.0650, area: 'South Vancouver' },
  'V5P': { lat: 49.2370, lng: -123.0660, area: 'South Vancouver' },
  'V5R': { lat: 49.2370, lng: -123.0340, area: 'South Vancouver' },
  'V5S': { lat: 49.2200, lng: -123.0340, area: 'South Vancouver' },
  'V5T': { lat: 49.2590, lng: -123.0910, area: 'Mount Pleasant' },
  'V5V': { lat: 49.2485, lng: -123.0910, area: 'Kensington' },
  'V5W': { lat: 49.2370, lng: -123.0910, area: 'Victoria-Fraserview' },
  'V5X': { lat: 49.2200, lng: -123.0910, area: 'Sunset' },
  'V5Y': { lat: 49.2627, lng: -123.1086, area: 'Mount Pleasant' },
  'V5Z': { lat: 49.2590, lng: -123.1140, area: 'Fairview' },
  'V6A': { lat: 49.2827, lng: -123.0950, area: 'Strathcona' },
  'V6B': { lat: 49.2797, lng: -123.1120, area: 'Downtown' },
  'V6C': { lat: 49.2870, lng: -123.1170, area: 'Waterfront' },
  'V6E': { lat: 49.2820, lng: -123.1250, area: 'West End' },
  'V6G': { lat: 49.2900, lng: -123.1350, area: 'West End' },
  'V6H': { lat: 49.2680, lng: -123.1350, area: 'Fairview' },
  'V6J': { lat: 49.2630, lng: -123.1450, area: 'Kitsilano' },
  'V6K': { lat: 49.2680, lng: -123.1570, area: 'Kitsilano' },
  'V6L': { lat: 49.2485, lng: -123.1570, area: 'Kerrisdale' },
  'V6M': { lat: 49.2370, lng: -123.1350, area: 'Marpole' },
  'V6N': { lat: 49.2200, lng: -123.1350, area: 'Marpole' },
  'V6P': { lat: 49.2200, lng: -123.1350, area: 'Marpole' },
  'V6R': { lat: 49.2680, lng: -123.1740, area: 'Point Grey' },
  'V6S': { lat: 49.2550, lng: -123.1870, area: 'Dunbar' },
  'V6T': { lat: 49.2660, lng: -123.2500, area: 'UBC' },
  'V6Z': { lat: 49.2770, lng: -123.1230, area: 'Downtown South' },
  'V3M': { lat: 49.2070, lng: -122.9110, area: 'New Westminster' },
  'V3L': { lat: 49.2120, lng: -122.9260, area: 'New Westminster' },
  'V3N': { lat: 49.2210, lng: -122.8910, area: 'New Westminster' },
  'V3V': { lat: 49.1930, lng: -122.8490, area: 'Surrey' },
  'V3W': { lat: 49.1770, lng: -122.8490, area: 'Surrey' },
  'V3R': { lat: 49.1930, lng: -122.8010, area: 'Surrey' },
  'V3S': { lat: 49.1770, lng: -122.7500, area: 'Surrey' },
  'V3T': { lat: 49.1900, lng: -122.8910, area: 'Surrey' },
  'V3X': { lat: 49.1600, lng: -122.7900, area: 'Surrey' },
  'V5A': { lat: 49.2827, lng: -122.9870, area: 'North Burnaby' },
  'V5B': { lat: 49.2640, lng: -122.9870, area: 'Burnaby' },
  'V5C': { lat: 49.2640, lng: -123.0100, area: 'Burnaby' },
  'V5E': { lat: 49.2300, lng: -122.9570, area: 'Burnaby' },
  'V5G': { lat: 49.2640, lng: -122.9570, area: 'Burnaby' },
  'V5H': { lat: 49.2300, lng: -122.9870, area: 'Burnaby' },
  'V5J': { lat: 49.2300, lng: -123.0100, area: 'Burnaby' },
  'V7L': { lat: 49.3170, lng: -123.0750, area: 'North Vancouver' },
  'V7M': { lat: 49.3100, lng: -123.0750, area: 'North Vancouver' },
  'V7N': { lat: 49.3250, lng: -123.0620, area: 'North Vancouver' },
  'V7P': { lat: 49.3170, lng: -123.1050, area: 'North Vancouver' },
  'V7R': { lat: 49.3170, lng: -123.1300, area: 'North Vancouver' },
  'V6V': { lat: 49.1780, lng: -123.0370, area: 'Richmond' },
  'V6W': { lat: 49.1600, lng: -123.0370, area: 'Richmond' },
  'V6X': { lat: 49.1780, lng: -123.1300, area: 'Richmond' },
  'V6Y': { lat: 49.1600, lng: -123.1300, area: 'Richmond' },
  'V7A': { lat: 49.1600, lng: -123.1560, area: 'Richmond' },
  'V7B': { lat: 49.1940, lng: -123.1810, area: 'Richmond (Airport)' },
  'V7C': { lat: 49.1780, lng: -123.1560, area: 'Richmond' },
  'V7E': { lat: 49.1350, lng: -123.1560, area: 'Richmond' },
  'V3J': { lat: 49.2700, lng: -122.7900, area: 'Port Coquitlam' },
  'V3K': { lat: 49.2610, lng: -122.7900, area: 'Port Coquitlam' },
  'V3B': { lat: 49.2800, lng: -122.7900, area: 'Port Moody' },
  'V3C': { lat: 49.2480, lng: -122.8200, area: 'Coquitlam' },
  'V3E': { lat: 49.2760, lng: -122.7500, area: 'Coquitlam' },
  'V4A': { lat: 49.0630, lng: -122.8000, area: 'White Rock' }
};

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function normalizePostalCode(zip) {
  if (!zip) return null;
  const cleaned = zip.toUpperCase().replace(/\s/g, '');
  // Extract first 3 characters (FSA - Forward Sortation Area)
  const fsa = cleaned.substring(0, 3);
  return fsa;
}

function lookupPostalCode(zip) {
  const fsa = normalizePostalCode(zip);
  if (!fsa) return null;
  return postalCodeDB[fsa] || null;
}

function calculateDistance(fromZip, toZip) {
  const from = lookupPostalCode(fromZip);
  const to = lookupPostalCode(toZip);

  if (!from || !to) {
    return null;
  }

  const distance = haversineDistance(from.lat, from.lng, to.lat, to.lng);
  return {
    from: { zip: normalizePostalCode(fromZip), ...from },
    to: { zip: normalizePostalCode(toZip), ...to },
    distanceKm: Math.round(distance * 10) / 10
  };
}

// Routing engine (OSRM). The public demo server is fine for development but its
// usage policy PROHIBITS commercial/heavy use. For production, self-host OSRM
// with the BC Geofabrik extract (Docker) and set OSRM_URL to your instance.
const OSRM_URL = (process.env.OSRM_URL || 'https://router.project-osrm.org').replace(/\/$/, '');

// Fetch the real road route between two coordinates.
// Returns { distanceKm, durationMin, geometry } or null if routing fails.
async function getRoadRoute(fromLat, fromLng, toLat, toLng) {
  const coords = `${fromLng},${fromLat};${toLng},${toLat}`;
  const url = `${OSRM_URL}/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes || !data.routes.length) return null;
    const route = data.routes[0];
    return {
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMin: Math.round(route.duration / 60),
      geometry: route.geometry // GeoJSON LineString for drawing on the map
    };
  } catch (err) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function calculatePrice(distanceKm, weightLbs, speed) {
  const RATE_PER_KM = 0.20;
  const RATE_PER_LB = 0.25;

  const speedPrices = {
    standard: 5.99,
    express: 12.99,
    overnight: 24.99
  };

  const startPrice = speedPrices[speed] || speedPrices.standard;
  const distanceCost = distanceKm * RATE_PER_KM;
  const weightCost = weightLbs * RATE_PER_LB;
  const total = startPrice + distanceCost + weightCost;

  return {
    startPrice,
    distanceCost: Math.round(distanceCost * 100) / 100,
    weightCost: Math.round(weightCost * 100) / 100,
    total: Math.round(total * 100) / 100
  };
}

module.exports = {
  postalCodeDB,
  lookupPostalCode,
  calculateDistance,
  calculatePrice,
  normalizePostalCode,
  getRoadRoute
};
