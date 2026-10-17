from __future__ import annotations

import uuid

from sqlalchemy import (
    BigInteger,
    Boolean,
    ForeignKey,
    Integer,
    String,
    Uuid,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base
from app.infrastructure.database.models.base_entity import AuditEntityBase


class Menu(AuditEntityBase):
    """Hierarchical navigation menu model with role and permission access controls."""

    __tablename__ = "menus"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    public_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        unique=True,
        index=True,
        nullable=False,
        default=uuid.uuid7,
    )

    parent_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("menus.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
    )

    path: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    icon: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    sort_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    # Hierarchical tree relationships
    parent: Mapped[Menu | None] = relationship(
        "Menu",
        remote_side=[id],
        back_populates="children",
    )

    children: Mapped[list[Menu]] = relationship(
        "Menu",
        back_populates="parent",
        cascade="all, delete-orphan",
        order_by="Menu.sort_order",
    )

    # Access control associations
    roles: Mapped[list[Role]] = relationship(  # noqa: F821
        "Role",
        secondary="menu_roles",
        lazy="selectin",
    )

    permissions: Mapped[list[Permission]] = relationship(  # noqa: F821
        "Permission",
        secondary="menu_permissions",
        lazy="selectin",
    )


class MenuRole(Base):
    """Many-to-many association mapping menus directly to roles."""

    __tablename__ = "menu_roles"

    menu_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("menus.id", ondelete="CASCADE"),
        primary_key=True,
    )

    role_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )


class MenuPermission(Base):
    """Many-to-many association mapping menus directly to permissions."""

    __tablename__ = "menu_permissions"

    menu_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("menus.id", ondelete="CASCADE"),
        primary_key=True,
    )

    permission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("permissions.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
