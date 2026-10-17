import uuid
from datetime import UTC, datetime

from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.models.system.notification import Notification
from app.infrastructure.database.models.system.setting import SystemSetting
from app.modules.notifications.schemas import NotificationCreate


class NotificationService:
    """Service layer managing database interactions and lifecycle for notifications."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_for_user(
        self,
        user_id: uuid.UUID,
        *,
        unread_only: bool = False,
        offset: int = 0,
        limit: int = 50,
    ) -> tuple[list[Notification], int]:
        """Fetches notifications visible to the specified user with total count.

        Args:
            user_id: UUID of the authenticated operator.
            unread_only: If True, filters strictly to unread notifications.
            offset: SQL pagination offset.
            limit: SQL pagination page size limit.

        Returns:
            Tuple containing the list of Notification entities and total count.
        """
        base_filter = or_(
            Notification.user_id == user_id,
            Notification.user_id.is_(None),
        )

        count_stmt = select(func.count()).select_from(Notification).where(base_filter)
        if unread_only:
            count_stmt = count_stmt.where(Notification.is_read.is_(False))
        total = (await self.db.execute(count_stmt)).scalar_one()

        query = (
            select(Notification)
            .where(base_filter)
            .order_by(Notification.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        if unread_only:
            query = query.where(Notification.is_read.is_(False))

        result = await self.db.execute(query)
        items = list(result.scalars().all())
        return items, total

    async def get_unread_count(self, user_id: uuid.UUID) -> int:
        """Retrieves the count of unread notifications for the user."""
        stmt = (
            select(func.count())
            .select_from(Notification)
            .where(
                or_(
                    Notification.user_id == user_id,
                    Notification.user_id.is_(None),
                ),
                Notification.is_read.is_(False),
            )
        )
        return (await self.db.execute(stmt)).scalar_one()

    async def get_supported_modules(self) -> list[str]:
        """Fetches operational modules for notifications dynamically from System Settings."""
        try:
            stmt = select(SystemSetting.value).where(
                SystemSetting.category == "notifications",
                SystemSetting.key == "notification_modules",
            )
            res = (await self.db.execute(stmt)).scalar_one_or_none()
            if isinstance(res, list):
                configured_modules = [
                    str(m).strip().lower() for m in res if str(m).strip()
                ]
                # Return strictly the administrator-configured modules
                if configured_modules:
                    return configured_modules
        except Exception:
            pass

        return [
            "organizations",
            "masters",
            "rbac",
            "users",
            "settings",
            "menus",
            "activity_logs",
            "security",
            "system",
            "deal",
        ]

    async def create_notification(self, data: NotificationCreate) -> Notification:
        """Creates and commits a new notification."""
        notification = Notification(
            user_id=data.user_id,
            title=data.title.strip(),
            message=data.message.strip(),
            type=data.type,
            link=data.link.strip() if data.link else None,
            is_read=False,
        )
        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)
        return notification

    def _build_identifier_clause(self, identifier: int | uuid.UUID | str):
        if isinstance(identifier, int):
            return Notification.id == identifier
        if isinstance(identifier, uuid.UUID):
            return Notification.public_id == identifier
        str_val = str(identifier).strip()
        if str_val.isdigit():
            return Notification.id == int(str_val)
        try:
            val_uuid = uuid.UUID(str_val)
            return Notification.public_id == val_uuid
        except ValueError:
            return Notification.id == -1

    async def mark_as_read(
        self,
        notification_id: int | uuid.UUID | str,
        user_id: uuid.UUID,
        *,
        is_read: bool = True,
    ) -> Notification | None:
        """Toggles the read status of a specific notification by int ID or public UUID."""
        id_clause = self._build_identifier_clause(notification_id)
        stmt = select(Notification).where(
            id_clause,
            or_(
                Notification.user_id == user_id,
                Notification.user_id.is_(None),
            ),
        )
        result = await self.db.execute(stmt)
        notification = result.scalar_one_or_none()
        if not notification:
            return None

        notification.is_read = is_read
        notification.read_at = datetime.now(UTC) if is_read else None
        await self.db.commit()
        await self.db.refresh(notification)
        return notification

    async def mark_all_read(self, user_id: uuid.UUID) -> int:
        """Marks all unread notifications visible to the user as read."""
        stmt = (
            update(Notification)
            .where(
                or_(
                    Notification.user_id == user_id,
                    Notification.user_id.is_(None),
                ),
                Notification.is_read.is_(False),
            )
            .values(
                is_read=True,
                read_at=datetime.now(UTC),
            )
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.rowcount

    async def delete_notification(
        self,
        notification_id: int | uuid.UUID | str,
        user_id: uuid.UUID,
    ) -> bool:
        """Deletes a specific notification by int ID or public UUID."""
        id_clause = self._build_identifier_clause(notification_id)
        stmt = select(Notification).where(
            id_clause,
            or_(
                Notification.user_id == user_id,
                Notification.user_id.is_(None),
            ),
        )
        result = await self.db.execute(stmt)
        notification = result.scalar_one_or_none()
        if not notification:
            return False

        await self.db.delete(notification)
        await self.db.commit()
        return True

    async def clear_all(self, user_id: uuid.UUID) -> int:
        """Clears all notifications visible to the user."""
        stmt = delete(Notification).where(
            or_(
                Notification.user_id == user_id,
                Notification.user_id.is_(None),
            )
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.rowcount
