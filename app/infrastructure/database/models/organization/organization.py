from typing import TYPE_CHECKING
from uuid import UUID, uuid7

from sqlalchemy import BigInteger, Boolean, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.models.base_entity import AuditEntityBase

if TYPE_CHECKING:
    from app.infrastructure.database.models.masters.address import Address


class Organization(AuditEntityBase):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    public_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        unique=True,
        index=True,
        nullable=False,
        default=uuid7,
    )

    code: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    legal_name: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    registration_number: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    tax_registration_number: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    phone: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    website: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

    addresses: Mapped[list[Address]] = relationship(
        "Address",
        back_populates="organization",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
