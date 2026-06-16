# OSRM routing service (Railway)

Self-hosted road-routing engine that powers `POST /api/distance/route` in the
main app. Runs as its own Railway service in the same project; the app talks to
it over Railway's private network (never exposed publicly).

## Deploy

1. In your Railway project: **New → GitHub Repo** (same repo), or **+ Service →
   Empty Service** then connect the repo.
2. Service **Settings → Source → Root Directory** = `osrm`.
   Railway auto-detects the `Dockerfile`.
3. Deploy. The first build downloads + pre-processes the BC extract, so it takes
   several minutes. Subsequent deploys are cached unless the Dockerfile changes.
4. Confirm it's up: the deploy logs show `running and waiting for requests`.

## Connect the app to it

In the **main app** service → Variables, add a reference variable:

```
OSRM_URL=http://${{OSRM.RAILWAY_PRIVATE_DOMAIN}}:${{OSRM.PORT}}
```

(Replace `OSRM` with this service's actual name if different.) Redeploy the app.
The backend reads `OSRM_URL` in `backend/distance.js`; with it unset it falls
back to the public demo server, which is fine for local dev but not production.

## Updating map data

Geofabrik refreshes extracts daily. To pull newer roads, just trigger a redeploy
of this service (it re-downloads `british-columbia-latest` during build). No need
to schedule this often — monthly is plenty for a delivery area.

## Service-area crop

The build downloads the full British Columbia extract, then uses `osmium extract`
to crop it to the Greater Vancouver bounding box (`BBOX` arg) before OSRM
processes it — smaller image, faster build. The `BBOX` must stay in sync with
`SERVICE_AREA` in `backend/routes/distance.js` and the bounds in
`frontend/js/map-pickup.js`. To widen/shrink coverage, override it at build time:

```
--build-arg BBOX=minLng,minLat,maxLng,maxLat
```
