from pydantic import BaseModel, Field
from datetime import datetime


# ── Submission ──
class SubmissionOut(BaseModel):
    id: int
    user_id: int
    problem_id: int
    assignment_id: int | None = None
    query: str
    is_correct: bool
    execution_time_ms: float | None = None
    error_message: str | None = None
    result_snapshot: dict | None = None
    attempt_number: int
    submitted_at: datetime

    model_config = {"from_attributes": True}


# ── Client-graded attempts (see App.jsx::handleSubmit, which grades
# entirely in the browser via DuckDB-WASM) ──
class _ClientAttemptIn(BaseModel):
    query: str
    is_correct: bool
    attempt_number: int = 1
    # The frontend's own problem id and workspace mode — logged to
    # submission_logs only, so rows stay identifiable without a tutor id.
    client_problem_id: str | None = Field(None, max_length=64)
    workspace_mode: str | None = Field(None, max_length=16)


class HintRequestIn(_ClientAttemptIn):
    # The tutor service's own problem id (lib/problems.js's hand-mapped
    # tutorProblemId) — not this backend's own Problem.id, a separate,
    # unrelated catalog the live client-side-graded flow doesn't read.
    tutor_problem_id: int
    # True when App.jsx::retryTutorHint re-sends an attempt already reported
    # here (after a tutor outage) — updates its submission_logs row instead
    # of logging the same attempt twice.
    is_retry: bool = False


class SubmissionLogIn(_ClientAttemptIn):
    # None for problems with no tutor-side mapping (e.g. instructor-authored).
    tutor_problem_id: int | None = None


class HintRequestOut(BaseModel):
    hint_request_id: int | None = None
    hint_available: bool = False


# ── Assignment ──
class AssignmentCreate(BaseModel):
    title: str
    description: str | None = None
    open_date: datetime | None = None
    due_date: datetime | None = None
    max_attempts: int = 0
    problem_ids: list[int] = []


class AssignmentOut(BaseModel):
    id: int
    course_id: int
    title: str
    description: str | None = None
    open_date: datetime | None = None
    due_date: datetime | None = None
    max_attempts: int
    is_active: bool
    created_at: datetime
    problem_count: int = 0

    model_config = {"from_attributes": True}


# ── Analytics ──
class StudentProgress(BaseModel):
    user_id: int
    student_id: str | None = None
    name: str
    total_problems: int = 0
    solved_problems: int = 0
    total_submissions: int = 0
    average_attempts: float = 0.0
    last_activity: datetime | None = None


class ClassAnalytics(BaseModel):
    total_students: int
    active_students: int
    total_submissions: int
    average_score: float
    problem_success_rates: list[dict] = []
    recent_activity: list[dict] = []
