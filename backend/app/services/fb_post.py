"""Publish a job opening to a Facebook Page via Graph API.

Credentials are resolved in this order:
  1. Supabase `fb_integration` row  (set via Settings UI)
  2. `META_PAGE_ID` + `META_PAGE_ACCESS_TOKEN` env vars  (legacy fallback)
  3. None → mock mode so local dev still demos end-to-end
"""

from typing import Any

import httpx

from ..config import settings
from ..db import get_supabase

GRAPH_BASE = "https://graph.facebook.com/v21.0"


def get_active_credentials() -> tuple[dict, str] | None:
    """Return ({page_id, page_access_token, page_name?}, source) or None."""
    try:
        sb = get_supabase()
        res = (
            sb.table("fb_integration")
            .select("*")
            .eq("id", "singleton")
            .single()
            .execute()
        )
        if res.data:
            row = res.data
            return (
                {
                    "page_id": row["page_id"],
                    "page_access_token": row["page_access_token"],
                    "page_name": row.get("page_name"),
                    "connected_at": row.get("connected_at"),
                },
                "db",
            )
    except Exception:
        pass

    if settings.meta_page_id and settings.meta_page_access_token:
        return (
            {
                "page_id": settings.meta_page_id,
                "page_access_token": settings.meta_page_access_token,
                "page_name": None,
                "connected_at": None,
            },
            "env",
        )
    return None


async def verify_page_token(page_id: str, page_access_token: str) -> dict:
    """Validate credentials by calling Graph API. Returns {ok, page_name?, error?}."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(
            f"{GRAPH_BASE}/{page_id}",
            params={"access_token": page_access_token, "fields": "id,name"},
        )
    if r.status_code != 200:
        try:
            err = r.json().get("error", {}).get("message", "validation failed")
        except Exception:
            err = "validation failed"
        return {"ok": False, "error": err}
    data = r.json()
    return {"ok": True, "page_name": data.get("name"), "page_id": data.get("id")}


async def publish_to_page(message: str, link: str | None = None) -> dict[str, Any]:
    """Publish a feed post on the configured Facebook Page."""
    creds = get_active_credentials()
    if not creds:
        return {
            "ok": False,
            "mock": True,
            "post_id": f"mock_{abs(hash(message)) % 10_000_000}",
            "post_url": link or "",
            "message": "No Facebook Page connected — open Settings to connect one",
        }

    cred, source = creds
    payload: dict[str, Any] = {
        "message": message,
        "access_token": cred["page_access_token"],
    }
    if link:
        payload["link"] = link

    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(
            f"{GRAPH_BASE}/{cred['page_id']}/feed", data=payload
        )
        if r.status_code != 200:
            try:
                err = r.json().get("error", {}).get("message", "publish failed")
            except Exception:
                err = "publish failed"
            return {"ok": False, "error": err, "source": source}
        data = r.json()

    post_id = data.get("id", "")
    post_url = (
        f"https://www.facebook.com/{post_id.replace('_', '/posts/')}"
        if post_id
        else ""
    )
    return {"ok": True, "post_id": post_id, "post_url": post_url, "source": source}
