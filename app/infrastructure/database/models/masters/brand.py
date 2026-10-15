from uuid import UUID, uuid4

from sqlalchemy import Boolean, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.models.base_entity import EntityBase


class Brand(EntityBase):
    __tablename__ = "brands"

    __table_args__ = (
        UniqueConstraint("code", name="uq_brands_code"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    public_id: Mapped[UUID] = mapped_column(
        unique=True,
        nullable=False,
        default=uuid4,
    )

    code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        index=True,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )