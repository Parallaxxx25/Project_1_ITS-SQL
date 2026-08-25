import enum
from datetime import datetime, timezone
from sqlalchemy import String, Enum, DateTime, Boolean, Text, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Role(str, enum.Enum):
    STUDENT = "student"
    TA = "ta"
    INSTRUCTOR = "instructor"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    student_id: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True, index=True)
    role: Mapped[Role] = mapped_column(Enum(Role), default=Role.STUDENT, nullable=False)
    modules: Mapped[str | None] = mapped_column(Text, nullable=True)   # JSON string e.g. '["sql","python"]'
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    enrollments = relationship("Enrollment", back_populates="user", lazy="selectin")
    submissions = relationship("Submission", back_populates="user", lazy="selectin")

    def modules_list(self) -> list[str]:
        """Parse modules JSON string → list."""
        import json
        if not self.modules:
            return []
        try:
            return json.loads(self.modules)
        except Exception:
            return []

    def __repr__(self):
        return f"<User {self.email} role={self.role}>"