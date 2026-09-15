"""
app/services/auth_service.py — Auth business logic
"""
import json
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.user import User, Role
from app.schemas.auth import RegisterRequest, LoginRequest

settings = get_settings()


# ── Password helpers ──────────────────────────────────────────
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


# ── JWT helpers ───────────────────────────────────────────────
def create_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "username": user.username,
        "role": user.role.value,
        "iat": now,
        # Expiry — tokens MUST NOT live forever (revocation / stolen-token window).
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    # PyJWT verifies `exp` by default and raises ExpiredSignatureError when past.
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


# ── Register ──────────────────────────────────────────────────
async def register_user(db: AsyncSession, body: RegisterRequest) -> User:
    # Same domain restriction as the Google path (see verify_google_token
    # below) — password self-signup was the one way in that skipped it,
    # letting anyone with any email register an account.
    if settings.ALLOWED_EMAIL_DOMAIN and not body.email.endswith("@" + settings.ALLOWED_EMAIL_DOMAIN):
        raise ValueError(f"อนุญาตเฉพาะอีเมล @{settings.ALLOWED_EMAIL_DOMAIN}")

    # Check duplicate username/email — one identical message for both, so a
    # registration attempt can't be used to enumerate which accounts exist.
    existing_username = await db.scalar(select(User).where(User.username == body.username))
    existing_email = await db.scalar(select(User).where(User.email == body.email))
    if existing_username or existing_email:
        raise ValueError("Username หรือ Email นี้ถูกใช้แล้ว")

    # Self-signup mints students ONLY. `role` arrives from the client, so it is
    # never trusted: the previous check only guarded INSTRUCTOR, which let anyone
    # POST role="admin" straight past it. Staff accounts come from
    # app/seed.py::INSTRUCTOR_SEED, never from this endpoint.
    if body.role != Role.STUDENT:
        raise ValueError("สมัครสมาชิกได้เฉพาะบัญชีนักศึกษา — บัญชีผู้สอนสร้างโดยผู้ดูแลระบบ")

    user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        email=body.email,
        name=body.name,
        role=body.role,
        modules=json.dumps(body.modules, ensure_ascii=False),
        student_id=body.username if body.role == Role.STUDENT else None,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


# ── Login ─────────────────────────────────────────────────────
async def login_user(db: AsyncSession, body: LoginRequest) -> User:
    user = await db.scalar(select(User).where(User.username == body.username))

    if not user or not verify_password(body.password, user.password_hash):
        raise ValueError("Username หรือ Password ไม่ถูกต้อง")

    if not user.is_active:
        raise ValueError("บัญชีนี้ถูกระงับการใช้งาน")

    # Update last_login
    user.last_login = datetime.now(timezone.utc)
    await db.commit()

    return user


# ── Google OAuth Login ────────────────────────────────────────
async def google_login(access_token: str, db: AsyncSession) -> dict:
    """
    Verify a Google OAuth access token via the userinfo endpoint, then
    find-or-create the local user. Returns {success, token, user}.
    """
    import httpx

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if resp.status_code != 200:
        raise ValueError("Google token ไม่ถูกต้องหรือหมดอายุ")

    info = resp.json()
    email = (info.get("email") or "").lower()
    if not email:
        raise ValueError("ไม่พบอีเมลจากบัญชี Google")
    if settings.ALLOWED_EMAIL_DOMAIN and not email.endswith("@" + settings.ALLOWED_EMAIL_DOMAIN):
        raise ValueError(f"อนุญาตเฉพาะอีเมล @{settings.ALLOWED_EMAIL_DOMAIN}")

    name = info.get("name") or email.split("@")[0]
    picture = info.get("picture")

    user = await db.scalar(select(User).where(User.email == email))
    if not user:
        role = Role.STUDENT   # Google sign-in never grants staff — see INSTRUCTOR_SEED.
        user = User(
            username=email.split("@")[0],
            password_hash=hash_password(secrets.token_urlsafe(32)),  # unusable local password
            email=email,
            name=name,
            role=role,
            modules=json.dumps([], ensure_ascii=False),
            photo_url=picture,
            student_id=email.split("@")[0] if role == Role.STUDENT else None,
        )
        db.add(user)
    else:
        if picture:
            user.photo_url = picture

    user.last_login = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)

    return {
        "success": True,
        "token": create_token(user),
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "name": user.name,
            "role": user.role.value,
            "modules": user.modules_list(),
            "photo_url": user.photo_url,
        },
    }
