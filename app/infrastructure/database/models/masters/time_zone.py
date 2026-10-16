from uuid import UUID, uuid7

from sqlalchemy import BigInteger, Boolean, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.models.base_entity import EntityBase


class TimeZone(EntityBase):
    __tablename__ = "time_zones"

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
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    label: Mapped[str] = mapped_column(String(150), nullable=False)
    utc_offset: Mapped[str | None] = mapped_column(String(10))
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
