"""Local SQLite fallback that mimics the slice of supabase-py we use.

Activated automatically when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are blank,
so the same backend code path works locally and against real Supabase in prod.
"""

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parent.parent / "local.db"

_JSON_COLUMNS = {"raw_lead_data"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_row(row: sqlite3.Row) -> dict[str, Any]:
    d = dict(row)
    for col in _JSON_COLUMNS:
        if col in d and isinstance(d[col], str):
            try:
                d[col] = json.loads(d[col])
            except (json.JSONDecodeError, TypeError):
                pass
    return d


def _encode_payload(payload: dict[str, Any]) -> dict[str, Any]:
    out = dict(payload)
    for k, v in list(out.items()):
        if isinstance(v, (dict, list)):
            out[k] = json.dumps(v)
    return out


class _Result:
    def __init__(self, data):
        self.data = data


class _Query:
    def __init__(self, table_name: str):
        self.table = table_name
        self._op: str | None = None
        self._cols = "*"
        self._filters: list[tuple[str, Any]] = []
        self._order: tuple[str, bool] | None = None
        self._limit: int | None = None
        self._single = False
        self._payload: dict[str, Any] | None = None

    def select(self, cols: str = "*"):
        self._op = "select"
        self._cols = cols
        return self

    def eq(self, col: str, val: Any):
        self._filters.append((col, val))
        return self

    def order(self, col: str, desc: bool = False):
        self._order = (col, desc)
        return self

    def limit(self, n: int):
        self._limit = n
        return self

    def single(self):
        self._single = True
        return self

    def insert(self, payload: dict[str, Any]):
        self._op = "insert"
        self._payload = payload
        return self

    def update(self, payload: dict[str, Any]):
        self._op = "update"
        self._payload = payload
        return self

    def delete(self):
        self._op = "delete"
        return self

    def _where(self) -> tuple[str, list[Any]]:
        if not self._filters:
            return "", []
        clauses = []
        params: list[Any] = []
        for col, val in self._filters:
            clauses.append(f"{col} = ?")
            params.append(val)
        return " WHERE " + " AND ".join(clauses), params

    def execute(self) -> _Result:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        try:
            if self._op == "select":
                where, params = self._where()
                sql = f"SELECT {self._cols} FROM {self.table}{where}"
                if self._order:
                    col, desc = self._order
                    sql += f" ORDER BY {col} {'DESC' if desc else 'ASC'}"
                if self._single:
                    sql += " LIMIT 1"
                elif self._limit:
                    sql += f" LIMIT {self._limit}"
                cur.execute(sql, params)
                rows = [_parse_row(r) for r in cur.fetchall()]
                if self._single:
                    return _Result(data=rows[0] if rows else None)
                return _Result(data=rows)

            if self._op == "insert":
                payload = _encode_payload(self._payload or {})
                payload.setdefault("id", str(uuid.uuid4()))
                if self.table in ("jobs", "applicants", "screening_questions"):
                    payload.setdefault("created_at", _now())
                if self.table == "jobs":
                    payload.setdefault("updated_at", _now())
                if self.table == "communications":
                    payload.setdefault("sent_at", _now())
                cols = list(payload.keys())
                placeholders = ", ".join(["?"] * len(cols))
                sql = f"INSERT INTO {self.table} ({', '.join(cols)}) VALUES ({placeholders})"
                cur.execute(sql, [payload[c] for c in cols])
                conn.commit()
                cur.execute(
                    f"SELECT * FROM {self.table} WHERE id = ?", [payload["id"]]
                )
                row = cur.fetchone()
                return _Result(data=[_parse_row(row)] if row else [])

            if self._op == "update":
                payload = _encode_payload(self._payload or {})
                if self.table == "jobs":
                    payload["updated_at"] = _now()
                set_clause = ", ".join([f"{k} = ?" for k in payload.keys()])
                params = list(payload.values())
                where, where_params = self._where()
                params.extend(where_params)
                cur.execute(
                    f"UPDATE {self.table} SET {set_clause}{where}", params
                )
                conn.commit()
                cur.execute(f"SELECT * FROM {self.table}{where}", where_params)
                return _Result(data=[_parse_row(r) for r in cur.fetchall()])

            if self._op == "delete":
                where, params = self._where()
                cur.execute(f"DELETE FROM {self.table}{where}", params)
                conn.commit()
                return _Result(data=[])

            raise RuntimeError(f"unknown op: {self._op}")
        finally:
            conn.close()


class LocalClient:
    def table(self, name: str) -> _Query:
        return _Query(name)


_SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    pay_range TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    fb_page_id TEXT,
    fb_lead_form_id TEXT,
    fb_post_id TEXT,
    fb_post_url TEXT,
    published_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS screening_questions (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    question TEXT NOT NULL,
    field_key TEXT NOT NULL,
    criteria_type TEXT NOT NULL,
    criteria_value TEXT,
    weight INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS applicants (
    id TEXT PRIMARY KEY,
    job_id TEXT,
    full_name TEXT,
    phone TEXT,
    email TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    fb_lead_id TEXT UNIQUE,
    raw_lead_data TEXT,
    score INTEGER DEFAULT 0,
    stage TEXT NOT NULL DEFAULT 'new',
    notes TEXT,
    created_at TEXT NOT NULL,
    last_contacted_at TEXT
);

CREATE TABLE IF NOT EXISTS communications (
    id TEXT PRIMARY KEY,
    applicant_id TEXT NOT NULL,
    channel TEXT NOT NULL,
    direction TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT,
    provider_id TEXT,
    sent_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fb_integration (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL,
    page_name TEXT,
    page_access_token TEXT NOT NULL,
    connected_at TEXT,
    updated_at TEXT
);
"""


def init_local_db() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(_SCHEMA)
    conn.commit()
    conn.close()
