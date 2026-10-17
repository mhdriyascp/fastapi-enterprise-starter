import logging
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import delete, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.models.system.activity_log import ActivityLog
from app.infrastructure.database.models.system.notification import Notification
from app.infrastructure.database.models.system.setting import SystemSetting
from app.modules.activity_logs.schemas import ActivityLogResponse

logger = logging.getLogger(__name__)

ROUTE_MAP: dict[str, str] = {
    "organizations": "/organizations",
    "organization": "/organizations",
    "masters": "/masters",
    "master": "/masters",
    "users": "/users",
    "user": "/users",
    "rbac": "/rbac",
    "roles": "/rbac",
    "role": "/rbac",
    "permissions": "/rbac",
    "permission": "/rbac",
    "menus": "/menus",
    "menu": "/menus",
    "settings": "/settings",
    "setting": "/settings",
    "activity_logs": "/activity-logs",
    "activity_log": "/activity-logs",
    "security": "/settings",
    "system": "/settings",
    "deal": "/deals",
    "deals": "/deals",
}


async def _dispatch_module_notification(
    db: AsyncSession,
    module: str,
    action: str,
    entity_type: str,
    entity_id: str | int | UUID,
    entity_name: str | None = None,
) -> None:
    """Dispatches a system notification for newly created or updated records in supported modules."""
    try:
        clean_action = action.upper().strip()
        # Notifications update ONLY for newly created or updated record changes
        if clean_action not in ("CREATE", "UPDATE"):
            return

        clean_module = module.lower().strip()
        if clean_module in ("notifications", "notification"):
            return

        # Fetch in-app notifications flag & supported notification modules from SystemSettings
        setting_stmt = select(SystemSetting.key, SystemSetting.value).where(
            SystemSetting.category == "notifications",
            SystemSetting.key.in_(
                ["enable_in_app_notifications", "notification_modules"]
            ),
        )
        settings_rows = (await db.execute(setting_stmt)).all()
        settings_dict = {row[0]: row[1] for row in settings_rows}

        # Check if in-app notifications are globally enabled (defaults to True if not configured)
        if settings_dict.get("enable_in_app_notifications") is False:
            return

        configured_modules = settings_dict.get("notification_modules")
        if isinstance(configured_modules, list) and configured_modules:
            supported = [str(m).strip().lower() for m in configured_modules]
        else:
            supported = [
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

        singular = clean_module[:-1] if clean_module.endswith("s") else clean_module
        plural = clean_module if clean_module.endswith("s") else f"{clean_module}s"

        is_supported = (
            clean_module in supported or singular in supported or plural in supported
        )
        if not is_supported:
            return

        entity_title = entity_type.replace("_", " ").replace("-", " ").title()
        if clean_action == "CREATE":
            title = f"New {entity_title} Created"
            message = (
                f"{entity_title} '{entity_name}' was successfully created."
                if entity_name
                else f"A new {entity_title.lower()} record was created."
            )
        else:
            title = f"{entity_title} Updated"
            message = (
                f"{entity_title} '{entity_name}' was updated."
                if entity_name
                else f"{entity_title} details were updated."
            )

        link = ROUTE_MAP.get(clean_module, f"/{clean_module}")

        notification = Notification(
            user_id=None,
            title=title[:150],
            message=message[:1000],
            type=clean_module[:50],
            link=link[:255] if link else None,
            is_read=False,
        )
        db.add(notification)
        await db.flush()
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Failed to dispatch automated notification for module=%s action=%s: %s",
            module,
            action,
            exc,
        )


async def record_activity(
    db: AsyncSession,
    module: str,
    action: str,
    entity_type: str,
    entity_id: str | int | UUID,
    entity_name: str | None = None,
    details: dict[str, Any] | None = None,
    user_id: UUID | None = None,
    user_email: str | None = None,
    ip_address: str | None = None,
    request_id: str | None = None,
) -> ActivityLog | None:
    """Safely creates and attaches a system activity audit log record.

    Ensures that logging anomalies never abort or corrupt the surrounding business transaction.
    """
    try:
        log_entry = ActivityLog(
            module=module.lower().strip(),
            action=action.upper().strip(),
            entity_type=entity_type.strip(),
            entity_id=str(entity_id).strip(),
            entity_name=entity_name[:200] if entity_name else None,
            details=details,
            user_id=user_id,
            user_email=user_email[:254] if user_email else None,
            ip_address=ip_address[:50] if ip_address else None,
            request_id=request_id[:100] if request_id else None,
        )
        db.add(log_entry)
        await db.flush()

        # Automatically dispatch dynamic notification for supported modules on CREATE/UPDATE
        await _dispatch_module_notification(
            db=db,
            module=module,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
        )

        return log_entry
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Failed to capture activity log for module=%s action=%s: %s",
            module,
            action,
            exc,
        )
        return None


class ActivityLogService:
    """Service for querying and reporting system activity & audit logs."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    def to_response(self, log: ActivityLog) -> ActivityLogResponse:
        return ActivityLogResponse(
            id=log.id,
            public_id=log.public_id,
            module=log.module,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            entity_name=log.entity_name,
            details=log.details,
            user_id=log.user_id,
            user_email=log.user_email,
            ip_address=log.ip_address,
            request_id=log.request_id,
            created_at=log.created_at,
        )

    async def list_logs(
        self,
        module: str | None = None,
        action: str | None = None,
        search: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[ActivityLogResponse], int]:
        """Fetches a paginated, filterable audit log stream."""
        query = select(ActivityLog)

        if module and module.strip() and module.strip().lower() != "all":
            query = query.where(ActivityLog.module == module.strip().lower())

        if action and action.strip() and action.strip().upper() != "ALL":
            query = query.where(ActivityLog.action == action.strip().upper())

        if search and search.strip():
            term = f"%{search.strip()}%"
            query = query.where(
                or_(
                    ActivityLog.entity_name.ilike(term),
                    ActivityLog.entity_id.ilike(term),
                    ActivityLog.user_email.ilike(term),
                    ActivityLog.module.ilike(term),
                    ActivityLog.entity_type.ilike(term),
                )
            )

        if start_date:
            query = query.where(ActivityLog.created_at >= start_date)

        if end_date:
            query = query.where(ActivityLog.created_at <= end_date)

        total_res = await self.db.scalar(
            select(func.count()).select_from(query.subquery())
        )
        total = total_res or 0

        # High-performance reverse-chronological ordering
        ordered_query = (
            query.order_by(desc(ActivityLog.created_at), desc(ActivityLog.id))
            .offset(offset)
            .limit(limit)
        )

        rows = (await self.db.scalars(ordered_query)).all()
        return [self.to_response(r) for r in rows], total

    async def get_by_identifier(
        self, identifier: int | UUID | str
    ) -> ActivityLogResponse | None:
        """Resolves an activity log by internal integer ID or public UUIDv7."""
        query = select(ActivityLog)
        str_val = str(identifier).strip()

        try:
            parsed_uuid = UUID(str_val)
            query = query.where(ActivityLog.public_id == parsed_uuid)
        except ValueError, AttributeError:
            if str_val.isdigit():
                query = query.where(ActivityLog.id == int(str_val))
            else:
                return None

        record = (await self.db.execute(query)).scalar_one_or_none()
        return self.to_response(record) if record else None

    async def get_distinct_modules(self) -> list[str]:
        """Returns the list of modules that currently possess activity records."""
        query = select(ActivityLog.module).distinct().order_by(ActivityLog.module.asc())
        rows = (await self.db.scalars(query)).all()
        return list(rows)

    async def delete_log(self, identifier: int | UUID | str) -> bool:
        """Deletes a single activity log record by integer ID or public UUID."""
        query = select(ActivityLog)
        str_val = str(identifier).strip()

        try:
            parsed_uuid = UUID(str_val)
            query = query.where(ActivityLog.public_id == parsed_uuid)
        except ValueError, AttributeError:
            if str_val.isdigit():
                query = query.where(ActivityLog.id == int(str_val))
            else:
                return False

        record = (await self.db.execute(query)).scalar_one_or_none()
        if not record:
            return False

        await self.db.delete(record)
        await self.db.commit()
        return True

    async def bulk_delete_logs(self, identifiers: list[str]) -> int:
        """Deletes multiple activity log records by their identifiers in a single batch."""
        if not identifiers:
            return 0

        int_ids: list[int] = []
        uuid_ids: list[UUID] = []
        for raw in identifiers:
            s = str(raw).strip()
            try:
                uuid_ids.append(UUID(s))
            except ValueError, AttributeError:
                if s.isdigit():
                    int_ids.append(int(s))

        clauses = []
        if int_ids:
            clauses.append(ActivityLog.id.in_(int_ids))
        if uuid_ids:
            clauses.append(ActivityLog.public_id.in_(uuid_ids))

        if not clauses:
            return 0

        stmt = select(ActivityLog).where(or_(*clauses))
        records = (await self.db.scalars(stmt)).all()
        count = len(records)
        for r in records:
            await self.db.delete(r)

        if count > 0:
            await self.db.commit()
        return count

    async def clear_all_logs(self) -> int:
        """Permanently purges all system activity log records from the database.

        Returns:
            The number of records permanently deleted.
        """
        stmt = delete(ActivityLog)
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.rowcount or 0
