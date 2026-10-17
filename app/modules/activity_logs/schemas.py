from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field, model_validator

from app.shared.base_schema import BaseSchema
from app.shared.response import PagedResponse


class ActivityLogResponse(BaseSchema):
    """API presentation schema for system activity and audit log entries.

    Follows ISO 8601 second-precision UTC datetime formatting and dual-identifier standards.
    """

    id: int
    public_id: UUID
    module: str
    action: str
    entity_type: str
    entity_id: str
    entity_name: str | None = None
    details: dict[str, Any] | None = None
    user_id: UUID | None = None
    user_email: str | None = None
    ip_address: str | None = None
    request_id: str | None = None
    created_at: datetime


ActivityLogPagedResponse = PagedResponse[ActivityLogResponse]


class BulkDeleteActivityLogsPayload(BaseSchema):
    """Payload contract for bulk deleting activity log records."""

    ids: list[str] = Field(default_factory=list)
    identifiers: list[str] | None = None

    @model_validator(mode="before")
    @classmethod
    def normalize_identifiers(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("ids") and data.get("identifiers"):
                data["ids"] = data["identifiers"]
        return data
