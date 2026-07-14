"""Seed the running backend with a sample job + screening rules + a few applicants.

Usage:
    # In one terminal:
    uvicorn main:app --reload --port 8000
    # In another:
    python seed.py
"""

import json
import sys
import time

import httpx

API = "http://localhost:8001"


def wait_for_api() -> None:
    for _ in range(20):
        try:
            r = httpx.get(f"{API}/health", timeout=1.0)
            if r.status_code == 200:
                return
        except httpx.HTTPError:
            pass
        time.sleep(0.5)
    print("backend never became healthy", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    wait_for_api()

    # Screening questions shared by both installer roles.
    screening = [
        {"question": "Do you have your own truck?", "field_key": "has_truck",
         "criteria_type": "equals", "criteria_value": "yes", "weight": 3},
        {"question": "Years of construction experience?", "field_key": "experience_years",
         "criteria_type": "min", "criteria_value": "1", "weight": 2},
        {"question": "Can you lift 50 lbs?", "field_key": "can_lift",
         "criteria_type": "equals", "criteria_value": "yes", "weight": 2},
        {"question": "Phone number", "field_key": "phone_number",
         "criteria_type": "required", "weight": 1},
    ]

    def create_job(payload: dict) -> dict:
        created = httpx.post(f"{API}/jobs", json=payload, timeout=5.0).json()
        print(f"created job {created['id']} — {payload['title']}")
        for q in screening:
            httpx.post(f"{API}/screening", json={"job_id": created["id"], **q}, timeout=5.0)
        return created

    # Job #1 — the original spray-foam / batt installer posting.
    job = create_job({
        "title": "Insulation Installer",
        "description": "Spray-foam + batt installer for residential homes. Houston area.",
        "location": "Houston, TX",
        "pay_range": "$22-30/hr + overtime",
        "status": "active",
        "fb_lead_form_id": "DEMO_FORM_123",
    })

    # Job #2 — blow-in + remediation crew (they hire across all service types).
    create_job({
        "title": "Insulation Installer (Blow-In & Remediation)",
        "description": "Blow-in insulation and full remediations. Houston area.",
        "location": "Houston, TX",
        "pay_range": "$22-30/hr + overtime",
        "status": "active",
    })
    print("added screening questions to both jobs")

    applicants = [
        {
            "full_name": "Carlos Mendoza", "phone": "+17135551234",
            "email": "carlos.m@example.com", "source": "facebook_lead_ads",
            "stage": "new", "score": 8,
            "raw_lead_data": {
                "has_truck": "yes", "experience_years": "5",
                "can_lift": "yes", "phone_number": "+17135551234",
            },
        },
        {
            "full_name": "Jamal Williams", "phone": "+12815559876",
            "email": "jwilliams@example.com", "source": "facebook_lead_ads",
            "stage": "new", "score": 6,
            "raw_lead_data": {
                "has_truck": "no", "experience_years": "3",
                "can_lift": "yes", "phone_number": "+12815559876",
            },
        },
        {
            "full_name": "Maria Gonzalez", "phone": "+18325554567",
            "email": "mariag@example.com", "source": "facebook_lead_ads",
            "stage": "contacted", "score": 8,
            "raw_lead_data": {
                "has_truck": "yes", "experience_years": "2",
                "can_lift": "yes", "phone_number": "+18325554567",
            },
        },
        {
            "full_name": "Tyrone Davis", "phone": "+17139998888",
            "email": "tyrone.d@example.com", "source": "facebook_lead_ads",
            "stage": "interview", "score": 7,
            "raw_lead_data": {
                "has_truck": "yes", "experience_years": "4",
                "can_lift": "yes", "phone_number": "+17139998888",
            },
        },
        {
            "full_name": "Brandon Lee", "phone": "+18329995555",
            "email": "blee@example.com", "source": "facebook_lead_ads",
            "stage": "new", "score": 3,
            "raw_lead_data": {
                "has_truck": "no", "experience_years": "0",
                "can_lift": "yes", "phone_number": "+18329995555",
            },
        },
    ]
    for a in applicants:
        httpx.post(
            f"{API}/applicants",
            json={"job_id": job["id"], **a},
            timeout=5.0,
        )
    print(f"created {len(applicants)} sample applicants")
    print("\ndone — open http://localhost:5173")


if __name__ == "__main__":
    main()
