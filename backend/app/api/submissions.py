"""
Submission endpoints — record and view client-graded attempts, mint hints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.submission import Submission, SubmissionLog, HintRequest
from app.schemas.submission import (
    SubmissionOut,
    HintRequestIn,
    HintRequestOut,
    SubmissionLogIn,
)
from app.middleware.auth import get_current_user, require_ta
from app.services import tutor_client

router = APIRouter(prefix="/submissions", tags=["Submissions"])


async def _next_attempt_number(db: AsyncSession, user: User, payload) -> int:
    """This attempt's place among the student's logged attempts on this
    problem in this mode. Counted here, not taken from the browser, whose
    localStorage count skips errored Submits and Runs and restarts on
    another device. Without a client_problem_id there is nothing to count
    by, so the browser's number stands."""
    if payload.client_problem_id is None:
        return payload.attempt_number
    prior = await db.scalar(
        select(func.count()).select_from(SubmissionLog).where(
            SubmissionLog.user_id == user.id,
            SubmissionLog.client_problem_id == payload.client_problem_id,
            SubmissionLog.workspace_mode == payload.workspace_mode,
        )
    )
    return prior + 1


# ── Client-graded flow ──────────────────────────────────────────────
# The live frontend grades entirely in the browser (DuckDB-WASM, see
# App.jsx::handleSubmit) — these two endpoints are the actual path the
# tutor service is reached from. is_correct here is client-reported and
# is NOT written to Submission (see HintRequest's docstring) — it only
# ever decides whether a hint gets offered, never anything an instructor
# dashboard would trust as a grade. Each attempt is logged to
# SubmissionLog, graded by the tutor's own verdict, with the hint text
# added once the student opens it; POST /log below covers the attempts
# the frontend never sends to the tutor.
#
# There used to be a server-graded POST /submissions + POST /{id}/hint
# pair here, backed by a SQLite sandbox (app/grading/). It was never
# called by the frontend, had no query timeout, and materialized full
# result sets before capping rows — an unauthenticated DoS surface with
# no callers. Removed rather than hardened; see app/grading/sandbox.py
# in git history if a server-graded path is needed later.


@router.post("/hint-request", response_model=HintRequestOut)
async def request_hint(
    payload: HintRequestIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Forward a client-graded result to the tutor service to mint a
    hint_token, and log the attempt to SubmissionLog. Returns
    hint_available=False (no error) if the tutor service didn't respond —
    the attempt is still logged, just without a tutor verdict."""
    attempt_id = payload.client_attempt_id
    tutor_resp = await tutor_client.grade(
        external_user_id=str(user.id),
        problem_id=payload.tutor_problem_id,
        query=payload.query,
        partner_verdict="pass" if payload.is_correct else "fail",
        # One per attempt — a genuine retry of this same attempt replays
        # instead of double-counting. Older clients send no attempt id; their
        # per-browser count can repeat, and the tutor then replays the wrong
        # attempt's grade.
        client_submission_id=(
            f"its-sql-client:{user.id}:{attempt_id}" if attempt_id
            else f"its-sql-client:{user.id}:{payload.tutor_problem_id}:{payload.attempt_number}"
        ),
    )

    log = None
    if payload.is_retry:
        same_attempt = (
            [SubmissionLog.client_attempt_id == attempt_id] if attempt_id
            # Older clients: the newest row with this query — a Retry only
            # ever re-sends the student's latest attempt.
            else [SubmissionLog.tutor_problem_id == payload.tutor_problem_id,
                  SubmissionLog.query == payload.query]
        )
        result = await db.execute(
            select(SubmissionLog)
            .where(SubmissionLog.user_id == user.id, *same_attempt)
            .order_by(SubmissionLog.id.desc())
            .limit(1)
        )
        log = result.scalar_one_or_none()
    if log is None:
        log = SubmissionLog(
            user_id=user.id,
            tutor_problem_id=payload.tutor_problem_id,
            client_problem_id=payload.client_problem_id,
            workspace_mode=payload.workspace_mode,
            attempt_number=await _next_attempt_number(db, user, payload),
            client_attempt_id=attempt_id,
            action=payload.action,
            query=payload.query,
            client_is_correct=payload.is_correct,
        )
        db.add(log)
    if tutor_resp is not None:
        log.tutor_verdict = tutor_resp.get("verdict")
        log.is_correct = {"pass": True, "fail": False}.get(log.tutor_verdict)
        log.execution_time_ms = tutor_resp.get("execution_time_ms")
        log.error_message = tutor_resp.get("error_message")

    if tutor_resp is None or not tutor_resp.get("hint_available"):
        await db.commit()
        return HintRequestOut(hint_available=False)

    await db.flush()  # assigns log.id
    hint_req = HintRequest(
        user_id=user.id,
        tutor_problem_id=payload.tutor_problem_id,
        hint_token=tutor_resp.get("hint_token"),
        submission_log_id=log.id,
    )
    db.add(hint_req)
    await db.commit()
    await db.refresh(hint_req)

    return HintRequestOut(hint_request_id=hint_req.id, hint_available=True)


@router.post("/log", status_code=204)
async def log_submission(
    payload: SubmissionLogIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Log a client-graded attempt that never goes through /hint-request —
    passes, EXAM (which must never mint a hint_token), the local semicolon
    rule, problems with no tutor mapping. Nothing grades it server-side, so
    is_correct stays NULL and the browser's verdict lands only in
    client_is_correct."""
    db.add(SubmissionLog(
        user_id=user.id,
        tutor_problem_id=payload.tutor_problem_id,
        client_problem_id=payload.client_problem_id,
        workspace_mode=payload.workspace_mode,
        attempt_number=await _next_attempt_number(db, user, payload),
        client_attempt_id=payload.client_attempt_id,
        action=payload.action,
        query=payload.query,
        client_is_correct=payload.is_correct,
    ))
    await db.commit()


@router.post("/hint-request/{hint_request_id}/hint")
async def get_client_hint(
    hint_request_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Passthrough to the tutor service's POST /api/v1/hint for a
    client-graded submission. Ownership is checked before the stored
    hint_token is used — the token itself never reaches the browser."""
    result = await db.execute(select(HintRequest).where(HintRequest.id == hint_request_id))
    hint_req = result.scalar_one_or_none()
    if not hint_req or hint_req.user_id != user.id:
        raise HTTPException(404, "Hint request not found")
    if not hint_req.hint_token:
        raise HTTPException(400, "No hint available for this request")

    tutor_resp = await tutor_client.hint(hint_req.hint_token)
    if tutor_resp is None:
        raise HTTPException(503, "Hint service unavailable — try again in a moment")

    if hint_req.submission_log_id is not None:
        log = await db.get(SubmissionLog, hint_req.submission_log_id)
        if log is not None:
            # A re-fetch overwrites — the row keeps the hint last shown. The
            # tutor answers a re-fetch from its cache, so "cached" never
            # replaces the source and latency of the generation it replays.
            log.hint_text = tutor_resp.get("hint_text")
            if tutor_resp.get("source") != "cached" or log.hint_source is None:
                log.hint_source = tutor_resp.get("source")
                log.hint_latency_ms = tutor_resp.get("latency_ms")
            await db.commit()
    return tutor_resp


@router.get("/my", response_model=List[SubmissionOut])
async def my_submissions(
    problem_id: int = None,
    limit: int = 50,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's submissions, optionally filtered by problem."""
    query = select(Submission).where(Submission.user_id == user.id)
    if problem_id:
        query = query.where(Submission.problem_id == problem_id)
    query = query.order_by(Submission.submitted_at.desc()).limit(limit)

    result = await db.execute(query)
    submissions = result.scalars().all()
    return [
        {
            "id": s.id,
            "user_id": s.user_id,
            "problem_id": s.problem_id,
            "assignment_id": s.assignment_id,
            "query": s.query,
            "is_correct": s.is_correct,
            "execution_time_ms": s.execution_time_ms,
            "error_message": s.error_message,
            "result_snapshot": s.result_snapshot,
            "attempt_number": s.attempt_number,
            "submitted_at": s.submitted_at,
        }
        for s in submissions
    ]


@router.get("/problem/{problem_id}/all")
async def list_submissions_for_problem(
    problem_id: int,
    user: User = Depends(require_ta),
    db: AsyncSession = Depends(get_db),
):
    """List all submissions for a problem. TA/Instructor/Admin only."""
    result = await db.execute(
        select(Submission)
        .where(Submission.problem_id == problem_id)
        .order_by(Submission.submitted_at.desc())
        .limit(200)
    )
    submissions = result.scalars().all()
    return [
        {
            "id": s.id,
            "user_id": s.user_id,
            "user_name": s.user.name if s.user else None,
            "student_id": s.user.student_id if s.user else None,
            "problem_id": s.problem_id,
            "query": s.query,
            "is_correct": s.is_correct,
            "execution_time_ms": s.execution_time_ms,
            "error_message": s.error_message,
            "attempt_number": s.attempt_number,
            "submitted_at": s.submitted_at.isoformat(),
        }
        for s in submissions
    ]


@router.get("/student/{student_user_id}")
async def list_submissions_for_student(
    student_user_id: int,
    course_id: int = None,
    user: User = Depends(require_ta),
    db: AsyncSession = Depends(get_db),
):
    """List all submissions for a specific student. TA/Instructor/Admin only."""
    query = select(Submission).where(Submission.user_id == student_user_id)
    query = query.order_by(Submission.submitted_at.desc()).limit(200)

    result = await db.execute(query)
    submissions = result.scalars().all()
    return [
        {
            "id": s.id,
            "user_id": s.user_id,
            "problem_id": s.problem_id,
            "problem_title": s.problem.title if s.problem else None,
            "query": s.query,
            "is_correct": s.is_correct,
            "execution_time_ms": s.execution_time_ms,
            "error_message": s.error_message,
            "attempt_number": s.attempt_number,
            "submitted_at": s.submitted_at.isoformat(),
        }
        for s in submissions
    ]
