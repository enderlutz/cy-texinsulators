from .config import settings

_client = None


def get_supabase():
    """Return Supabase client if configured, else a local-SQLite shim with the same API."""
    global _client
    if _client is not None:
        return _client

    if settings.supabase_url and settings.supabase_service_role_key:
        from supabase import create_client

        _client = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )
    else:
        from .db_local import LocalClient, init_local_db

        init_local_db()
        _client = LocalClient()
        print("[db] running in local SQLite mode — set SUPABASE_URL to switch to Postgres")
    return _client
