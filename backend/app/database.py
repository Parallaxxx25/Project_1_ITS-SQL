from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

# Supabase's transaction pooler (port 6543) is pgbouncer in transaction mode:
# a connection goes back to the pool between statements, so prepared statements
# can't be reused and asyncpg dies with DuplicatePreparedStatementError. Two
# separate caches have to go: asyncpg's own (statement_cache_size, a connect
# arg) and SQLAlchemy's (prepared_statement_cache_size, which this dialect only
# reads off the URL query string — not a create_engine kwarg).
#
# Doing it here rather than demanding the right query params in DATABASE_URL
# means the transaction pooler (6543) and session pooler (5432) both just work.
_url = make_url(settings.DATABASE_URL)
_engine_kwargs: dict = {}
if _url.drivername.startswith("sqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
elif _url.drivername.endswith("asyncpg"):
    _url = _url.update_query_dict({"prepared_statement_cache_size": "0"})
    _engine_kwargs["connect_args"] = {"statement_cache_size": 0}

engine = create_async_engine(
    _url,
    echo=settings.DEBUG,
    **_engine_kwargs,
)

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            # Roll back any partial transaction so a failed request never
            # commits half-written state or leaks a broken session.
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Create all tables on startup + tiny additive migration for existing DBs
    (create_all does NOT alter existing tables)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if "sqlite" in settings.DATABASE_URL:
            for table, col in (
                ("users", "first_name VARCHAR(100)"),
                ("users", "last_name VARCHAR(100)"),
                ("problems", "tutor_problem_id INTEGER"),
                ("submissions", "hint_token VARCHAR(64)"),
                ("submissions", "tutor_verdict VARCHAR(16)"),
            ):
                try:
                    await conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {col}")
                except Exception:
                    pass  # column already exists
