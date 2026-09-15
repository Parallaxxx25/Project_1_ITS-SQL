from pydantic_settings import BaseSettings
from pydantic import model_validator
from functools import lru_cache


class Settings(BaseSettings):
    # ── App ──
    APP_NAME: str = "ITS-SQL Platform"
    # Default False — DEBUG=True enables SQL echo (see database.py) and,
    # in the tutor service, an arbitrary-SQL debug endpoint. Opt in per
    # environment, never ship it on by default.
    DEBUG: bool = False

    # ── JWT ──
    # Required — no default. A random per-process key silently invalidates
    # every live JWT on restart and makes multi-worker deploys reject each
    # other's tokens. Set it in backend/.env (see backend/.env.example).
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    # ── Database ──
    # Default is local SQLite for dev. Production sets this in backend/.env
    # (or the Render dashboard) to a real Postgres URL — never hardcode a
    # live connection string with credentials here; this file is committed.
    DATABASE_URL: str = "sqlite+aiosqlite:///./its_sql.db"

    # ── Login throttle (brute-force guard, per IP + per username) ──
    RATE_LIMIT_ATTEMPTS: int = 5      # max attempts...
    RATE_LIMIT_WINDOW: int = 60       # ...per this many seconds

    # ── CORS ──
    FRONTEND_URL: str = "http://localhost:8080"

    # ── Email domain restriction (Google OAuth) ──
    ALLOWED_EMAIL_DOMAIN: str = "kmitl.ac.th"

    # ── Supabase (Activity Tracking) ──
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    # ── Tutor grading + hint service (github.com/Parallaxxx25/intelligent-tutor) ──
    # Empty TUTOR_SERVICE_URL disables the integration entirely — submissions
    # still grade normally via this platform's own SQLite sandbox, they just
    # never get a hint_token and the hint button never shows.
    TUTOR_SERVICE_URL: str = ""
    TUTOR_SERVICE_KEY: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}

    @model_validator(mode="after")
    def _require_secret_key(self):
        if not self.SECRET_KEY or self.SECRET_KEY == "change-me-to-a-random-secret-key":
            raise ValueError(
                "SECRET_KEY is not set. Create backend/.env with a real value. "
                'Generate one with: python -c "import secrets; print(secrets.token_hex(32))" '
                "(see backend/.env.example)"
            )
        return self


@lru_cache()
def get_settings() -> Settings:
    return Settings()
