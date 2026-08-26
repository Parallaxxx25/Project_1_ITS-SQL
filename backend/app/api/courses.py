"""
Course / Module / Lesson CRUD endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.models.user import User, Role
from app.models.course import Course, Module, Lesson
from app.models.enrollment import Enrollment
from app.schemas.course import (
    CourseCreate, CourseOut, CourseEnroll,
    ModuleCreate, ModuleOut,
    LessonCreate, LessonOut,
)
from app.middleware.auth import get_current_user, require_instructor, require_ta, require_authorized_instructor

router = APIRouter(prefix="/courses", tags=["Courses"])

# ─── Helper ──────────────────────────────────────────────────────────

def _course_to_out(course: Course, hide_code: bool = True) -> dict:
    return {
        "id": course.id,
        "code": course.code,
        "name": course.name,
        "description": course.description,
        "access_code": None if hide_code else course.access_code,
        "instructor_id": course.instructor_id,
        "instructor_name": course.instructor.name if course.instructor else None,
        "is_active": course.is_active,
        "created_at": course.created_at,
        "module_count": len(course.modules) if course.modules else 0,
        "enrolled_count": len(course.enrollments) if course.enrollments else 0,
    }


# ─── Courses ─────────────────────────────────────────────────────────

@router.get("", response_model=List[CourseOut])
async def list_courses(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all courses. Instructors/admins see all; students see enrolled."""
    if user.role in (Role.INSTRUCTOR, Role.ADMIN):
        result = await db.execute(select(Course).order_by(Course.created_at.desc()))
        courses = result.scalars().all()
        return [_course_to_out(c, hide_code=False) for c in courses]
    else:
        # Students/TAs see only enrolled courses
        result = await db.execute(
            select(Course)
            .join(Enrollment, Enrollment.course_id == Course.id)
            .where(Enrollment.user_id == user.id)
            .order_by(Course.created_at.desc())
        )
        courses = result.scalars().all()
        return [_course_to_out(c) for c in courses]


@router.post("", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
async def create_course(
    payload: CourseCreate,
    user: User = Depends(require_authorized_instructor),
    db: AsyncSession = Depends(get_db),
):
    """Create a new course. Authorized Instructor/Admin only."""
    existing = await db.execute(select(Course).where(Course.code == payload.code))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Course code already exists")

    course = Course(
        code=payload.code,
        name=payload.name,
        description=payload.description,
        access_code=payload.access_code,
        instructor_id=user.id,
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return _course_to_out(course, hide_code=False)


@router.get("/{course_id}", response_model=CourseOut)
async def get_course(
    course_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get course details."""
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(404, "Course not found")

    is_privileged = user.role in (Role.INSTRUCTOR, Role.ADMIN)
    return _course_to_out(course, hide_code=not is_privileged)


@router.put("/{course_id}", response_model=CourseOut)
async def update_course(
    course_id: int,
    payload: CourseCreate,
    user: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
):
    """Update course. Instructor/Admin only."""
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(404, "Course not found")
    if course.instructor_id != user.id and user.role != Role.ADMIN:
        raise HTTPException(403, "Not the course instructor")

    course.code = payload.code
    course.name = payload.name
    course.description = payload.description
    course.access_code = payload.access_code
    await db.commit()
    await db.refresh(course)
    return _course_to_out(course, hide_code=False)


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(
    course_id: int,
    user: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
):
    """Delete course. Admin or course instructor only."""
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(404, "Course not found")
    if course.instructor_id != user.id and user.role != Role.ADMIN:
        raise HTTPException(403, "Not the course instructor")
    await db.delete(course)
    await db.commit()


# ─── Enrollment ──────────────────────────────────────────────────────

@router.post("/{course_ref}/enroll")
async def enroll_in_course(
    course_ref: str,
    payload: CourseEnroll,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Enroll current user in a course using access code.

    `course_ref` is the course code (what the frontend course cards carry,
    e.g. "06070999") or the numeric row id. Code is tried first: course codes
    here are all-digit strings, so an id-first lookup would silently resolve
    "06070999" to row 6070999.
    """
    result = await db.execute(select(Course).where(Course.code == course_ref))
    course = result.scalar_one_or_none()
    if course is None and course_ref.isdigit():
        result = await db.execute(select(Course).where(Course.id == int(course_ref)))
        course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(404, "Course not found")
    if course.access_code != payload.access_code:
        raise HTTPException(400, "Invalid access code")

    # Check already enrolled
    existing = await db.execute(
        select(Enrollment).where(
            Enrollment.user_id == user.id,
            Enrollment.course_id == course.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Already enrolled in this course")

    enrollment = Enrollment(
        user_id=user.id,
        course_id=course.id,
        role="student",
    )
    db.add(enrollment)
    await db.commit()
    return {"message": "Enrolled successfully", "course_id": course.id}


@router.get("/{course_id}/students")
async def list_students(
    course_id: int,
    user: User = Depends(require_ta),
    db: AsyncSession = Depends(get_db),
):
    """List enrolled students. TA/Instructor/Admin only."""
    result = await db.execute(
        select(Enrollment)
        .where(Enrollment.course_id == course_id)
        .order_by(Enrollment.enrolled_at)
    )
    enrollments = result.scalars().all()
    return [
        {
            "enrollment_id": e.id,
            "user_id": e.user.id,
            "email": e.user.email,
            "name": e.user.name,
            "student_id": e.user.student_id,
            "role": e.role,
            "enrolled_at": e.enrolled_at.isoformat(),
        }
        for e in enrollments
    ]


# ─── Modules ─────────────────────────────────────────────────────────

@router.get("/{course_id}/modules", response_model=List[ModuleOut])
async def list_modules(
    course_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List modules in a course."""
    result = await db.execute(
        select(Module)
        .where(Module.course_id == course_id)
        .order_by(Module.order_index)
    )
    modules = result.scalars().all()
    return [
        {
            "id": m.id,
            "course_id": m.course_id,
            "title": m.title,
            "description": m.description,
            "order_index": m.order_index,
            "is_active": m.is_active,
            "lesson_count": len(m.lessons) if m.lessons else 0,
        }
        for m in modules
    ]


@router.post("/{course_id}/modules", response_model=ModuleOut, status_code=status.HTTP_201_CREATED)
async def create_module(
    course_id: int,
    payload: ModuleCreate,
    user: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
):
    """Create a module in a course."""
    module = Module(
        course_id=course_id,
        title=payload.title,
        description=payload.description,
        order_index=payload.order_index,
    )
    db.add(module)
    await db.commit()
    await db.refresh(module)
    return {
        "id": module.id,
        "course_id": module.course_id,
        "title": module.title,
        "description": module.description,
        "order_index": module.order_index,
        "is_active": module.is_active,
        "lesson_count": 0,
    }


@router.put("/modules/{module_id}", response_model=ModuleOut)
async def update_module(
    module_id: int,
    payload: ModuleCreate,
    user: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
):
    """Update a module."""
    result = await db.execute(select(Module).where(Module.id == module_id))
    module = result.scalar_one_or_none()
    if not module:
        raise HTTPException(404, "Module not found")
    module.title = payload.title
    module.description = payload.description
    module.order_index = payload.order_index
    await db.commit()
    await db.refresh(module)
    return {
        "id": module.id,
        "course_id": module.course_id,
        "title": module.title,
        "description": module.description,
        "order_index": module.order_index,
        "is_active": module.is_active,
        "lesson_count": len(module.lessons) if module.lessons else 0,
    }


@router.delete("/modules/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_module(
    module_id: int,
    user: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
):
    """Delete a module."""
    result = await db.execute(select(Module).where(Module.id == module_id))
    module = result.scalar_one_or_none()
    if not module:
        raise HTTPException(404, "Module not found")
    await db.delete(module)
    await db.commit()


# ─── Lessons ─────────────────────────────────────────────────────────

@router.get("/modules/{module_id}/lessons", response_model=List[LessonOut])
async def list_lessons(
    module_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List lessons in a module."""
    result = await db.execute(
        select(Lesson)
        .where(Lesson.module_id == module_id)
        .order_by(Lesson.order_index)
    )
    lessons = result.scalars().all()
    return [
        {
            "id": l.id,
            "module_id": l.module_id,
            "title": l.title,
            "content": l.content,
            "order_index": l.order_index,
            "lesson_type": l.lesson_type,
            "is_active": l.is_active,
            "problem_count": len(l.problems) if l.problems else 0,
        }
        for l in lessons
    ]


@router.post("/modules/{module_id}/lessons", response_model=LessonOut, status_code=status.HTTP_201_CREATED)
async def create_lesson(
    module_id: int,
    payload: LessonCreate,
    user: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
):
    """Create a lesson in a module."""
    lesson = Lesson(
        module_id=module_id,
        title=payload.title,
        content=payload.content,
        order_index=payload.order_index,
        lesson_type=payload.lesson_type,
    )
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    return {
        "id": lesson.id,
        "module_id": lesson.module_id,
        "title": lesson.title,
        "content": lesson.content,
        "order_index": lesson.order_index,
        "lesson_type": lesson.lesson_type,
        "is_active": lesson.is_active,
        "problem_count": 0,
    }


@router.put("/lessons/{lesson_id}", response_model=LessonOut)
async def update_lesson(
    lesson_id: int,
    payload: LessonCreate,
    user: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
):
    """Update a lesson."""
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    lesson.title = payload.title
    lesson.content = payload.content
    lesson.order_index = payload.order_index
    lesson.lesson_type = payload.lesson_type
    await db.commit()
    await db.refresh(lesson)
    return {
        "id": lesson.id,
        "module_id": lesson.module_id,
        "title": lesson.title,
        "content": lesson.content,
        "order_index": lesson.order_index,
        "lesson_type": lesson.lesson_type,
        "is_active": lesson.is_active,
        "problem_count": len(lesson.problems) if lesson.problems else 0,
    }


@router.delete("/lessons/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lesson(
    lesson_id: int,
    user: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
):
    """Delete a lesson."""
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    await db.delete(lesson)
    await db.commit()
