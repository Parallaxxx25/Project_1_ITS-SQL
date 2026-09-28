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
    Raw log of query executions (for analytics/debugging).

    One row per client-graded attempt: POST /submissions/hint-request logs
    the ones sent to the tutor service, POST /submissions/log every other
    one (passes, EXAM, ... — see App.jsx::logAttempt). is_correct,
    execution_time_ms and error_message are the tutor service's own
    server-side grading of the query, never the browser's claim: they stay
    NULL when the tutor wasn't asked, didn't respond, or ruled "ungradable",
    and client_is_correct holds what the browser reported.
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
    # Client-graded flow only. problem_id above stays NULL there: the
    # frontend sends the tutor service's own problem id, not a row of this
    # backend's problems table (see HintRequest.tutor_problem_id).
    tutor_problem_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # The frontend's own problem id (lib/problems.js) and workspace mode
    # (COURSE / ASSIGNMENT / EXAM) — what identifies the problem when it
    # has no tutor_problem_id.
    client_problem_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    workspace_mode: Mapped[str | None] = mapped_column(String(16), nullable=True)
    # This row's place among the student's logged attempts on this problem in
    # this mode, counted server-side (submissions.py::_next_attempt_number) —
    # so errored Submits and Runs get their own number, across devices too.
    attempt_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Minted per attempt by the browser and re-sent by a Retry, which finds
    # this row by it. NULL from clients older than the column.
    client_attempt_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # "submit" | "run" (a Run is logged only when it errored). NULL from
    # clients older than the column.
    action: Mapped[str | None] = mapped_column(String(8), nullable=True)
    # Spoofable — kept only to compare against the tutor's is_correct.
    client_is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    tutor_verdict: Mapped[str | None] = mapped_column(String(16), nullable=True)
    # The tutor hint text the student was shown for this attempt — filled in
    # by POST /submissions/hint-request/{id}/hint, NULL if they never opened one.
    hint_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Where that hint came from ("llm" | "rule_based", "cached" only when the
    # first fetch never recorded one) and the tutor's own time to produce it.
    hint_source: Mapped[str | None] = mapped_column(String(16), nullable=True)
    hint_latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    def __repr__(self):
        return f"<SubmissionLog user={self.user_id} at={self.created_at}>"


class HintRequest(Base):
    """
    One tutor-service hint_token, scoped to the student who owns it.

    The live frontend grades entirely client-side (DuckDB-WASM, see
    App.jsx::handleSubmit) and never calls POST /submissions — so this is
    deliberately its own table rather than a field on Submission: writing
    client-reported is_correct into Submission would let a student spoof
    their own grading history in a table the instructor dashboards read as
    ground truth. (SubmissionLog gets the tutor's verdict as is_correct and
    the client's claim only in a separate client_is_correct.) This table
    exists purely to hold a hint_token between POST /submissions/hint-request
    and POST /submissions/hint-request/{id}/hint — nothing here is graded.

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
    # The attempt this hint belongs to, so the hint text lands on its log row.
    submission_log_id: Mapped[int | None] = mapped_column(
        ForeignKey("submission_logs.id", ondelete="SET NULL"), nullable=True
    )

    def __repr__(self):
        return f"<HintRequest user={self.user_id} problem={self.problem_id}>"
