# Sunset Dental Dashboard — Deployment Guide

**Architecture**: Next.js app on Vercel → subdomain `dashboard.visioninfinity.co` → linked from WordPress

This is the cleanest, most maintainable approach. Your WordPress site stays untouched. The dashboard lives at its own URL, looks premium, and you can link or iframe it from any WordPress page.

---

## 1. Architecture Overview

```
WordPress (visioninfinity.co)
  └── "Client Dashboard" page → links to →  dashboard.visioninfinity.co

Vercel (dashboard.visioninfinity.co)
  └── Next.js app
        ├── /login          — password-protected login page
        ├── /dashboard      — main dashboard
        ├── /api/dashboard/stats  — computes KPI data
        └── /api/dashboard/leads  — returns filtered leads

Data source (choose one):
  A. Google Sheets  (via Service Account — recommended for live)
  B. Local JSON     (data/dashboard-data.json — works immediately)
  C. n8n webhooks   (when you set DASHBOARD_STATS_URL + DASHBOARD_LEADS_URL)
```

---

## 2. One-time setup (15 minutes)

### Step 1 — Push code to GitHub

1. Create a new GitHub repo (private): `sunset-dental-dashboard`
2. Push this folder to it:
   ```bash
   git init
   git add .
   git commit -m "initial dashboard"
   git remote add origin https://github.com/YOUR_USERNAME/sunset-dental-dashboard.git
   git push -u origin main
   ```

### Step 2 — Deploy to Vercel

1. Go to https://vercel.com → New Project
2. Import your GitHub repo
3. Vercel auto-detects Next.js — click **Deploy**
4. Your app is live at `something.vercel.app`

### Step 3 — Connect your domain

1. In Vercel project → **Settings → Domains**
2. Add: `dashboard.visioninfinity.co`
3. In your domain registrar / DNS panel, add a CNAME:
   ```
   Name:   dashboard
   Value:  cname.vercel-dns.com
   TTL:    300
   ```
4. Vercel auto-provisions SSL. Wait 2–5 minutes.

---

## 3. Environment variables (Vercel dashboard)

Go to **Vercel → Project → Settings → Environment Variables** and add:

### Required (always)

| Variable | Value | Notes |
|---|---|---|
| `DEMO_PASSWORD` | `sunset2026` (change this!) | Password for demo login |

### For live Google Sheets data

| Variable | Value | Notes |
|---|---|---|
| `GOOGLE_SHEET_ID` | `1WGicqRvnyXm0k9LDrgoiv60LXfJcF5oC6ulHcPwmp68` | Your sheet ID |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `dashboard@your-project.iam.gserviceaccount.com` | From GCP |
| `GOOGLE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...` | From GCP JSON key |

### For Supabase Auth (recommended before sharing with client)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` |

### For n8n webhooks (optional, overrides Google Sheets)

| Variable | Value |
|---|---|
| `DASHBOARD_STATS_URL` | `https://your-n8n/webhook/dashboard-stats` |
| `DASHBOARD_LEADS_URL` | `https://your-n8n/webhook/dashboard-leads` |

---

## 4. Setting up Google Sheets access (for live data)

### Step A — Create a Google Cloud Service Account

1. Go to https://console.cloud.google.com
2. Create a new project (e.g., "Sunset Dental Dashboard")
3. Enable **Google Sheets API**: APIs & Services → Enable APIs → search "Sheets"
4. Go to **IAM & Admin → Service Accounts** → Create Service Account
   - Name: `dashboard-reader`
   - Role: Viewer (or no role needed)
5. Click on the service account → **Keys → Add Key → JSON**
6. Download the JSON file

### Step B — Share your Google Sheet

1. Open your Google Sheet
2. Click **Share**
3. Add the service account email (from the JSON file, `client_email` field)
4. Give it **Viewer** access

### Step C — Add to Vercel env vars

From the downloaded JSON file, copy:
- `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → `GOOGLE_PRIVATE_KEY` (keep the full key including `\n` characters)

**Important**: In Vercel, paste the private key exactly as-is. Vercel handles multiline values.

### Step D — Name your sheets correctly

Your Google Sheet tabs must be named exactly:
- `leads`
- `chat_log`
- `appointments`

---

## 5. WordPress integration

### Option A — Simple link (recommended)

Add a button/link anywhere in WordPress that opens the dashboard:

```html
<a href="https://dashboard.visioninfinity.co" 
   target="_blank" 
   class="wp-block-button__link">
   View Client Dashboard →
</a>
```

### Option B — Embed via iframe

Add a Custom HTML block in WordPress:

```html
<iframe 
  src="https://dashboard.visioninfinity.co/dashboard"
  width="100%"
  height="900px"
  frameborder="0"
  style="border-radius: 12px; border: 1px solid #e5e5e5;"
></iframe>
```

Note: The login screen will show inside the iframe on first visit. Some browsers block cookies in iframes — Option A (simple link) is more reliable.

### Option C — WordPress menu item

Go to WordPress → Appearance → Menus → Add Custom Link:
- URL: `https://dashboard.visioninfinity.co`
- Label: `Client Dashboard`

---

## 6. Setting up Supabase Auth (before sharing with client)

1. Go to https://supabase.com → New Project
2. Go to **Authentication → Users → Invite User**
3. Enter the client's email (e.g., `owner@sunsetdental.com`)
4. They get an email to set their password
5. Add your Supabase URL and anon key to Vercel env vars
6. Redeploy (`git push` triggers auto-redeploy on Vercel)

The demo password login is disabled once Supabase keys are configured.

---

## 7. Updating local data snapshot

When you want to refresh the local fallback data from your Excel workbook:

```bash
# With the default workbook path:
python scripts/export_dashboard_seed.py

# Or with a downloaded copy:
python scripts/export_dashboard_seed.py "C:\Users\Muhammad Awais\Downloads\Sunset Dental Care — Bot Database (5).xlsx"
```

Then commit and push → Vercel redeploys automatically.

---

## 8. Missing Google Sheet fields (high-impact additions)

To make the dashboard answer "Which marketing source is performing best?", these fields are currently missing or empty in your sheet:

### High priority — add these to `leads` sheet

| Column name | Example values | Why it matters |
|---|---|---|
| `source_channel` | `whatsapp`, `facebook`, `google`, `organic` | Show which channel drives most leads |
| `source_campaign` | `ramadan_promo_2026`, `brackets_ad` | Identify best campaigns |
| `stage` (normalized) | `new`, `interested`, `booked`, `visited`, `lost` | Pipeline funnel chart |
| `appointment_status` | `booked`, `visited`, `no_show`, `cancelled` | Track show rate |
| `outcome` | `closed`, `ghosted`, `rescheduled` | Final disposition |

### Medium priority — add to `appointments` sheet

| Column name | Example values | Why it matters |
|---|---|---|
| `outcome_notes` | `showed up`, `no-show`, `rescheduled` | Actual visit tracking |
| `confirmed_at` | ISO timestamp | When confirmation was received |

### Currently working well ✓

- `lead_score`, `intent_level`, `treatment_type`, `conversation_summary`
- `last_message`, `last_interaction_at`, `appointment_slot_iso`
- `current_handler`, `handoff_status`, `language`
- All `chat_log` fields

---

## 9. Checklist before sharing with client

- [ ] Change `DEMO_PASSWORD` to something strong
- [ ] Set up Supabase Auth and invite client email
- [ ] Connect live Google Sheets data (or keep local snapshot)
- [ ] Test login at `https://dashboard.visioninfinity.co/login`
- [ ] Add WordPress link/button to the dashboard URL
- [ ] Optionally customize the client's email in sidebar

---

## 10. Folder structure

```
sunset-dental-dashboard/
├── data/
│   └── dashboard-data.json      ← local data snapshot (fallback)
├── scripts/
│   └── export_dashboard_seed.py ← refresh local snapshot from Excel
├── src/
│   ├── app/
│   │   ├── layout.js            ← fonts, metadata
│   │   ├── page.js              ← redirects / → /dashboard
│   │   ├── login/
│   │   │   └── page.jsx         ← login page
│   │   ├── dashboard/
│   │   │   └── page.jsx         ← main dashboard (KPIs, chart, table)
│   │   └── api/
│   │       ├── auth/route.js    ← demo login/logout endpoint
│   │       └── dashboard/
│   │           ├── stats/route.js  ← KPI + trend data API
│   │           └── leads/route.js  ← filtered leads API
│   ├── lib/
│   │   ├── data.js              ← Google Sheets + local fallback
│   │   ├── dashboard-utils.js   ← filter + compute logic
│   │   ├── demo-auth.js         ← cookie-based demo session
│   │   └── supabase-browser.js  ← Supabase client (optional)
│   └── styles/
│       └── globals.css          ← all design tokens + component styles
├── middleware.js                 ← auth guard for /dashboard/*
├── next.config.js
├── package.json
├── jsconfig.json
└── .env.example
```
