from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import init_db
from .routes.scan import router as scan_router
from .routes.incidents import router as incidents_router
from .routes.feedback import router as feedback_router
from .routes.integrations import router as integrations_router
from .routes.actions import router as actions_router
from .routes.admin import router as admin_router
from .tasks import start_scheduler

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scan_router)
app.include_router(incidents_router)
app.include_router(feedback_router)
app.include_router(integrations_router)
app.include_router(actions_router)
app.include_router(admin_router)


@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.app_env}


@app.on_event("startup")
async def on_startup():
    await init_db()
    # start polling scheduler
    start_scheduler()
