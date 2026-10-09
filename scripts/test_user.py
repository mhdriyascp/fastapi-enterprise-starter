import asyncio

from sqlalchemy import select

from app.infrastructure.database.session import SessionFactory
from app.modules.users.models import User


async def main():
    async with SessionFactory() as session:
        result = await session.execute(
            select(User).where(User.email == "updated@example.com")
        )

        user = result.scalar_one()

        print("Before update:")
        print("id:", user.id)
        print("public_id:", user.public_id)
        print("email:", user.email)
        print("created_at:", user.created_at)
        print("updated_at:", user.updated_at)

        user.email = "updated-again@example.com"

        await session.commit()
        await session.refresh(user)

        print("\nAfter update:")
        print("id:", user.id)
        print("public_id:", user.public_id)
        print("email:", user.email)
        print("created_at:", user.created_at)
        print("updated_at:", user.updated_at)


if __name__ == "__main__":
    asyncio.run(main())