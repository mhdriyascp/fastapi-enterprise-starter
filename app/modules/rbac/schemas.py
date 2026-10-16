from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.shared.base_schema import BaseSchema
from app.shared.response import PagedResponse

# ============================================================
# Role Schemas
# ============================================================


class RoleCreate(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=100,
    )
    code: str | None = Field(
        default=None,
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


class RoleResponse(BaseSchema):
    id: UUID
    name: str
    code: str
    description: str | None
    is_system: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime | None


# Aliased to PagedResponse for standardized collection envelope compatibility
RoleListResponse = PagedResponse[RoleResponse]


# ============================================================
# Permission Schemas
# ============================================================


class PermissionCreate(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=100,
    )
    code: str | None = Field(
        default=None,
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
        expected = f"{self.resource.strip().lower()}.{self.action.strip().lower()}"
        self.code = expected
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


class PermissionResponse(BaseSchema):
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


# Aliased to PagedResponse for standardized collection envelope compatibility
PermissionListResponse = PagedResponse[PermissionResponse]


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
            raise ValueError("Duplicate permission IDs are not allowed.")
        return self


class RolePermissionListResponse(BaseModel):
    role_id: UUID
    permissions: list[PermissionResponse]
