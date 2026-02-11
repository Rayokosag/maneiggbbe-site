# Maneigbbe Delivery

A package delivery tracking website (like UPS) for **Maneigbbe Delivery Service & Technology Inc**.

## Quick Start

```bash
cd server
npm install
npm start
```
Open http://localhost:3000 in your browser.

## Features

- Track packages with tracking number
- Request pickup with pricing calculator
- Admin dashboard to manage packages
- Customer registration & login (Email + Google)
- Email & SMS notifications
- Photo upload for packages

## Project Structure

```
maneigbbe-delivery/
├── index.html                # Homepage
├── tracking.html             # Track packages
├── request-pickup.html       # Request a pickup
├── login.html                # Admin login
├── admin.html                # Admin dashboard
├── customer-login.html       # Customer login
├── register.html             # Customer signup
├── css/styles.css            # Styles
├── js/                       # Frontend scripts
├── images/                   # Logo & images
└── server/                   # Backend (Node.js)
```

## Default Login

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express
- **Database:** SQLite

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

## Environment Setup

Copy `.env.example` to `.env` in the server folder and update:

```
JWT_SECRET=your-secret-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
```

## License

MIT
