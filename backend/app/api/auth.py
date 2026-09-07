"""
Authentication endpoints.

POST /api/auth/google    — Exchange Google access token for JWT (เดิม)
POST /api/auth/register  — สมัครสมาชิกด้วย username/password
POST /api/auth/login     — เข้าสู่ระบบด้วย username/password
GET  /api/auth/me        — Get current user info
POST /api/auth/activity  — Log user activity
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.config import get_settings
from app.schemas.user import GoogleTokenPayload, UserOut
from app.schemas.auth import RegisterRequest, LoginRequest, ActivityRequest, AuthResponse, UserResponse
from app.services.auth_service import google_login, register_user, login_user, create_token
from app.services import audit
from app.services.rate_limiter import login_rate_limiter
from app.middleware.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()
logger = logging.getLogger("api.auth")


def _client_ip(request: Request) -> str:
    """First hop from X-Forwarded-For if present, else the socket peer."""
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "-"


def _throttle(request: Request, username: str) -> None:
    """Per-IP + per-username sliding-window throttle (brute-force guard)."""
    ip = _client_ip(request)
    for key in (f"ip:{ip}", f"user:{(username or '').strip().lower()}"):
        allowed, retry_after = login_rate_limiter.hit(
            key, settings.RATE_LIMIT_ATTEMPTS, settings.RATE_LIMIT_WINDOW
        )
        if not allowed:
            raise HTTPException(
                status_code=429,
                detail=f"พยายามบ่อยเกินไป กรุณารอ {retry_after} วินาทีแล้วลองใหม่",
                headers={"Retry-After": str(retry_after)},
            )


# ── POST /api/auth/google (เดิม — ไม่แตะ) ────────────────────
@router.post("/google")
async def login_with_google(
    payload: GoogleTokenPayload,
    db: AsyncSession = Depends(get_db),
):
    """
    Exchange a Google OAuth access token for a platform JWT.
    Frontend sends the access_token obtained from Google Identity Services.
    Backend verifies it, creates/finds user, returns JWT.
    """
    try:
        result = await google_login(payload.access_token, db)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        logger.exception("google_login failed")
        raise HTTPException(status_code=500, detail="ยืนยันตัวตนไม่สำเร็จ กรุณาลองใหม่")


# ── POST /api/auth/register ───────────────────────────────────
@router.post("/register", response_model=AuthResponse)
async def register(body: RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """สมัครสมาชิกด้วย username / password / email / name / modules"""
    _throttle(request, body.username)
    try:
        user = await register_user(db, body)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Username หรือ Email นี้ถูกใช้แล้ว")

    token = create_token(user)
    return AuthResponse(
        success=True,
        token=token,
        user=UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            name=user.name,
            role=user.role.value,
            modules=user.modules_list(),
        ),
    )


# ── POST /api/auth/login ──────────────────────────────────────
@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """เข้าสู่ระบบด้วย username / password (ตรวจกับบัญชีที่ sign-up ไว้ใน SQLite)"""
    _throttle(request, body.username)
    ip = _client_ip(request)
    try:
        user = await login_user(db, body)
    except ValueError as e:
        audit.log_auth("login", username=body.username, ip=ip, status="invalid")
        raise HTTPException(status_code=401, detail=str(e))

    login_rate_limiter.reset(f"ip:{ip}")
    login_rate_limiter.reset(f"user:{(body.username or '').strip().lower()}")
    audit.log_auth("login", username=user.username, ip=ip, status="success")
    token = create_token(user)
    return AuthResponse(
        success=True,
        token=token,
        user=UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            name=user.name,
            role=user.role.value,
            modules=user.modules_list(),
        ),
    )


# ── GET /api/auth/me ────────────────────────────────────────
@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user)):
    """Return the currently authenticated user."""
    return user


# ── POST /api/auth/activity ───────────────────────────────────
@router.post("/activity")
async def log_activity(
    body: ActivityRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """
    Frontend เรียกทุกครั้งที่:
    - เปิดหน้าใหม่          → event_type="page_view",            page="/exercises"
    - ส่งโจทย์              → event_type="exercise_submit",       exercise_id=5, score=90
    - ใช้ hint              → event_type="hint_used",             note="hint #2"
    - เพิ่ม recommendation  → event_type="recommendation_added",  note="..."
    - logout               → event_type="logout"
    """
    # TODO: บันทึกลง activity_log table และ sync Google Sheets
    print(
        f"[activity] user={current_user.username} "
        f"event={body.event_type} page={body.page} "
        f"exercise={body.exercise_id} score={body.score}"
    )
    return {"success": True}