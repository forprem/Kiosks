# Production Deployment Guide

This guide deploys the Kiosk Booking Platform to production using Firebase Hosting, Cloud Run, and Neon PostgreSQL.

## Architecture overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Firebase Hosting                             │
│        (frontend React app served at yourapp.firebase.io)       │
│                                                                   │
│   Rewrite /api/* → Cloud Run backend service                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Cloud Run (kiosk-backend)                      │
│     Docker container running Express + Prisma + Stripe          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Neon PostgreSQL (free tier)                    │
│        Cloud-hosted, serverless Postgres database               │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Google Cloud account (with billing enabled for Cloud Run)
- Firebase project (free tier included in GCP)
- Neon PostgreSQL account (free tier)
- Stripe account (test or production keys)
- `gcloud` CLI installed
- `firebase-tools` CLI installed

## Step 0: Set up Neon PostgreSQL

1. Visit https://neon.tech
2. Create a free account
3. Create a new project
4. Copy the connection string (e.g., `postgresql://user:password@host/dbname`)
5. Save this for later

## Step 1: Prepare production environment files

### Backend production `.env`

Create a secure `.env.production` in backend folder (do NOT commit):

```
PORT=8080
NODE_ENV=production
DATABASE_URL=postgresql://user:password@neon.host/dbname?sslmode=require
ADMIN_TOKEN=<generate-a-strong-random-token>
FRONTEND_URL=https://your-project.firebaseapp.com
STRIPE_SECRET_KEY=sk_live_YOUR_PROD_KEY_OR_sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_YOUR_PROD_SECRET_OR_whsec_test_...
```

Generate a strong admin token:

```bash
openssl rand -base64 32
```

## Step 2: Build and containerize backend

### Create Dockerfile in `/backend`

The Dockerfile is already scaffolded; verify it exists or create [backend/Dockerfile](backend/Dockerfile):

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 8080

CMD ["npm", "start"]
```

### Build Docker image locally (test)

```bash
cd backend
docker build -t kiosk-backend:latest .
```

## Step 3: Push to Cloud Run

### Set up Google Cloud project

```bash
export PROJECT_ID="your-gcp-project-id"

gcloud config set project $PROJECT_ID
gcloud auth login
```

### Enable required APIs

```bash
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
```

### Create Artifact Registry repository (optional, for image storage)

```bash
gcloud artifacts repositories create docker-repo \
  --repository-format=docker \
  --location=us-central1
```

### Deploy backend to Cloud Run

```bash
cd backend

# Build and push to Cloud Run directly
gcloud run deploy kiosk-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,DATABASE_URL=postgresql://...,ADMIN_TOKEN=...,FRONTEND_URL=https://your-app.firebaseapp.com,STRIPE_SECRET_KEY=sk_...,STRIPE_WEBHOOK_SECRET=whsec_..." \
  --memory 512Mi \
  --cpu 1 \
  --timeout 60 \
  --max-instances 10
```

**Or** set env vars in Cloud Run console after deployment:

1. Go to Cloud Run dashboard
2. Click service `kiosk-backend`
3. Edit → Modify → Environment variables
4. Add all vars from `.env.production`
5. Deploy

After success, copy the service URL (e.g., `https://kiosk-backend-abc123xyz.a.run.app`).

## Step 4: Update Firebase Hosting configuration

### Edit [firebase.json](firebase.json)

Replace with your Cloud Run service URL:

```json
{
  "hosting": {
    "public": "frontend/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "/api/**",
        "run": {
          "serviceId": "kiosk-backend",
          "region": "us-central1"
        }
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

**Alternative** (if using external Cloud Run URL, not Firebase App Hosting):

```json
{
  "hosting": {
    "public": "frontend/dist",
    "rewrites": [
      {
        "source": "/api/**",
        "destination": "https://kiosk-backend-abc123xyz.a.run.app/api"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### Update frontend `.env` for production

Create [frontend/.env.production](frontend/.env.production):

```
VITE_API_BASE_URL=/api
```

(This makes all API calls relative, so they go through Firebase rewrites.)

## Step 5: Build and deploy frontend

```bash
cd frontend

# Build for production
npm run build

# This generates ./dist folder

# Login to Firebase
firebase login

# Deploy
firebase deploy --only hosting
```

After success, you'll see:

```
Hosting URL: https://your-project.firebaseapp.com
```

## Step 6: Set up database backups and monitoring

### Neon

Neon handles backups automatically on free tier (7-day retention). Upgrade plan for longer retention if needed.

### Google Cloud monitoring

1. Go to Cloud Run dashboard
2. Click `kiosk-backend` service
3. Set up budget alerts at 20 USD, 50 USD, 100 USD
4. Monitor CPU/memory usage daily first week

## Step 7: Enable Stripe webhooks (production)

### Create webhook endpoint

In Stripe dashboard:

1. Developers → Webhooks
2. Add endpoint: `https://kiosk-backend-abc123xyz.a.run.app/api/webhooks/stripe`
3. Select events: `checkout.session.completed`, `payment_intent.succeeded`
4. Copy signing secret
5. Add to Cloud Run environment: `STRIPE_WEBHOOK_SECRET=whsec_...`

### Handle webhook in backend (optional enhancement)

Currently handled via redirect; Stripe webhook endpoint can auto-confirm bookings in future version.

## Step 8: Verify deployment

```bash
# Check backend health
curl https://kiosk-backend-abc123xyz.a.run.app/health

# Check frontend loads
curl https://your-project.firebaseapp.com
```

Visit https://your-project.firebaseapp.com in browser:

1. Select mall
2. Click kiosk
3. Enter booking details
4. Proceed to Stripe Checkout (or mock if no key)

## Cost summary (as of 2026)

| Service | Free Tier | After | Notes |
|---------|-----------|-------|-------|
| Firebase Hosting | 5GB/month | $0.15/GB | Typically free for small apps |
| Cloud Run | 2M requests/month | $0.30 per 1M req | ~$3-5 for 20M requests |
| Neon Postgres | 3 projects, 1GB storage | $15/month | Upgrade when you hit limit |
| Stripe | N/A | 2.9% + $0.30 per txn | No charges for test mode |

**Estimated monthly cost starting:** $0 (all free tier)  
**Estimated after 1k bookings/month:** $20-40 (mostly Neon upgrade)

## Setting up budget alerts

```bash
gcloud billing budgets create \
  --billing-account=$BILLING_ACCOUNT_ID \
  --display-name="Kiosk Booking Budget" \
  --budget-amount=50 \
  --threshold-rule=percent=50,percent=90,percent=100
```

## Scaling considerations

### Phase 1: Free tier (0-1k bookings/month)
- Neon free tier: 3 projects, 1GB
- Cloud Run: 2M requests free, 512Mi memory
- Firebase Hosting: 5GB free

### Phase 2: Growth (1k-10k bookings/month)
- Upgrade Neon to standard plan (~$15/month)
- Cloud Run auto-scaling handles 10M+ requests/month
- No Firebase Hosting upgrade needed

### Phase 3: Scale (10k+ bookings/month)
- Migrate Neon to Cloud SQL if need guaranteed uptime SLA
- Cloud Run continues auto-scaling
- Add CDN (Cloud CDN) for media/static assets

## Troubleshooting deployment

### "502 Bad Gateway" from Firebase

- Check Cloud Run service is actually running: `gcloud run describe kiosk-backend`
- Verify Cloud Run env vars are set correctly
- Check logs: `gcloud run logs read kiosk-backend --limit 50`

### "Database connection failed" in production

- Verify `DATABASE_URL` is correct (no typos)
- Check Neon database is running
- Ensure Cloud Run IP is whitelisted (Neon does not require IP whitelist on free tier)

### Frontend API calls fail with 404

- Verify `firebase.json` rewrite rules are correct
- Check `VITE_API_BASE_URL=/api` in frontend production build
- Run `npm run build` again after updating .env.production

## Next steps

1. Set up CI/CD pipeline (GitHub Actions)
2. Add custom domain (via Firebase Hosting)
3. Enable auto-renewal emails for bookings
4. Implement admin dashboard analytics
