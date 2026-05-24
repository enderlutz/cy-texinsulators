const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`${r.status} ${r.statusText}: ${text}`);
  }
  if (r.status === 204) return undefined as T;
  return r.json();
}

export type Stage = "new" | "contacted" | "interview" | "hired" | "rejected";
export type JobStatus = "draft" | "active" | "paused" | "closed";

export interface Job {
  id: string;
  title: string;
  description?: string;
  location?: string;
  pay_range?: string;
  status: JobStatus;
  fb_page_id?: string;
  fb_lead_form_id?: string;
  fb_post_id?: string;
  fb_post_url?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PublicJob {
  id: string;
  title: string;
  description?: string;
  location?: string;
  pay_range?: string;
  questions: {
    id: string;
    question: string;
    field_key: string;
    criteria_type: string;
  }[];
}

export interface ShareLinks {
  apply_url: string;
  message: string;
}

export interface Applicant {
  id: string;
  job_id?: string;
  full_name?: string;
  phone?: string;
  email?: string;
  source: string;
  score: number;
  stage: Stage;
  notes?: string;
  raw_lead_data?: Record<string, string>;
  created_at: string;
  last_contacted_at?: string;
}

export const api = {
  listJobs: () => request<Job[]>("/jobs"),
  createJob: (payload: Partial<Job>) =>
    request<Job>("/jobs", { method: "POST", body: JSON.stringify(payload) }),
  updateJob: (id: string, payload: Partial<Job>) =>
    request<Job>(`/jobs/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteJob: (id: string) => request<void>(`/jobs/${id}`, { method: "DELETE" }),

  listApplicants: (params?: { job_id?: string; stage?: Stage }) => {
    const q = new URLSearchParams();
    if (params?.job_id) q.set("job_id", params.job_id);
    if (params?.stage) q.set("stage", params.stage);
    const s = q.toString();
    return request<Applicant[]>(`/applicants${s ? `?${s}` : ""}`);
  },
  getApplicant: (id: string) => request<Applicant>(`/applicants/${id}`),
  updateApplicant: (id: string, payload: Partial<Applicant>) =>
    request<Applicant>(`/applicants/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  sendMessage: (
    id: string,
    payload: { channel: "sms" | "email"; body: string; subject?: string }
  ) =>
    request<{ result: { status: string } }>(`/applicants/${id}/messages`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  shareLinks: (job_id: string) => request<ShareLinks>(`/jobs/${job_id}/share`),
  publishJob: (job_id: string, message: string, apply_url?: string) =>
    request<{ ok: boolean; mock?: boolean; post_id: string; post_url: string; message?: string }>(
      `/jobs/${job_id}/publish`,
      { method: "POST", body: JSON.stringify({ message, apply_url }) }
    ),

  publicJob: (job_id: string) => request<PublicJob>(`/public/jobs/${job_id}`),
  submitApplication: (payload: {
    job_id: string;
    full_name: string;
    phone?: string;
    email?: string;
    answers: Record<string, string>;
  }) =>
    request<{ ok: boolean; applicant_id: string; score: number }>(`/public/apply`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export const STAGES: Stage[] = ["new", "contacted", "interview", "hired", "rejected"];
