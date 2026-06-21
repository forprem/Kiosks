# Local Development Setup

This guide walks through setting up the Kiosk Booking Platform on your local machine for development.

## Prerequisites

- Node.js 20+
- PostgreSQL (via Docker or local install) or free Postgres account (Neon/Supabase)
- npm or yarn

## Step 1: Get a free PostgreSQL database

Choose one:

### Option A: Neon (Recommended for free tier)

1. Visit https://neon.tech
2. Sign up (free tier includes 3 projects)
3. Create a new project
4. Copy the connection string (looks like `postgresql://user:password@host/dbname?sslmode=require`)

### Option B: Supabase

1. Visit https://supabase.com
2. Sign up for free
3. Create a new project
4. Go to Settings > Database > Connection string (URI mode)
5. Copy the connection string

### Option C: Local PostgreSQL with Docker

1. Install Docker
2. Run:

```bash
docker run --name kiosk-postgres \
  -e POSTGRES_USER=kiosk \
  -e POSTGRES_PASSWORD=localdev \
  -e POSTGRES_DB=kiosk_db \
  -p 5432:5432 \
  -d postgres:16
```

3. Connection string: `postgresql://kiosk:localdev@localhost:5432/kiosk_db`

## Step 2: Clone and install dependencies

```bash
cd /home/ansible/Kiosk

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

## Step 3: Configure environment files

### Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
ADMIN_TOKEN=dev-admin-token-change-me
FRONTEND_URL=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
```

- Replace `DATABASE_URL` with your connection string from Step 1
- Keep `STRIPE_*` as is (mock mode will be used without valid keys)

### Frontend

```bash
cd ../frontend
cp .env.example .env
```

Edit `.env`:

```
VITE_API_BASE_URL=http://localhost:4000
```

## Step 4: Initialize database

```bash
cd backend

# Generate Prisma client
npm run prisma:generate

# Push schema to database (creates tables)
npm run prisma:push

# Seed demo data (one mall with 3 demo kiosks)
npm run prisma:seed
```

You should see output like:

```
Prisma schema pushed to the database successfully
Seed completed
```

## Step 5: Start backend

```bash
cd backend
npm run dev
```

Expected output:

```
Backend listening on http://localhost:4000
```

Test health endpoint:

```bash
curl http://localhost:4000/health
# Response: {"ok":true,"service":"kiosk-booking-backend"}
```

## Step 6: Start frontend (new terminal)

```bash
cd frontend
npm run dev
```

Expected output:

```
VITE v5.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
```

Open http://localhost:5173 in your browser.

## Using the app locally

### Customer mode (default)

1. Select a mall from dropdown
2. Click kiosk pins on the map
3. Enter name, email, start date
4. Click "Proceed to Payment"
5. Mock payment confirms automatically (no Stripe key)
6. Kiosk status changes to BOOKED

### Admin mode

1. Click "Admin" tab
2. Enter admin token: `dev-admin-token-change-me`
3. Create new mall
4. Create new kiosk with coordinates
5. Update selected kiosk price/position/status

## Useful API endpoints for manual testing

### Get malls

```bash
curl http://localhost:4000/api/malls
```

### Get kiosks for a mall

```bash
curl "http://localhost:4000/api/kiosks?mallId=demo-mall-central"
```

### Create booking

```bash
curl -X POST http://localhost:4000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "kioskId": "demo-kiosk-a101",
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "startDate": "2025-01-15T00:00:00Z"
  }'
```

### Admin: Create kiosk

```bash
curl -X POST http://localhost:4000/api/admin/kiosks \
  -H "Content-Type: application/json" \
  -H "x-admin-token: dev-admin-token-change-me" \
  -d '{
    "mallId": "demo-mall-central",
    "code": "C-301",
    "mapX": 75,
    "mapY": 60,
    "pricePerYear": 20000,
    "status": "AVAILABLE"
  }'
```

## Database inspection

### Using psql (if local Postgres)

```bash
psql -U kiosk -d kiosk_db -h localhost

# List tables
\dt

# Query bookings
SELECT * FROM "Booking";

# Query kiosks
SELECT * FROM "Kiosk";
```

### Using Prisma Studio (visual DB browser)

```bash
cd backend
npx prisma studio
```

Opens http://localhost:5555 with interactive DB view.

## Troubleshooting

### "database error" when booking

- Check `DATABASE_URL` in `.env` is correct
- Verify database is running and accessible
- Run `npm run prisma:push` again

### Port 4000 or 5173 already in use

```bash
# Find and kill process on port 4000
lsof -ti:4000 | xargs kill -9

# Find and kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Admin endpoint returns 401

- Double-check `ADMIN_TOKEN` in backend `.env`
- Make sure header is exactly: `x-admin-token: your-token-value`

### Prisma schema out of sync

```bash
cd backend
npm run prisma:generate
npm run prisma:push
```

## Next: Deploy to production

See [DEPLOYMENT.md](DEPLOYMENT.md) for Firebase Hosting + Cloud Run + Neon setup.
