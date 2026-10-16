from typing import TYPE_CHECKING
from uuid import UUID, uuid7

from sqlalchemy import (
    BigInteger,
    Boolean,
    Float,
    ForeignKey,
    String,
    Text,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.models.base_entity import AuditEntityBase

if TYPE_CHECKING:
    from app.infrastructure.database.models.organization.organization import (
        Organization,
    )


class Address(AuditEntityBase):
    __tablename__ = "addresses"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        index=True,
    )

    public_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        unique=True,
        index=True,
        nullable=False,
        default=uuid7,
    )

    organization_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    branch_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("branches.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    address_type_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("address_types.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    country_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("countries.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    state_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("states.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )

    city_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("cities.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )

    address_line1: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    address_line2: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    landmark: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    postal_code: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        index=True,
    )

    latitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    longitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    is_default: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

    organization: Mapped[Organization | None] = relationship(
        "Organization",
        back_populates="addresses",
    )
