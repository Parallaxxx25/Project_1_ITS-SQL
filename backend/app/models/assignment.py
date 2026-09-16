from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    open_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    max_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # 0 = unlimited
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    course = relationship("Course", lazy="selectin")
    creator = relationship("User", foreign_keys=[created_by], lazy="selectin")
    problems = relationship("AssignmentProblem", back_populates="assignment", lazy="selectin", order_by="AssignmentProblem.order_index")

    def __repr__(self):
        return f"<Assignment {self.title}>"


class AssignmentProblem(Base):
    __tablename__ = "assignment_problems"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    assignment_id: Mapped[int] = mapped_column(ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False)
    problem_id: Mapped[int] = mapped_column(ForeignKey("problems.id", ondelete="CASCADE"), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    points: Mapped[int] = mapped_column(Integer, default=10, nullable=False)

    # Relationships
    assignment = relationship("Assignment", back_populates="problems")
    problem = relationship("Problem", lazy="selectin")

    def __repr__(self):
        return f"<AssignmentProblem assignment={self.assignment_id} problem={self.problem_id}>"
