from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from ..config import settings
from ..db import get_supabase
from ..models.schemas import Job, JobCreate, JobUpdate, PublishRequest
from ..services.fb_post import publish_to_page

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=list[Job])
def list_jobs():
    res = get_supabase().table("jobs").select("*").order("created_at", desc=True).execute()
    return res.data or []


@router.post("", response_model=Job, status_code=201)
def create_job(payload: JobCreate):
    res = get_supabase().table("jobs").insert(payload.model_dump(exclude_none=True)).execute()
    if not res.data:
        raise HTTPException(500, "failed to create job")
    return res.data[0]


@router.get("/{job_id}", response_model=Job)
def get_job(job_id: str):
    res = get_supabase().table("jobs").select("*").eq("id", job_id).single().execute()
    if not res.data:
        raise HTTPException(404, "job not found")
    return res.data


@router.patch("/{job_id}", response_model=Job)
def update_job(job_id: str, payload: JobUpdate):
    data = payload.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(400, "no fields to update")
    res = get_supabase().table("jobs").update(data).eq("id", job_id).execute()
    if not res.data:
        raise HTTPException(404, "job not found")
    return res.data[0]


@router.delete("/{job_id}", status_code=204)
def delete_job(job_id: str):
    get_supabase().table("jobs").delete().eq("id", job_id).execute()
    return None


@router.get("/{job_id}/share")
def share_links(job_id: str):
    """Build the public apply URL + a copy-paste-ready message for cross-posting."""
    sb = get_supabase()
    res = sb.table("jobs").select("*").eq("id", job_id).single().execute()
    if not res.data:
        raise HTTPException(404, "job not found")
    job = res.data
    apply_url = f"{settings.public_apply_base.rstrip('/')}/apply/{job_id}"
    pieces = [f"🔨 We're hiring: {job['title']}"]
    if job.get("location"):
        pieces.append(f"📍 {job['location']}")
    if job.get("pay_range"):
        pieces.append(f"💰 {job['pay_range']}")
    if job.get("description"):
        pieces.append("")
        pieces.append(job["description"])
    pieces.append("")
    pieces.append(f"Apply in 2 minutes → {apply_url}")
    return {"apply_url": apply_url, "message": "\n".join(pieces)}


@router.post("/{job_id}/publish")
async def publish_job(job_id: str, payload: PublishRequest):
    """Publish job to the configured Facebook Page via Graph API."""
    sb = get_supabase()
    res = sb.table("jobs").select("*").eq("id", job_id).single().execute()
    if not res.data:
        raise HTTPException(404, "job not found")

    apply_url = payload.apply_url or (
        f"{settings.public_apply_base.rstrip('/')}/apply/{job_id}"
    )
    publish_res = await publish_to_page(payload.message, link=apply_url)

    update_data: dict = {"status": "active"}
    if publish_res.get("ok") or publish_res.get("mock"):
        update_data["fb_post_id"] = publish_res.get("post_id")
        update_data["fb_post_url"] = publish_res.get("post_url")
        update_data["published_at"] = datetime.now(timezone.utc).isoformat()
    sb.table("jobs").update(update_data).eq("id", job_id).execute()

    return publish_res
