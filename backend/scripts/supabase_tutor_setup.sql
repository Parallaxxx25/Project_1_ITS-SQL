-- Provision the tutor grading/hint service inside the SAME Supabase project
-- that backs this platform's accounts.
--
-- Run in the Supabase SQL editor (as postgres). Idempotent — and it is meant
-- to be run TWICE: once before loading the tutor data, and once after, so the
-- grants at the bottom cover the tables the restore creates.
--
-- Why this file exists at all: both apps name tables `users` and `problems`
-- (app/models/user.py + app/models/problem.py here; backend/db/models.py in
-- the tutor repo). Letting the tutor service create its tables in `public`
-- would collide with — and a data load would overwrite — the live accounts
-- and problem rows. So the tutor's own tables get their own schema, and the
-- student-facing sample data (BikeStores, in `production`/`sales`) gets a
-- role that can reach nothing else.
--
-- Replace both CHANGE_ME passwords before running. Do not commit real ones:
--   python -c "import secrets; print(secrets.token_urlsafe(24))"

-- ── Schemas ─────────────────────────────────────────────────────────────
-- tutor:              the tutor service's own tables (its `users`, `problems`,
--                     gold_standards, ...) — kept out of `public` so they
--                     never touch this platform's tables of the same name.
-- production, sales:  BikeStores sample data. The SQL students actually query.
--                     Named by the upstream sample database, not by us.
CREATE SCHEMA IF NOT EXISTS tutor;
CREATE SCHEMA IF NOT EXISTS production;
CREATE SCHEMA IF NOT EXISTS sales;

-- ── Roles ───────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tutor_app') THEN
        CREATE ROLE tutor_app WITH LOGIN PASSWORD 'CHANGE_ME_tutor_app_pass';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'student_ro') THEN
        CREATE ROLE student_ro WITH LOGIN PASSWORD 'CHANGE_ME_student_ro_pass';
    END IF;
END
$$;

-- ── tutor_app: the service's own connection (POSTGRES_URL / _SYNC) ──────
-- search_path is set on the role rather than in the tutor's code: its
-- SQLAlchemy models carry no schema, so create_all and every query land in
-- whatever comes first here. `public` is deliberately absent — with it in
-- the path, an unqualified `users` would resolve to THIS platform's accounts
-- table. BikeStores is reachable for seeding; students' own queries do not
-- use this role (see student_ro below).
ALTER ROLE tutor_app SET search_path = tutor, production, sales;

ALTER SCHEMA tutor      OWNER TO tutor_app;
ALTER SCHEMA production OWNER TO tutor_app;
ALTER SCHEMA sales      OWNER TO tutor_app;

REVOKE ALL ON SCHEMA public FROM tutor_app;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM tutor_app;

-- ── student_ro: the role student-submitted SQL executes as ──────────────
-- (POSTGRES_URL_EXEC). code_executor.py already restricts statements to
-- SELECT/WITH/EXPLAIN by regex and opens the session read-only, but a regex
-- is a filter, not a boundary. This is the boundary: a role that physically
-- cannot read `public` (this platform's accounts, password hashes, and
-- submissions) or `tutor` (gold-standard solutions — readable golds would
-- hand every answer to any student who can run a SELECT).
REVOKE ALL ON SCHEMA public FROM student_ro;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM student_ro;
REVOKE ALL ON SCHEMA tutor FROM student_ro;
REVOKE ALL ON ALL TABLES IN SCHEMA tutor FROM student_ro;

GRANT USAGE ON SCHEMA production TO student_ro;
GRANT USAGE ON SCHEMA sales      TO student_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA production TO student_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA sales      TO student_ro;

-- Cover tables created later (a reseed, or the initial data restore if this
-- file is run before it). Default privileges apply per creating role, so
-- these are scoped to tutor_app — the role that owns the restore.
ALTER DEFAULT PRIVILEGES FOR ROLE tutor_app IN SCHEMA production
    GRANT SELECT ON TABLES TO student_ro;
ALTER DEFAULT PRIVILEGES FOR ROLE tutor_app IN SCHEMA sales
    GRANT SELECT ON TABLES TO student_ro;

-- ── Verify ──────────────────────────────────────────────────────────────
-- Expect: 0 rows. Any row here is a table in this platform's own schema that
-- a student's SQL could read.
SELECT table_schema, table_name, privilege_type
FROM information_schema.table_privileges
WHERE grantee = 'student_ro' AND table_schema IN ('public', 'tutor');
