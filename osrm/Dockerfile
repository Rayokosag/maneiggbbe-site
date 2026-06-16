# Self-hosted OSRM routing engine for the Greater Vancouver service area.
# Deployed as a SEPARATE Railway service (root directory = /osrm), reached by the
# main app over Railway's private network. The British Columbia extract is
# downloaded and pre-processed (MLD pipeline) at build time and baked into the
# image, so no persistent volume is needed.
FROM ghcr.io/project-osrm/osrm-backend:latest

# Regional extract from Geofabrik, then cropped to the service area with osmium.
ARG REGION_URL=https://download.geofabrik.de/north-america/canada/british-columbia-latest.osm.pbf
# Greater Vancouver bounding box (minLng,minLat,maxLng,maxLat). Keep in sync with
# SERVICE_AREA in backend/routes/distance.js and the bounds in map-pickup.js.
ARG BBOX=-123.35,49.0,-122.5,49.45

WORKDIR /data

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates osmium-tool \
 && rm -rf /var/lib/apt/lists/* \
 && curl -fL "$REGION_URL" -o bc.osm.pbf \
 # Crop BC down to just the Greater Vancouver service area -> smaller, faster build
 && osmium extract -b "$BBOX" bc.osm.pbf -o region.osm.pbf \
 && rm -f bc.osm.pbf \
 && osrm-extract -p /opt/car.lua region.osm.pbf \
 && osrm-partition region.osrm \
 && osrm-customize region.osrm \
 && rm -f region.osm.pbf

# Railway injects PORT; bind IPv6 (::) so the service is reachable on the
# private network. Shell form so ${PORT} expands.
CMD osrm-routed --algorithm mld --ip :: --port ${PORT:-5000} /data/region.osrm
