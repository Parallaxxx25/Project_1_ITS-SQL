from pydantic import BaseModel
from datetime import datetime


# ── Submission ──
class SubmissionCreate(BaseModel):
    problem_id: int
    query: str
    assignment_id: int | None = None


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


class GradingResult(BaseModel):
    submission_id: int | None = None
    is_correct: bool
    execution_time_ms: float
    error_message: str | None = None
    student_result: dict | None = None  # columns + rows (limited)
    expected_result: dict | None = None
    comparison: dict | None = None
    hints: list[str] = []
    # True when the tutor service minted a hint_token for this submission —
    # tells the frontend whether to show the "get a hint" button. The token
    # itself never appears here; fetch it via POST /submissions/{id}/hint.
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
