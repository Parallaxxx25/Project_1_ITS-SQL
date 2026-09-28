"""
POST /submissions/hint-request must log every attempt it forwards to the
tutor to submission_logs, POST /submissions/hint-request/{id}/hint must add
the hint text to that same row, and POST /submissions/log must log the rest
(passes, EXAM, ...) without a tutor verdict. Every attempt gets its own
server-counted attempt_number and — via client_attempt_id — its own
client_submission_id at the tutor, so an errored Submit or Run never replays
another attempt's grade. Also pins init_db()'s additive migration on a pre-existing
submission_logs / hint_requests table, which is what the live Postgres has.

Calls the endpoint functions directly with the tutor service stubbed out, so
no live backend or tutor is needed. Defaults to a throwaway SQLite file; set
DATABASE_URL to an empty Postgres database to exercise the Postgres path.

Run:  cd backend && python -m tests.test_submission_log
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

from fastapi import HTTPException  # noqa: E402
from sqlalchemy import func, inspect, select  # noqa: E402

import app.models  # noqa: E402,F401 — registers every table for create_all
from app.api import submissions  # noqa: E402
from app.database import AsyncSessionLocal, engine, init_db  # noqa: E402
from app.main import app as fastapi_app  # noqa: E402
from app.middleware.auth import get_current_user  # noqa: E402
from app.models.submission import HintRequest, SubmissionLog  # noqa: E402
from app.models.user import User  # noqa: E402
from app.schemas.submission import HintRequestIn, SubmissionLogIn  # noqa: E402
from app.services import tutor_client  # noqa: E402

IS_SQLITE = engine.dialect.name == "sqlite"
PK = "INTEGER PRIMARY KEY" if IS_SQLITE else "SERIAL PRIMARY KEY"

# The two tables as they were before this change — init_db() must add the
# new columns to them in place (create_all skips tables that already exist).
OLD_SCHEMA = (
    f"""CREATE TABLE submission_logs (
        id {PK}, user_id INTEGER NOT NULL, problem_id INTEGER, query TEXT NOT NULL,
        execution_time_ms FLOAT, error_message TEXT, is_correct BOOLEAN,
        created_at TIMESTAMP NOT NULL)""",
    f"""CREATE TABLE hint_requests (
        id {PK}, user_id INTEGER NOT NULL, tutor_problem_id INTEGER NOT NULL,
        hint_token VARCHAR(64), created_at TIMESTAMP NOT NULL)""",
)


class FakeTutor:
    def __init__(self):
        self.up = True
        self.hint_source = "rule_based"
        self.submission_ids = []  # client_submission_id of every /grade call

    async def grade(self, **kwargs):
        self.submission_ids.append(kwargs["client_submission_id"])
        if not self.up:
            return None
        return {
            "verdict": "fail", "score": 0.0, "execution_time_ms": 12,
            "error_message": None, "hint_available": True,
            "hint_token": f"tok-{uuid.uuid4().hex[:8]}",
        }

    async def hint(self, hint_token):
        if not self.up:
            return None
        cached = self.hint_source == "cached"
        return {"hint_level": 1, "hint_text": f"hint for {hint_token}",
                "source": self.hint_source, "latency_ms": 3 if cached else 5}


async def _logs(db, user):
    result = await db.execute(
        select(SubmissionLog).where(SubmissionLog.user_id == user.id).order_by(SubmissionLog.id)
    )
    return result.scalars().all()


async def _run():
    async with engine.begin() as conn:
        for stmt in OLD_SCHEMA:
            await conn.exec_driver_sql(stmt)
    await init_db()
    await init_db()  # must be re-runnable: every startup calls it

    async with engine.connect() as conn:
        cols = await conn.run_sync(lambda c: {
            t: {col["name"] for col in inspect(c).get_columns(t)}
            for t in ("submission_logs", "hint_requests")
        })
    assert {"tutor_problem_id", "client_problem_id", "workspace_mode", "attempt_number",
            "client_is_correct", "tutor_verdict", "hint_text", "client_attempt_id", "action",
            "hint_source", "hint_latency_ms"} <= cols["submission_logs"], cols
    assert "submission_log_id" in cols["hint_requests"], cols

    tutor = FakeTutor()
    tutor_client.grade, tutor_client.hint = tutor.grade, tutor.hint

    async with AsyncSessionLocal() as db:
        name = f"logtest_{uuid.uuid4().hex[:8]}"
        user = User(username=name, password_hash="x", email=f"{name}@kmitl.ac.th", name=name)
        db.add(user)
        await db.commit()

        # 1. A failed attempt is logged with the tutor's verdict, and the
        #    hint text lands on that row once the student opens it.
        out = await submissions.request_hint(
            HintRequestIn(tutor_problem_id=7, query="SELECT 1;", is_correct=False, attempt_number=1,
                          client_problem_id="3", workspace_mode="COURSE"),
            user=user, db=db,
        )
        assert out.hint_available and out.hint_request_id
        [log] = await _logs(db, user)
        assert (log.tutor_problem_id, log.attempt_number, log.query) == (7, 1, "SELECT 1;")
        assert (log.client_problem_id, log.workspace_mode) == ("3", "COURSE")
        assert log.client_is_correct is False
        assert log.tutor_verdict == "fail" and log.is_correct is False
        assert log.execution_time_ms == 12 and log.hint_text is None
        hint_req = await db.get(HintRequest, out.hint_request_id)
        assert hint_req.submission_log_id == log.id

        resp = await submissions.get_client_hint(out.hint_request_id, user=user, db=db)
        await db.refresh(log)
        assert log.hint_text == resp["hint_text"] and log.hint_text
        assert (log.hint_source, log.hint_latency_ms) == ("rule_based", 5)

        # A re-fetch is answered from the tutor's cache: the text is kept,
        # the source and latency of the original generation too.
        tutor.hint_source = "cached"
        await submissions.get_client_hint(out.hint_request_id, user=user, db=db)
        await db.refresh(log)
        assert (log.hint_source, log.hint_latency_ms) == ("rule_based", 5)
        tutor.hint_source = "rule_based"

        # 2. Tutor down: the attempt is still logged, just without a verdict,
        #    and a failed hint fetch leaves hint_text alone.
        tutor.up = False
        out = await submissions.request_hint(
            HintRequestIn(tutor_problem_id=7, query="SELECT 2;", is_correct=False, attempt_number=2),
            user=user, db=db,
        )
        assert not out.hint_available
        logs = await _logs(db, user)
        assert len(logs) == 2
        assert logs[1].tutor_verdict is None and logs[1].is_correct is None
        assert logs[1].client_is_correct is False

        # 3. retryTutorHint re-sends that same attempt once the tutor is back:
        #    it fills in the existing row instead of logging it twice.
        tutor.up = True
        out = await submissions.request_hint(
            HintRequestIn(tutor_problem_id=7, query="SELECT 2;", is_correct=False,
                          attempt_number=2, is_retry=True),
            user=user, db=db,
        )
        assert out.hint_available
        logs = await _logs(db, user)
        assert len(logs) == 2
        assert logs[1].tutor_verdict == "fail"
        assert (await db.get(HintRequest, out.hint_request_id)).submission_log_id == logs[1].id

        tutor.up = False
        try:
            await submissions.get_client_hint(out.hint_request_id, user=user, db=db)
            raise AssertionError("expected 503")
        except HTTPException as e:
            assert e.status_code == 503
        await db.refresh(logs[1])
        assert logs[1].hint_text is None

        # 4. Resubmitting the same query without is_retry is a new execution.
        tutor.up = True
        await submissions.request_hint(
            HintRequestIn(tutor_problem_id=7, query="SELECT 2;", is_correct=False, attempt_number=2),
            user=user, db=db,
        )
        count = await db.scalar(
            select(func.count()).select_from(SubmissionLog).where(SubmissionLog.user_id == user.id)
        )
        assert count == 3

        # 5. Everything that never reaches the tutor goes through POST /log —
        #    over HTTP here, to pin the route and its empty 204 body too.
        fastapi_app.dependency_overrides[get_current_user] = lambda: user
        transport = httpx.ASGITransport(app=fastapi_app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            r = await client.post("/api/submissions/log", json={
                "tutor_problem_id": None, "query": "SELECT 3;", "is_correct": True,
                "attempt_number": 1, "client_problem_id": "1733000000123", "workspace_mode": "EXAM",
            })
        fastapi_app.dependency_overrides.clear()
        assert r.status_code == 204 and r.content == b"", (r.status_code, r.text)
        log = (await _logs(db, user))[-1]
        assert (log.query, log.client_problem_id, log.workspace_mode) == ("SELECT 3;", "1733000000123", "EXAM")
        assert log.tutor_problem_id is None and log.client_is_correct is True
        assert log.is_correct is None and log.tutor_verdict is None
        assert await db.scalar(select(func.count()).select_from(HintRequest).where(
            HintRequest.submission_log_id == log.id)) == 0

        # 6. An errored Submit then an errored Run: the browser's count never
        #    moved (both say 1), but each is its own attempt — its own row,
        #    its own number, its own client_submission_id at the tutor.
        def attempt(query, attempt_id, action, **kw):
            return HintRequestIn(tutor_problem_id=9, query=query, is_correct=False, attempt_number=1,
                                 client_attempt_id=attempt_id, action=action,
                                 client_problem_id="42", workspace_mode="COURSE", **kw)

        tutor.submission_ids.clear()
        await submissions.request_hint(attempt("SELEC 1;", "a-1", "submit"), user=user, db=db)
        tutor.up = False
        await submissions.request_hint(attempt("SELECT x;", "a-2", "run"), user=user, db=db)
        first, second = [l for l in await _logs(db, user) if l.client_problem_id == "42"]
        assert (first.attempt_number, first.action, first.client_attempt_id) == (1, "submit", "a-1")
        assert (second.attempt_number, second.action, second.tutor_verdict) == (2, "run", None)
        assert tutor.submission_ids == [f"its-sql-client:{user.id}:a-1", f"its-sql-client:{user.id}:a-2"]

        # Its Retry finds that row by the attempt id and re-sends the same
        # client_submission_id, so the tutor would replay rather than regrade.
        tutor.up = True
        await submissions.request_hint(attempt("SELECT x;", "a-2", "run", is_retry=True), user=user, db=db)
        await db.refresh(second)
        assert second.tutor_verdict == "fail" and second.attempt_number == 2
        assert tutor.submission_ids[-1] == tutor.submission_ids[1]

        # POST /log continues the same count; another mode keeps its own.
        await submissions.log_submission(SubmissionLogIn(
            tutor_problem_id=9, query="SELECT 1;", is_correct=True, attempt_number=1,
            client_attempt_id="a-3", action="submit", client_problem_id="42", workspace_mode="COURSE",
        ), user=user, db=db)
        await submissions.log_submission(SubmissionLogIn(
            tutor_problem_id=9, query="SELECT 1;", is_correct=True, attempt_number=5,
            client_problem_id="42", workspace_mode="EXAM",
        ), user=user, db=db)
        numbers = [(l.workspace_mode, l.attempt_number) for l in await _logs(db, user)
                   if l.client_problem_id == "42"]
        assert numbers == [("COURSE", 1), ("COURSE", 2), ("COURSE", 3), ("EXAM", 1)], numbers

    await engine.dispose()


def test_submission_log():
    asyncio.run(_run())


if __name__ == "__main__":
    test_submission_log()
    print(f"ok ({engine.dialect.name})")
