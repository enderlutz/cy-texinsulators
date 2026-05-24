"""Settings — Facebook integration credentials.

GET /settings/fb        — current connection status (never leaks the token)
POST /settings/fb        — connect/update; validates against Graph API before saving
POST /settings/fb/test   — re-validate the stored credentials
DELETE /settings/fb      — disconnect (clears the stored row)
"""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from ..config import settings as env_settings
from ..db import get_supabase
from ..models.schemas import FbConnectRequest, FbIntegrationStatus
from ..services.fb_post import get_active_credentials, verify_page_token

router = APIRouter(prefix="/settings", tags=["settings"])


def _read_db_row() -> dict | None:
    try:
        res = (
            get_supabase()
            .table("fb_integration")
            .select("*")
            .eq("id", "singleton")
            .single()
            .execute()
        )
        return res.data
    except Exception:
        return None


@router.get("/fb", response_model=FbIntegrationStatus)
def fb_status() -> FbIntegrationStatus:
    row = _read_db_row()
    if row:
        return FbIntegrationStatus(
            connected=True,
            page_id=row.get("page_id"),
            page_name=row.get("page_name"),
            connected_at=row.get("connected_at"),
            source="db",
        )
    if env_settings.meta_page_id and env_settings.meta_page_access_token:
        return FbIntegrationStatus(
            connected=True,
            page_id=env_settings.meta_page_id,
            page_name=None,
            source="env",
        )
    return FbIntegrationStatus(connected=False, source="none")


@router.post("/fb", response_model=FbIntegrationStatus)
async def fb_connect(payload: FbConnectRequest) -> FbIntegrationStatus:
    check = await verify_page_token(payload.page_id, payload.page_access_token)
    if not check.get("ok"):
        raise HTTPException(400, check.get("error") or "validation failed")

    sb = get_supabase()
    now = datetime.now(timezone.utc).isoformat()
    row_data = {
        "id": "singleton",
        "page_id": check.get("page_id") or payload.page_id,
        "page_name": check.get("page_name"),
        "page_access_token": payload.page_access_token,
        "connected_at": now,
        "updated_at": now,
    }
    existing = _read_db_row()
    if existing:
        sb.table("fb_integration").update(row_data).eq("id", "singleton").execute()
    else:
        sb.table("fb_integration").insert(row_data).execute()

    return FbIntegrationStatus(
        connected=True,
        page_id=row_data["page_id"],
        page_name=row_data["page_name"],
        connected_at=now,
        source="db",
    )


@router.post("/fb/test")
async def fb_test():
    creds = get_active_credentials()
    if not creds:
        raise HTTPException(404, "no Facebook integration configured")
    cred, source = creds
    check = await verify_page_token(cred["page_id"], cred["page_access_token"])
    return {**check, "source": source}


@router.delete("/fb", status_code=204)
def fb_disconnect():
    get_supabase().table("fb_integration").delete().eq("id", "singleton").execute()
    return None
