"""
app/services/auth_service.py — Auth business logic
"""
import json
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.user import User, Role
from app.schemas.auth import RegisterRequest, LoginRequest
from app.services import ldap_service

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
    # Check duplicate username
    existing_username = await db.scalar(select(User).where(User.username == body.username))
    if existing_username:
        raise ValueError("Username นี้ถูกใช้แล้ว")

    # Check duplicate email
    existing_email = await db.scalar(select(User).where(User.email == body.email))
    if existing_email:
        raise ValueError("Email นี้ถูกใช้แล้ว")

    # Check instructor authorization
    if body.role == Role.INSTRUCTOR:
        if body.name not in settings.AUTHORIZED_INSTRUCTORS:
            raise ValueError(f"ชื่อ '{body.name}' ไม่ได้รับสิทธิ์เป็นผู้สอน กรุณาติดต่อผู้ดูแลระบบ")

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
async def google_login(access_token: str, db: AsyncSession, requested_role: str | None = None) -> dict:
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
        role = Role.STUDENT
        if requested_role == "instructor" and name in settings.AUTHORIZED_INSTRUCTORS:
            role = Role.INSTRUCTOR
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


# ── LDAP / Active Directory Login ─────────────────────────────
def _role_from_groups(groups: list[str]) -> Role:
    """Map AD memberOf groups → platform role via LDAP_GROUP_ROLE_MAP."""
    for needle, role_name in (settings.LDAP_GROUP_ROLE_MAP or {}).items():
        if any(needle.lower() in g.lower() for g in groups):
            try:
                return Role(role_name)
            except ValueError:
                continue
    try:
        return Role(settings.LDAP_DEFAULT_ROLE)
    except ValueError:
        return Role.STUDENT


def _resolve_role(profile) -> Role:
    """Explicit hint → AD groups → default; then force instructor for the
    configured override usernames (password already verified by LDAP)."""
    role = None
    if getattr(profile, "role", None):
        try:
            role = Role(profile.role)
        except ValueError:
            role = None
    if role is None:
        role = _role_from_groups(profile.groups)

    override = {u.strip().lower() for u in (settings.LDAP_INSTRUCTOR_USERS or [])}
    if profile.username and profile.username.lower() in override:
        role = Role.INSTRUCTOR
    return role


async def ldap_login_user(db: AsyncSession, login: str, password: str) -> User:
    """
    Authenticate against AD/LDAP, then find-or-provision the local User record.

    The blocking ldap3 network call is run in a threadpool so it does not stall
    the async event loop. Raises ldap_service.LdapError subclasses on auth
    failure, or ValueError if the local account is deactivated.
    """
    if settings.LDAP_DEV_MODE:
        # Local test users — no network. See app/services/ldap_dev.py.
        from app.services.ldap_dev import dev_authenticate
        profile = dev_authenticate(settings, login, password)
    else:
        authenticator = ldap_service.get_authenticator()
        try:
            profile = await run_in_threadpool(authenticator.authenticate, login, password)
        except ldap_service.LdapUnavailable:
            # AD unreachable (off-campus / no tunnel). Optionally fall back to
            # local dev users so login still works; real AD stays primary.
            if getattr(settings, "LDAP_DEV_FALLBACK", False):
                from app.services.ldap_dev import dev_authenticate
                profile = dev_authenticate(settings, login, password)
            else:
                raise

    # Find existing account by AD username (sAMAccountName), then by email.
    user = await db.scalar(select(User).where(User.username == profile.username))
    if not user and profile.email:
        user = await db.scalar(select(User).where(User.email == profile.email))

    # Resolve role: hint/groups/default, with instructor-override applied.
    role = _resolve_role(profile)

    if not user:
        # Just-in-time provisioning — accounts are governed by AD.
        email = profile.email or f"{profile.username}@{settings.ALLOWED_EMAIL_DOMAIN}"
        user = User(
            username=profile.username,
            password_hash=hash_password(secrets.token_urlsafe(32)),  # unusable local password
            email=email,
            name=profile.display_name,
            role=role,
            modules=json.dumps([], ensure_ascii=False),
            student_id=profile.username if role == Role.STUDENT else None,
        )
        db.add(user)
    else:
        if not user.is_active:
            raise ValueError("บัญชีนี้ถูกระงับการใช้งาน")
        # Keep role + identity in sync with the authoritative directory on each login.
        user.role = role
        if profile.display_name:
            user.name = profile.display_name
        if profile.email:
            user.email = profile.email

    user.last_login = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return user