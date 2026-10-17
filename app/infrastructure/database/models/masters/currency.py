from typing import TYPE_CHECKING
from uuid import UUID, uuid7

from sqlalchemy import BigInteger, Boolean, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.models.base_entity import EntityBase

if TYPE_CHECKING:
    from app.infrastructure.database.models.masters.country import Country


class Currency(EntityBase):
    __tablename__ = "currencies"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )
    public_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        unique=True,
        index=True,
        nullable=False,
        default=uuid7,
    )
    code: Mapped[str] = mapped_column(String(3), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    symbol: Mapped[str | None] = mapped_column(String(10))
    decimal_places: Mapped[int] = mapped_column(
        Integer, nullable=False, default=2, server_default="2"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )

    countries: Mapped[list[Country]] = relationship(
        "Country",
        back_populates="default_currency",
        lazy="selectin",
    )
