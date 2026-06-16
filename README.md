# Maneiggbbe Delivery

A package delivery tracking website for **Maneiggbbe Delivery Service & Technology Inc**.

**Live Site:** https://www.maneiggbbe.com

## Quick Start (Local Development)

```bash
cd backend
npm install
npm start
```
Open http://localhost:3000 (the backend serves the frontend and the API)

## Features

- Track packages with tracking number
- Request pickup with pricing calculator
- Admin dashboard to manage packages
- Customer registration & login
- Email notifications
- Distance-based pricing

## Project Structure

```
maneiggbbe-delivery/
├── frontend/                 # Static site (HTML/CSS/vanilla JS)
│   ├── index.html            # Homepage
│   ├── tracking.html         # Track packages
│   ├── request-pickup.html   # Request a pickup (with Leaflet map + routing)
│   ├── login.html            # Admin login
│   ├── admin.html            # Admin dashboard
│   ├── customer-login.html   # Customer login
│   ├── register.html         # Customer signup
│   ├── forgot-password.html  # Password reset
│   ├── reset-password.html   # Reset password
│   ├── customer-dashboard.html
│   ├── css/                  # Styles
│   ├── js/                   # Frontend scripts
│   └── images/               # Logo & images
├── backend/                  # Node.js + Express API (serves the frontend too)
├── osrm/                     # Self-hosted OSRM routing service (Docker)
└── Dockerfile                # Docker deployment
```

## Tech Stack

- **Frontend:** HTML, CSS, vanilla JavaScript (Leaflet for maps)
- **Backend:** Node.js, Express
- **Database:** Turso (LibSQL cloud database)
- **Routing:** OSRM (self-hosted, see `osrm/`)
- **Hosting:** Railway (CDN/SSL via Cloudflare)
- **Domain:** Namecheap

## Default Login

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |

## Pricing

| Item | Price |
|------|-------|
| Standard (3-5 days) | $5.99 |
| Express (1-2 days) | $12.99 |
| Overnight | $24.99 |
| Distance | $0.20/km |
| Weight | $0.25/lb |

## Package Statuses

1. Pending Pickup
2. Picked Up
3. In Transit
4. Out for Delivery
5. Delivered

## Deployment

Hosted on **Railway**, fronted by **Cloudflare** (CDN + SSL). See `update.md`
for the full list of required environment variables (Turso, JWT/session secrets,
Google OAuth, Resend email, CORS origins, etc.).

### Deploy to Railway

1. Push code to GitHub
2. Create a Railway service from the GitHub repo (uses the `Dockerfile`)
3. Add environment variables (see `update.md`)
4. Deploy — Railway auto-redeploys on push to `main`

> The OSRM routing service is a **separate** Railway service (Root Directory =
> `osrm`). See `osrm/README.md` for setup and the `OSRM_URL` wiring.

## Services Used

| Service | Purpose | Cost |
|---------|---------|------|
| Railway | Hosting (app + OSRM) | Hobby (~$5/mo) |
| Cloudflare | CDN, SSL, DNS | Free |
| Turso | Database | Free (9GB) |
| Resend | Email | Free tier |
| Namecheap | Domain | Paid |
| GitHub | Code repo | Free |

## License

MIT
