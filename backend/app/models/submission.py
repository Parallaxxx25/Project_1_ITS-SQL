from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Submission(Base):
    """
    Each graded submission for a problem.
    """
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    problem_id: Mapped[int] = mapped_column(ForeignKey("problems.id", ondelete="CASCADE"), nullable=False, index=True)
    assignment_id: Mapped[int | None] = mapped_column(ForeignKey("assignments.id"), nullable=True)
    query: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    execution_time_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    result_snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # First N rows of result
    attempt_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    # Opaque handle for POST /submissions/{id}/hint — minted by the tutor
    # service's /api/v1/grade, never sent to the browser directly. NULL if
    # the tutor service wasn't called (no tutor_problem_id) or didn't
    # respond (see app/services/tutor_client.py).
    hint_token: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # The tutor service's own verdict ("pass" | "fail" | "ungradable") for
    # this same query, when it responded — kept for analytics/debugging
    # dialect divergence, never used to override is_correct above.
    tutor_verdict: Mapped[str | None] = mapped_column(String(16), nullable=True)

    # Relationships
    user = relationship("User", back_populates="submissions")
    problem = relationship("Problem", lazy="selectin")

    def __repr__(self):
        return f"<Submission user={self.user_id} problem={self.problem_id} correct={self.is_correct}>"


class SubmissionLog(Base):
    """
    Raw log of EVERY query execution (for analytics/debugging).
    """
    __tablename__ = "submission_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    problem_id: Mapped[int | None] = mapped_column(ForeignKey("problems.id", ondelete="SET NULL"), nullable=True)
    query: Mapped[str] = mapped_column(Text, nullable=False)
    execution_time_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True
    )

    def __repr__(self):
        return f"<SubmissionLog user={self.user_id} at={self.created_at}>"


class HintRequest(Base):
    """
    One tutor-service hint_token, scoped to the student who owns it.

    The live frontend grades entirely client-side (DuckDB-WASM, see
    App.jsx::handleSubmit) and never calls POST /submissions — so this is
    deliberately its own table rather than a field on Submission: writing
    client-reported is_correct into Submission/SubmissionLog would let a
    student spoof their own grading history in tables the instructor
    dashboards read as ground truth. This table exists purely to hold a
    hint_token between POST /submissions/hint-request and
    POST /submissions/hint-request/{id}/hint — nothing here is graded.

    tutor_problem_id is the tutor service's own problem id, sent directly
    by the frontend (see lib/problems.js's hand-mapped tutorProblemId
    field) — not a FK to this backend's own problems table, which is a
    separate catalog the live client-side-graded flow doesn't read at all.
    """
    __tablename__ = "hint_requests"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    tutor_problem_id: Mapped[int] = mapped_column(Integer, nullable=False)
    hint_token: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    def __repr__(self):
        return f"<HintRequest user={self.user_id} problem={self.problem_id}>"
