from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

Stage = Literal["new", "contacted", "interview", "hired", "rejected"]
JobStatus = Literal["draft", "active", "paused", "closed"]
CriteriaType = Literal["equals", "contains", "min", "max", "required"]


class JobCreate(BaseModel):
    title: str
    description: str | None = None
    location: str | None = None
    pay_range: str | None = None
    status: JobStatus = "draft"
    fb_page_id: str | None = None
    fb_lead_form_id: str | None = None


class JobUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    location: str | None = None
    pay_range: str | None = None
    status: JobStatus | None = None
    fb_page_id: str | None = None
    fb_lead_form_id: str | None = None


class Job(JobCreate):
    id: str
    fb_post_id: str | None = None
    fb_post_url: str | None = None
    published_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class PublishRequest(BaseModel):
    message: str
    apply_url: str | None = None


class PublicApplication(BaseModel):
    job_id: str
    full_name: str = Field(..., min_length=1)
    phone: str | None = None
    email: str | None = None
    answers: dict[str, str] = Field(default_factory=dict)


class ScreeningQuestionCreate(BaseModel):
    job_id: str
    question: str
    field_key: str
    criteria_type: CriteriaType
    criteria_value: str | None = None
    weight: int = 1


class ScreeningQuestion(ScreeningQuestionCreate):
    id: str
    created_at: datetime


class ApplicantCreate(BaseModel):
    job_id: str | None = None
    full_name: str | None = None
    phone: str | None = None
    email: str | None = None
    source: str = "manual"
    fb_lead_id: str | None = None
    raw_lead_data: dict[str, Any] | None = None
    score: int = 0
    stage: Stage = "new"
    notes: str | None = None


class ApplicantUpdate(BaseModel):
    stage: Stage | None = None
    notes: str | None = None
    score: int | None = None


class Applicant(ApplicantCreate):
    id: str
    created_at: datetime
    last_contacted_at: datetime | None = None


class Communication(BaseModel):
    id: str
    applicant_id: str
    channel: Literal["sms", "email"]
    direction: Literal["outbound", "inbound"]
    body: str
    status: str | None = None
    provider_id: str | None = None
    sent_at: datetime


class SendMessageRequest(BaseModel):
    channel: Literal["sms", "email"]
    body: str = Field(..., min_length=1)
    subject: str | None = None
