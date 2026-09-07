"""
JWT Authentication middleware.
Verifies the Bearer token and injects the current user into requests.
"""

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.user import User, Role
from app.services.auth_service import decode_token

settings = get_settings()
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and verify JWT, return the current User."""
    token = credentials.credentials
    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub"))
    except (jwt.PyJWTError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


def require_roles(*roles: Role):
    """Dependency factory: restrict endpoint to specific roles."""
    async def checker(user: User = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires role: {', '.join(r.value for r in roles)}",
            )
        return user
    return checker


# Convenience dependencies
require_student = require_roles(Role.STUDENT, Role.TA, Role.INSTRUCTOR, Role.ADMIN)
require_ta = require_roles(Role.TA, Role.INSTRUCTOR, Role.ADMIN)
require_instructor = require_roles(Role.INSTRUCTOR, Role.ADMIN)
require_admin = require_roles(Role.ADMIN)
