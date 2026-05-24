# Insulation Hiring Platform

Hiring dashboard for a Houston insulation company. Receives applicants from Facebook Lead Ads via webhook, runs screening rules, fires SMS/email auto-replies, and tracks them through a kanban pipeline.

## Stack

| Layer    | Tech                                           | Deploys to |
| -------- | ---------------------------------------------- | ---------- |
| Frontend | React + Vite + TypeScript + shadcn/ui + Tailwind | Vercel     |
| Backend  | FastAPI + Pydantic v2                          | Railway    |
| Database | Supabase Postgres                              | Supabase   |
| Messaging| Twilio (SMS) + Resend (email)                  | —          |
| Ingest   | Meta Graph API — Lead Ads webhooks             | —          |

## Local dev

### 1. Database (Supabase)
1. Create a project at https://supabase.com
2. SQL editor → paste `backend/supabase/schema.sql` → run
3. Project settings → API → copy `URL` and `service_role` key

### 2. Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # fill in SUPABASE_* and (optionally) Twilio/Resend/Meta
uvicorn main:app --reload --port 8000
```

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env       # VITE_API_URL=http://localhost:8000
npm run dev                # http://localhost:5173
```

## Deployment

### Backend → Railway
1. New Project → Deploy from GitHub repo → set **root directory** to `backend/`
2. Variables tab — add everything from `backend/.env.example`
3. Railway auto-detects Nixpacks; `railway.json` defines the start command
4. Settings → Networking → "Generate Domain" to get a public URL
5. Health check: `https://<your-domain>/health`

### Frontend → Vercel
1. New Project → import repo → set **root directory** to `frontend/`
2. Framework: Vite (auto-detected via `vercel.json`)
3. Environment variable: `VITE_API_URL=https://<railway-domain>`
4. Deploy

### Connect them
After both are live, update Railway's `FRONTEND_ORIGIN` env var to your Vercel domain so CORS works.

## Facebook Lead Ads setup

1. Create a Meta App at https://developers.facebook.com → add **Webhooks** + **Marketing API** products
2. Connect the company Facebook Page; grant `leads_retrieval` + `pages_manage_metadata` + `pages_show_list` permissions
3. Generate a long-lived **Page Access Token** → set as `META_PAGE_ACCESS_TOKEN` in Railway
4. App Dashboard → Webhooks → Page → subscribe to `leadgen` field
   - Callback URL: `https://<railway-domain>/webhooks/meta`
   - Verify token: matches `META_VERIFY_TOKEN`
5. App settings → copy **App Secret** → set as `META_APP_SECRET` (used to verify signatures)
6. Create a Lead Ad in Ads Manager → grab the Lead Form ID → paste into a Job row's `fb_lead_form_id`
7. Test with Meta's Lead Ads Testing Tool: https://developers.facebook.com/tools/lead-ads-testing

## v1 scope (this scaffold)
- Receive applicants from FB Lead Ads → applicants table
- Screening rules per job → auto-score on intake
- Kanban pipeline: new → contacted → interview → hired/rejected
- Send SMS (Twilio) + email (Resend) from applicant page; logged to communications table

## v2 (paid upgrade)
- Publish/edit Lead Ads directly from the dashboard via Marketing API
- Multi-board posting (Indeed XML feed, ZipRecruiter partner API)
- Automated SMS sequences (drip)
- Multi-tenant — multiple companies on one install
