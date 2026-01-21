# Maneigbbe Delivery - Project Context

## Overview
A delivery tracking website (like UPS) for **Maneigbbe Delivery Service & Technology Inc**. Built with HTML/CSS/JS frontend and Node.js/Express/SQLite backend.

## Project Structure
```
maneigbbe-delivery/
├── index.html              # Homepage
├── tracking.html           # Package tracking page
├── request-pickup.html     # Pickup request form with packaging service
├── login.html              # Admin login
├── admin.html              # Admin dashboard
├── css/
│   └── styles.css          # Main stylesheet (logo: 80x80px)
├── js/
│   ├── main.js             # Homepage quick track
│   ├── login.js            # Admin login (API)
│   ├── pickup.js           # Pickup form + pricing calculation
│   ├── tracking.js         # Package tracking (API)
│   └── admin.js            # Dashboard CRUD (API)
├── images/
│   ├── logo.jpg            # Company logo (circular, black/white)
│   └── parcel.jpg          # Pricing chart image
├── server/
│   ├── server.js           # Express app (port 3000)
│   ├── database.js         # SQLite setup with sql.js
│   ├── package.json        # Dependencies
│   ├── delivery.db         # SQLite database file
│   └── routes/
│       ├── auth.js         # POST /api/auth/login, /logout
│       └── packages.js     # CRUD /api/packages
└── {css,js,images}/        # Original assets folder (logo.JPG, parcel.JPG)
```

## Tech Stack
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **Database**: SQLite (via sql.js - pure JS, no native compilation)
- **Auth**: bcryptjs for password hashing

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login |
| POST | `/api/auth/logout` | Admin logout |
| GET | `/api/packages` | List all packages |
| GET | `/api/packages/stats` | Dashboard stats |
| GET | `/api/packages/:trackingNumber` | Track package |
| POST | `/api/packages` | Create pickup request |
| PUT | `/api/packages/:trackingNumber` | Update status |
| DELETE | `/api/packages/:trackingNumber` | Delete package |

## Database Schema
- **admins**: id, username, password_hash, created_at
- **packages**: tracking_number, sender/recipient info, weight, speed, status, price, etc.
- **timeline_events**: tracking_number, date, status, location, completed

## Default Credentials
- **Admin**: username: `admin`, password: `admin123`

## Demo Packages
- MNG123456 (In Transit)
- MNG789012 (Delivered)
- MNG345678 (Pending Pickup)

## Pricing Structure
**Delivery Speeds:**
- Standard (3-5 days): $5.99
- Express (1-2 days): $12.99
- Overnight: $24.99

**Additional Charges:**
- $0.20 per kilometer
- $0.25 per pound (over 5 lbs)

**Packaging Materials:**
- Mail Envelope: $15
- Parcel Box: $20
- Box 1-7: $30 each

## Package Statuses
1. Pending Pickup
2. Picked Up
3. In Transit
4. Out for Delivery
5. Delivered

## Running the Project
```bash
cd server
npm install
npm start
# Server runs on http://localhost:3000
```

## Design Notes
- Primary color: #667eea (purple-blue)
- Secondary color: #764ba2 (deep purple)
- Logo: 80x80px, circular with shadow
- Gradient backgrounds on navbar, buttons, cards
- Mobile responsive layouts

## Recent Changes
- Added Node.js/Express backend with SQLite
- Added packaging service with box options
- Redesigned request-pickup page with two-column layout
- Logo size increased to 80x80px

## TODO / Future Enhancements
- [ ] JWT token authentication
- [ ] Email/SMS notifications
- [ ] Distance-based pricing calculation
- [ ] Customer accounts
- [ ] Package photo upload
- [ ] Driver tracking
