# Ankita Designs Live Shopping Deployment

Recommended production setup:

- Frontend: Vercel
- Backend: Render web service
- Database: Render PostgreSQL, Neon, or Supabase PostgreSQL
- Image storage: Cloudinary
- Live video: LiveKit Cloud, optional until streaming is needed

## 1. Push The Project To GitHub

Deployments should be connected to a GitHub repository.

Do not commit local secret files:

- `.env`
- `backend/.env`
- `frontend/.env`

## 2. Deploy Backend On Render

Use the root `render.yaml` blueprint, or create a Render Web Service manually.

Manual Render settings:

- Root directory: `backend`
- Runtime: Python
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/health`

Backend environment variables:

```text
DATABASE_URL=your_postgres_connection_string
FRONTEND_URL=https://your-vercel-domain.vercel.app
ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app
ALLOWED_ORIGIN_REGEX=https://.*\.vercel\.app

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

GOOGLE_CLIENT_ID=your_google_oauth_web_client_id

LIVEKIT_URL=wss://your-livekit-host
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

BOOTSTRAP_ADMIN_EMAIL=admin@ankitadesigns.in
BOOTSTRAP_ADMIN_PASSWORD=set_a_strong_password
BOOTSTRAP_ADMIN_NAME=Ankita Admin

OTP_PROVIDER=fast2sms
OTP_DEBUG_RESPONSE=false
FAST2SMS_API_KEY=your_fast2sms_api_key
FAST2SMS_OTP_ID=your_fast2sms_smart_otp_template_id
FAST2SMS_VARIABLES_VALUES=

# Optional Twilio fallback if OTP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_PHONE=
```

LiveKit can stay empty if live video is not ready for production. The app will keep catalogue, chat, cart, checkout, vendor, and admin flows running.

For local OTP testing, use `OTP_DEBUG_RESPONSE=true` so SMS delivery is skipped and the development OTP is returned by the backend.

## 3. Deploy Frontend On Vercel

Vercel settings:

- Framework: Next.js
- Root directory: `frontend`
- Install command: `npm install`
- Build command: `npm run build`

Frontend environment variables:

```text
NEXT_PUBLIC_API_URL=https://your-render-backend.onrender.com
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-host
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_oauth_web_client_id
```

If LiveKit is not configured yet, keep `NEXT_PUBLIC_LIVEKIT_URL` empty.

## 4. Update Backend CORS After Vercel URL Is Known

After the first Vercel deployment, copy the Vercel production URL and update Render:

```text
FRONTEND_URL=https://your-vercel-domain.vercel.app
ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app
```

Then redeploy/restart the Render backend.

## 5. Google Login Setup

In Google Cloud Console:

- Create OAuth Web Client.
- Authorized JavaScript origins:
  - `https://your-vercel-domain.vercel.app`
  - `http://localhost:3001`
- Use the same client ID in:
  - Backend: `GOOGLE_CLIENT_ID`
  - Frontend: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

## 6. Production Verification

Verify these URLs:

```text
https://your-render-backend.onrender.com/health
https://your-render-backend.onrender.com/docs
https://your-vercel-domain.vercel.app
```

Manual flows to test:

- Homepage loads and shows exhibitions.
- Admin login works.
- Admin can create exhibition and upload banner.
- Admin can create homepage advertisement.
- Vendor registration works.
- Vendor can upload product image.
- Customer can add item to cart.
- Checkout requires login before order.
- Backend CORS does not block frontend requests.

## 7. Production Notes

- Do not use localhost URLs in production environment variables.
- Do not expose `LIVEKIT_API_SECRET`, `CLOUDINARY_API_SECRET`, or database passwords in frontend variables.
- Keep image files in Cloudinary; database stores URLs only.
- Keep `ALLOWED_ORIGINS` explicit. Do not use `*` with authenticated requests.
