# Kiosk Booking Platform (Free-First MVP)

This workspace is split into:

- `frontend`: React + Vite + TypeScript customer app
- `backend`: Express + Prisma + PostgreSQL API with admin and booking flows

## MVP features implemented

- Mall list and kiosk map selection
- Booking creation with fixed 1-year contract duration
- Booking conflict prevention (overlap checks)
- Admin mall and kiosk update endpoints
- Payment session creation:
	- Mock mode for free testing (no Stripe key needed)
	- Stripe Checkout mode when key is configured

## Free-first architecture

- Frontend: Firebase Hosting (free tier limits)
- Backend: local first, then Cloud Run
- Database: Neon/Supabase Postgres free tier
- Payments: mock mode or Stripe test mode

## Quick start (Node.js 20+)

1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

2. Configure environment files

```bash
cd ../backend
cp .env.example .env
cd ../frontend
cp .env.example .env
```

3. Prepare database schema and seed demo data

```bash
cd ../backend
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
```

4. Start backend

```bash
cd ../backend
npm run dev
```

5. Start frontend

```bash
cd ../frontend
npm run dev
```

## Admin endpoints

Set `ADMIN_TOKEN` in backend `.env`, then send header:

`x-admin-token: <ADMIN_TOKEN>`

Available routes:

- `POST /api/admin/malls`
- `PATCH /api/admin/malls/:mallId`
- `POST /api/admin/kiosks`
- `PATCH /api/admin/kiosks/:kioskId`

## Payment behavior

- If `STRIPE_SECRET_KEY` is missing or placeholder, checkout runs in mock mode.
- Frontend will auto-confirm mock payment so you can test full booking flow for free.
- Add Stripe test key to switch to real Stripe Checkout.

## Deploy outline

1. Build frontend and deploy with Firebase Hosting
2. Deploy backend to Cloud Run service `kiosk-backend`
3. Keep `DATABASE_URL` pointed to free Neon/Supabase Postgres first
4. Move to Cloud SQL later when traffic and revenue justify it
