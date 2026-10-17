from datetime import datetime
from typing import Any
from uuid import UUID, uuid7

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.models.base_entity import EntityBase


class ActivityLog(EntityBase):
    """Enterprise System Activity & Audit Log entity.

    Tracks all administrative and lifecycle mutations across all modules
    including record creation, modification, deletion, and state transitions
    with full operator attribution, timestamps, and JSON change details.
    """

    __tablename__ = "system_activity_logs"

    # Dual identifier strategy: Internal 64-bit BigInteger primary key
    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    # Dual identifier strategy: External REST public identifier
    public_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        unique=True,
        index=True,
        nullable=False,
        default=uuid7,
    )

    # Module name (e.g. 'organizations', 'menus', 'roles', 'users', 'masters', 'settings')
    module: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    # Activity action type (e.g. 'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE')
    action: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
    )

    # Target entity model class name (e.g. 'Organization', 'Menu', 'Role', 'Country', 'User')
    entity_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    # Primary identifier of target entity (as string)
    entity_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    # Friendly display name or label of target entity
    entity_name: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    # Detailed change delta or mutation payload
    details: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    # Operator attribution
    user_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    user_email: Mapped[str | None] = mapped_column(
        String(254),
        nullable=True,
        index=True,
    )

    # Network and tracing observability
    ip_address: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    request_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )

    # High-density chronological index on created_at for fast time-range querying
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )
