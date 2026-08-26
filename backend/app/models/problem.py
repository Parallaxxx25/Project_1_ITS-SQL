import enum
from sqlalchemy import String, Text, Integer, Enum, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Difficulty(str, enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class Problem(Base):
    __tablename__ = "problems"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[Difficulty] = mapped_column(Enum(Difficulty), default=Difficulty.BEGINNER, nullable=False)
    schema_sql: Mapped[str] = mapped_column(Text, nullable=False)  # CREATE TABLE statements
    solution_query: Mapped[str] = mapped_column(Text, nullable=False)  # Golden/reference query
    starter_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    table_name: Mapped[str | None] = mapped_column(String(100), nullable=True)  # Primary table for display
    requirements: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # List of requirement strings
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # This problem's id in the tutor service's own catalog (matched via its
    # GET /api/v1/problems, keyed on external_problem_id = our Problem.id).
    # NULL means the tutor service has no gold query for this problem, so
    # submissions to it never get a hint_token.
    tutor_problem_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Relationships
    lesson = relationship("Lesson", back_populates="problems")
    datasets = relationship("Dataset", back_populates="problem", lazy="selectin", order_by="Dataset.order_index")
    hints = relationship("Hint", back_populates="problem", lazy="selectin", order_by="Hint.order_index")

    def __repr__(self):
        return f"<Problem {self.title}>"


class Dataset(Base):
    """
    Multiple datasets per problem to prevent hardcoded answers.
    Student query must pass ALL datasets to be considered correct.
    """
    __tablename__ = "datasets"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    problem_id: Mapped[int] = mapped_column(ForeignKey("problems.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    insert_sql: Mapped[str] = mapped_column(Text, nullable=False)  # INSERT statements
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    problem = relationship("Problem", back_populates="datasets")

    def __repr__(self):
        return f"<Dataset {self.name} for Problem#{self.problem_id}>"


class Hint(Base):
    __tablename__ = "hints"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    problem_id: Mapped[int] = mapped_column(ForeignKey("problems.id", ondelete="CASCADE"), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    problem = relationship("Problem", back_populates="hints")

    def __repr__(self):
        return f"<Hint for Problem#{self.problem_id}>"
