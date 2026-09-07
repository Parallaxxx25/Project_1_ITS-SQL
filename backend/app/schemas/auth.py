"""
app/schemas/auth.py — Pydantic schemas for authentication
"""
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from app.models.user import Role
from app.schemas.user import UserOut


# ── Request schemas ───────────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str
    password: str
    email: EmailStr
    name: str
    role: Role = Role.STUDENT
    modules: list[str] = []

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Username ต้องมีอย่างน้อย 3 ตัวอักษร")
        if len(v) > 50:
            raise ValueError("Username ยาวเกินไป (max 50)")
        return v

    @field_validator("password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password ต้องมีอย่างน้อย 6 ตัวอักษร")
        return v

    @field_validator("name")
    @classmethod
    def name_valid(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("กรุณากรอกชื่อ-นามสกุล")
        return v


class LoginRequest(BaseModel):
    username: str
    password: str


class ActivityRequest(BaseModel):
    event_type: str          # login | logout | page_view | exercise_submit | hint_used
    page: Optional[str] = None
    exercise_id: Optional[int] = None
    score: Optional[float] = None
    note: Optional[str] = None


# ── Response schemas ──────────────────────────────────────────
class AuthResponse(BaseModel):
    success: bool
    token: str
    user: UserOut   # same shape as GET /api/auth/me, so the client sees one user object