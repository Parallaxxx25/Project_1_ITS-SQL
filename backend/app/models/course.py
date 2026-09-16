from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    access_code: Mapped[str] = mapped_column(String(50), nullable=False)
    instructor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    instructor = relationship("User", foreign_keys=[instructor_id], lazy="selectin")
    modules = relationship("Module", back_populates="course", lazy="selectin", order_by="Module.order_index")
    enrollments = relationship("Enrollment", back_populates="course", lazy="selectin")

    def __repr__(self):
        return f"<Course {self.code}: {self.name}>"


class Module(Base):
    __tablename__ = "modules"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    course = relationship("Course", back_populates="modules")
    lessons = relationship("Lesson", back_populates="module", lazy="selectin", order_by="Lesson.order_index")

    def __repr__(self):
        return f"<Module {self.title}>"


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    module_id: Mapped[int] = mapped_column(ForeignKey("modules.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    lesson_type: Mapped[str] = mapped_column(String(20), default="CONTENT", nullable=False)  # CONTENT, PRACTICE, EXAM
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    module = relationship("Module", back_populates="lessons")
    problems = relationship("Problem", back_populates="lesson", lazy="selectin", order_by="Problem.order_index")

    def __repr__(self):
        return f"<Lesson {self.title}>"
