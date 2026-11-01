# ITS-SQL — Interactive Tutoring System for SQL

A SQL learning platform for KMITL course `06070999` with **in-browser grading**, a **second server-side verdict and AI hints** from the tutor service, **role-based access control**, and an **instructor roster built from server-side attempt logs**.

This repository is the platform (frontend + backend). The grading and hint service lives in the [`tutor/`](tutor/) git submodule ([intelligent-tutor](https://github.com/Parallaxxx25/intelligent-tutor)); see [tutor/CLAUDE.md](tutor/CLAUDE.md) and [tutor/CONTEXT.md](tutor/CONTEXT.md) for its internals.

## Architecture

```
 Browser ─────────────────────────────────────────────┐
 │ React 18 · Monaco editor                           │
 │ DuckDB-WASM + bikestore_mysql.sql                  │  grades every Submit locally
 │ lib/verifier.js (student query vs gold query)      │  (this is the verdict the student sees)
 └───────────────┬────────────────────────────────────┘
                 │ HTTPS  /api/*
        ┌────────▼────────┐
        │ Caddy           │  TLS (Cloudflare DNS-01), static SPA, security headers
        └────────┬────────┘
        ┌────────▼────────────────────┐        ┌─────────────────────────────────┐
        │ partner-api (this backend)  │ HTTP   │ tutor-api (tutor/ submodule)    │
        │ FastAPI · SQLAlchemy async  │───────►│ FastAPI · LangGraph · Gemini    │
        │ auth, courses, attempt log  │ X-Service-Key  /api/v1/grade, /api/v1/hint │
        └────────┬────────────────────┘        └──────┬───────────────┬──────────┘
          ┌──────▼──────┐                      ┌──────▼──────┐ ┌──────▼──────┐
          │ app-postgres│                      │tutor-postgres│ │ tutor-redis │
          │ users, logs │                      │ BikeStores + │ │ session     │
          └─────────────┘                      │ interaction_ │ └─────────────┘
                                               │ history      │
                                               └──────────────┘
```

Production runs all six services from [docker-compose.prod.yml](docker-compose.prod.yml) on the faculty VM at `https://itssql.site` (campus network / VPN only). [DEPLOY_VM.md](DEPLOY_VM.md) is the runbook.

## Tech Stack

| Layer      | Technology                                                                 |
|------------|----------------------------------------------------------------------------|
| Frontend   | React 18, Vite 5, Tailwind CSS 3, Monaco Editor, DuckDB-WASM               |
| Backend    | FastAPI, SQLAlchemy 2 (async), Pydantic; asyncpg (Postgres) or aiosqlite (local) |
| Auth       | Username + password (bcrypt) → JWT (PyJWT, HS256, 8 h)                     |
| Grading    | In the browser: DuckDB-WASM. On the server: the tutor service's read-only Postgres grader |
| Hints      | Tutor service (Gemini 2.5 Flash, multi-signal 4-level escalation policy)  |
| Database   | PostgreSQL 16 in production; SQLite for local dev                          |
| Deploy     | Docker Compose, Caddy (xcaddy + Cloudflare DNS plugin)                     |

## User Roles

| Role       | What the live UI gives them                                                    |
|------------|--------------------------------------------------------------------------------|
| Student    | Course / Assignment / Exam workspaces, AI hint panel (not in EXAM), own history |
| TA         | Same instructor console as Instructor (the frontend treats TA as instructor)  |
| Instructor | Instructor console: class roster and analytics from `submission_logs`        |
| Admin      | API only (`/api/admin/*`); there is no admin UI and no way to create an admin except editing the database |

Self-registration only ever creates a `student` with an `@kmitl.ac.th` email. Three instructor accounts are seeded on every startup ([backend/app/seed.py](backend/app/seed.py) `ensure_instructors`); their passwords are random and printed once to the log unless `SEED_INSTRUCTOR_PW` is set.

## Project Structure

```
its-sql/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py          #   register, login, me (+ unused /google, /activity stub)
│   │   │   ├── courses.py       #   courses, enrollment by access code, modules, lessons
│   │   │   ├── problems.py      #   problems, datasets, static hints CRUD
│   │   │   ├── submissions.py   #   attempt logging + tutor grade/hint passthrough
│   │   │   ├── dashboard.py     #   /attempts (live roster); older endpoints read Submission
│   │   │   └── admin.py         #   users, roles, assignments, TAs, stats
│   │   ├── middleware/auth.py   #   JWT verification, role guards
│   │   ├── models/              #   SQLAlchemy models (13 tables)
│   │   ├── schemas/             #   Pydantic schemas
│   │   ├── services/
│   │   │   ├── auth_service.py  #   bcrypt, JWT, Google userinfo check
│   │   │   ├── rate_limiter.py  #   login/register throttle
│   │   │   ├── audit.py         #   auth audit log (logs/auth_audit.log)
│   │   │   └── tutor_client.py  #   calls the tutor's /api/v1/grade and /api/v1/hint
│   │   ├── config.py            #   settings (pydantic-settings)
│   │   ├── database.py          #   async engine, create_all + additive ALTERs
│   │   ├── main.py              #   app entry point, CORS, request-id middleware
│   │   └── seed.py              #   course 06070999, 8 modules, 185 problems
│   ├── scripts/                 #   reset_attempts.py, reset_instructor_pw.py
│   ├── tests/
│   └── data/bikestore_mysql.sql
├── frontend/
│   ├── public/bikestore_mysql.sql   # dataset DuckDB-WASM loads in the browser
│   └── src/
│       ├── App.jsx                  # workspace, submit/run, hint flow
│       ├── components/              # RightPanel (editor), InstructorDashboard, ...
│       └── lib/
│           ├── problems.js          # the 185 problems, gold queries, tutorProblemId
│           ├── verifier.js          # client-side grading
│           ├── db-manager.js        # DuckDB-WASM loader, read-only execution
│           ├── api.js, auth-api.js  # backend client (JWT in sessionStorage)
│           ├── instructor-store.js  # instructor-only content, kept in localStorage
│           └── hint-markdown.js     # safe hint rendering
├── tutor/                       # git submodule — grading + AI hint service
├── scripts/
│   ├── backup_dbs.sh            # nightly pg_dump of both databases
│   └── pin_tutor_problem_ids.py # import the 185 problems into the tutor, pinned ids
├── docker-compose.yml           # local trial stack
├── docker-compose.prod.yml      # production stack (faculty VM)
├── Caddyfile
├── DEPLOY_VM.md
└── setup.sh                     # local venv + seed + frontend install (no tutor)
```

## Quick Start

### Full stack with Docker (platform + tutor)

```bash
git submodule update --init          # tutor/ is empty otherwise
echo "SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_hex(32))')" > .env
# optional: GOOGLE_API_KEY=... in the same .env for real Gemini hints
docker compose up --build            # http://localhost:8080
```

### Platform only (no hints)

Prerequisites: Python 3.12, Node.js 18+, pnpm or npm.

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# set SECRET_KEY in backend/.env first — the app refuses to start with the example value
python -m app.seed                   # creates its_sql.db, course, 185 problems
uvicorn app.main:app --reload        # http://localhost:8000

cd ../frontend
pnpm install
pnpm dev                             # http://localhost:8080 (proxies /api to :8000)
```

`./setup.sh` runs the same steps, but it copies `.env.example` unchanged, so set `SECRET_KEY` in `backend/.env` before it reaches the seed step. Without `TUTOR_SERVICE_URL` the platform still grades in the browser; attempts are logged without a tutor verdict and no hint is offered.

Swagger UI (`/docs`) and ReDoc are served only when `DEBUG=true`.

## Auth Flow

```
Student registers (username, password, name, student id)
  → POST /api/auth/register   — role is always student; email = <username>@kmitl.ac.th
  → POST /api/auth/login      — throttled per IP and per username (5 / 60 s)
  → returns a JWT (8 h); the browser keeps it in sessionStorage
  → on every page load the session is re-validated with GET /api/auth/me
  → idle logout after 20 minutes
```

`POST /api/auth/google` still exists in the backend but nothing in the frontend calls it. LDAP is not implemented ([ldap.md](ldap.md) is a requirements note only).

## Grading

A **Submit** is graded twice.

**1. In the browser — the verdict the student sees** ([frontend/src/lib/verifier.js](frontend/src/lib/verifier.js)):

1. DuckDB-WASM loads `bikestore_mysql.sql` once per page (9 tables).
2. Comments are stripped and trailing `;` removed; the gold query and the student query each run inside `BEGIN … ROLLBACK` with an 8 s timeout.
3. Pass = same column count, same row count, same values. Column names are reported but never fail a query.
4. Rows are compared as a multiset unless the gold query has `ORDER BY`; then order must match too.
5. Values are normalised by type (numbers to 6 decimals; the text `'007'` never equals the number `7`).
6. A query that does not end with `;` is marked failed even if its result is correct (a client-only rule).

**2. On the server — the tutor's verdict** ([backend/app/api/submissions.py](backend/app/api/submissions.py)):

The backend forwards every logged attempt on a problem with a `tutorProblemId` to the tutor's `POST /api/v1/grade`, which re-runs the query against PostgreSQL as the read-only `student_ro` role. That verdict is stored as `submission_logs.is_correct`; the browser's claim is kept separately in `client_is_correct`. If the tutor is unreachable the attempt is still logged, with a NULL verdict.

There is no server-side sandbox in this backend any more: the old SQLite sandbox had no callers and was removed (commit `cca1b4e`).

## Attempt logging and hints

```
Submit / errored Run
  ├─ failed, not EXAM, problem has tutorProblemId
  │     → POST /api/submissions/hint-request
  │         logs the attempt, tutor /grade, stores the hint_token in hint_requests
  │     → student opens the hint panel
  │     → POST /api/submissions/hint-request/{id}/hint
  │         tutor /hint (Gemini); hint_text, hint_source, hint_latency_ms saved on the attempt row
  └─ everything else (passes, EXAM, missing semicolon, no tutor mapping)
        → POST /api/submissions/log
            logs the attempt; tutor /grade when mapped; no hint is ever minted
```

Every row of `submission_logs` carries the student, the backend `problem_id`, the tutor and frontend problem ids, the workspace mode (`COURSE` / `ASSIGNMENT` / `EXAM`), a server-counted `attempt_number`, a per-attempt `client_attempt_id`, the `action` (`submit` or `run`), the query, both verdicts, and the hint shown. Successful Runs and errored Runs in EXAM are not logged. The `hint_token` itself never reaches the browser.

`submission_logs` is the only server-side record of student work: the `submissions` table has no writer, so the older `/submissions/my`, `/dashboard/my-progress` and `/dashboard/class/*` endpoints return empty results.

## API Endpoints

All routes are under `/api`. "TA+" means TA, Instructor or Admin.

| Method | Endpoint                                      | Auth        | Description                                   |
|--------|-----------------------------------------------|-------------|-----------------------------------------------|
| GET    | `/health`                                     | Public      | Liveness                                      |
| POST   | `/auth/register`                              | Public      | Create a student account                      |
| POST   | `/auth/login`                                 | Public      | Username + password → JWT                     |
| GET    | `/auth/me`                                    | Any         | Current user                                  |
| GET    | `/courses`                                    | Any         | List courses                                  |
| POST   | `/courses/{code or id}/enroll`                | Any         | Enroll with the access code                   |
| GET    | `/courses/{id}/students`                      | TA+         | Enrolled students                             |
| *      | `/courses`, `/courses/{id}/modules`, `/courses/modules/{id}/lessons` | Instructor | Course / module / lesson CRUD |
| *      | `/problems/...`                               | Any / Instructor | Problems, datasets, static hints (`solution_query` only for Instructor/Admin) |
| POST   | `/submissions/hint-request`                   | Any         | Log a failed attempt, tutor grade, mint hint  |
| POST   | `/submissions/hint-request/{id}/hint`         | Owner       | Fetch the tutor hint for that attempt         |
| POST   | `/submissions/log`                            | Any         | Log any other attempt (204)                   |
| GET    | `/dashboard/attempts`                         | TA+         | Every student and every logged attempt        |
| *      | `/admin/users`, `/admin/stats`, `/admin/.../assignments`, `/admin/courses/{id}/ta/{user}` | TA+ / Instructor / Admin (per route) | User, role, assignment and TA management |

## Environment Variables

### Backend (`backend/.env`, or the compose file)

| Variable               | Default                                | Description                                          |
|------------------------|----------------------------------------|------------------------------------------------------|
| `SECRET_KEY`           | — (required)                           | JWT signing key; startup fails without a real value  |
| `DATABASE_URL`         | `sqlite+aiosqlite:///./its_sql.db`     | Production uses `postgresql+asyncpg://…`             |
| `FRONTEND_URL`         | `http://localhost:8080`                | Allowed CORS origin, alongside the fixed localhost dev origins in `main.py` |
| `ALLOWED_EMAIL_DOMAIN` | `kmitl.ac.th`                          | Email domain allowed at registration                 |
| `RATE_LIMIT_ATTEMPTS` / `RATE_LIMIT_WINDOW` | `5` / `60`        | Login and register throttle                          |
| `TUTOR_SERVICE_URL`    | *(empty — tutor integration off)*      | e.g. `http://tutor-api:8000`                         |
| `TUTOR_SERVICE_KEY`    | *(empty)*                              | Must equal the tutor's `SERVICE_KEY`                 |
| `SEED_INSTRUCTOR_PW`   | *(unset — random per account)*         | Pins the seeded instructors' password                |
| `DEBUG`                | `false`                                | SQL echo and Swagger UI                              |

### Frontend (`frontend/.env`)

| Variable            | Default                      | Description                                   |
|---------------------|------------------------------|-----------------------------------------------|
| `VITE_API_URL`      | *(unset → `/api`)*           | Backend API base URL; leave unset when the backend is served from the same origin (dev proxy, Caddy in production) |
| `VITE_API_TARGET`   | `http://localhost:8000`      | Dev-server proxy target (`vite.config.js`)    |

## Course Data

[backend/app/seed.py](backend/app/seed.py) creates course `06070999` (access code `ITSSQL2025`) with **185 problems in 8 modules**. The same problems, with their gold queries and `tutorProblemId`s (106–394), are defined for the browser in [frontend/src/lib/problems.js](frontend/src/lib/problems.js). Descriptions are in Thai.

| Module | Topic                          | COURSE | ASSIGNMENT | EXAM |
|--------|--------------------------------|--------|------------|------|
| 01     | Database fundamentals          | 1      | 1          | 1    |
| 02     | SELECT                         | 12     | 12         | 2    |
| 03     | WHERE                          | 12     | 12         | 2    |
| 04     | ORDER BY & LIMIT               | 12     | 12         | 2    |
| 05     | JOIN                           | 12     | 12         | 2    |
| 06     | Multiple tables (OUTER JOIN)   | 12     | 12         | 2    |
| 07     | Aggregate functions            | 12     | 12         | 2    |
| 08     | Subqueries                     | 12     | 12         | 2    |

The dataset is **BikeStores** ([Data/bikestore_mysql.sql](Data/bikestore_mysql.sql), a MySQL dump): 9 tables — `brands`, `categories`, `customers`, `orders`, `order_items`, `products`, `staffs`, `stocks`, `stores`.

## Tests

```bash
cd backend && python -m tests.test_submission_log     # attempt logging, tutor stubbed (SQLite or Postgres)
cd backend && python -m tests.test_class_attempts     # /dashboard/attempts
BASE=http://localhost:8000 python -m backend.tests.test_auth_hardening   # against a running backend
cd frontend && npm test                                # hint-markdown (node --test)
```

The tutor service has its own pytest suite under [tutor/tests/](tutor/tests/).

## License

MIT
