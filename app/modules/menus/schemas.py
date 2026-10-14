from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MenuCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    code: str | None = Field(
        default=None, min_length=1, max_length=50, pattern=r"^[A-Za-z0-9_-]+$"
    )
    path: str | None = Field(default=None, max_length=255)
    icon: str | None = Field(default=None, max_length=100)
    sort_order: int = Field(default=0, ge=0)
    parent_id: UUID | None = None
    is_active: bool = True
    role_ids: list[UUID] = Field(default_factory=list)
    permission_ids: list[UUID] = Field(default_factory=list)


class MenuUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=100)
    code: str | None = Field(
        default=None, min_length=1, max_length=50, pattern=r"^[A-Za-z0-9_-]+$"
    )
    path: str | None = Field(default=None, max_length=255)
    icon: str | None = Field(default=None, max_length=100)
    sort_order: int | None = Field(default=None, ge=0)
    parent_id: UUID | None = None
    is_active: bool | None = None
    role_ids: list[UUID] | None = None
    permission_ids: list[UUID] | None = None


class MenuRoleAssignment(BaseModel):
    role_ids: list[UUID] = Field(default_factory=list)


class MenuPermissionAssignment(BaseModel):
    permission_ids: list[UUID] = Field(default_factory=list)


class MenuResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    public_id: UUID
    parent_id: UUID | None = None
    title: str
    code: str
    path: str | None = None
    icon: str | None = None
    sort_order: int
    is_active: bool
    role_ids: list[UUID] = Field(default_factory=list)
    permission_ids: list[UUID] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime | None = None


class MenuTreeNode(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    public_id: UUID
    parent_id: UUID | None = None
    title: str
    code: str
    path: str | None = None
    icon: str | None = None
    sort_order: int
    is_active: bool
    children: list[MenuTreeNode] = Field(default_factory=list)
