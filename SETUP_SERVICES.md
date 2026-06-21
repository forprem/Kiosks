# Complete Service Setup Walkthrough

Follow these steps in order. Each section has exact clicks and what to copy.

---

## 1️⃣ SET UP NEON POSTGRESQL (Database)

### Step 1.1: Create Neon Account

1. Go to: https://neon.tech
2. Click **"Sign up"** (top right)
3. Choose **"Continue with Google"** (or email)
4. Complete sign-up

### Step 1.2: Create Database Project

1. After login, you'll see dashboard
2. Click **"Create a project"** (or **"New Project"**)
3. Fill in:
   - **Project name:** `kiosk-booking`
   - **Region:** Leave as default (US-East)
   - **PostgreSQL version:** 16 (latest)
4. Click **"Create project"**
5. **Wait 30 seconds** for database to spin up

### Step 1.3: Copy Connection String

1. After project created, click on project name
2. Look for **"Connection string"** section (usually on right side)
3. Click the **connection string** (starts with `postgresql://`)
4. Click **"Copy"** button
5. **SAVE THIS** — you'll need it later. Format looks like:
   ```
   postgresql://user123:password456@ep-xyz.neon.tech/dbname?sslmode=require
   ```

**✅ DONE: Neon PostgreSQL** — You now have a free cloud database.

---

## 2️⃣ SET UP GOOGLE CLOUD (Backend Hosting)

### Step 2.1: Create Google Cloud Project

1. Go to: https://console.cloud.google.com
2. If you see a project dropdown (top), click it
3. Click **"NEW PROJECT"** (top right)
4. Fill in:
   - **Project name:** `kiosk-booking`
   - Leave **Organization** as default
5. Click **"CREATE"**
6. **Wait 30 seconds** for project to be created

### Step 2.2: Copy Your Project ID

1. You'll see a notification "Project created" (top right area)
2. Click on the project dropdown (top left, next to Google Cloud logo)
3. You'll see your project listed
4. Look for **Project ID** (not "Project name") — it looks like: `kiosk-booking-12345`
5. **COPY THIS** — you'll need it
6. Click on the project to open it

### Step 2.3: Enable Billing

1. In left sidebar, click **"Billing"**
2. Click **"Link a billing account"**
3. If you don't have a billing account:
   - Click **"Create billing account"**
   - Add your credit card (won't charge until you exceed free tier)
   - Confirm
4. Link the billing account to your project
5. **Note:** Cloud Run is free for 2M requests/month, so won't charge you initially

### Step 2.4: Enable Required APIs

Run these commands in terminal (you'll do this in Phase 3, but good to know):

```bash
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
```

**✅ DONE: Google Cloud** — Project is ready for backend deployment.

---

## 3️⃣ SET UP FIREBASE (Frontend Hosting)

### Step 3.1: Create Firebase Project

1. Go to: https://console.firebase.google.com
2. Click **"Create a project"**
3. Fill in:
   - **Project name:** `kiosk-booking`
4. Click **"Continue"**
5. **Disable Google Analytics** (toggle off) — not needed for this app
6. Click **"Create project"**
7. **Wait 1 minute** for Firebase project to be created

### Step 3.2: Link to Google Cloud Project

1. After creation, you'll see dashboard
2. Go to **"Project settings"** (gear icon, top right)
3. Look for **"Google Cloud Platform (GCP)"** section
4. You should see a link to your GCP project
5. It should already be linked (Firebase uses the same GCP project)

### Step 3.3: Copy Firebase Project ID

1. In **Project settings**, look for **"Project ID"** (near top)
2. It should match your GCP Project ID: `kiosk-booking-12345`
3. **COPY THIS**

**✅ DONE: Firebase** — Frontend hosting is ready.

---

## 4️⃣ SET UP STRIPE (Payments - Optional for Initial Testing)

### Step 4.1: Create Stripe Account

1. Go to: https://dashboard.stripe.com
2. Click **"Sign up"**
3. Fill in your email and create password
4. Confirm email
5. Complete account setup (name, address, etc.)

### Step 4.2: Get Test Keys

1. After account created, you're in Stripe Dashboard
2. Make sure you're in **"Test mode"** (toggle in top left should show "Test")
3. Go to **"Developers"** → **"API keys"** (left sidebar)
4. You'll see two keys under "Standard keys":
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)
5. Click the **Secret key** row to expand
6. Click **"Copy"** to copy the secret key
7. **SAVE THIS** — format: `sk_test_XXXXXXXXXXXX...`

### Step 4.3: Get Webhook Secret (Optional, for later)

1. In **Developers**, click **"Webhooks"** (left sidebar)
2. Click **"Add endpoint"**
3. For now, skip this — you'll add it after Cloud Run deployment
4. When ready, you'll come back here and add webhook URL

**✅ DONE: Stripe** — Test payment keys ready (won't charge anything in test mode).

---

## 5️⃣ COLLECT YOUR CREDENTIALS

Open a text editor and save these values. You'll need them for deployment:

```
=== CREDENTIALS FOR DEPLOYMENT ===

NEON_CONNECTION_STRING:
postgresql://user:password@ep-xyz.neon.tech/dbname?sslmode=require

GCP_PROJECT_ID:
kiosk-booking-12345

FIREBASE_PROJECT_ID:
kiosk-booking-12345

STRIPE_SECRET_KEY (optional, use mock mode if you skip):
sk_test_XXXXXXXXXXXX...

ADMIN_TOKEN (I'll generate this during deployment):
(Will be generated)

FRONTEND_URL:
https://kiosk-booking-12345.firebaseapp.com
```

---

## 6️⃣ INSTALL REQUIRED CLIs

Run these in terminal one at a time:

### Install gcloud CLI

```bash
curl https://sdk.cloud.google.com | bash
```

After install completes, restart your terminal:
```bash
exec -l $SHELL
```

Verify:
```bash
gcloud --version
```

### Install Firebase CLI

```bash
npm install -g firebase-tools
```

Verify:
```bash
firebase --version
```

### Login to Google Cloud

```bash
gcloud auth login
```

This opens a browser — sign in with the same Google account you used for GCP/Firebase.

### Login to Firebase

```bash
firebase login
```

Again, sign in with same Google account.

---

## 7️⃣ READY FOR DEPLOYMENT

Once you've completed all steps above, you have:

✅ Neon PostgreSQL database (with connection string)  
✅ Google Cloud Project (with Project ID)  
✅ Firebase project (linked to GCP)  
✅ Stripe test keys (optional)  
✅ gcloud and firebase CLIs installed  
✅ Authenticated with Google and Firebase  

**Next:** Tell me you've completed these steps, and I'll deploy your backend and frontend live in 10 minutes.

---

## Common Issues

### "gcloud: command not found"
- Restart terminal after install: `exec -l $SHELL`
- Or open a new terminal window

### "Can't find my Project ID"
- In Google Cloud Console, look at top left dropdown (shows project name)
- Click dropdown, find your project
- Project ID is shown in gray text below project name

### "Firebase login not working"
- Make sure you're logged into GCP first: `gcloud auth login`
- Then try Firebase: `firebase login`
- Open a private/incognito browser window if login redirects fail

### "Neon connection string not showing"
- Go to: https://console.neon.tech
- Click your project
- Look for "Connection Details" on right side
- It's the long string starting with `postgresql://`

---

**Once you complete steps 1-7, reply and I'll guide you through actual deployment.**
