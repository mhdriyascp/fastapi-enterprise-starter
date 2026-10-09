from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.infrastructure.database.engine import engine

# Async session factory and dependency for database sessions.
SessionFactory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Dependency function to provide a database session.
async def get_db_session() -> AsyncGenerator[AsyncSession]:
    async with SessionFactory() as session:
        yield session