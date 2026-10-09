from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from app.infrastructure.database.engine import engine

"""
Why we need an application lifespan context manager in FastAPI:

It allows us to define startup and shutdown logic in a centralized
place, ensuring that application-scoped resources are initialized
and cleaned up when the application starts and stops.
"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Application starting...")

    # Verify that the database is reachable.
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))

    yield

    print("Application shutting down...")

    # Dispose the SQLAlchemy connection pool.
    await engine.dispose()