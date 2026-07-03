# Ankita ExpoVerse

Ankita ExpoVerse is a virtual exhibition and live-shopping platform for Ankita Designs.

Tagline: `Walk. Watch. Shop Live.`

This repository is the production foundation for the first MVP:

- a Next.js frontend
- a FastAPI backend
- PostgreSQL and Redis via Docker
- a Phaser-powered exhibition hall
- a split-screen live commerce room
- database-backed cart and checkout flows
- vendor and admin summaries

## Repository layout

```text
ankita-expoverse/
  frontend/   # Next.js app
  backend/    # FastAPI app
  database/   # schema notes
```

## Stack

### Frontend
- Next.js
- TypeScript
- Tailwind CSS
- Framer Motion
- Phaser 3
- Zustand

### Backend
- FastAPI
- Pydantic
- SQLAlchemy
- Redis
- LiveKit token service for real camera streaming

### Infrastructure
- PostgreSQL
- Redis
- Docker Compose

## MVP flow

1. Landing page
2. Avatar selection
3. Exhibition map
4. Stall proximity or fallback join
5. Vendor live room
6. Add to cart
7. Checkout
8. Order success
9. Vendor dashboard
10. Admin dashboard

## Seeded role accounts

Use these accounts for local role testing:

```text
Admin:  admin@ankitadesigns.in / admin123
Vendor: vendor@ankitadesigns.in / vendor123
User:   user@example.com / user123
```

Role entry points:

- Public: `/`, `/login`, `/register`
- User: `/avatar`, `/exhibitions`, `/exhibition/ankita-lifestyle-live-expo`, `/live/white-metal-gifts`, `/cart`, `/checkout`, `/success`, `/orders`
- Vendor: `/vendor`, `/vendor/exhibitions`, `/vendor/stall`, `/vendor/products`, `/vendor/live`, `/vendor/orders`
- Admin: `/admin`, `/admin/exhibitions`, `/admin/vendors`, `/admin/stalls`, `/admin/orders`, `/admin/analytics`

## Environment variables

Copy `.env.example` and set values as needed.

### Backend
- `DATABASE_URL`
- `REDIS_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `LIVEKIT_URL`
- `FRONTEND_URL`
- `ALLOWED_ORIGINS`
- `OTP_PROVIDER` (`twilio` or `fast2sms`)
- `OTP_DEBUG_RESPONSE`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_PHONE`
- `FAST2SMS_API_KEY`
- `FAST2SMS_OTP_ID`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL`
- `EMAIL_OTP_DEBUG_RESPONSE`

### Frontend
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_LIVEKIT_URL`

## Run infrastructure

```bash
docker compose up -d
```

This starts:

- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

## Run the backend

Python is required locally.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open:

- API docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health: [http://localhost:8000/health](http://localhost:8000/health)

### Production data

The backend reads and writes production data through the SQLAlchemy models and configured database connection. Runtime routes should not generate or serve seed, mock, or demo records.

If the deployed database contains old sample rows, remove them directly from the database or admin tools. The application will display whatever records exist in the connected database.

### User account diagnostics

Passwords are stored as one-way hashes and cannot be viewed in plaintext. To check which database the backend is using and whether users have valid password hashes:

```bash
cd backend
python scripts/list_users.py
```

To reset a user's password safely:

```bash
cd backend
python scripts/reset_user_password.py
```

### OTP SMS setup

Local OTP testing can use `OTP_DEBUG_RESPONSE=true`, which returns the generated code in the API response and skips SMS delivery.

Production SMS delivery supports two providers:

- Twilio: set `OTP_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_PHONE`.
- Fast2SMS Smart OTP: set `OTP_PROVIDER=fast2sms`, `FAST2SMS_API_KEY`, and `FAST2SMS_OTP_ID`.

Fast2SMS uses the Smart OTP JSON endpoint at `https://www.fast2sms.com/dev/otp/send`. Numbers are sent as Indian 10-digit mobile numbers. Complete DLT entity, header, content template, and Smart OTP template approval in Fast2SMS before enabling it in production. If your Fast2SMS template has extra variables besides the OTP itself, set `FAST2SMS_VARIABLES_VALUES` with pipe-separated values; otherwise keep it empty.

### Vendor email verification setup

Vendor registration sends its six-digit email code directly from the FastAPI backend through SMTP. Use the SMTP server for a mailbox or domain you control; SMTP credentials are never sent to the frontend.

```text
SMTP_HOST=mail.your-domain.com
SMTP_PORT=587
SMTP_USERNAME=verification@your-domain.com
SMTP_PASSWORD=your_mailbox_password
SMTP_FROM_EMAIL=verification@your-domain.com
SMTP_FROM_NAME=Ankita Designs
SMTP_USE_TLS=true
SMTP_USE_SSL=false
EMAIL_OTP_DEBUG_RESPONSE=false
```

Use port `465` with `SMTP_USE_SSL=true` and `SMTP_USE_TLS=false` when your mail server requires implicit SSL. For local testing only, set `EMAIL_OTP_DEBUG_RESPONSE=true`; the backend skips email delivery and returns the development code to the vendor form. Keep this flag `false` in production.

## Run the frontend

Node.js 18+ is recommended.

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Fix a corrupted Next.js cache on Windows

If the frontend throws an error like:

```text
ENOENT: no such file or directory, open frontend/.next/server/middleware-manifest.json
GET / 500
```

stop the frontend server, then run:

```powershell
cd C:\Users\atharva\Desktop\Expoverse\frontend
Remove-Item -Recurse -Force .next
npm run dev
```

If the issue continues, do a clean reinstall:

```powershell
cd C:\Users\atharva\Desktop\Expoverse\frontend
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
npm run dev
```

There is no production middleware file in the frontend. If a `middleware.ts` file is added later, it must export valid Next.js middleware or be removed.

## Key routes

- `/`
- `/avatar`
- `/exhibition`
- `/live/white-metal-gifts`
- `/checkout`
- `/success`
- `/vendor`
- `/admin`

## API surface

### Exhibition lifecycle

Exhibitions use this lifecycle:

- `draft`: admin is preparing the exhibition.
- `scheduled`: visible to vendors/users with countdown, but entry/live streaming is gated.
- `live`: users can enter the map and vendors can go live.
- `paused`: entry and new live sessions are blocked temporarily.
- `ended`: exhibition is complete and live sessions are ended.
- `cancelled`: exhibition was cancelled.

Admin lifecycle controls:

- `POST /admin/exhibitions/{exhibition_id}/schedule`
- `POST /admin/exhibitions/{exhibition_id}/start`
- `POST /admin/exhibitions/{exhibition_id}/pause`
- `POST /admin/exhibitions/{exhibition_id}/resume`
- `POST /admin/exhibitions/{exhibition_id}/end`
- `POST /admin/exhibitions/{exhibition_id}/cancel`

Countdown and entry gates:

- `GET /exhibitions/{exhibition_id}/status`
- `GET /exhibitions/{exhibition_id}/entry`

The backend uses server time for countdown decisions. Users can enter the full map only when `can_user_enter=true`. Vendors can start live only when `can_vendor_go_live=true`.

Vendor streaming modes:

- `camera`: real LiveKit camera streaming. Backend credentials are required.
- `mock`: explicit local test mode only.
- `rtmp`: future-ready stream app mode with placeholder `rtmp_url` and generated `stream_key`.

Local development seed records are optional and must be written to PostgreSQL before they appear in the app.
Production components do not import local seed data.

### Health
- `GET /health`

### Exhibitions
- `GET /exhibitions`
- `GET /exhibitions/{exhibition_id}`
- `GET /exhibitions/{exhibition_id}/status`
- `GET /exhibitions/{exhibition_id}/entry`

### Stalls
- `GET /exhibitions/{exhibition_id}/stalls`
- `GET /stalls/{stall_id}`
- `GET /stalls/{stall_id}/products`

### Products
- `GET /products`
- `GET /products/{product_id}`

### Cart
- `POST /cart/add`
- `GET /cart`
- `PATCH /cart/items/{item_id}`
- `DELETE /cart/items/{item_id}`

### Checkout and orders
- `POST /checkout/create-order`
- `GET /orders/{order_id}`
- `GET /vendor/orders`
- `PATCH /vendor/orders/{order_id}/status`

### Live sessions
- `POST /live-sessions/start`
- `POST /live-sessions/end`
- `PATCH /live-sessions/{session_id}/pin-product`
- `GET /live-sessions/stall/{stall_id}`
- `GET /live-sessions/{stall_id}`
- `POST /vendor/live/start`
- `POST /vendor/live/end`
- `PATCH /vendor/live/{live_session_id}/pin-product`

### LiveKit
- `POST /livekit/token`
- `GET /livekit/config-status`

### CORS
- `GET /cors/debug`

Camera streaming requires backend LiveKit credentials. If credentials are missing, camera mode returns a clear `LIVEKIT_NOT_CONFIGURED` error instead of pretending to stream. Mock mode is available only when explicitly selected.

### Vendor
- `GET /vendor/dashboard`
- `GET /vendor/products`
- `POST /vendor/products`
- `PATCH /vendor/products/{product_id}`

### Admin
- `GET /admin/analytics`
- `GET /admin/orders`
- `GET /admin/vendors`
- `GET /admin/stalls`

## Architecture notes

- The map is discovery.
- The live room is conversion.
- The cart and checkout are revenue.
- Vendor and admin views are the operational layer.

AtriumVerse was used only as a technical reference for map/realtime/video architecture. This codebase is a clean Ankita ExpoVerse application and does not carry classroom or office collaboration concepts.

## Real LiveKit Streaming Setup

LiveKit camera streaming is supported through backend-issued tokens.

Install frontend packages:

```powershell
cd C:\Users\atharva\Desktop\Expoverse\frontend
npm install livekit-client @livekit/components-react @livekit/components-styles
```

Backend `.env` only:

```text
LIVEKIT_URL=wss://your-livekit-host
LIVEKIT_API_KEY=your-key
LIVEKIT_API_SECRET=your-secret
FRONTEND_URL=http://localhost:3001
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

Frontend `.env.local` or PowerShell env:

```text
NEXT_PUBLIC_API_URL=http://127.0.0.1:8001
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-host
```

Never expose `LIVEKIT_API_SECRET` to the frontend.

## Deployment CORS Setup

For Render backend deployments, configure explicit frontend origins. Do not use wildcard `*` with credentialed requests.

Render backend environment:

```text
FRONTEND_URL=https://your-vercel-url.vercel.app
ALLOWED_ORIGINS=https://your-vercel-url.vercel.app,http://localhost:3000,http://localhost:3001
```

For the current Vercel deployment, set:

```text
FRONTEND_URL=https://expoverse-gkg0012q6-atharvao-os-projects.vercel.app
ALLOWED_ORIGINS=https://expoverse-gkg0012q6-atharvao-os-projects.vercel.app,http://localhost:3000,http://localhost:3001
```

The backend normalizes origins by removing trailing slashes. To inspect the active CORS allowlist without exposing secrets, call:

```text
GET https://expoverse.onrender.com/cors/debug
```

Run backend:

```powershell
cd C:\Users\atharva\Desktop\Expoverse\backend
.\.venv\Scripts\activate
python -m uvicorn app.main:app --reload --port 8002
```

Run frontend:

```powershell
cd C:\Users\atharva\Desktop\Expoverse\frontend
$env:NEXT_PUBLIC_API_URL="http://127.0.0.1:8002"
$env:NEXT_PUBLIC_LIVEKIT_URL="wss://your-livekit-host"
.\node_modules\.bin\next.cmd dev -p 3001
```

Verify backend configuration:

```text
GET http://127.0.0.1:8002/livekit/config-status
```

Expected configured response:

```json
{
  "livekit_url_configured": true,
  "api_key_configured": true,
  "api_secret_configured": true,
  "mode": "real"
}
```

Vendor camera flow:

- Open `/vendor/live`.
- Select `Camera Stream`.
- Click `Go Live`.
- Backend calls `POST /vendor/live/start`.
- If LiveKit credentials exist, response includes `livekit.mode = "real"`, `livekit.url`, `livekit.room_name`, and a vendor token with publish/subscribe/data permissions.
- Browser asks for camera and microphone permission.

User viewer flow:

- Open `/live/white-metal-gifts`.
- Frontend calls `POST /live-sessions/white-metal-gifts/join`.
- If LiveKit credentials exist, response includes a user token with subscribe/data permissions and no publish permission.
- The user sees the vendor stream while the product panel, chat, and cart remain active.

If LiveKit credentials are missing, camera mode shows a configuration error. To use local test streaming, the vendor must explicitly choose `Mock Stream`.

Two-browser test:

1. Login as vendor and open `/vendor/live`.
2. Select `Camera Stream`.
3. Click `Go Live` and allow camera/microphone access.
4. Open an incognito window or another browser.
5. Login as user and open a live room from the exhibition floor.
6. Confirm the user sees the vendor stream, chat works, the pinned product appears, and Add to Cart works.

## Payment note

Checkout persists cart and order records through the backend. Payment gateway integrations can target:

- Razorpay
- Cashfree
- Shopify checkout
- direct Ankita Designs checkout routing

## Next milestones

1. Alembic migrations and persistent PostgreSQL writes
2. Real auth and role-aware sessions
3. Real Redis presence + movement sync
4. LiveKit room embed
5. Vendor-side product pinning from live room
6. Order management workflow and notifications
7. Event analytics pipeline
