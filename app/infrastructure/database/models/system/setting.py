from typing import Any
from uuid import UUID, uuid7

from sqlalchemy import BigInteger, Boolean, Index, Integer, String, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.models.base_entity import AuditEntityBase


class SystemSetting(AuditEntityBase):
    """Enterprise System Configuration & Application Preferences entity.

    Stores system-wide parameters, security thresholds, localization baselines,
    email gateway configurations, and feature toggles.
    """

    __tablename__ = "system_settings"

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

    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    key: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    value: Mapped[Any] = mapped_column(
        JSONB,
        nullable=False,
    )

    value_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="string",
    )

    label: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    is_public: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    is_system: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    sort_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        index=True,
    )

    __table_args__ = (
        Index("uq_system_settings_category_key", "category", "key", unique=True),
    )
