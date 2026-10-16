import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.shared.base_schema import BaseSchema


class NotificationCreate(BaseModel):
    title: str = Field(min_length=2, max_length=150)
    message: str = Field(min_length=2, max_length=1000)
    type: Literal["deal", "security", "tenant", "system"] = "system"
    link: str | None = Field(default=None, max_length=255)
    user_id: uuid.UUID | None = None


class NotificationUpdate(BaseModel):
    is_read: bool


class NotificationResponse(BaseSchema):
    id: int
    public_id: uuid.UUID
    user_id: uuid.UUID | None = None
    title: str
    message: str
    type: str
    link: str | None = None
    is_read: bool
    read_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None


class UnreadCountResponse(BaseModel):
    unread_count: int
