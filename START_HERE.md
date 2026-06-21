# Kiosk Booking Platform - Complete MVP

This is a **production-ready, free-first starter** for a mall kiosk booking platform with map selection, 1-year bookings, online payments, and admin controls.

**Status: ✅ Complete and ready to run**

---

## 🎯 Features Implemented

- ✅ Interactive mall map with kiosk selection
- ✅ Fixed 1-year booking contracts
- ✅ Booking conflict prevention (overlap checks)
- ✅ Online payments via Stripe or mock mode
- ✅ Admin panel to create/update malls and kiosks
- ✅ Customer booking flow with email/name validation
- ✅ Real database (Prisma + PostgreSQL)
- ✅ Full REST API with admin-protected endpoints
- ✅ Free-tier friendly (Neon Postgres + Firebase Hosting + Cloud Run)

---

## 📚 Documentation Index

### For first-time users

1. **[QUICK_START.md](QUICK_START.md)** — Get running in 5 minutes (start here!)
2. **[DEVELOPMENT.md](DEVELOPMENT.md)** — Full local dev setup with troubleshooting

### For deployment

3. **[DEPLOYMENT.md](DEPLOYMENT.md)** — Deploy to Firebase Hosting + Cloud Run + Neon (production-grade)
4. **[FREE_TIER_PLAN.md](FREE_TIER_PLAN.md)** — Free-to-paid migration strategy

### For developers

5. **[API.md](API.md)** — Complete REST API endpoint reference
6. **[README.md](README.md)** — Project overview and architecture

---

## 📁 Project Structure

```
Kiosk/
├── backend/                    # Express + Prisma API
│   ├── src/
│   │   ├── server.ts          # All API endpoints
│   │   ├── config.ts          # Environment setup
│   │   ├── db.ts              # Prisma client
│   │   └── date-utils.ts      # 1-year booking logic
│   ├── prisma/
│   │   ├── schema.prisma      # Data models
│   │   └── seed.ts            # Demo data
│   ├── Dockerfile             # For Cloud Run
│   ├── package.json           # Dependencies
│   └── .env.example           # Config template
│
├── frontend/                   # React + Vite customer + admin UI
│   ├── src/
│   │   ├── App.tsx            # Customer & admin modes
│   │   ├── api.ts             # Backend client
│   │   └── styles.css         # Styling
│   ├── package.json           # Dependencies
│   ├── .env.example           # Config template
│   └── .env.production        # Production config
│
├── docker-compose.yml         # Local Postgres + backend
├── firebase.json              # Firebase Hosting config
├── .firebaserc               # Firebase project mapping
├── QUICK_START.md            # 5-min setup
├── DEVELOPMENT.md            # Local dev guide
├── DEPLOYMENT.md             # Production deployment
├── API.md                    # API reference
└── setup.sh                  # Automated setup script

```

---

## 🚀 Getting Started

### Option 1: Automated setup (recommended)

```bash
cd /home/ansible/Kiosk
bash setup.sh
```

Then follow the prompts.

### Option 2: Manual setup

See [QUICK_START.md](QUICK_START.md) for step-by-step instructions.

---

## 💡 Key Technical Decisions

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React + Vite | Fast dev, small bundle, Firebase-friendly |
| Backend | Express + TypeScript | Lightweight, easy Cloud Run deployment |
| Database | Prisma + Postgres | Type-safe, migrations, free tier (Neon/Supabase) |
| Payments | Stripe + Mock mode | Industry standard, free testing without key |
| Hosting | Firebase + Cloud Run | Free tier covers MVP, seamless scaling |

---

## 📊 Database Schema

### Core entities

1. **Mall** — Each shopping center
2. **Kiosk** — Individual rental units (position on map, price, status)
3. **Booking** — Customer lease (kioskId, startDate, endDate=+1 year, status)
4. **Payment** — Transaction record (bookingId, amount, Stripe session)

All models include `createdAt`, `updatedAt` for audit trails.

---

## 🔒 Admin Authentication

**Simple token-based** for MVP (upgrade to Firebase Auth for production):

```bash
# Any request to /api/admin/* requires header:
x-admin-token: <ADMIN_TOKEN_from_.env>
```

Set a strong token in backend `.env.example`:

```bash
ADMIN_TOKEN=$(openssl rand -base64 32)
```

---

## 💰 Cost Breakdown

| Service | Free tier | Cost after | When to upgrade |
|---------|-----------|-----------|-----------------|
| Firebase Hosting | 5GB/month | $0.15/GB | 100k+ visits/month |
| Cloud Run | 2M requests | $0.30 per 1M | 20M+ requests/month |
| Neon Postgres | 1 project, 1GB | $15/month | 1GB data reached |
| Stripe | N/A | 2.9% + $0.30/txn | Production traffic |

**Estimated MVP monthly cost: $0 (all free tier)**  
**With 1k bookings/month: ~$20-30**

---

## 🎮 Try it now (local)

After following [QUICK_START.md](QUICK_START.md):

### Customer booking
1. Open http://localhost:5173
2. Select mall from dropdown
3. Click green kiosk pin
4. Enter name, email, date
5. Click "Proceed to Payment"
6. Mock payment confirms (no Stripe key needed)

### Admin updates
1. Click "Admin" tab
2. Enter admin token from `.env`
3. Create or update kiosks
4. Changes reflect in map immediately

---

## 🔄 Booking Logic (Business Rules)

1. **Exactly 1 year** — All bookings are 365 days from start date
2. **No overlaps** — System rejects bookings that conflict with existing leases
3. **Status workflow** — PENDING_PAYMENT → CONFIRMED (after payment)
4. **Price locked** — Price at booking time is stored, kiosk can change later
5. **Admin anytime** — Admins can update kiosk details without affecting confirmed bookings

---

## 📱 API Quick Reference

```bash
# List malls
curl http://localhost:4000/api/malls

# List kiosks for a mall
curl "http://localhost:4000/api/kiosks?mallId=demo-mall-central"

# Create booking
curl -X POST http://localhost:4000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "kioskId": "demo-kiosk-a101",
    "customerName": "Jane Doe",
    "customerEmail": "jane@example.com",
    "startDate": "2025-06-20T00:00:00Z"
  }'

# Admin: Create kiosk
curl -X POST http://localhost:4000/api/admin/kiosks \
  -H "Content-Type: application/json" \
  -H "x-admin-token: dev-admin-token-12345" \
  -d '{
    "mallId": "demo-mall-central",
    "code": "D-401",
    "mapX": 90,
    "mapY": 75,
    "pricePerYear": 25000,
    "status": "AVAILABLE"
  }'
```

Full reference: [API.md](API.md)

---

## 🚢 Deployment Summary

1. **Frontend** → Firebase Hosting (1 command)
2. **Backend** → Cloud Run (Docker container, 1 command)
3. **Database** → Neon Postgres (free account, 1 connection string)
4. **Stripe** → Test mode while validating, switch to production keys later

See [DEPLOYMENT.md](DEPLOYMENT.md) for exact steps.

---

## 🛠️ Tech Stack Summary

### Backend
- Node.js 20 + Express.js
- TypeScript for type safety
- Prisma ORM with PostgreSQL
- Stripe SDK for payments
- Zod for validation

### Frontend
- React 18 + Vite
- TypeScript
- Fetch API (no extra libs)
- Tailwind-like utility CSS
- Components for admin & customer modes

### Infrastructure
- Firebase Hosting
- Google Cloud Run
- Neon PostgreSQL
- Docker for containerization

---

## 📋 Next Steps

### Immediate (already available)
- ✅ Run locally
- ✅ Test customer flow
- ✅ Test admin updates
- ✅ Review database schema

### Short-term (before launching)
- Add Firebase Auth for real admin/customer logins
- Add Stripe webhook endpoint for production confirmation
- Add booking history page
- Add admin analytics dashboard

### Medium-term (scaling)
- Add email notifications (booking confirmation, renewal reminders)
- Add multi-language support
- Add more payment methods (credit card only Stripe initially)
- Add booking cancellation + refunds

### Long-term (optimization)
- Migrate Neon → Cloud SQL when SLA needed
- Add CDN for static assets
- Add search/filter by mall, price, size
- Add customer portal with receipts

---

## 📞 Support & Questions

- **Local setup issues?** See [DEVELOPMENT.md](DEVELOPMENT.md)
- **Deployment help?** See [DEPLOYMENT.md](DEPLOYMENT.md)
- **API questions?** See [API.md](API.md)
- **Cost concerns?** See [FREE_TIER_PLAN.md](FREE_TIER_PLAN.md)

---

## 📄 License & Notes

This is a **free-tier-first starter project** designed for rapid validation before significant cloud spend. All code is TypeScript, fully typed, and follows production patterns.

**Ready to launch? Start with [QUICK_START.md](QUICK_START.md)!**
