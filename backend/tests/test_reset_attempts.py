"""
Guards scripts/reset_attempts.py — the destructive one.

Only two things matter and neither is obvious from reading it: a dry run must
change nothing, and --yes must actually clear the rows. Runs against a throwaway
SQLite file, so no live service and no Postgres needed.

Run:  cd backend && python -m pytest tests/test_reset_attempts.py
"""
from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import create_engine, text

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.reset_attempts import (  # noqa: E402
    BACKEND_WIPES,
    TUTOR_WIPES,
    apply_wipe,
    collect_counts,
)

SCHEMA = (
    "CREATE TABLE interaction_history (id INTEGER PRIMARY KEY, attempt_number INT)",
    "CREATE TABLE student_progress (id INTEGER PRIMARY KEY, attempts INT, best_score REAL)",
    "CREATE TABLE hint_requests (id INTEGER PRIMARY KEY, hint_token TEXT)",
)

SEED = (
    "INSERT INTO interaction_history (attempt_number) VALUES (1), (2), (3)",
    "INSERT INTO student_progress (attempts, best_score) VALUES (4, 0.9), (0, 0.0), (2, 1.0)",
    "INSERT INTO hint_requests (hint_token) VALUES ('tok-a'), ('tok-b')",
)


def _engine(tmp_path: Path):
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}")
    with engine.begin() as conn:
        for stmt in SCHEMA + SEED:
            conn.execute(text(stmt))
    return engine


def _scalar(engine, sql: str) -> int:
    with engine.connect() as conn:
        return conn.execute(text(sql)).scalar_one()


def test_dry_run_counts_and_changes_nothing(tmp_path):
    engine = _engine(tmp_path)

    counts = {**collect_counts(engine, TUTOR_WIPES), **collect_counts(engine, BACKEND_WIPES)}

    assert counts["tutor.interaction_history rows to delete"] == 3
    # the attempts = 0 row is already clean and must not be counted
    assert counts["tutor.student_progress rows to zero"] == 2
    assert counts["backend.hint_requests rows to delete"] == 2

    assert _scalar(engine, "SELECT COUNT(*) FROM interaction_history") == 3
    assert _scalar(engine, "SELECT COUNT(*) FROM hint_requests") == 2
    assert _scalar(engine, "SELECT SUM(attempts) FROM student_progress") == 6


def test_wipe_clears_counters_but_keeps_scores(tmp_path):
    engine = _engine(tmp_path)

    apply_wipe(engine, TUTOR_WIPES)
    apply_wipe(engine, BACKEND_WIPES)

    assert _scalar(engine, "SELECT COUNT(*) FROM interaction_history") == 0
    assert _scalar(engine, "SELECT COUNT(*) FROM hint_requests") == 0
    assert _scalar(engine, "SELECT SUM(attempts) FROM student_progress") == 0
    # rows survive, and best_score is untouched — mastery only ever promotes
    assert _scalar(engine, "SELECT COUNT(*) FROM student_progress") == 3
    assert _scalar(engine, "SELECT COUNT(*) FROM student_progress WHERE best_score = 1.0") == 1
