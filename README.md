# ITS-SQL — Interactive Tutoring System for SQL

A full-stack SQL learning platform with **automated grading**, **role-based access control**, and **analytics dashboards**. Built for the KMITL Software Engineering programme (~200 students).

## Architecture

```
┌────────────────────┐        ┌───────────────────────┐
│  Frontend (React)  │  HTTP  │  Backend (FastAPI)     │
│  Vite · Tailwind   │◄──────►│  SQLAlchemy · SQLite   │
│  Port 8080         │        │  Port 8000             │
└────────────────────┘        └───────────┬───────────┘
                                          │
        ┌─────────────────┐    ┌──────────▼──────────┐
        │ Google OAuth    │    │ Grading Sandbox      │
        │ (GIS + userinfo)│    │ (temp SQLite per run)│
        └─────────────────┘    └─────────────────────┘
```

## Tech Stack

| Layer      | Technology                                          |
|------------|-----------------------------------------------------|
| Frontend   | React 18, Vite 5, Tailwind CSS 3, Monaco Editor     |
| Backend    | FastAPI, SQLAlchemy 2 (async), aiosqlite, Pydantic   |
| Auth       | Google Identity Services → FastAPI JWT (python-jose) |
| Grading    | SQLite sandbox (temp file per submission)            |
| Database   | SQLite (platform data) + Bikestore dataset           |

## User Roles

| Role       | Capabilities                                                     |
|------------|------------------------------------------------------------------|
| Student    | Solve problems, view own submissions & progress                  |
| TA         | View all submissions, class analytics, manage hints              |
| Instructor | Full CRUD on courses/modules/lessons/problems, assign TAs        |
| Admin      | User management, role assignment, system stats                   |

## Project Structure

```
ITS-SQL/
├── backend/
│   ├── app/
│   │   ├── api/                 # Route handlers
│   │   │   ├── auth.py          #   POST /auth/google, GET /auth/me
│   │   │   ├── courses.py       #   Courses, modules, lessons CRUD
│   │   │   ├── problems.py      #   Problems, datasets, hints CRUD
│   │   │   ├── submissions.py   #   Submit & grade, history
│   │   │   ├── dashboard.py     #   Student progress, class analytics
│   │   │   └── admin.py         #   User management, assignments, stats
│   │   ├── grading/
│   │   │   ├── sandbox.py       #   SQLite sandbox execution
│   │   │   └── comparator.py    #   Result comparison engine
│   │   ├── middleware/
│   │   │   └── auth.py          #   JWT creation & verification
│   │   ├── models/              #   SQLAlchemy models (6 files)
│   │   ├── schemas/             #   Pydantic schemas (4 files)
│   │   ├── services/
│   │   │   ├── auth_service.py  #   Google OAuth verification
│   │   │   └── grading_service.py
│   │   ├── config.py            #   Settings (pydantic-settings)
│   │   ├── database.py          #   Async engine & session
│   │   ├── main.py              #   FastAPI app entry point
│   │   └── seed.py              #   Seed 81 problems + bikestore data
│   ├── data/
│   │   └── bikestore_mysql.sql  #   Bikestore schema & data (~9k lines)
│   ├── requirements.txt
│   ├── .env.example
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/          #   React components
│   │   ├── lib/
│   │   │   ├── api.js           #   Backend API client (JWT management)
│   │   │   ├── auth.js          #   Google sign-in (GIS → backend)
│   │   │   ├── firebase.js      #   Firebase config (legacy, for client ID)
│   │   │   ├── db-manager.js    #   DuckDB-WASM (local practice only)
│   │   │   ├── problems.js      #   Problem definitions (81 problems)
│   │   │   └── verifier.js      #   Client-side query verification
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── index.jsx
│   ├── public/
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   └── .env
│
├── setup.sh                     #   One-command setup script
└── README.md
```

## Quick Start

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **pnpm** (recommended) or npm

### One-Command Setup

```bash
./setup.sh
```

This creates a Python venv, installs dependencies, seeds the database (81 problems + bikestore dataset), and installs frontend packages.

### Manual Setup

#### Backend

```bash
cd backend

# Create & activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment config
cp .env.example .env
# Edit .env — set GOOGLE_CLIENT_ID if needed

# Seed the database (creates its_sql.db + loads all problems)
python -m app.seed

# Start the server
uvicorn app.main:app --reload
```

Backend runs at **http://localhost:8000**  
API docs at **http://localhost:8000/docs**

#### Frontend

```bash
cd frontend

# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

Frontend runs at **http://localhost:8080**

## Auth Flow

```
User clicks "Sign in with Google"
  → Google Identity Services (GIS) popup
  → Returns access_token
  → Frontend sends to POST /api/auth/google
  → Backend verifies with Google userinfo API
  → Validates @kmitl.ac.th domain
  → Creates/finds user in DB (default role: STUDENT)
  → Returns JWT token
  → Frontend stores JWT, attaches to all API requests
```

## Grading System

Each submission goes through a **sandbox execution** pipeline:

1. Create temporary SQLite database file
2. Convert MySQL schema → SQLite (handles backticks, AUTO_INCREMENT, data types)
3. Load schema + dataset(s) into temp DB
4. Execute the **golden query** (instructor's solution)
5. Execute the **student's query** (whitelist: SELECT only)
6. Compare results: column names, row count, data values, order sensitivity
7. If problem has multiple datasets, student must pass **all** of them
8. Destroy temp DB file

This prevents hardcoded answers and ensures queries work against any valid dataset.

## API Endpoints

| Method | Endpoint                              | Auth        | Description                    |
|--------|---------------------------------------|-------------|--------------------------------|
| POST   | `/api/auth/google`                   | Public      | Exchange Google token for JWT   |
| GET    | `/api/auth/me`                       | Any         | Get current user               |
| GET    | `/api/courses`                       | Any         | List courses                   |
| POST   | `/api/courses`                       | Instructor  | Create course                  |
| POST   | `/api/courses/{id}/enroll`           | Any         | Enroll with access code        |
| GET    | `/api/problems/lesson/{id}`          | Any         | List problems for a lesson     |
| GET    | `/api/problems/{id}`                 | Any         | Get problem details            |
| POST   | `/api/submissions`                   | Any         | Submit query for grading       |
| GET    | `/api/submissions/my`                | Any         | My submission history          |
| GET    | `/api/dashboard/my-progress`         | Any         | Student progress dashboard     |
| GET    | `/api/dashboard/class/{id}`          | TA+         | Class analytics                |
| GET    | `/api/admin/users`                   | TA+         | List users                     |
| GET    | `/api/admin/stats`                   | Admin       | System statistics              |

Full interactive docs at `/docs` (Swagger UI) or `/redoc`.

## Environment Variables

### Backend (`backend/.env`)

| Variable               | Default                                | Description                |
|------------------------|----------------------------------------|----------------------------|
| `SECRET_KEY`           | auto-generated                         | JWT signing key            |
| `DATABASE_URL`         | `sqlite+aiosqlite:///./its_sql.db`     | Database connection string |
| `GOOGLE_CLIENT_ID`     | *(empty — auto-detected)*              | Google OAuth client ID     |
| `FRONTEND_URL`         | `http://localhost:8080`                | CORS allowed origin        |
| `ALLOWED_EMAIL_DOMAIN` | `kmitl.ac.th`                          | Email domain restriction   |
| `SANDBOX_DB_TYPE`      | `sqlite`                               | Grading sandbox type       |

### Frontend (`frontend/.env`)

| Variable               | Default                         | Description           |
|------------------------|---------------------------------|-----------------------|
| `VITE_API_URL`         | `http://localhost:8000/api`     | Backend API base URL  |
| `VITE_GOOGLE_CLIENT_ID`| *(empty — auto-detected)*      | Google OAuth client ID|

## Course Data

The platform ships with the **Bikestore** dataset (9 tables, ~9k lines of SQL) and **81 pre-built SQL problems** organized across 5 modules:

1. **Basic SELECT** — simple queries, filtering, sorting
2. **Joins & Subqueries** — inner/outer joins, correlated subqueries
3. **Aggregation** — GROUP BY, HAVING, window functions
4. **Advanced** — CTEs, complex analytics
5. **Exam** — assessment problems

## License

MIT

