from fastapi import APIRouter, HTTPException

from ..db import get_supabase
from ..models.schemas import ScreeningQuestion, ScreeningQuestionCreate

router = APIRouter(prefix="/screening", tags=["screening"])


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


@router.delete("/{question_id}", status_code=204)
def delete_question(question_id: str):
    get_supabase().table("screening_questions").delete().eq("id", question_id).execute()
    return None
