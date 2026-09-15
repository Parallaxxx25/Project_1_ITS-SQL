"""
Submission endpoints — record and view client-graded attempts, mint hints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.submission import Submission, HintRequest
from app.schemas.submission import (
    SubmissionOut,
    HintRequestIn,
    HintRequestOut,
)
from app.middleware.auth import get_current_user, require_ta
from app.services import tutor_client

router = APIRouter(prefix="/submissions", tags=["Submissions"])


# ── Client-graded flow ──────────────────────────────────────────────
# The live frontend grades entirely in the browser (DuckDB-WASM, see
# App.jsx::handleSubmit) — these two endpoints are the actual path the
# tutor service is reached from. is_correct here is client-reported and
# is NOT written to Submission (see HintRequest's docstring) — it only
# ever decides whether a hint gets offered, never anything an instructor
# dashboard would trust as a grade.
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
    """Forward a client-graded result to the tutor service purely to mint
    a hint_token. Returns hint_available=False (no error) if the tutor
    service didn't respond."""
    tutor_resp = await tutor_client.grade(
        external_user_id=str(user.id),
        problem_id=payload.tutor_problem_id,
        query=payload.query,
        partner_verdict="pass" if payload.is_correct else "fail",
        # Deterministic per (student, problem, attempt) — a genuine retry
        # of this same attempt replays instead of double-counting.
        client_submission_id=f"its-sql-client:{user.id}:{payload.tutor_problem_id}:{payload.attempt_number}",
    )
    if tutor_resp is None or not tutor_resp.get("hint_available"):
        return HintRequestOut(hint_available=False)

    hint_req = HintRequest(
        user_id=user.id,
        tutor_problem_id=payload.tutor_problem_id,
        hint_token=tutor_resp.get("hint_token"),
    )
    db.add(hint_req)
    await db.commit()
    await db.refresh(hint_req)

    return HintRequestOut(hint_request_id=hint_req.id, hint_available=True)


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
