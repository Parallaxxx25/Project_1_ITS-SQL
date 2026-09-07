-- DBLearn — users table (auth)
-- SQLite dialect (the app runs sqlite+aiosqlite). For Postgres, swap AUTOINCREMENT
-- for SERIAL/IDENTITY and datetime('now') for now().

CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name    VARCHAR(100),
    last_name     VARCHAR(100),
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username);

-- NOTE: the live app manages this table via SQLAlchemy and adds extra columns
-- (email, name, role, modules, is_active, …) used by the wider platform. The
-- columns above are the auth-critical set used by /api/auth/register +
-- /api/auth/login.
