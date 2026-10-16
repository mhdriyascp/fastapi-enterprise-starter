from uuid import UUID, uuid7

from sqlalchemy import BigInteger, Boolean, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.models.base_entity import EntityBase


class CommunicationType(EntityBase):
    __tablename__ = "communication_types"

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
    code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(300))
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
