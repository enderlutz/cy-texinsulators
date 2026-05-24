"""Meta Graph API client for fetching full Lead Ads payloads."""

import httpx

from ..config import settings

GRAPH_BASE = "https://graph.facebook.com/v21.0"


async def fetch_lead(leadgen_id: str) -> dict:
    """Hydrate a lead by ID using the page access token."""
    if not settings.meta_page_access_token:
        return {}
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(
            f"{GRAPH_BASE}/{leadgen_id}",
            params={"access_token": settings.meta_page_access_token},
        )
        r.raise_for_status()
        return r.json()
