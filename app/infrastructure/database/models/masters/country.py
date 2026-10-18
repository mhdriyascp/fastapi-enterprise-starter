from typing import TYPE_CHECKING
from uuid import UUID, uuid7

from sqlalchemy import BigInteger, Boolean, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.models.base_entity import AuditEntityBase

if TYPE_CHECKING:
    from app.infrastructure.database.models.masters.currency import Currency


class Country(AuditEntityBase):
    __tablename__ = "countries"

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
    default_currency_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("currencies.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    code: Mapped[str] = mapped_column(String(2), unique=True, nullable=False)
    iso3_code: Mapped[str | None] = mapped_column(String(3), unique=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone_code: Mapped[str | None] = mapped_column(String(10))
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )

    default_currency: Mapped[Currency | None] = relationship(
        "Currency",
        lazy="selectin",
        foreign_keys=[default_currency_id],
    )
