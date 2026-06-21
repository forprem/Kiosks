# Quick Start (5 minutes)

Get the Kiosk Booking Platform running locally with minimal setup.

## Prerequisites

- Node.js 20+ installed
- Free Neon or Supabase account (1 minute signup)

## 1. Get a free database (1 min)

### Neon (recommended)

```bash
# Visit https://neon.tech → Sign up → Create project → Copy connection string
# Looks like: postgresql://user:password@host/dbname?sslmode=require
```

Save that connection string for Step 3.

## 2. Install dependencies (2 min)

```bash
cd /home/ansible/Kiosk

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

## 3. Configure environment (1 min)

### Backend

```bash
cd backend
cp .env.example .env

# Edit .env and replace DATABASE_URL with your Neon connection string
# Edit .env and replace ADMIN_TOKEN with any string you want (e.g., "dev123")
```

### Frontend

```bash
cd ../frontend
cp .env.example .env
# Leave as is (uses localhost:4000 by default)
```

## 4. Initialize database (1 min)

```bash
cd ../backend

npm run prisma:generate
npm run prisma:push
npm run prisma:seed
```

You should see `Seed completed` and no errors.

## 5. Start the app (1 min)

### Terminal 1: Backend

```bash
cd /home/ansible/Kiosk/backend
npm run dev
```

You'll see: `Backend listening on http://localhost:4000`

### Terminal 2: Frontend

```bash
cd /home/ansible/Kiosk/frontend
npm run dev
```

You'll see: `Local: http://localhost:5173/`

## 6. Use it

Open http://localhost:5173 in your browser.

### Customer flow

1. Select a mall
2. Click a kiosk on the map (green pins = available)
3. Fill in your name, email, date
4. Click "Proceed to Payment"
5. Mock payment confirms instantly

### Admin flow

1. Click "Admin" tab
2. Enter admin token (from `.env`)
3. Create mall
4. Create kiosk
5. Update kiosk price/position

Done! You now have a fully functional kiosk booking platform.

## What's next?

- **Deploy for free:** See [DEPLOYMENT.md](DEPLOYMENT.md)
- **API reference:** See [API.md](API.md)
- **Local dev details:** See [DEVELOPMENT.md](DEVELOPMENT.md)
- **Database inspection:** Run `npx prisma studio` in backend folder
