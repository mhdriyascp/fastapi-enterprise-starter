from decimal import Decimal
from uuid import UUID, uuid7

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    ForeignKey,
    Numeric,
    String,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.models.base_entity import EntityBase


class Tax(EntityBase):
    __tablename__ = "taxes"

    __table_args__ = (
        UniqueConstraint(
            "country_id",
            "code",
            name="uq_taxes_country_id_code",
        ),
        CheckConstraint(
            "rate >= 0",
            name="ck_taxes_rate_non_negative",
        ),
        CheckConstraint(
            "tax_type IN ('percentage', 'fixed')",
            name="ck_taxes_tax_type_valid",
        ),
    )

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

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    code: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    rate: Mapped[Decimal] = mapped_column(
        Numeric(10, 4),
        nullable=False,
    )

    tax_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="percentage",
        server_default="percentage",
    )

    country_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("countries.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    is_active: Mapped[bool] = mapped_column(
        nullable=False,
        default=True,
        server_default="true",
    )
