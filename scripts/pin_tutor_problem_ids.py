"""Import the partner problem catalog into the tutor DB with each problem's id
pinned to the tutorProblemId that frontend/src/lib/problems.js already sends.

Why: the frontend hard-codes tutor problem ids (106-394) — a snapshot of the
autoincrement in whichever tutor DB tutor/scripts/import_partner_problems.py
was first run against. A fresh tutor seed yields ids 1-24, so every hint
request names a problem that doesn't exist and the hint button never shows.
This runs that same importer's upsert, but sets problems_id_seq before each
insert so the row lands on the id the frontend expects (matched by title).

Run on the VM host, from the repo root, after both seeds (DEPLOY_VM.md Phase 6):

    python3 scripts/pin_tutor_problem_ids.py --dry-run
    python3 scripts/pin_tutor_problem_ids.py

All-or-nothing: refuses to start if a title has no mapping or a target id is
held by a different problem, and rolls back unless every id matches.
Idempotent — a re-run upserts the same rows onto the same ids.
"""

import argparse
import asyncio
import csv
import io
import logging
import re
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
COMPOSE = ["docker", "compose", "-f", str(REPO / "docker-compose.prod.yml")]
PROBLEMS_JS = REPO / "frontend" / "src" / "lib" / "problems.js"
_ENTRY = re.compile(
    r"""\{\s*id:\s*\d+,\s*tutorProblemId:\s*(\d+),.*?title:\s*(["'])(.*?)\2""", re.S
)


# ── host side ────────────────────────────────────────────────────────────


def _run(*args: str, stdin: str | None = None) -> str:
    return subprocess.run(
        [*COMPOSE, *args], input=stdin, capture_output=True, text=True, check=True
    ).stdout


def _frontend_map() -> dict[str, int]:
    entries = _ENTRY.findall(PROBLEMS_JS.read_text(encoding="utf-8"))
    mapping = {title: int(tid) for tid, _, title in entries}
    if len(mapping) != len(entries) or len(set(mapping.values())) != len(entries):
        sys.exit("problems.js: duplicate titles or tutorProblemIds — mapping is ambiguous")
    return mapping


def _partner_catalog_sqlite(path: Path) -> None:
    """The importer reads SQLite; the partner catalog now lives in app-postgres."""
    db = sqlite3.connect(path)
    # Typed columns: an untyped SQLite column keeps CSV ids as text, and '1' != 1
    # when matched against external_problem_id.
    for table, ddl, query in (
        ("problems", "id integer primary key, lesson_id integer, title text, description text,"
                     " difficulty text, solution_query text, starter_code text",
         "select id, lesson_id, title, description, difficulty::text,"
         " solution_query, starter_code from problems order by id"),
        ("lessons", "id integer primary key, title text",
         "select id, title from lessons order by id"),
    ):
        out = _run("exec", "-T", "app-postgres", "psql", "-U", "its_sql", "-d", "its_sql",
                   "-c", f"\\copy ({query}) to stdout with csv header")
        rows = list(csv.reader(io.StringIO(out)))[1:]
        db.execute(f"create table {table} ({ddl})")
        db.executemany(
            f"insert into {table} values ({', '.join('?' * len(rows[0]))})",
            [[v if v != "" else None for v in r] for r in rows],
        )
    db.commit()
    db.close()


def host_main(dry_run: bool) -> None:
    mapping = _frontend_map()
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        _partner_catalog_sqlite(tmp / "partner.db")
        (tmp / "map.tsv").write_text(
            "".join(f"{t}\t{i}\n" for t, i in mapping.items()), encoding="utf-8"
        )
        for f in ("partner.db", "map.tsv"):
            _run("cp", str(tmp / f), f"tutor-api:/tmp/pin_{f}")
        _run("cp", __file__, "tutor-api:/tmp/pin_tutor_problem_ids.py")
    try:
        subprocess.run(
            [*COMPOSE, "exec", "-T", "-w", "/app", "tutor-api", "python",
             "/tmp/pin_tutor_problem_ids.py", "--inner",
             *(["--dry-run"] if dry_run else [])],
            check=True,
        )
    finally:
        _run("exec", "-T", "tutor-api", "rm", "-f", "/tmp/pin_partner.db",
             "/tmp/pin_map.tsv", "/tmp/pin_tutor_problem_ids.py")


# ── inside tutor-api ─────────────────────────────────────────────────────


async def inner_main(dry_run: bool) -> None:
    sys.path.insert(0, "/app")
    from sqlalchemy import text

    from backend.db.database import async_session_factory, init_db
    from scripts import import_partner_problems as imp

    log = logging.getLogger("pin_tutor_problem_ids")
    await init_db()
    want = {}
    for line in Path("/tmp/pin_map.tsv").read_text(encoding="utf-8").splitlines():
        title, tid = line.rsplit("\t", 1)
        want[title] = int(tid)
    rows = imp.read_partner_problems(Path("/tmp/pin_partner.db"))

    missing = [r["title"] for r in rows if r["title"] not in want]
    if missing:
        sys.exit(f"no tutorProblemId in problems.js for: {missing}")

    async with async_session_factory() as session:
        holder = dict(
            (await session.execute(text("select id, external_problem_id from problems"))).all()
        )
        clash = [(r["title"], want[r["title"]]) for r in rows
                 if want[r["title"]] in holder and holder[want[r["title"]]] != r["id"]]
        if clash:
            sys.exit(f"target ids already held by other problems: {clash[:10]}")

        counts = {"created": 0, "updated": 0, "skipped": 0}
        for r in rows:
            # is_called=false: the next nextval() returns exactly this value
            await session.execute(text("select setval('problems_id_seq', :v, false)"),
                                  {"v": want[r["title"]]})
            counts[await imp.upsert_problem(session, r)] += 1
        await session.flush()

        got = dict((await session.execute(text(
            "select external_problem_id, id from problems where external_problem_id is not null"
        ))).all())
        wrong = [(r["title"], got.get(r["id"]), want[r["title"]])
                 for r in rows if got.get(r["id"]) != want[r["title"]]]
        if wrong:
            await session.rollback()
            sys.exit(f"pinning failed, rolled back: {wrong[:10]}")

        if dry_run:
            await session.rollback()
            log.info("Dry run — rolled back. Would have: %s", counts)
        else:
            await session.commit()
            log.info("Committed %s; all %d ids match problems.js", counts, len(rows))

    # setval is not transactional — always leave the sequence past the real max
    async with async_session_factory() as session:
        await session.execute(text(
            "select setval('problems_id_seq', (select coalesce(max(id), 1) from problems))"
        ))
        await session.commit()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--inner", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args()
    if args.inner:
        logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
        logging.getLogger("sqlalchemy.engine").disabled = True
        asyncio.run(inner_main(args.dry_run))
    else:
        host_main(args.dry_run)
