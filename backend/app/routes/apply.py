"""Public apply endpoints — no auth. Powers the hosted application form
that applicants land on after clicking a job link from Facebook (or anywhere).
"""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from ..config import settings
from ..db import get_supabase
from ..models.schemas import PublicApplication
from ..services.notify import send_email, send_sms
from ..services.screening import score_applicant

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/jobs/{job_id}")
def public_job(job_id: str):
    """Public job view — used by the apply page to render title + questions."""
    sb = get_supabase()
    job_res = sb.table("jobs").select("*").eq("id", job_id).single().execute()
    if not job_res.data:
        raise HTTPException(404, "job not found")
    job = job_res.data

    if job.get("status") not in ("active", "published", "draft"):
        # Closed/paused jobs shouldn't accept new applications.
        if job.get("status") in ("closed", "paused"):
            raise HTTPException(410, "this position is no longer accepting applications")

    questions_res = (
        sb.table("screening_questions")
        .select("*")
        .eq("job_id", job_id)
        .order("created_at")
        .execute()
    )
    return {
        "id": job["id"],
        "title": job["title"],
        "description": job.get("description"),
        "location": job.get("location"),
        "pay_range": job.get("pay_range"),
        "questions": [
            {
                "id": q["id"],
                "question": q["question"],
                "question_es": q.get("question_es"),
                "field_key": q["field_key"],
                "criteria_type": q["criteria_type"],
            }
            for q in (questions_res.data or [])
        ],
    }


@router.post("/apply", status_code=201)
def submit_application(payload: PublicApplication):
    sb = get_supabase()

    # Validate the job is real and accepting applications.
    job_res = sb.table("jobs").select("*").eq("id", payload.job_id).single().execute()
    if not job_res.data:
        raise HTTPException(404, "job not found")
    job = job_res.data
    if job.get("status") in ("closed", "paused"):
        raise HTTPException(410, "this position is no longer accepting applications")

    # Score against this job's screening questions.
    criteria_res = (
        sb.table("screening_questions")
        .select("*")
        .eq("job_id", payload.job_id)
        .execute()
    )
    score = score_applicant(payload.answers, criteria_res.data or [])

    insert_res = (
        sb.table("applicants")
        .insert(
            {
                "job_id": payload.job_id,
                "full_name": payload.full_name,
                "phone": payload.phone,
                "email": payload.email,
                "source": "hosted_form",
                "raw_lead_data": payload.answers,
                "score": score,
                "stage": "new",
            }
        )
        .execute()
    )
    applicant = insert_res.data[0] if insert_res.data else None
    if not applicant:
        raise HTTPException(500, "failed to record application")

    # Speed-to-lead auto-reply (bilingual based on the language they applied in).
    first_name = payload.full_name.split(" ")[0]
    if payload.lang == "es":
        auto_msg = (
            f"Hola {first_name}, gracias por aplicar al puesto de "
            f"{job['title']}. Nos comunicaremos pronto para coordinar una llamada breve."
        )
        email_subject = f"Recibimos tu solicitud — {job['title']}"
    else:
        auto_msg = (
            f"Hi {first_name}, thanks for applying to "
            f"{job['title']}. We'll be in touch shortly to schedule a quick chat."
        )
        email_subject = f"We got your application — {job['title']}"
    comms = []
    if payload.phone:
        sms_res = send_sms(payload.phone, auto_msg)
        comms.append(
            sb.table("communications")
            .insert(
                {
                    "applicant_id": applicant["id"],
                    "channel": "sms",
                    "direction": "outbound",
                    "body": auto_msg,
                    "status": sms_res.get("status"),
                    "provider_id": sms_res.get("provider_id"),
                }
            )
            .execute()
        )
    if payload.email:
        email_res = send_email(payload.email, email_subject, auto_msg)
        comms.append(
            sb.table("communications")
            .insert(
                {
                    "applicant_id": applicant["id"],
                    "channel": "email",
                    "direction": "outbound",
                    "body": auto_msg,
                    "status": email_res.get("status"),
                    "provider_id": email_res.get("provider_id"),
                }
            )
            .execute()
        )

    if comms:
        sb.table("applicants").update(
            {"last_contacted_at": datetime.now(timezone.utc).isoformat()}
        ).eq("id", applicant["id"]).execute()

    return {
        "ok": True,
        "applicant_id": applicant["id"],
        "score": score,
        "auto_reply_fired": len(comms) > 0,
        "apply_base": settings.public_apply_base,
    }
