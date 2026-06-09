# Maneigbbe Delivery — Update Log

## Session Updates

### 1. Google Sign-In (OAuth)
- Implemented `oauth.js` using `passport` + `passport-google-oauth20`
- Installed passport packages and added to `package.json`
- Called `initOAuth(app)` in `server.js` after session middleware
- Changed session `sameSite` from `strict` to `lax` (required for OAuth redirects)
- Google Sign-In button on `register.html` and `customer-login.html` now fully functional
- Backend routes: `GET /api/customers/auth/google` and `GET /api/customers/auth/google/callback`
- **Required env vars:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- Authorized redirect URI set to: `https://maneiggbbe-site-production.up.railway.app/api/customers/auth/google/callback`

### 2. Domain & DNS Setup
- Site moved from Koyeb to **Railway**
- Live URL: `https://www.maneiggbbe.com`
- Railway domain: `maneiggbbe-site-production.up.railway.app`
- Cloudflare page rule added: `maneiggbbe.com/*` → redirects 301 to `https://www.maneiggbbe.com/$1`

### 3. Customer Dashboard Improvements
- Added avatar with user initials
- Added "Signed in with Google" badge for Google users
- Added "Member since" date
- Added quick action buttons: **Request Pickup** and **Track a Package**
- Improved stats cards with icons
- Removed 4 fake placeholder tabs (Bulk Upload, Invoices, Reports, Contact Manager)
- **Change Password tab hidden for Google Sign-In users** (they don't have a password)
- Backend: profile API now returns `isGoogleUser` flag

### 4. Admin Dashboard — Full Redesign
- Complete dark UI rewrite (standalone CSS, no external stylesheet)
- Stats cards with emoji icons
- Table shows: tracking #, sender name+city, recipient name+city, status badge, speed, price, date
- **View** button opens full detail modal with ALL pickup info:
  - Sender: name, phone, email, address, city/zip
  - Recipient: name, phone, email, address, city/zip
  - Weight, speed, price, expected delivery, description
- **Update** button focuses the status update form in modal
- **Delete** button shows custom confirmation modal (no browser `confirm()`)
- Toast notifications replace all `alert()` popups
- Search filters client-side; status filter reloads from server
- Removed "Admin Login" link from customer sign-in page (`customer-login.html`)
- Removed exposed demo credentials (`admin`/`admin123`) from `login.html`

### 5. Admin Change Password
- New backend route: `PUT /api/auth/password`
- "Change Password" button added to admin nav
- Modal with current password, new password, confirm fields
- Validates min 8 characters and password match before submitting

### 6. Security Fixes
- Removed `admin`/`admin123` demo credentials from public `login.html`
- Removed "Admin Login" link from customer-facing sign-in page
- Rotated Turso database token (old token invalidated via Turso CLI)

### 7. Railway Environment Variables (required)
| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | JWT signing secret (required — server crashes if missing) |
| `SESSION_SECRET` | Express session secret (required in production) |
| `NODE_ENV` | Set to `production` |
| `PORT` | `3000` |
| `TURSO_DATABASE_URL` | `libsql://maneigbbe-rayokosag.aws-us-west-2.turso.io` |
| `TURSO_AUTH_TOKEN` | Turso database auth token |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | `https://maneiggbbe-site-production.up.railway.app/api/customers/auth/google/callback` |
| `CORS_ORIGINS` | `https://www.maneiggbbe.com,https://maneiggbbe.com` |

### 8. Admin Login
- URL: `www.maneiggbbe.com/login.html` (not linked publicly)
- Default credentials: `admin` / `admin123` (**change this immediately via Change Password**)
