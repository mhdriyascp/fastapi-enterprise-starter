from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    Boolean,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.models.base_entity import EntityBase


class DocumentSequence(EntityBase):
    __tablename__ = "document_sequences"

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "branch_id",
            "document_type",
            name="uq_document_sequence_org_branch_type",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[UUID] = mapped_column(
        unique=True, nullable=False, default=uuid4
    )
    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    branch_id: Mapped[int | None] = mapped_column(
        ForeignKey("branches.id", ondelete="RESTRICT"),
        nullable=True,
    )
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)
    prefix: Mapped[str] = mapped_column(String(30), nullable=False, default="")
    next_number: Mapped[int] = mapped_column(
        BigInteger, nullable=False, default=1, server_default="1"
    )
    padding_length: Mapped[int] = mapped_column(
        Integer, nullable=False, default=5, server_default="5"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )