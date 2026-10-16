from datetime import date
from uuid import UUID, uuid7

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.models.base_entity import AuditEntityBase


class FiscalPeriod(AuditEntityBase):
    __tablename__ = "fiscal_periods"

    __table_args__ = (
        UniqueConstraint(
            "fiscal_year_id",
            "period_number",
            name="uq_fiscal_period_year_number",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    public_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        unique=True,
        index=True,
        nullable=False,
        default=uuid7,
    )
    fiscal_year_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("fiscal_years.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    period_number: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_closed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
