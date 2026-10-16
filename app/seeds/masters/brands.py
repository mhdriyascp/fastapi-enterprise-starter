from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.models.masters.brand import Brand

BRANDS = [
    {
        "code": "APPLE",
        "name": "Apple",
        "description": "Consumer electronics and technology brand.",
    },
    {
        "code": "SAMSUNG",
        "name": "Samsung",
        "description": "Consumer electronics and technology brand.",
    },
    {
        "code": "DELL",
        "name": "Dell",
        "description": "Computer and technology brand.",
    },
    {
        "code": "HP",
        "name": "HP",
        "description": "Computing and printing technology brand.",
    },
    {
        "code": "LENOVO",
        "name": "Lenovo",
        "description": "Personal computers and technology products.",
    },
]


async def seed_brands(session: AsyncSession) -> None:
    for brand_data in BRANDS:
        result = await session.execute(
            select(Brand).where(Brand.code == brand_data["code"])
        )
        existing_brand = result.scalar_one_or_none()

        if existing_brand:
            continue

        brand = Brand(
            public_id=uuid4(),
            **brand_data,
            is_active=True,
        )
        session.add(brand)

    await session.flush()
