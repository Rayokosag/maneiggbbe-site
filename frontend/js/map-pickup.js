// Leaflet pickup/dropoff map with address autocomplete + road routing.
//
// Drop-in (no build step). Pieces:
//   - Leaflet            : rendering + markers
//   - OSM raster tiles   : base map (swap to MapTiler for production volume)
//   - leaflet-geosearch  : address autocomplete (OSM/Nominatim provider, bbox-bounded)
//   - backend /api/distance/route : real road distance + ETA from OSRM
//
// PRODUCTION NOTE: the OSM tile server and Nominatim public API both forbid
// heavy/commercial use. For a live business, swap TILE_URL to a MapTiler key
// and replace OpenStreetMapProvider with the MapTiler/Geoapify provider below.

(function () {
  // --- Service area: Greater Vancouver. Keep in sync with backend SERVICE_AREA.
  var CENTER = [49.2488, -123.0]; // metro-wide view
  var VIEWBOX = '-123.35,49.45,-122.5,49.0'; // lng,lat,lng,lat (Nominatim order)
  var BOUNDS = L.latLngBounds([49.0, -123.35], [49.45, -122.5]);
  var TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  var mapEl = document.getElementById('routeMap');
  if (!mapEl || typeof L === 'undefined') return;

  var map = L.map('routeMap', {
    maxBounds: BOUNDS.pad(0.3),
    minZoom: 10
  }).setView(CENTER, 11);

  L.tileLayer(TILE_URL, {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Map sometimes needs a nudge if it was laid out before becoming visible.
  setTimeout(function () { map.invalidateSize(); }, 200);

  // Address autocomplete provider, results restricted to the service area.
  var provider = new GeoSearch.OpenStreetMapProvider({
    params: {
      viewbox: VIEWBOX,
      bounded: 1,
      countrycodes: 'ca',
      addressdetails: 1,
      'accept-language': 'en'
    }
  });

  // --- Marker state ----------------------------------------------------------
  var markers = { pickup: null, dropoff: null };
  var coords = { pickup: null, dropoff: null };
  var routeLayer = null;

  function pinIcon(color) {
    return L.divIcon({
      className: '',
      html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;' +
        'background:' + color + ';transform:rotate(-45deg);border:2px solid #fff;' +
        'box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 22]
    });
  }
  var ICONS = { pickup: pinIcon('#2e7d32'), dropoff: pinIcon('#c62828') };

  function setPoint(role, lat, lng) {
    coords[role] = { lat: lat, lng: lng };
    if (markers[role]) {
      markers[role].setLatLng([lat, lng]);
    } else {
      markers[role] = L.marker([lat, lng], { icon: ICONS[role], draggable: true })
        .addTo(map)
        .bindTooltip(role === 'pickup' ? 'Pickup' : 'Dropoff', { permanent: false });
      markers[role].on('dragend', function (e) {
        var p = e.target.getLatLng();
        coords[role] = { lat: p.lat, lng: p.lng };
        recomputeRoute();
      });
    }
    recomputeRoute();
  }

  // --- Routing ---------------------------------------------------------------
  function showError(msg) {
    var el = document.getElementById('routeError');
    var info = document.getElementById('routeInfo');
    if (info) info.style.display = 'none';
    if (el) { el.textContent = msg; el.style.display = msg ? 'block' : 'none'; }
  }

  function recomputeRoute() {
    if (!coords.pickup || !coords.dropoff) return;
    showError('');

    fetch('/api/distance/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ from: coords.pickup, to: coords.dropoff })
    })
      .then(function (res) {
        return res.json().then(function (body) {
          if (!res.ok) throw new Error(body.error || 'Routing failed');
          return body;
        });
      })
      .then(function (route) {
        // Draw the route polyline
        if (routeLayer) map.removeLayer(routeLayer);
        routeLayer = L.geoJSON(route.geometry, {
          style: { color: '#1a1a1a', weight: 5, opacity: 0.75 }
        }).addTo(map);
        map.fitBounds(routeLayer.getBounds().pad(0.15));

        // Surface distance + ETA
        document.getElementById('routeDistance').textContent = route.distanceKm + ' km';
        document.getElementById('routeEta').textContent = route.durationMin + ' min';
        document.getElementById('routeInfo').style.display = 'flex';

        // Feed real road distance into the price estimate (pickup.js)
        window.roadDistanceKm = route.distanceKm;
        window.roadEtaMinutes = route.durationMin;
        window.pickupCoords = coords.pickup;
        window.dropoffCoords = coords.dropoff;
        if (typeof window.calculatePrice === 'function') window.calculatePrice();
      })
      .catch(function (err) {
        showError(err.message || 'Could not calculate the route.');
      });
  }

  // --- Address autocomplete bound to the existing form inputs -----------------
  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  function attachAutocomplete(inputId, role) {
    var input = document.getElementById(inputId);
    if (!input) return;

    var wrap = input.parentElement;
    wrap.style.position = 'relative';

    var list = document.createElement('div');
    list.style.cssText = 'position:absolute;left:0;right:0;top:100%;z-index:1000;' +
      'background:#fff;border:1px solid #e0e0e0;border-radius:8px;margin-top:2px;' +
      'box-shadow:0 4px 14px rgba(0,0,0,0.12);max-height:220px;overflow-y:auto;display:none;';
    wrap.appendChild(list);

    function closeList() { list.style.display = 'none'; list.innerHTML = ''; }

    var run = debounce(function () {
      var q = input.value.trim();
      if (q.length < 3) { closeList(); return; }
      provider.search({ query: q }).then(function (results) {
        list.innerHTML = '';
        if (!results.length) { closeList(); return; }
        results.slice(0, 6).forEach(function (r) {
          var item = document.createElement('div');
          item.textContent = r.label;
          item.style.cssText = 'padding:0.55rem 0.8rem;cursor:pointer;font-size:0.88rem;border-bottom:1px solid #f0f0f0;';
          item.addEventListener('mouseenter', function () { item.style.background = '#f5f5f5'; });
          item.addEventListener('mouseleave', function () { item.style.background = '#fff'; });
          item.addEventListener('mousedown', function (e) {
            e.preventDefault(); // fire before blur
            input.value = r.label;
            setPoint(role, r.y, r.x);
            map.setView([r.y, r.x], 14);
            closeList();
          });
          list.appendChild(item);
        });
        list.style.display = 'block';
      }).catch(closeList);
    }, 350);

    input.addEventListener('input', run);
    input.addEventListener('blur', function () { setTimeout(closeList, 150); });
  }

  attachAutocomplete('senderAddress', 'pickup');
  attachAutocomplete('recipientAddress', 'dropoff');

  // Click the map to drop whichever pin isn't set yet (pickup first).
  map.on('click', function (e) {
    var role = !coords.pickup ? 'pickup' : 'dropoff';
    setPoint(role, e.latlng.lat, e.latlng.lng);
  });
})();
