# Maneiggbbe Delivery

A package delivery tracking website for **Maneiggbbe Delivery Service & Technology Inc**.

**Live Site:** https://www.maneiggbbe.com

## Quick Start (Local Development)

```bash
cd server
npm install
npm start
```
Open http://localhost:3000

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
├── index.html                # Homepage
├── tracking.html             # Track packages
├── request-pickup.html       # Request a pickup
├── login.html                # Admin login
├── admin.html                # Admin dashboard
├── customer-login.html       # Customer login
├── register.html             # Customer signup
├── forgot-password.html      # Password reset
├── reset-password.html       # Reset password
├── customer-dashboard.html   # Customer dashboard
├── css/styles.css            # Styles
├── js/                       # Frontend scripts
├── images/                   # Logo & images
├── server/                   # Backend (Node.js)
└── Dockerfile                # Docker deployment
```

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express
- **Database:** Turso (LibSQL cloud database)
- **Hosting:** Koyeb
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

### Environment Variables (Koyeb)

```
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-token
PORT=3000
```

### Deploy to Koyeb

1. Push code to GitHub
2. Create Koyeb service from GitHub repo
3. Select Dockerfile as builder
4. Add environment variables
5. Deploy

## Services Used

| Service | Purpose | Cost |
|---------|---------|------|
| Koyeb | Hosting | Free |
| Turso | Database | Free (9GB) |
| Namecheap | Domain | Paid |
| GitHub | Code repo | Free |

## License

MIT
