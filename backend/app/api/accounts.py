"""
Spec auth endpoints — POST /api/signup, POST /api/login.
bcrypt (saltRounds=10) hashing, JWT 24h, no password_hash ever returned,
same 401 message for unknown-user and wrong-password (anti user-enumeration).
"""
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.user import User, Role

router = APIRouter(tags=["Accounts"])
settings = get_settings()


# ── Schemas (server-side validation — cannot be bypassed by the client) ──
class SignupIn(BaseModel):
    first_name: str
    last_name: str
    username: str
    password: str

    @field_validator("first_name", "last_name")
    @classmethod
    def _name_required(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("first_name and last_name are required")
        return v

    @field_validator("username")
    @classmethod
    def _username_valid(cls, v: str) -> str:
        v = (v or "").strip()
        if len(v) < 4:
            raise ValueError("username must be at least 4 characters")
        return v

    @field_validator("password")
    @classmethod
    def _password_valid(cls, v: str) -> str:
        if not v or len(v) < 8:
            raise ValueError("password must be at least 8 characters")
        return v


class LoginIn(BaseModel):
    username: str
    password: str


# ── Helpers ──
def _make_token(u: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "id": u.id,
        "username": u.username,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "iat": now,
        "exp": now + timedelta(hours=24),   # JWT expiry = 24h
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def _public(u: User) -> dict:
    # Never expose password_hash.
    return {"id": u.id, "username": u.username, "first_name": u.first_name, "last_name": u.last_name}


# ── POST /api/signup ──
@router.post("/signup", status_code=201)
async def signup(body: SignupIn, db: AsyncSession = Depends(get_db)):
    # Username must be unique ("used once").
    if await db.scalar(select(User).where(User.username == body.username)):
        raise HTTPException(status_code=409, detail="username already exists")

    pw_hash = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt(rounds=10)).decode()
    user = User(
        username=body.username,
        password_hash=pw_hash,
        first_name=body.first_name,
        last_name=body.last_name,
        name=f"{body.first_name} {body.last_name}".strip(),
        email=f"{body.username}@dblearn.local",  # satisfies the wider model's NOT NULL
        role=Role.STUDENT,
        modules="[]",
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        raise HTTPException(status_code=409, detail="username already exists")
    await db.refresh(user)
    return {"user": _public(user)}


# ── POST /api/login ──
@router.post("/login")
async def login(body: LoginIn, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.username == body.username))
    # Same message whether the user is missing OR the password is wrong.
    if not user or not bcrypt.checkpw(body.password.encode(), user.password_hash.encode()):
        raise HTTPException(status_code=401, detail="invalid credentials")
    return {"token": _make_token(user), "user": _public(user)}
