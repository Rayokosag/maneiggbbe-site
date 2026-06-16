# Maneiggbbe Delivery — Update Log

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
- **View** button opens full detail modal with ALL pickup info
- **Update** button focuses the status update form in modal
- **Delete** button shows custom confirmation modal (no browser `confirm()`)
- Toast notifications replace all `alert()` popups
- Search filters client-side; status filter reloads from server

### 5. Admin Change Password
- New backend route: `PUT /api/auth/password`
- "Change Password" button added to admin nav
- Modal with current password, new password, confirm fields

### 6. Security Fixes
- Removed `admin`/`admin123` demo credentials from public `login.html`
- Removed "Admin Login" link from customer-facing sign-in page
- Rotated Turso database token (old token invalidated via Turso CLI)
- Added `cdn.jsdelivr.net` to CSP scriptSrc (was blocking Chart.js)

### 7. Railway Environment Variables (required)
| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | JWT signing secret |
| `SESSION_SECRET` | Express session secret |
| `NODE_ENV` | Set to `production` |
| `PORT` | `3000` |
| `TURSO_DATABASE_URL` | `libsql://maneiggbbe-rayokosag.aws-us-west-2.turso.io` |
| `TURSO_AUTH_TOKEN` | Turso database auth token |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | `https://maneiggbbe-site-production.up.railway.app/api/customers/auth/google/callback` |
| `CORS_ORIGINS` | `https://www.maneiggbbe.com,https://maneiggbbe.com` |
| `RESEND_API_KEY` | Resend API key for email |
| `EMAIL_FROM` | `Maneiggbbe Delivery <noreply@maneiggbbe.com>` |
| `BASE_URL` | `https://www.maneiggbbe.com` |
| `ADMIN_EMAIL` | Admin email to receive pickup alerts |

### 8. Admin Login
- URL: `www.maneiggbbe.com/login.html` (not linked publicly)
- Default credentials: `admin` / `admin123` (**change this immediately via Change Password**)

### 9. Project Restructure
- Moved all frontend files from repo root into `frontend/` directory
- Moved `server/` into `backend/` directory

### 10. Deployment — Railway + Cloudflare + Namecheap
- Deployed to Railway Hobby plan (~$5/mo)
- Cloudflare added for CDN + DDoS protection + SSL (free plan)
- Namecheap nameservers updated to Cloudflare
- SSL/TLS mode set to **Full** in Cloudflare

---

## Session 2 Updates

### 11. Real Email Notifications (Resend)
- Replaced nodemailer/Ethereal with **Resend SDK** (`npm install resend`)
- `email.js` rewritten to use Resend API — no SMTP config needed
- Emails send from `noreply@maneiggbbe.com` (domain verified in Resend)
- **Admin pickup alert** — admin gets email when a new pickup is submitted with full details + dashboard link
- **Status update email** — recipient gets email when admin changes package status
- **Password reset email** — working with real delivery
- **OTP verification email** — 6-digit code sent on registration
- Footer contact email changed from `admin@maneiggbbe.com` → `saleteam@maneiggbbe.com` across all 10 pages

### 12. Customer Account Linking
- Pickup form sends auth token if customer is logged in
- Packages saved with `customer_id` so they appear in customer dashboard
- Success page shows **"View in My Dashboard"** button for logged-in customers
- Non-logged-in customers see **"Create Account"** prompt after submitting

### 13. Package Photo Uploads
- Admin detail modal shows package photos as thumbnails (click to view full size)
- Admin can upload new photos directly from the package detail modal
- Customers can remove individual photos before submitting (red ✕ button per photo)
- Photo counter shows `2/5 selected`
- **Known issue:** Railway filesystem is ephemeral — photos are lost on redeploy (see Todo #1)

### 14. Admin Analytics Charts (Chart.js)
- Bar chart: packages submitted per day (last 7 days)
- Doughnut chart: live status breakdown with color coding
- New backend endpoint: `GET /api/packages/analytics`
- Charts sit between stat cards and packages table

### 15. Email OTP Verification on Registration
- New customers must verify email with a 6-digit code before logging in
- OTP expires in 10 minutes with resend option
- Unverified accounts blocked from login — redirected to OTP step automatically
- Existing customers migrated to verified so they are not locked out
- New DB table: `email_verification_tokens`
- New routes: `POST /api/customers/verify-email`, `POST /api/customers/resend-otp`

### 16. Admin Action Buttons Fix + Delete Undo
- Replaced fragile `onclick` attributes with **event delegation** (fixes buttons not working)
- All event listeners moved inside `DOMContentLoaded` to prevent init errors
- **Soft delete** — packages set `deleted_at` timestamp instead of being permanently deleted
- **8-second undo toast** after delete — click Undo to instantly restore the package
- New backend endpoint: `POST /api/packages/:trackingNumber/restore`

---

## Todo (Next Session)

### 1. Cloudinary Photo Storage (PRIORITY)
- **Problem:** Railway filesystem is ephemeral — uploaded photos are wiped on every redeploy
- **Fix:** Integrate Cloudinary (free tier: 25GB storage, 25GB bandwidth/month)
- Store photo URLs in the database instead of local file paths
- Steps:
  1. Sign up at cloudinary.com
  2. `npm install cloudinary multer-storage-cloudinary`
  3. Rewrite `upload.js` to upload to Cloudinary instead of disk
  4. Store returned URLs in a `package_photos` database table
  5. Update `getPhotosForPackage` to query the DB instead of reading the filesystem
  6. Add env vars: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

### 2. SMS Notifications via Twilio (optional)
- SMS stub already in `sms.js` — just needs real credentials
- Sign up at twilio.com (~$1–2/month for 100 pickups)
- Add env vars: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Sender gets SMS on pickup, recipient gets SMS on status change
