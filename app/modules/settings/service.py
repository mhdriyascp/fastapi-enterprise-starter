import logging
from typing import Any
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.inspection import inspect

from app.infrastructure.database.models.system.setting import SystemSetting
from app.modules.settings.schemas import BulkSettingsUpdate, SystemSettingUpdate

logger = logging.getLogger(__name__)


class SystemSettingService:
    """Domain service encapsulating all enterprise system settings queries and mutations."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list(
        self,
        *,
        category: str | None = None,
        is_public: bool | None = None,
        search: str | None = None,
        offset: int = 0,
        limit: int = 100,
        sort_by: str = "category",
        sort_order: str = "asc",
    ) -> tuple[list[SystemSetting], int]:
        """Lists system settings with category filtering, search, and dynamic sorting.

        Args:
            category: Optional category filter ('general', 'security', etc.).
            is_public: Optional filter for public client-accessible settings.
            search: Optional search term matching key, label, or description.
            offset: Pagination offset.
            limit: Maximum items to return.
            sort_by: Target model column.
            sort_order: Sort direction ('asc' or 'desc').

        Returns:
            Tuple of (settings list, total count).
        """
        query = select(SystemSetting).where(SystemSetting.is_deleted.is_(False))

        if category and category.strip():
            query = query.where(SystemSetting.category == category.strip().lower())

        if is_public is not None:
            query = query.where(SystemSetting.is_public == is_public)

        if search and search.strip():
            term = f"%{search.strip()}%"
            query = query.where(
                or_(
                    SystemSetting.key.ilike(term),
                    SystemSetting.label.ilike(term),
                    SystemSetting.description.ilike(term),
                )
            )

        total = await self.db.scalar(select(func.count()).select_from(query.subquery()))

        mapper = inspect(SystemSetting)
        sort_col_name = (
            sort_by
            if sort_by in mapper.columns
            else ("category" if "category" in mapper.columns else "id")
        )
        sort_column = getattr(SystemSetting, sort_col_name)
        order_clause = sort_column.asc() if sort_order == "asc" else sort_column.desc()

        result = await self.db.scalars(
            query.order_by(order_clause).offset(offset).limit(limit)
        )
        return list(result.all()), total or 0

    async def get_by_identifier(
        self,
        identifier: str | int | UUID,
    ) -> SystemSetting | None:
        """Fetches a system setting via dual-resolution: integer ID, UUID public_id, or setting key.

        Args:
            identifier: The internal ID, external UUID, or unique configuration key.

        Returns:
            The matching SystemSetting entity or None if not found.
        """
        if isinstance(identifier, UUID):
            stmt = select(SystemSetting).where(
                SystemSetting.public_id == identifier,
                SystemSetting.is_deleted.is_(False),
            )
            return (await self.db.execute(stmt)).scalar_one_or_none()

        if isinstance(identifier, int):
            stmt = select(SystemSetting).where(
                SystemSetting.id == identifier,
                SystemSetting.is_deleted.is_(False),
            )
            return (await self.db.execute(stmt)).scalar_one_or_none()

        clean_id = str(identifier).strip()

        # Check for UUID string
        try:
            parsed_uuid = UUID(clean_id)
            stmt = select(SystemSetting).where(
                SystemSetting.public_id == parsed_uuid,
                SystemSetting.is_deleted.is_(False),
            )
            found = (await self.db.execute(stmt)).scalar_one_or_none()
            if found:
                return found
        except ValueError:
            pass

        # Check for numeric string
        if clean_id.isdigit():
            stmt = select(SystemSetting).where(
                SystemSetting.id == int(clean_id),
                SystemSetting.is_deleted.is_(False),
            )
            found = (await self.db.execute(stmt)).scalar_one_or_none()
            if found:
                return found

        # Fallback to key lookup
        stmt = select(SystemSetting).where(
            SystemSetting.key == clean_id,
            SystemSetting.is_deleted.is_(False),
        )
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def get_public_settings_map(self) -> dict[str, Any]:
        """Returns a key-value dictionary of all public configurations safe for unauthenticated clients."""
        stmt = select(SystemSetting).where(
            SystemSetting.is_public.is_(True),
            SystemSetting.is_deleted.is_(False),
        )
        rows = (await self.db.scalars(stmt)).all()
        return {setting.key: setting.value for setting in rows}

    async def get_all_settings_map(self) -> dict[str, Any]:
        """Returns a full key-value dictionary of all system configurations."""
        stmt = select(SystemSetting).where(SystemSetting.is_deleted.is_(False))
        rows = (await self.db.scalars(stmt)).all()
        return {setting.key: setting.value for setting in rows}

    async def update(
        self,
        identifier: str | int | UUID,
        payload: SystemSettingUpdate,
        updated_by_id: UUID | None = None,
    ) -> SystemSetting | None:
        """Updates a single system setting value and metadata."""
        setting = await self.get_by_identifier(identifier)
        if not setting:
            return None

        setting.value = payload.value
        if payload.label is not None:
            setting.label = payload.label.strip()
        if payload.description is not None:
            setting.description = payload.description.strip()
        if updated_by_id:
            setting.updated_by_id = updated_by_id

        await self.db.commit()
        await self.db.refresh(setting)
        logger.info(
            "System setting updated: %s=%s [Operator: %s]",
            setting.key,
            setting.value,
            updated_by_id,
        )
        return setting

    async def bulk_update(
        self,
        payload: BulkSettingsUpdate,
        updated_by_id: UUID | None = None,
    ) -> list[SystemSetting]:
        """Atomically updates multiple system settings by key."""
        updated_settings: list[SystemSetting] = []

        for key, new_value in payload.settings.items():
            stmt = select(SystemSetting).where(
                SystemSetting.key == key.strip(),
                SystemSetting.is_deleted.is_(False),
            )
            setting = (await self.db.execute(stmt)).scalar_one_or_none()
            if setting:
                setting.value = new_value
                if updated_by_id:
                    setting.updated_by_id = updated_by_id
                updated_settings.append(setting)

        if updated_settings:
            await self.db.commit()
            for s in updated_settings:
                await self.db.refresh(s)

        logger.info(
            "Bulk system settings updated (%d keys modified) [Operator: %s]",
            len(updated_settings),
            updated_by_id,
        )
        return updated_settings
