"""Publish a job opening to a Facebook Page via Graph API.

Uses `POST /{page-id}/feed` which needs a Page Access Token with
`pages_manage_posts` scope. No App Review required for self-use.
"""

from typing import Any

import httpx

from ..config import settings

GRAPH_BASE = "https://graph.facebook.com/v21.0"


async def publish_to_page(message: str, link: str | None = None) -> dict[str, Any]:
    """Publish a feed post on the configured Facebook Page.

    Returns {ok, post_id, post_url} or a mock when creds are missing
    so local dev still shows the flow end-to-end.
    """
    if not (settings.meta_page_access_token and settings.meta_page_id):
        return {
            "ok": False,
            "mock": True,
            "post_id": f"mock_{abs(hash(message)) % 10_000_000}",
            "post_url": link or "",
            "message": "META_PAGE_ID / META_PAGE_ACCESS_TOKEN not configured — skipped real publish",
        }

    payload: dict[str, Any] = {
        "message": message,
        "access_token": settings.meta_page_access_token,
    }
    if link:
        payload["link"] = link

    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(
            f"{GRAPH_BASE}/{settings.meta_page_id}/feed", data=payload
        )
        r.raise_for_status()
        data = r.json()

    post_id = data.get("id", "")
    post_url = (
        f"https://www.facebook.com/{post_id.replace('_', '/posts/')}"
        if post_id
        else ""
    )
    return {"ok": True, "post_id": post_id, "post_url": post_url}
