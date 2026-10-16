from uuid import UUID, uuid7

from sqlalchemy import (
    BigInteger,
    Boolean,
    ForeignKey,
    Integer,
    String,
    Time,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.models.base_entity import AuditEntityBase


class BusinessHours(AuditEntityBase):
    __tablename__ = "business_hours"

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "branch_id",
            "day_of_week",
            name="uq_business_hours_org_branch_day",
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
    organization_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    branch_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("branches.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)
    opens_at: Mapped[object | None] = mapped_column(Time, nullable=True)
    closes_at: Mapped[object | None] = mapped_column(Time, nullable=True)
    is_closed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    name: Mapped[str | None] = mapped_column(String(100))
