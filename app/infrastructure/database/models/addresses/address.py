from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    Float,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.models.base_entity import EntityBase


class Address(EntityBase):
    __tablename__ = "addresses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    public_id: Mapped[UUID] = mapped_column(
        unique=True,
        nullable=False,
        default=uuid4,
    )

    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    branch_id: Mapped[int | None] = mapped_column(
        ForeignKey("branches.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    address_type_id: Mapped[int] = mapped_column(
        ForeignKey("address_types.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    country_id: Mapped[int] = mapped_column(
        ForeignKey("countries.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    state_id: Mapped[int | None] = mapped_column(
        ForeignKey("states.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )

    city_id: Mapped[int | None] = mapped_column(
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