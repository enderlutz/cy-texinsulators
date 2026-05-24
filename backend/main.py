from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import applicants, apply, jobs, screening, settings as settings_routes, webhooks

app = FastAPI(title="Cy-Tex Insulators Hiring API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(jobs.router)
app.include_router(applicants.router)
app.include_router(screening.router)
app.include_router(webhooks.router)
app.include_router(apply.router)
app.include_router(settings_routes.router)
