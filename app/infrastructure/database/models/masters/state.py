from uuid import UUID, uuid7

from sqlalchemy import (
    BigInteger,
    Boolean,
    ForeignKey,
    String,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.models.base_entity import EntityBase


class State(EntityBase):
    __tablename__ = "states"
    __table_args__ = (
        UniqueConstraint("country_id", "code", name="uq_states_country_code"),
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
    country_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("countries.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    code: Mapped[str | None] = mapped_column(String(20))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
