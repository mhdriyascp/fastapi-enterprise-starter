import logging
from typing import Any
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.inspection import inspect

from app.infrastructure.database.models.system.setting import SystemSetting
from app.modules.activity_logs.service import record_activity
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
        if sort_by in mapper.columns and sort_by != "created_at":
            sort_col_name = sort_by
        elif sort_by == "created_at" and "sort_order" in mapper.columns:
            sort_col_name = "sort_order"
        else:
            sort_col_name = "sort_order" if "sort_order" in mapper.columns else "id"

        sort_column = getattr(SystemSetting, sort_col_name)
        if sort_col_name == "sort_order" and sort_by == "created_at":
            order_clause = sort_column.asc()
        else:
            order_clause = (
                sort_column.asc() if sort_order == "asc" else sort_column.desc()
            )

        if sort_col_name != "sort_order":
            order_by_args = [
                order_clause,
                SystemSetting.sort_order.asc(),
                SystemSetting.id.asc(),
            ]
        else:
            order_by_args = [
                order_clause,
                SystemSetting.category.asc(),
                SystemSetting.id.asc(),
            ]

        result = await self.db.scalars(
            query.order_by(*order_by_args).offset(offset).limit(limit)
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
        if payload.sort_order is not None:
            setting.sort_order = payload.sort_order
        if updated_by_id:
            setting.updated_by_id = updated_by_id

        await self.db.commit()
        await self.db.refresh(setting)
        await record_activity(
            db=self.db,
            module="settings",
            action="UPDATE",
            entity_type="SystemSetting",
            entity_id=setting.public_id,
            entity_name=setting.key,
            details={
                "key": setting.key,
                "value": setting.value,
                "sort_order": setting.sort_order,
            },
            user_id=updated_by_id,
        )
        await self.db.commit()
        logger.info(
            "System setting updated: %s=%s (sort_order=%d) [Operator: %s]",
            setting.key,
            setting.value,
            setting.sort_order,
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

        all_keys = set(payload.settings.keys())
        if payload.sort_orders:
            all_keys.update(payload.sort_orders.keys())

        for key in all_keys:
            stmt = select(SystemSetting).where(
                SystemSetting.key == key.strip(),
                SystemSetting.is_deleted.is_(False),
            )
            setting = (await self.db.execute(stmt)).scalar_one_or_none()
            if setting:
                if key in payload.settings:
                    setting.value = payload.settings[key]
                if payload.sort_orders and key in payload.sort_orders:
                    setting.sort_order = payload.sort_orders[key]
                if updated_by_id:
                    setting.updated_by_id = updated_by_id
                updated_settings.append(setting)

        if updated_settings:
            await self.db.commit()
            for s in updated_settings:
                await self.db.refresh(s)
            await record_activity(
                db=self.db,
                module="settings",
                action="UPDATE",
                entity_type="SystemSetting",
                entity_id="bulk",
                entity_name="Bulk System Settings",
                details={
                    "updated_keys": list(payload.settings.keys()),
                    "updated_sort_orders": list((payload.sort_orders or {}).keys()),
                },
                user_id=updated_by_id,
            )
            await self.db.commit()

        logger.info(
            "Bulk system settings updated (%d keys modified) [Operator: %s]",
            len(updated_settings),
            updated_by_id,
        )
        return updated_settings

    async def get_options_metadata(self) -> dict[str, list[dict[str, Any]]]:
        """Provides dynamic select options for modules, roles, currencies, timezones, and languages.

        Queries live relational master tables and security roles so dropdowns never rely on
        stale, hardcoded lists.
        """
        # 1. Fetch dynamic active roles from RBAC
        from app.modules.rbac.models import Role

        roles_stmt = (
            select(Role)
            .where(Role.is_deleted.is_(False), Role.is_active.is_(True))
            .order_by(Role.name.asc())
        )
        roles_res = await self.db.scalars(roles_stmt)
        roles_list = [
            {
                "value": r.code,
                "label": r.name,
                "sublabel": r.code,
                "badge": "System" if r.is_system else "Custom",
            }
            for r in roles_res.all()
        ]

        # 2. Fetch dynamic active currencies from Master data
        from app.infrastructure.database.models.masters.currency import Currency

        curr_stmt = (
            select(Currency)
            .where(Currency.is_deleted.is_(False), Currency.is_active.is_(True))
            .order_by(Currency.code.asc())
        )
        curr_res = await self.db.scalars(curr_stmt)
        currencies_list = [
            {
                "value": c.code,
                "label": f"{c.code} ({c.symbol} - {c.name})"
                if c.symbol
                else f"{c.code} ({c.name})",
                "sublabel": c.name,
                "badge": c.code,
            }
            for c in curr_res.all()
        ]

        # 3. Fetch dynamic active timezones from Master data
        from app.infrastructure.database.models.masters.time_zone import TimeZone

        tz_stmt = (
            select(TimeZone)
            .where(TimeZone.is_deleted.is_(False), TimeZone.is_active.is_(True))
            .order_by(TimeZone.label.asc())
        )
        tz_res = await self.db.scalars(tz_stmt)
        timezones_list = [
            {
                "value": tz.name,
                "label": tz.label,
                "sublabel": tz.name,
                "badge": tz.utc_offset or "UTC",
            }
            for tz in tz_res.all()
        ]

        # 4. Fetch dynamic active languages/locales from Master data
        from app.infrastructure.database.models.masters.language import Language

        lang_stmt = (
            select(Language)
            .where(Language.is_deleted.is_(False), Language.is_active.is_(True))
            .order_by(Language.name.asc())
        )
        lang_res = await self.db.scalars(lang_stmt)
        languages_list = [
            {
                "value": lang.code,
                "label": f"{lang.name} ({lang.native_name})"
                if lang.native_name
                else lang.name,
                "sublabel": lang.code,
                "badge": lang.code.upper(),
            }
            for lang in lang_res.all()
        ]

        # 5. Comprehensive System & CRM modules registry (current active + upcoming roadmap)
        modules_list = [
            # Active Platform Modules
            {
                "value": "organizations",
                "label": "Organizations",
                "sublabel": "Company tenants & accounts",
                "badge": "Core",
                "status": "active",
            },
            {
                "value": "masters",
                "label": "Master Data",
                "sublabel": "Catalogs, currencies, countries & locations",
                "badge": "Core",
                "status": "active",
            },
            {
                "value": "rbac",
                "label": "Access Control (RBAC)",
                "sublabel": "Roles & security permissions",
                "badge": "Security",
                "status": "active",
            },
            {
                "value": "users",
                "label": "User Accounts",
                "sublabel": "Identities, profiles & credentials",
                "badge": "Security",
                "status": "active",
            },
            {
                "value": "settings",
                "label": "System Settings",
                "sublabel": "Global parameters & enterprise configurations",
                "badge": "System",
                "status": "active",
            },
            {
                "value": "menus",
                "label": "Navigation Menus",
                "sublabel": "Sidebar navigation & routes",
                "badge": "System",
                "status": "active",
            },
            {
                "value": "activity_logs",
                "label": "System Activity Logs",
                "sublabel": "Audit trails & compliance records",
                "badge": "Audit",
                "status": "active",
            },
            {
                "value": "security",
                "label": "Security Governance",
                "sublabel": "Session timeouts & lockout protection",
                "badge": "Security",
                "status": "active",
            },
            {
                "value": "system",
                "label": "System Operations",
                "sublabel": "Core runtime & scheduler services",
                "badge": "System",
                "status": "active",
            },
            {
                "value": "notifications",
                "label": "System Notifications",
                "sublabel": "Real-time dispatch channels & banners",
                "badge": "System",
                "status": "active",
            },
            # Upcoming CRM Domain Modules
            {
                "value": "leads",
                "label": "Leads & Inquiries",
                "sublabel": "Inbound inquiries, scoring & qualification",
                "badge": "Sales",
                "status": "upcoming",
            },
            {
                "value": "deal",
                "label": "Deals & Opportunities",
                "sublabel": "Sales pipeline stages & revenue forecasting",
                "badge": "Sales",
                "status": "upcoming",
            },
            {
                "value": "contacts",
                "label": "Contacts & Stakeholders",
                "sublabel": "Customer decision makers & relationships",
                "badge": "CRM",
                "status": "upcoming",
            },
            {
                "value": "accounts",
                "label": "Customer Accounts",
                "sublabel": "Corporate client entities & branch hierarchies",
                "badge": "CRM",
                "status": "upcoming",
            },
            {
                "value": "pipelines",
                "label": "Sales Pipelines",
                "sublabel": "Custom deal workflows & velocity tracking",
                "badge": "Sales",
                "status": "upcoming",
            },
            {
                "value": "products",
                "label": "Products & Services",
                "sublabel": "Product catalog, SKU inventory & price books",
                "badge": "Commerce",
                "status": "upcoming",
            },
            {
                "value": "quotes",
                "label": "Quotes & Estimates",
                "sublabel": "Sales proposals, estimations & discount approvals",
                "badge": "Commerce",
                "status": "upcoming",
            },
            {
                "value": "invoices",
                "label": "Invoices & Billing",
                "sublabel": "Receivables, billing cycles & payment tracking",
                "badge": "Commerce",
                "status": "upcoming",
            },
            {
                "value": "tickets",
                "label": "Support Tickets",
                "sublabel": "Customer helpdesk, SLAs & escalations",
                "badge": "Support",
                "status": "upcoming",
            },
            {
                "value": "documents",
                "label": "Documents & Contracts",
                "sublabel": "File storage, agreements & signatures",
                "badge": "Operations",
                "status": "upcoming",
            },
            {
                "value": "tasks",
                "label": "Tasks & Activities",
                "sublabel": "Calls, meetings, reminders & follow-ups",
                "badge": "Productivity",
                "status": "upcoming",
            },
            {
                "value": "analytics",
                "label": "Executive Intelligence",
                "sublabel": "Executive dashboards, conversion ratios & audit KPIs",
                "badge": "Intelligence",
                "status": "upcoming",
            },
        ]

        return {
            "modules": modules_list,
            "roles": roles_list,
            "currencies": currencies_list,
            "timezones": timezones_list,
            "languages": languages_list,
        }
