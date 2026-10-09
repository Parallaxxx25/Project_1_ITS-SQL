"""
GET /dashboard/attempts is what the instructor dashboard's Students &
Analytics section is built from — students' own attempt history lives in
their own browsers' localStorage, so this is the only place an instructor can
see it. It must list every student, including one with no attempts yet, and
every attempt a student logged (errored Runs too, flagged by action), but
nothing from non-students — and only for TA/Instructor/Admin.

Defaults to a throwaway SQLite file; set DATABASE_URL to an empty Postgres
database to exercise the Postgres path.

Run:  cd backend && python -m tests.test_class_attempts
"""
from __future__ import annotations

import asyncio
import os
import sys
import tempfile
import uuid
from pathlib import Path

import httpx

os.environ.setdefault(
    "DATABASE_URL", f"sqlite+aiosqlite:///{Path(tempfile.mkdtemp()) / 'test.db'}"
)
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import app.models  # noqa: E402,F401 — registers every table for create_all
from app.database import AsyncSessionLocal, engine, init_db  # noqa: E402
from app.main import app as fastapi_app  # noqa: E402
from app.middleware.auth import get_current_user  # noqa: E402
from app.models.submission import SubmissionLog  # noqa: E402
from app.models.user import Role, User  # noqa: E402


def _user(name: str, role: Role) -> User:
    return User(username=name, password_hash="x", email=f"{name}@kmitl.ac.th", name=name, role=role)


async def _get(as_user: User) -> httpx.Response:
    fastapi_app.dependency_overrides[get_current_user] = lambda: as_user
    try:
        transport = httpx.ASGITransport(app=fastapi_app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.get("/api/dashboard/attempts")
    finally:
        fastapi_app.dependency_overrides.clear()


async def _run():
    await init_db()

    async with AsyncSessionLocal() as db:
        tag = uuid.uuid4().hex[:8]
        active, idle = _user(f"active_{tag}", Role.STUDENT), _user(f"idle_{tag}", Role.STUDENT)
        teacher = _user(f"teacher_{tag}", Role.INSTRUCTOR)
        db.add_all([active, idle, teacher])
        await db.flush()
        db.add_all([
            SubmissionLog(user_id=active.id, query="SELECT 1;", client_problem_id="1",
                          workspace_mode="COURSE", action="submit",
                          client_is_correct=True, is_correct=True),
            SubmissionLog(user_id=active.id, query="SELEC 1;", client_problem_id="1",
                          workspace_mode="COURSE", action="run", client_is_correct=False),
            SubmissionLog(user_id=teacher.id, query="SELECT 2;", client_problem_id="1",
                          workspace_mode="COURSE", action="submit", client_is_correct=True),
        ])
        await db.commit()

    r = await _get(active)
    assert r.status_code == 403, (r.status_code, r.text)

    r = await _get(teacher)
    assert r.status_code == 200, (r.status_code, r.text)
    body = r.json()

    students = {s["id"]: s for s in body["students"]}
    assert active.id in students and idle.id in students  # idle: no attempts, still listed
    assert teacher.id not in students
    assert students[active.id]["username"] == active.username

    rows = [a for a in body["attempts"] if a["user_id"] in (active.id, idle.id, teacher.id)]
    assert [(a["user_id"], a["action"], a["client_is_correct"], a["is_correct"]) for a in rows] == [
        (active.id, "submit", True, True),
        (active.id, "run", False, None),
    ], rows
    assert rows[0]["query"] == "SELECT 1;" and rows[0]["client_problem_id"] == "1"
    assert rows[0]["workspace_mode"] == "COURSE" and rows[0]["created_at"]

    await engine.dispose()


def test_class_attempts():
    asyncio.run(_run())


if __name__ == "__main__":
    test_class_attempts()
    print(f"ok ({engine.dialect.name})")
