-- Cy-Tex Insulators Hiring Platform — Supabase schema
-- Run this in the Supabase SQL editor.
-- Uses gen_random_uuid() (pgcrypto, pre-enabled on Supabase) — no extensions to enable.

-- ============================================================================
-- jobs: a hiring posting owned by the company
-- ============================================================================
create table if not exists jobs (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  location        text,
  pay_range       text,
  status          text not null default 'draft' check (status in ('draft','active','paused','closed')),
  fb_page_id      text,
  fb_lead_form_id text,
  fb_post_id      text,
  fb_post_url     text,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================================
-- screening_questions: per-job filter criteria applied to incoming applicants
-- ============================================================================
create table if not exists screening_questions (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references jobs(id) on delete cascade,
  question      text not null,
  field_key     text not null,
  criteria_type text not null check (criteria_type in ('equals','contains','min','max','required')),
  criteria_value text,
  weight        int not null default 1,
  created_at    timestamptz not null default now()
);

-- ============================================================================
-- applicants: every lead that comes in (FB Lead Ads webhook, manual, etc.)
-- ============================================================================
create table if not exists applicants (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid references jobs(id) on delete set null,
  full_name       text,
  phone           text,
  email           text,
  source          text not null default 'facebook_lead_ads',
  fb_lead_id      text unique,
  raw_lead_data   jsonb,
  score           int default 0,
  stage           text not null default 'new' check (stage in ('new','contacted','interview','hired','rejected')),
  notes           text,
  created_at      timestamptz not null default now(),
  last_contacted_at timestamptz
);

create index if not exists idx_applicants_job on applicants(job_id);
create index if not exists idx_applicants_stage on applicants(stage);
create index if not exists idx_applicants_created on applicants(created_at desc);

-- ============================================================================
-- communications: SMS and email log per applicant
-- ============================================================================
create table if not exists communications (
  id           uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references applicants(id) on delete cascade,
  channel      text not null check (channel in ('sms','email')),
  direction    text not null check (direction in ('outbound','inbound')),
  body         text not null,
  status       text default 'queued',
  provider_id  text,
  sent_at      timestamptz not null default now()
);

create index if not exists idx_communications_applicant on communications(applicant_id);

-- ============================================================================
-- fb_integration: singleton row holding the connected Facebook Page credentials
-- Replaces env-var-based META_PAGE_ID / META_PAGE_ACCESS_TOKEN (still supported as fallback).
-- ============================================================================
create table if not exists fb_integration (
  id                text primary key default 'singleton' check (id = 'singleton'),
  page_id           text not null,
  page_name         text,
  page_access_token text not null,
  connected_at      timestamptz default now(),
  updated_at        timestamptz default now()
);

alter table fb_integration enable row level security;

-- ============================================================================
-- RLS: service-role only for v1 (backend talks via service_role key).
-- When we add multi-tenant auth, replace with per-org policies.
-- ============================================================================
alter table jobs enable row level security;
alter table screening_questions enable row level security;
alter table applicants enable row level security;
alter table communications enable row level security;

-- updated_at trigger for jobs
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_jobs_updated_at on jobs;
create trigger trg_jobs_updated_at
  before update on jobs
  for each row execute function set_updated_at();
