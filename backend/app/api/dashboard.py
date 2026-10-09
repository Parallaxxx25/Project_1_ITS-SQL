"""
Dashboard & Analytics endpoints.
Student progress, class analytics, instructor overview.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, and_, distinct, case
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.models.user import User, Role
from app.models.course import Course, Module, Lesson
from app.models.problem import Problem
from app.models.submission import Submission, SubmissionLog
from app.models.enrollment import Enrollment
from app.models.assignment import Assignment, AssignmentProblem
from app.schemas.submission import StudentProgress, ClassAnalytics
from app.middleware.auth import get_current_user, require_ta, require_instructor

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# ─── Student Dashboard ──────────────────────────────────────────────

@router.get("/my-progress")
async def my_progress(
    course_id: int = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current student's progress overview."""
    # Total problems available (in enrolled courses if course_id provided)
    total_problems_query = select(func.count(Problem.id))
    if course_id:
        total_problems_query = total_problems_query.join(
            Lesson, Lesson.id == Problem.lesson_id
        ).join(
            Module, Module.id == Lesson.module_id
        ).where(Module.course_id == course_id)

    total_problems_result = await db.execute(total_problems_query)
    total_problems = total_problems_result.scalar()

    # Solved problems (unique problems with at least one correct submission)
    solved_query = select(func.count(distinct(Submission.problem_id))).where(
        and_(
            Submission.user_id == user.id,
            Submission.is_correct == True,
        )
    )
    solved_result = await db.execute(solved_query)
    solved_problems = solved_result.scalar()

    # Total submissions
    total_subs_result = await db.execute(
        select(func.count(Submission.id)).where(Submission.user_id == user.id)
    )
    total_submissions = total_subs_result.scalar()

    # Average attempts per solved problem
    avg_attempts = 0.0
    if solved_problems > 0:
        avg_result = await db.execute(
            select(func.avg(Submission.attempt_number)).where(
                and_(
                    Submission.user_id == user.id,
                    Submission.is_correct == True,
                )
            )
        )
        avg_attempts = round(avg_result.scalar() or 0, 2)

    # Recent submissions
    recent_result = await db.execute(
        select(Submission)
        .where(Submission.user_id == user.id)
        .order_by(Submission.submitted_at.desc())
        .limit(10)
    )
    recent = recent_result.scalars().all()

    # Per-module progress
    module_progress = []
    if course_id:
        modules_result = await db.execute(
            select(Module)
            .where(Module.course_id == course_id)
            .order_by(Module.order_index)
        )
        modules = modules_result.scalars().all()
        for m in modules:
            # Count problems in this module
            mod_problems_result = await db.execute(
                select(func.count(Problem.id))
                .join(Lesson, Lesson.id == Problem.lesson_id)
                .where(Lesson.module_id == m.id)
            )
            mod_total = mod_problems_result.scalar()

            # Count solved in this module
            mod_solved_result = await db.execute(
                select(func.count(distinct(Submission.problem_id)))
                .join(Problem, Problem.id == Submission.problem_id)
                .join(Lesson, Lesson.id == Problem.lesson_id)
                .where(
                    and_(
                        Lesson.module_id == m.id,
                        Submission.user_id == user.id,
                        Submission.is_correct == True,
                    )
                )
            )
            mod_solved = mod_solved_result.scalar()

            module_progress.append({
                "module_id": m.id,
                "title": m.title,
                "total_problems": mod_total,
                "solved_problems": mod_solved,
                "progress_pct": round((mod_solved / mod_total * 100) if mod_total > 0 else 0, 1),
            })

    return {
        "total_problems": total_problems,
        "solved_problems": solved_problems,
        "total_submissions": total_submissions,
        "average_attempts": avg_attempts,
        "completion_pct": round((solved_problems / total_problems * 100) if total_problems > 0 else 0, 1),
        "module_progress": module_progress,
        "recent_submissions": [
            {
                "id": s.id,
                "problem_id": s.problem_id,
                "problem_title": s.problem.title if s.problem else None,
                "is_correct": s.is_correct,
                "attempt_number": s.attempt_number,
                "submitted_at": s.submitted_at.isoformat(),
            }
            for s in recent
        ],
    }


# ─── Instructor / TA Dashboard ──────────────────────────────────────

@router.get("/class/{course_id}")
async def class_analytics(
    course_id: int,
    user: User = Depends(require_ta),
    db: AsyncSession = Depends(get_db),
):
    """Class-level analytics for a course. TA/Instructor/Admin only."""
    # Total enrolled students
    total_students_result = await db.execute(
        select(func.count(Enrollment.id)).where(
            and_(
                Enrollment.course_id == course_id,
                Enrollment.role == "student",
            )
        )
    )
    total_students = total_students_result.scalar()

    # Active students (submitted in last 7 days)
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    active_result = await db.execute(
        select(func.count(distinct(Submission.user_id)))
        .join(Enrollment, and_(
            Enrollment.user_id == Submission.user_id,
            Enrollment.course_id == course_id,
        ))
        .where(Submission.submitted_at >= week_ago)
    )
    active_students = active_result.scalar()

    # Total submissions in this course
    total_subs_result = await db.execute(
        select(func.count(Submission.id))
        .join(Problem, Problem.id == Submission.problem_id)
        .join(Lesson, Lesson.id == Problem.lesson_id)
        .join(Module, Module.id == Lesson.module_id)
        .where(Module.course_id == course_id)
    )
    total_submissions = total_subs_result.scalar()

    # Average score (% of solved problems per student)
    # Get all problems in course
    course_problems_result = await db.execute(
        select(func.count(Problem.id))
        .join(Lesson, Lesson.id == Problem.lesson_id)
        .join(Module, Module.id == Lesson.module_id)
        .where(Module.course_id == course_id)
    )
    total_course_problems = course_problems_result.scalar()

    # Problem success rates
    problem_stats = []
    problems_result = await db.execute(
        select(Problem)
        .join(Lesson, Lesson.id == Problem.lesson_id)
        .join(Module, Module.id == Lesson.module_id)
        .where(Module.course_id == course_id)
        .order_by(Module.order_index, Lesson.order_index, Problem.order_index)
    )
    problems = problems_result.scalars().all()

    for p in problems:
        # Total attempts
        attempts_result = await db.execute(
            select(func.count(Submission.id)).where(Submission.problem_id == p.id)
        )
        total_attempts = attempts_result.scalar()

        # Unique solvers
        solvers_result = await db.execute(
            select(func.count(distinct(Submission.user_id))).where(
                and_(Submission.problem_id == p.id, Submission.is_correct == True)
            )
        )
        unique_solvers = solvers_result.scalar()

        success_rate = round((unique_solvers / total_students * 100) if total_students > 0 else 0, 1)

        problem_stats.append({
            "problem_id": p.id,
            "title": p.title,
            "difficulty": p.difficulty.value,
            "total_attempts": total_attempts,
            "unique_solvers": unique_solvers,
            "success_rate": success_rate,
        })

    # Recent activity (last 20 submissions)
    recent_result = await db.execute(
        select(Submission)
        .join(Problem, Problem.id == Submission.problem_id)
        .join(Lesson, Lesson.id == Problem.lesson_id)
        .join(Module, Module.id == Lesson.module_id)
        .where(Module.course_id == course_id)
        .order_by(Submission.submitted_at.desc())
        .limit(20)
    )
    recent = recent_result.scalars().all()

    return {
        "total_students": total_students,
        "active_students": active_students,
        "total_submissions": total_submissions,
        "total_problems": total_course_problems,
        "problem_success_rates": problem_stats,
        "recent_activity": [
            {
                "submission_id": s.id,
                "user_name": s.user.name if s.user else "Unknown",
                "student_id": s.user.student_id if s.user else None,
                "problem_title": s.problem.title if s.problem else None,
                "is_correct": s.is_correct,
                "submitted_at": s.submitted_at.isoformat(),
            }
            for s in recent
        ],
    }


@router.get("/class/{course_id}/students", response_model=List[StudentProgress])
async def student_progress_list(
    course_id: int,
    user: User = Depends(require_ta),
    db: AsyncSession = Depends(get_db),
):
    """List all students in a course with their progress. TA/Instructor/Admin only."""
    # Get enrolled students
    enrollments_result = await db.execute(
        select(Enrollment)
        .where(
            and_(
                Enrollment.course_id == course_id,
                Enrollment.role == "student",
            )
        )
    )
    enrollments = enrollments_result.scalars().all()

    # Total problems in course
    total_problems_result = await db.execute(
        select(func.count(Problem.id))
        .join(Lesson, Lesson.id == Problem.lesson_id)
        .join(Module, Module.id == Lesson.module_id)
        .where(Module.course_id == course_id)
    )
    total_problems = total_problems_result.scalar()

    students_progress = []
    for enrollment in enrollments:
        student = enrollment.user
        if not student:
            continue

        # Solved problems
        solved_result = await db.execute(
            select(func.count(distinct(Submission.problem_id))).where(
                and_(
                    Submission.user_id == student.id,
                    Submission.is_correct == True,
                )
            )
        )
        solved = solved_result.scalar()

        # Total submissions
        subs_result = await db.execute(
            select(func.count(Submission.id)).where(Submission.user_id == student.id)
        )
        total_subs = subs_result.scalar()

        # Avg attempts
        avg_result = await db.execute(
            select(func.avg(Submission.attempt_number)).where(
                and_(
                    Submission.user_id == student.id,
                    Submission.is_correct == True,
                )
            )
        )
        avg_attempts = round(avg_result.scalar() or 0, 2)

        # Last activity
        last_result = await db.execute(
            select(func.max(Submission.submitted_at)).where(Submission.user_id == student.id)
        )
        last_activity = last_result.scalar()

        students_progress.append(StudentProgress(
            user_id=student.id,
            student_id=student.student_id,
            name=student.name,
            total_problems=total_problems,
            solved_problems=solved,
            total_submissions=total_subs,
            average_attempts=avg_attempts,
            last_activity=last_activity,
        ))

    # Sort by solved problems descending
    students_progress.sort(key=lambda s: s.solved_problems, reverse=True)
    return students_progress


@router.get("/attempts")
async def class_attempts(
    user: User = Depends(require_ta),
    db: AsyncSession = Depends(get_db),
):
    """Every student, and every attempt they logged to submission_logs —
    what the instructor dashboard's Students & Analytics section is built
    from. The live frontend grades in the browser and never writes
    Submission, so submission_logs is the only server-side record of student
    work; the endpoints above, which read Submission, see none of it.
    TA/Instructor/Admin only."""
    students = (await db.scalars(
        select(User).where(User.role == Role.STUDENT).order_by(User.id)
    )).all()
    logs = (await db.scalars(
        select(SubmissionLog)
        .join(User, User.id == SubmissionLog.user_id)
        .where(User.role == Role.STUDENT)
        .order_by(SubmissionLog.id)
    )).all()
    return {
        "students": [
            {"id": s.id, "username": s.username, "name": s.name, "student_id": s.student_id}
            for s in students
        ],
        "attempts": [
            {
                "id": l.id,
                "user_id": l.user_id,
                "client_problem_id": l.client_problem_id,
                "workspace_mode": l.workspace_mode,
                "action": l.action,
                "query": l.query,
                # The browser's verdict — what the student was shown.
                "client_is_correct": l.client_is_correct,
                # The tutor's server-side verdict; NULL if it never graded this.
                "is_correct": l.is_correct,
                "execution_time_ms": l.execution_time_ms,
                "created_at": l.created_at.isoformat(),
            }
            for l in logs
        ],
    }
