"""
ITS-SQL Platform — FastAPI Application Entry Point
"""

import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("app")

# Import routers
from app.api.auth import router as auth_router
from app.api.courses import router as courses_router
from app.api.problems import router as problems_router
from app.api.submissions import router as submissions_router
from app.api.dashboard import router as dashboard_router
from app.api.admin import router as admin_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup & shutdown events."""
    # ── Startup ──
    # Import models so SQLAlchemy registers them before create_all
    import app.models  # noqa: F401
    await init_db()
    # Seed the 3 fixed instructor accounts (idempotent).
    from app.seed import ensure_instructors
    await ensure_instructors()
    print(f"✅  {settings.APP_NAME} started — DB ready, instructors seeded")
    yield
    # ── Shutdown ──
    print(f"🛑  {settings.APP_NAME} shutting down")


app = FastAPI(
    title=settings.APP_NAME,
    description="Interactive Tutoring System for SQL — Backend API",
    version="1.0.0",
    # Swagger/ReDoc off in production — only enable by setting DEBUG=true.
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    # Exact origins only — no wildcard regex. A regex like
    # r"https://.*\.vercel\.app" would trust *any* stranger's Vercel
    # deployment as a credentialed origin. If preview deployments need
    # access, list each preview URL explicitly in FRONTEND_URL/here
    # rather than reintroducing a wildcard.
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost:8081",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)


# ── Request ID + global error trap ───────────────────────────────────
@app.middleware("http")
async def request_context(request: Request, call_next):
    """Tag every request with an id and convert any unhandled exception into a
    safe JSON 500 (no stack trace / internals leaked to the client)."""
    request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("Unhandled error request_id=%s path=%s", request_id, request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": "เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่", "request_id": request_id},
            headers={"X-Request-ID": request_id},
        )
    response.headers["X-Request-ID"] = request_id
    return response


# ── Routers ──────────────────────────────────────────────────────────
app.include_router(auth_router, prefix="/api")
app.include_router(courses_router, prefix="/api")
app.include_router(problems_router, prefix="/api")
app.include_router(submissions_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(admin_router, prefix="/api")


# ── Health Check ─────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}
