from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


# ============================================================
# Role Schemas
# ============================================================


class RoleCreate(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=100,
    )
    code: str = Field(
        min_length=2,
        max_length=50,
        pattern=r"^[a-z][a-z0-9_]*$",
    )
    description: str | None = Field(
        default=None,
        max_length=2000,
    )


class RoleUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )
    description: str | None = Field(
        default=None,
        max_length=2000,
    )
    is_active: bool | None = None


class RoleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    code: str
    description: str | None
    is_system: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime | None


class RoleListResponse(BaseModel):
    items: list[RoleResponse]
    total: int
    page: int
    page_size: int


# ============================================================
# Permission Schemas
# ============================================================


class PermissionCreate(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=100,
    )
    code: str = Field(
        min_length=3,
        max_length=100,
        pattern=r"^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$",
    )
    description: str | None = Field(
        default=None,
        max_length=2000,
    )
    resource: str = Field(
        min_length=1,
        max_length=50,
        pattern=r"^[a-z][a-z0-9_]*$",
    )
    action: str = Field(
        min_length=1,
        max_length=50,
        pattern=r"^[a-z][a-z0-9_]*$",
    )

    @model_validator(mode="after")
    def validate_code_consistency(self):
        if self.code != f"{self.resource}.{self.action}":
            raise ValueError(
                "Permission code must match 'resource.action'."
            )
        return self


class PermissionUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )
    description: str | None = Field(
        default=None,
        max_length=2000,
    )
    is_active: bool | None = None


class PermissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    code: str
    description: str | None
    resource: str
    action: str
    is_system: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime | None


class PermissionListResponse(BaseModel):
    items: list[PermissionResponse]
    total: int
    page: int
    page_size: int


# ============================================================
# Role-Permission Assignment Schemas
# ============================================================


class RolePermissionAssign(BaseModel):
    permission_id: UUID


class RolePermissionReplace(BaseModel):
    permission_ids: list[UUID]

    @model_validator(mode="after")
    def validate_unique_permission_ids(self):
        if len(self.permission_ids) != len(set(self.permission_ids)):
            raise ValueError(
                "Duplicate permission IDs are not allowed."
            )
        return self


class RolePermissionListResponse(BaseModel):
    role_id: UUID
    permissions: list[PermissionResponse]