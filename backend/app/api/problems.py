"""
Problem / Dataset / Hint CRUD endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.models.user import User, Role
from app.models.problem import Problem, Dataset, Hint
from app.schemas.problem import (
    ProblemCreate, ProblemOut, ProblemDetailOut,
    DatasetCreate, DatasetOut,
    HintCreate, HintOut,
)
from app.middleware.auth import get_current_user, require_instructor, require_ta

router = APIRouter(prefix="/problems", tags=["Problems"])

# ─── Problems ────────────────────────────────────────────────────────

@router.get("/lesson/{lesson_id}", response_model=List[ProblemOut])
async def list_problems_for_lesson(
    lesson_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List problems in a lesson."""
    result = await db.execute(
        select(Problem)
        .where(Problem.lesson_id == lesson_id)
        .order_by(Problem.order_index)
    )
    problems = result.scalars().all()
    return [
        {
            "id": p.id,
            "lesson_id": p.lesson_id,
            "title": p.title,
            "description": p.description,
            "difficulty": p.difficulty.value,
            "table_name": p.table_name,
            "starter_code": p.starter_code,
            "requirements": p.requirements,
            "order_index": p.order_index,
            "hint_count": len(p.hints) if p.hints else 0,
            "dataset_count": len(p.datasets) if p.datasets else 0,
        }
        for p in problems
    ]


@router.get("/{problem_id}")
async def get_problem(
    problem_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get problem details.
    Students see ProblemOut (without solution).
    Instructors/admins see ProblemDetailOut (with solution + schema).
    """
    result = await db.execute(select(Problem).where(Problem.id == problem_id))
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(404, "Problem not found")

    base = {
        "id": problem.id,
        "lesson_id": problem.lesson_id,
        "title": problem.title,
        "description": problem.description,
        "difficulty": problem.difficulty.value,
        "table_name": problem.table_name,
        "starter_code": problem.starter_code,
        "requirements": problem.requirements,
        "order_index": problem.order_index,
        "hint_count": len(problem.hints) if problem.hints else 0,
        "dataset_count": len(problem.datasets) if problem.datasets else 0,
    }

    if user.role in (Role.INSTRUCTOR, Role.ADMIN):
        base["schema_sql"] = problem.schema_sql
        base["solution_query"] = problem.solution_query

    return base


@router.post("/lesson/{lesson_id}", status_code=status.HTTP_201_CREATED)
async def create_problem(
    lesson_id: int,
    payload: ProblemCreate,
    user: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
):
    """Create a problem in a lesson. Authorized Instructor/Admin only."""
    problem = Problem(
        lesson_id=lesson_id,
        title=payload.title,
        description=payload.description,
        difficulty=payload.difficulty,
        schema_sql=payload.schema_sql,
        solution_query=payload.solution_query,
        starter_code=payload.starter_code,
        table_name=payload.table_name,
        requirements=payload.requirements,
        order_index=payload.order_index,
    )
    db.add(problem)
    await db.commit()
    await db.refresh(problem)
    return {
        "id": problem.id,
        "lesson_id": problem.lesson_id,
        "title": problem.title,
        "description": problem.description,
        "difficulty": problem.difficulty.value,
        "schema_sql": problem.schema_sql,
        "solution_query": problem.solution_query,
        "table_name": problem.table_name,
        "starter_code": problem.starter_code,
        "requirements": problem.requirements,
        "order_index": problem.order_index,
        "hint_count": 0,
        "dataset_count": 0,
    }


@router.put("/{problem_id}")
async def update_problem(
    problem_id: int,
    payload: ProblemCreate,
    user: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
):
    """Update a problem."""
    result = await db.execute(select(Problem).where(Problem.id == problem_id))
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(404, "Problem not found")

    problem.title = payload.title
    problem.description = payload.description
    problem.difficulty = payload.difficulty
    problem.schema_sql = payload.schema_sql
    problem.solution_query = payload.solution_query
    problem.starter_code = payload.starter_code
    problem.table_name = payload.table_name
    problem.requirements = payload.requirements
    problem.order_index = payload.order_index
    await db.commit()
    await db.refresh(problem)
    return {
        "id": problem.id,
        "lesson_id": problem.lesson_id,
        "title": problem.title,
        "description": problem.description,
        "difficulty": problem.difficulty.value,
        "schema_sql": problem.schema_sql,
        "solution_query": problem.solution_query,
        "table_name": problem.table_name,
        "starter_code": problem.starter_code,
        "requirements": problem.requirements,
        "order_index": problem.order_index,
        "hint_count": len(problem.hints) if problem.hints else 0,
        "dataset_count": len(problem.datasets) if problem.datasets else 0,
    }


@router.delete("/{problem_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_problem(
    problem_id: int,
    user: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
):
    """Delete a problem."""
    result = await db.execute(select(Problem).where(Problem.id == problem_id))
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(404, "Problem not found")
    await db.delete(problem)
    await db.commit()


# ─── Datasets ────────────────────────────────────────────────────────

@router.get("/{problem_id}/datasets", response_model=List[DatasetOut])
async def list_datasets(
    problem_id: int,
    user: User = Depends(require_ta),
    db: AsyncSession = Depends(get_db),
):
    """List datasets for a problem. TA/Instructor/Admin only."""
    result = await db.execute(
        select(Dataset)
        .where(Dataset.problem_id == problem_id)
        .order_by(Dataset.order_index)
    )
    datasets = result.scalars().all()
    return [
        {"id": d.id, "problem_id": d.problem_id, "name": d.name, "order_index": d.order_index}
        for d in datasets
    ]


@router.post("/{problem_id}/datasets", status_code=status.HTTP_201_CREATED)
async def create_dataset(
    problem_id: int,
    payload: DatasetCreate,
    user: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
):
    """Add a dataset to a problem."""
    dataset = Dataset(
        problem_id=problem_id,
        name=payload.name,
        insert_sql=payload.insert_sql,
        order_index=payload.order_index,
    )
    db.add(dataset)
    await db.commit()
    await db.refresh(dataset)
    return {"id": dataset.id, "problem_id": dataset.problem_id, "name": dataset.name, "order_index": dataset.order_index}


@router.delete("/datasets/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dataset(
    dataset_id: int,
    user: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
):
    """Delete a dataset."""
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(404, "Dataset not found")
    await db.delete(dataset)
    await db.commit()


# ─── Hints ───────────────────────────────────────────────────────────

@router.get("/{problem_id}/hints", response_model=List[HintOut])
async def list_hints(
    problem_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List hints for a problem (available to all authenticated users)."""
    result = await db.execute(
        select(Hint)
        .where(Hint.problem_id == problem_id)
        .order_by(Hint.order_index)
    )
    hints = result.scalars().all()
    return [
        {"id": h.id, "problem_id": h.problem_id, "message": h.message, "order_index": h.order_index}
        for h in hints
    ]


@router.post("/{problem_id}/hints", status_code=status.HTTP_201_CREATED)
async def create_hint(
    problem_id: int,
    payload: HintCreate,
    user: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
):
    """Add a hint to a problem."""
    hint = Hint(
        problem_id=problem_id,
        message=payload.message,
        order_index=payload.order_index,
    )
    db.add(hint)
    await db.commit()
    await db.refresh(hint)
    return {"id": hint.id, "problem_id": hint.problem_id, "message": hint.message, "order_index": hint.order_index}


@router.delete("/hints/{hint_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_hint(
    hint_id: int,
    user: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
):
    """Delete a hint."""
    result = await db.execute(select(Hint).where(Hint.id == hint_id))
    hint = result.scalar_one_or_none()
    if not hint:
        raise HTTPException(404, "Hint not found")
    await db.delete(hint)
    await db.commit()
