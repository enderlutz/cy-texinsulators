"""Meta (Facebook) Lead Ads webhook endpoints.

Setup in Meta App dashboard:
  - Subscribe Page to `leadgen` field
  - Callback URL: https://<railway-domain>/webhooks/meta
  - Verify token: matches META_VERIFY_TOKEN env var
"""

import hashlib
import hmac

from fastapi import APIRouter, HTTPException, Query, Request

from ..config import settings
from ..db import get_supabase
from ..services.meta import fetch_lead
from ..services.screening import flatten_field_data, score_applicant

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.get("/meta")
def verify_meta(
    mode: str = Query(..., alias="hub.mode"),
    token: str = Query(..., alias="hub.verify_token"),
    challenge: str = Query(..., alias="hub.challenge"),
):
    if mode == "subscribe" and token == settings.meta_verify_token:
        return int(challenge)
    raise HTTPException(403, "verification failed")


def _verify_signature(app_secret: str, body: bytes, header: str | None) -> bool:
    if not app_secret or not header:
        return False
    expected = "sha256=" + hmac.new(
        app_secret.encode(), body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, header)


@router.post("/meta")
async def receive_meta_lead(request: Request):
    raw = await request.body()
    sig = request.headers.get("X-Hub-Signature-256")
    if settings.meta_app_secret and not _verify_signature(
        settings.meta_app_secret, raw, sig
    ):
        raise HTTPException(401, "invalid signature")

    payload = await request.json()
    sb = get_supabase()

    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            if change.get("field") != "leadgen":
                continue
            value = change.get("value", {})
            leadgen_id = value.get("leadgen_id")
            form_id = value.get("form_id")
            if not leadgen_id:
                continue

            # Skip if we've seen this lead already.
            existing = (
                sb.table("applicants")
                .select("id")
                .eq("fb_lead_id", leadgen_id)
                .execute()
            )
            if existing.data:
                continue

            # Hydrate from Graph API.
            full = await fetch_lead(leadgen_id)
            fields = flatten_field_data(full.get("field_data", []))

            # Find the job that owns this lead form.
            job_row = (
                sb.table("jobs")
                .select("id")
                .eq("fb_lead_form_id", form_id)
                .limit(1)
                .execute()
            )
            job_id = job_row.data[0]["id"] if job_row.data else None

            # Score against this job's screening questions.
            score = 0
            if job_id:
                criteria_res = (
                    sb.table("screening_questions")
                    .select("*")
                    .eq("job_id", job_id)
                    .execute()
                )
                score = score_applicant(fields, criteria_res.data or [])

            sb.table("applicants").insert(
                {
                    "job_id": job_id,
                    "full_name": fields.get("full_name") or fields.get("name"),
                    "phone": fields.get("phone_number") or fields.get("phone"),
                    "email": fields.get("email"),
                    "source": "facebook_lead_ads",
                    "fb_lead_id": leadgen_id,
                    "raw_lead_data": fields,
                    "score": score,
                    "stage": "new",
                }
            ).execute()

    return {"ok": True}
