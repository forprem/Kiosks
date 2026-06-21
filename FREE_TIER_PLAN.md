# Free Tier Plan (Now) -> Paid Tier Plan (Later)

## Start free

1. Database: Neon Postgres free tier or Supabase Postgres free tier
2. Frontend: Firebase Hosting (free limits)
3. Backend: run locally first, then Cloud Run with strict budget alerts
4. Payments: mock mode for zero-cost end-to-end testing, then Stripe test mode

## When to move to paid

1. Sustained bookings and real payment volume
2. Need stronger SLA and private networking
3. Need higher DB performance and autoscaling controls

## Migration path

1. Keep `DATABASE_URL` as single source for DB connection
2. Use Prisma schema and migrations from day one
3. Move from Neon/Supabase to Cloud SQL by changing connection env + running migrations
4. Keep API contract unchanged so frontend does not need major changes

## Cost control checklist

1. Set Google Cloud budget alert at low threshold (e.g. 20 USD, 50 USD, 100 USD)
2. Use smallest Cloud Run and Cloud SQL settings first
3. Monitor CPU/memory and only scale after usage data
4. Keep Stripe in test mode until end-to-end flow is validated
