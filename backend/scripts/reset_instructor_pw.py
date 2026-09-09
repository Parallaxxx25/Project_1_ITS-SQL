"""
Reset a forgotten instructor password.

Usage:
    cd backend
    python -m scripts.reset_instructor_pw <username> [new_password]

If new_password is omitted, a random one is generated and printed once.
"""
import asyncio
import secrets
import sys

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.user import User
from app.services.auth_service import hash_password


async def main() -> None:
    if len(sys.argv) < 2:
        sys.exit("usage: python -m scripts.reset_instructor_pw <username> [new_password]")
    username = sys.argv[1]
    new_pw = sys.argv[2] if len(sys.argv) > 2 else secrets.token_urlsafe(9)

    async with AsyncSessionLocal() as db:
        user = await db.scalar(select(User).where(User.username == username))
        if not user:
            sys.exit(f"no user with username {username!r}")
        user.password_hash = hash_password(new_pw)
        await db.commit()

    print(f"password for {username} reset to: {new_pw}")


if __name__ == "__main__":
    asyncio.run(main())
