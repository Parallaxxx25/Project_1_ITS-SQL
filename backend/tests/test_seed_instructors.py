"""
Guards app.seed.ensure_instructors — the SEED_INSTRUCTOR_PW branch.

Two things matter and neither is obvious from reading it: unset, an existing
instructor's own password survives every restart; set, it is forced back onto
all of them on every startup AND echoed to the log (the whole point of pinning
it — a random one is bcrypt-hashed and gone). Runs against a throwaway SQLite
file, so no live service and no Postgres needed.

Run:  cd backend && python -m pytest tests/test_seed_instructors.py
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

PINNED = "classroom-demo-pw"


@pytest.fixture()
def seeded(tmp_path, monkeypatch):
    """app.database builds its engine at import time off DATABASE_URL, so the
    env var has to be set before the first import of anything under app.*"""
    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{tmp_path / 'seed.db'}")
    monkeypatch.delenv("SEED_INSTRUCTOR_PW", raising=False)

    from app.database import AsyncSessionLocal, init_db
    from app.seed import INSTRUCTOR_SEED, ensure_instructors

    asyncio.run(init_db())
    asyncio.run(ensure_instructors())
    return AsyncSessionLocal, INSTRUCTOR_SEED, ensure_instructors


def _hash_of(AsyncSessionLocal, username: str) -> str:
    from sqlalchemy import select
    from app.models.user import User

    async def go():
        async with AsyncSessionLocal() as db:
            return (await db.scalar(select(User).where(User.username == username))).password_hash

    return asyncio.run(go())


def test_unpinned_restart_keeps_a_changed_password(seeded):
    from app.services.auth_service import hash_password, verify_password

    AsyncSessionLocal, INSTRUCTOR_SEED, ensure_instructors = seeded
    username = INSTRUCTOR_SEED[0]["username"]

    # the instructor changes their own password, then the service restarts
    async def change():
        from sqlalchemy import select
        from app.models.user import User

        async with AsyncSessionLocal() as db:
            user = await db.scalar(select(User).where(User.username == username))
            user.password_hash = hash_password("chosen-by-instructor")
            await db.commit()

    asyncio.run(change())
    asyncio.run(ensure_instructors())

    assert verify_password("chosen-by-instructor", _hash_of(AsyncSessionLocal, username))


def test_pinned_overwrites_every_instructor_and_logs_it(seeded, monkeypatch, capsys):
    from app.services.auth_service import verify_password

    AsyncSessionLocal, INSTRUCTOR_SEED, ensure_instructors = seeded
    before = {u["username"]: _hash_of(AsyncSessionLocal, u["username"]) for u in INSTRUCTOR_SEED}

    monkeypatch.setenv("SEED_INSTRUCTOR_PW", PINNED)
    asyncio.run(ensure_instructors())

    for u in INSTRUCTOR_SEED:
        after = _hash_of(AsyncSessionLocal, u["username"])
        assert after != before[u["username"]]
        assert verify_password(PINNED, after)

    assert PINNED in capsys.readouterr().out
