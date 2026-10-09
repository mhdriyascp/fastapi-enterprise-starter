from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from app.core.config import settings

# Create an asynchronous SQLAlchemy engine using the database URL from the settings.
engine: AsyncEngine = create_async_engine(
    settings.database_url,
)