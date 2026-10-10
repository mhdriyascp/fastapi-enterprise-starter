from uuid import UUID, uuid4

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.models.base_entity import EntityBase


class Country(EntityBase):
    __tablename__ = "countries"

    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[UUID] = mapped_column(
        unique=True, nullable=False, default=uuid4
    )
    code: Mapped[str] = mapped_column(String(2), unique=True, nullable=False)
    iso3_code: Mapped[str | None] = mapped_column(String(3), unique=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone_code: Mapped[str | None] = mapped_column(String(10))
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )