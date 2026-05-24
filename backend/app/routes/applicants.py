from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from ..db import get_supabase
from ..models.schemas import (
    Applicant,
    ApplicantCreate,
    ApplicantUpdate,
    SendMessageRequest,
)
from ..services.notify import send_email, send_sms

router = APIRouter(prefix="/applicants", tags=["applicants"])


@router.get("", response_model=list[Applicant])
def list_applicants(
    job_id: str | None = Query(None),
    stage: str | None = Query(None),
):
    q = get_supabase().table("applicants").select("*").order("created_at", desc=True)
    if job_id:
        q = q.eq("job_id", job_id)
    if stage:
        q = q.eq("stage", stage)
    return q.execute().data or []


@router.post("", response_model=Applicant, status_code=201)
def create_applicant(payload: ApplicantCreate):
    res = (
        get_supabase()
        .table("applicants")
        .insert(payload.model_dump(exclude_none=True))
        .execute()
    )
    if not res.data:
        raise HTTPException(500, "failed to create applicant")
    return res.data[0]


@router.get("/{applicant_id}", response_model=Applicant)
def get_applicant(applicant_id: str):
    res = (
        get_supabase()
        .table("applicants")
        .select("*")
        .eq("id", applicant_id)
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(404, "applicant not found")
    return res.data


@router.patch("/{applicant_id}", response_model=Applicant)
def update_applicant(applicant_id: str, payload: ApplicantUpdate):
    data = payload.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(400, "no fields to update")
    res = (
        get_supabase()
        .table("applicants")
        .update(data)
        .eq("id", applicant_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(404, "applicant not found")
    return res.data[0]


@router.post("/{applicant_id}/messages", status_code=201)
def send_message(applicant_id: str, payload: SendMessageRequest):
    sb = get_supabase()
    applicant_res = (
        sb.table("applicants").select("*").eq("id", applicant_id).single().execute()
    )
    applicant = applicant_res.data
    if not applicant:
        raise HTTPException(404, "applicant not found")

    if payload.channel == "sms":
        if not applicant.get("phone"):
            raise HTTPException(400, "applicant has no phone")
        result = send_sms(applicant["phone"], payload.body)
    else:
        if not applicant.get("email"):
            raise HTTPException(400, "applicant has no email")
        result = send_email(
            applicant["email"], payload.subject or "Following up", payload.body
        )

    comm = (
        sb.table("communications")
        .insert(
            {
                "applicant_id": applicant_id,
                "channel": payload.channel,
                "direction": "outbound",
                "body": payload.body,
                "status": result.get("status"),
                "provider_id": result.get("provider_id"),
            }
        )
        .execute()
    )
    sb.table("applicants").update(
        {"last_contacted_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", applicant_id).execute()

    return {"communication": comm.data[0] if comm.data else None, "result": result}


@router.get("/{applicant_id}/communications")
def list_communications(applicant_id: str):
    res = (
        get_supabase()
        .table("communications")
        .select("*")
        .eq("applicant_id", applicant_id)
        .order("sent_at", desc=True)
        .execute()
    )
    return res.data or []
