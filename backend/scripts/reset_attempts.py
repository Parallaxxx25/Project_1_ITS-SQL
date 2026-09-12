"""
One-shot reset of the hint-escalation counters inflated by the old
single-button workspace.

Before the Run Code / Submit Answer split, every query a student ran was a
graded submission, so ``student_progress.attempts`` counted data-inspection
queries as failed attempts and the hint ladder
(``escalation_policy.attempt_count_floor``) handed out level-4 hints on first
genuine attempts. This clears that history so the ladder starts clean.

DESTRUCTIVE AND IRREVERSIBLE. It deletes every row of the tutor service's
``interaction_history`` — the same rows behind evaluation_report.md and
judge_results.csv. It always writes a backup first and refuses to write
anything without an explicit --yes.

Spans both databases because they are coupled: the backend's ``hint_requests``
rows hold hint_tokens that only resolve against tutor ``interaction_history``,
so wiping one without the other leaves dangling tokens that 404.

Usage:
    cd backend
    python -m scripts.reset_attempts                # dry run: counts only
    python -m scripts.reset_attempts --yes          # back up, then wipe

The tutor database URL comes from TUTOR_POSTGRES_URL_SYNC (same default as
the tutor service's own POSTGRES_URL_SYNC setting).
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from sqlalchemy import create_engine, text

BACKUP_DIR = Path(__file__).resolve().parents[1] / "backups"

DEFAULT_TUTOR_URL = "postgresql://tutor:tutor_pass@localhost:5432/tutor_db"


@dataclass(frozen=True)
class Wipe:
    """One countable, appliable change. ``count_sql`` must return a single
    number: the rows ``write_sql`` would affect."""

    label: str
    count_sql: str
    write_sql: str


TUTOR_WIPES = (
    Wipe(
        "tutor.interaction_history rows to delete",
        "SELECT COUNT(*) FROM interaction_history",
        "DELETE FROM interaction_history",
    ),
    Wipe(
        "tutor.student_progress rows to zero",
        "SELECT COUNT(*) FROM student_progress WHERE attempts > 0",
        "UPDATE student_progress SET attempts = 0 WHERE attempts > 0",
    ),
)

# best_score and mastery_level are deliberately left alone: mastery only ever
# promotes (backend/memory/mastery.py), so resetting it would demote students
# who genuinely earned the level.

BACKEND_WIPES = (
    Wipe(
        "backend.hint_requests rows to delete",
        "SELECT COUNT(*) FROM hint_requests",
        "DELETE FROM hint_requests",
    ),
)


def collect_counts(engine, wipes) -> dict[str, int]:
    """How many rows each wipe would touch. Reads only."""
    with engine.connect() as conn:
        return {w.label: conn.execute(text(w.count_sql)).scalar_one() for w in wipes}


def apply_wipe(engine, wipes) -> dict[str, int]:
    """Apply every wipe in one transaction. Returns rows actually affected."""
    affected: dict[str, int] = {}
    with engine.begin() as conn:
        for w in wipes:
            affected[w.label] = conn.execute(text(w.write_sql)).rowcount
    return affected


# ---------------------------------------------------------------------------
# Backups — never wipe without one
# ---------------------------------------------------------------------------

def backup_sqlite(db_path: Path, stamp: str) -> Path:
    BACKUP_DIR.mkdir(exist_ok=True)
    target = BACKUP_DIR / f"{db_path.stem}_{stamp}{db_path.suffix}"
    shutil.copy2(db_path, target)
    return target


def backup_postgres(url: str, stamp: str) -> Path:
    BACKUP_DIR.mkdir(exist_ok=True)
    target = BACKUP_DIR / f"tutor_{stamp}.sql"
    if shutil.which("pg_dump") is None:
        sys.exit("pg_dump not found on PATH — refusing to wipe without a backup.")
    with target.open("w", encoding="utf-8") as fh:
        result = subprocess.run(["pg_dump", url], stdout=fh, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        sys.exit(f"pg_dump failed, nothing was wiped:\n{result.stderr}")
    return target


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def _sqlite_path(url: str) -> Path:
    """Filesystem path behind a sqlite URL, resolved from the backend dir."""
    rel = url.split(":///", 1)[1]
    return (Path.cwd() / rel).resolve()


def main(argv: list[str] | None = None) -> None:
    argv = sys.argv[1:] if argv is None else argv
    confirmed = "--yes" in argv

    from app.config import settings  # imported here so --help-ish use needs no env

    backend_url = settings.DATABASE_URL.replace("+aiosqlite", "")
    tutor_url = os.environ.get("TUTOR_POSTGRES_URL_SYNC", DEFAULT_TUTOR_URL)

    tutor_engine = create_engine(tutor_url)
    backend_engine = create_engine(backend_url)

    counts = {
        **collect_counts(tutor_engine, TUTOR_WIPES),
        **collect_counts(backend_engine, BACKEND_WIPES),
    }
    for label, n in counts.items():
        print(f"  {n:>8}  {label}")

    if not confirmed:
        print("\nDry run — nothing written. Re-run with --yes to back up and wipe.")
        return

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    print(f"\nBacking up to {BACKUP_DIR}/ ...")
    print(f"  {backup_postgres(tutor_url, stamp)}")
    if backend_url.startswith("sqlite"):
        print(f"  {backup_sqlite(_sqlite_path(backend_url), stamp)}")
    else:
        sys.exit("backend is not sqlite — back it up by hand, then wipe by hand.")

    print("\nWiping ...")
    affected = {
        **apply_wipe(tutor_engine, TUTOR_WIPES),
        **apply_wipe(backend_engine, BACKEND_WIPES),
    }
    for label, n in affected.items():
        print(f"  {n:>8}  {label}")
    print("\nDone. The hint ladder now starts at level 1 for every student.")


if __name__ == "__main__":
    main()
