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
from app.services.auth_service import google_login, register_user, login_user, ldap_login_user, create_token
from app.services import ldap_service, audit
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
            key, settings.LDAP_RATE_LIMIT, settings.LDAP_RATE_WINDOW
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
        result = await google_login(payload.access_token, db, requested_role=payload.role)
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
    """เข้าสู่ระบบด้วย username / password"""
    _throttle(request, body.username)
    try:
        user = await login_user(db, body)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

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


# ── POST /api/auth/ldap-login ─────────────────────────────────
# Statuses mapped to safe, user-facing messages (no server internals leaked).
_LDAP_403 = (
    ldap_service.LdapAccountDisabled,
    ldap_service.LdapAccountLocked,
    ldap_service.LdapPasswordExpired,
    ldap_service.LdapMustResetPassword,
    ldap_service.LdapLoginNotPermitted,
)
_LDAP_503 = (ldap_service.LdapUnavailable, ldap_service.LdapConfigError)


@router.post("/ldap-login", response_model=AuthResponse)
async def ldap_login(body: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """เข้าสู่ระบบผ่าน Active Directory / LDAP (2-step service bind)."""
    if not settings.LDAP_ENABLED:
        raise HTTPException(status_code=503, detail="ระบบ LDAP ปิดใช้งานอยู่")

    ip = _client_ip(request)
    username = (body.username or "").strip()

    # ── Rate limiting: per IP AND per username (brute-force / AD-lockout guard) ──
    for key in (f"ip:{ip}", f"user:{username.lower()}"):
        allowed, retry_after = login_rate_limiter.hit(
            key, settings.LDAP_RATE_LIMIT, settings.LDAP_RATE_WINDOW
        )
        if not allowed:
            audit.log_auth("ldap_login", username=username, ip=ip, status="rate_limited")
            raise HTTPException(
                status_code=429,
                detail=f"พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอ {retry_after} วินาทีแล้วลองใหม่",
                headers={"Retry-After": str(retry_after)},
            )

    # ── Authenticate ──
    try:
        user = await ldap_login_user(db, username, body.password)
    except (ldap_service.LdapInvalidCredentials, ldap_service.LdapUserNotFound) as e:
        audit.log_auth("ldap_login", username=username, ip=ip, status="invalid")
        raise HTTPException(status_code=401, detail=e.public_message)
    except _LDAP_403 as e:
        audit.log_auth("ldap_login", username=username, ip=ip, status="denied", detail=type(e).__name__)
        raise HTTPException(status_code=403, detail=e.public_message)
    except _LDAP_503 as e:
        audit.log_auth("ldap_login", username=username, ip=ip, status="unavailable", detail=type(e).__name__)
        raise HTTPException(status_code=503, detail=e.public_message)
    except ValueError as e:  # local account deactivated
        audit.log_auth("ldap_login", username=username, ip=ip, status="deactivated")
        raise HTTPException(status_code=403, detail=str(e))
    except ldap_service.LdapError as e:  # any other LDAP failure
        audit.log_auth("ldap_login", username=username, ip=ip, status="error", detail=type(e).__name__)
        raise HTTPException(status_code=503, detail=e.public_message)

    # ── Success: clear this identity's throttle counters ──
    login_rate_limiter.reset(f"ip:{ip}")
    login_rate_limiter.reset(f"user:{username.lower()}")
    audit.log_auth("ldap_login", username=user.username, ip=ip, status="success")

    return AuthResponse(
        success=True,
        token=create_token(user),
        user=UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            name=user.name,
            role=user.role.value,
            modules=user.modules_list(),
        ),
    )


# ── GET /api/auth/me (เดิม — ไม่แตะ) ────────────────────────
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