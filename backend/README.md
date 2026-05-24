# Backend — Insulation Hiring API

FastAPI service. See `../README.md` for full deploy + setup.

## Routes
- `GET /health`
- `GET|POST|PATCH|DELETE /jobs`
- `GET|POST|PATCH /applicants` · `POST /applicants/{id}/messages` · `GET /applicants/{id}/communications`
- `GET|POST|DELETE /screening`
- `GET /webhooks/meta` (verification challenge)
- `POST /webhooks/meta` (lead intake from Facebook)

## Local
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

## Notes
- Supabase is accessed via the `service_role` key — backend-only, never expose to the frontend.
- Twilio / Resend calls are no-ops when their env vars are blank, so local dev works without them.
- Meta webhook verifies `X-Hub-Signature-256` when `META_APP_SECRET` is set.
