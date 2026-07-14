from fastapi import APIRouter, HTTPException

from ..db import get_supabase
from ..models.schemas import (
    CopyQuestionsRequest,
    ScreeningQuestion,
    ScreeningQuestionCreate,
)

router = APIRouter(prefix="/screening", tags=["screening"])

# Fields copied when cloning a question onto another job (everything except
# the row identity: id, job_id, created_at).
_COPYABLE_FIELDS = (
    "question",
    "question_es",
    "field_key",
    "criteria_type",
    "criteria_value",
    "weight",
)


@router.get("/job/{job_id}", response_model=list[ScreeningQuestion])
def list_for_job(job_id: str):
    res = (
        get_supabase()
        .table("screening_questions")
        .select("*")
        .eq("job_id", job_id)
        .order("created_at")
        .execute()
    )
    return res.data or []


@router.post("", response_model=ScreeningQuestion, status_code=201)
def create_question(payload: ScreeningQuestionCreate):
    res = (
        get_supabase()
        .table("screening_questions")
        .insert(payload.model_dump(exclude_none=True))
        .execute()
    )
    if not res.data:
        raise HTTPException(500, "failed to create screening question")
    return res.data[0]


@router.post("/copy")
def copy_questions(payload: CopyQuestionsRequest):
    """Clone all screening questions from one job onto another.

    Additive and non-destructive: it only inserts rows on the target job, and
    it skips any question whose field_key already exists there — so re-running
    never creates duplicates and it never modifies or deletes existing data.
    This is what lets an existing job act as a reusable template.
    """
    if payload.from_job_id == payload.to_job_id:
        raise HTTPException(400, "source and target jobs must be different")

    sb = get_supabase()
    source = (
        sb.table("screening_questions")
        .select("*")
        .eq("job_id", payload.from_job_id)
        .order("created_at")
        .execute()
        .data
        or []
    )
    existing = (
        sb.table("screening_questions")
        .select("field_key")
        .eq("job_id", payload.to_job_id)
        .execute()
        .data
        or []
    )
    existing_keys = {q["field_key"] for q in existing}

    copied = 0
    for q in source:
        if q["field_key"] in existing_keys:
            continue
        row = {"job_id": payload.to_job_id}
        for f in _COPYABLE_FIELDS:
            if q.get(f) is not None:
                row[f] = q[f]
        # Insert one row at a time so this works against both Supabase and the
        # local SQLite shim (the shim only accepts a single-row payload).
        sb.table("screening_questions").insert(row).execute()
        copied += 1

    return {"copied": copied, "skipped": len(source) - copied}


@router.delete("/{question_id}", status_code=204)
def delete_question(question_id: str):
    get_supabase().table("screening_questions").delete().eq("id", question_id).execute()
    return None
