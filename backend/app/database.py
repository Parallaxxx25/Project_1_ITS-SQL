from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
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
            for col in ("first_name VARCHAR(100)", "last_name VARCHAR(100)"):
                try:
                    await conn.exec_driver_sql(f"ALTER TABLE users ADD COLUMN {col}")
                except Exception:
                    pass  # column already exists
