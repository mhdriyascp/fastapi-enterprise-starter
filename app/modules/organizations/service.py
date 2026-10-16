import re
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.inspection import inspect

from app.infrastructure.database.models.organization.organization import (
    Organization,
)
from app.modules.organizations.schemas import (
    OrganizationCreate,
    OrganizationUpdate,
)


class OrganizationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        data: OrganizationCreate,
    ) -> Organization:
        if data.code and data.code.strip():
            clean_code = data.code.strip().upper()
        else:
            base_code = re.sub(r"[^A-Za-z0-9_]+", "_", data.name.strip().upper()).strip(
                "_"
            )[:30]
            if len(base_code) < 2:
                base_code = f"{base_code}_ORG"[:30]

            candidate = base_code
            counter = 1
            while True:
                exists_stmt = select(Organization.id).where(
                    Organization.code == candidate
                )
                exists = (await self.db.execute(exists_stmt)).scalar_one_or_none()
                if not exists:
                    clean_code = candidate
                    break
                candidate = f"{base_code[:25]}_{counter}"
                counter += 1

        organization = Organization(
            code=clean_code,
            name=data.name.strip(),
            legal_name=data.legal_name,
            registration_number=data.registration_number,
            tax_registration_number=data.tax_registration_number,
            email=str(data.email) if data.email else None,
            phone=data.phone,
            website=str(data.website) if data.website else None,
        )

        self.db.add(organization)

        try:
            await self.db.commit()
            await self.db.refresh(organization)
        except IntegrityError as exc:
            await self.db.rollback()
            raise ValueError("An organization with this code already exists.") from exc

        return organization

    async def list(
        self,
        *,
        offset: int = 0,
        limit: int = 50,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        search: str | None = None,
        is_active: bool | None = None,
    ) -> tuple[list[Organization], int]:
        """Lists organizations with pagination, search, status filtering, and dynamic sorting.

        Args:
            offset: Number of items to skip.
            limit: Maximum number of items to return.
            sort_by: Column name to order by.
            sort_order: Sort direction ('asc' or 'desc').
            search: Optional text term to search in name, code, legal_name, registration_number.
            is_active: Optional boolean filter for active state.

        Returns:
            A tuple of (organizations list, total count).
        """
        query = select(Organization).where(Organization.is_deleted.is_(False))
        mapper = inspect(Organization)

        if is_active is not None:
            query = query.where(Organization.is_active == is_active)

        if search and search.strip():
            term = f"%{search.strip()}%"
            query = query.where(
                or_(
                    Organization.name.ilike(term),
                    Organization.code.ilike(term),
                    Organization.legal_name.ilike(term),
                    Organization.registration_number.ilike(term),
                )
            )

        total = await self.db.scalar(select(func.count()).select_from(query.subquery()))

        sort_col_name = (
            sort_by
            if sort_by in mapper.columns
            else ("created_at" if "created_at" in mapper.columns else "id")
        )
        sort_column = getattr(Organization, sort_col_name)
        order_clause = sort_column.asc() if sort_order == "asc" else sort_column.desc()

        result = await self.db.scalars(
            query.order_by(order_clause).offset(offset).limit(limit)
        )
        return list(result.all()), total or 0

    async def get_by_id(
        self,
        organization_id: int,
        include_deleted: bool = False,
    ) -> Organization | None:
        """Fetches an organization by internal database ID."""
        query = select(Organization).where(Organization.id == organization_id)
        if hasattr(Organization, "is_deleted") and not include_deleted:
            query = query.where(Organization.is_deleted.is_(False))
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_public_id(
        self,
        public_id: UUID,
        include_deleted: bool = False,
    ) -> Organization | None:
        """Fetches an organization by external UUID public ID."""
        query = select(Organization).where(Organization.public_id == public_id)
        if hasattr(Organization, "is_deleted") and not include_deleted:
            query = query.where(Organization.is_deleted.is_(False))
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get(
        self,
        identifier: int | UUID | str,
        include_deleted: bool = False,
    ) -> Organization | None:
        """Fetches an organization by UUID public ID, integer ID, or string identifier.

        Supports dual-lookup:
        - UUID or valid UUID string -> resolves by public_id
        - int or integer digit string -> resolves by internal id
        """
        if isinstance(identifier, UUID):
            return await self.get_by_public_id(
                identifier, include_deleted=include_deleted
            )

        if isinstance(identifier, int):
            return await self.get_by_id(
                organization_id=identifier, include_deleted=include_deleted
            )

        # String identifier: check if valid UUID first
        str_val = str(identifier).strip()
        try:
            parsed_uuid = UUID(str_val)
            return await self.get_by_public_id(
                parsed_uuid, include_deleted=include_deleted
            )
        except ValueError, AttributeError:
            pass

        # If digits, fallback to integer ID
        if str_val.isdigit():
            return await self.get_by_id(
                organization_id=int(str_val), include_deleted=include_deleted
            )

        return None

    async def update(
        self,
        organization: Organization,
        data: OrganizationUpdate,
    ) -> Organization:
        updates = data.model_dump(exclude_unset=True)

        for field, value in updates.items():
            if field == "name":
                if value is None or not str(value).strip():
                    raise ValueError("Organization name cannot be null or empty.")
            if isinstance(value, str):
                value = value.strip()
            if field == "email" and value is not None:
                value = str(value)
            if field == "website" and value is not None:
                value = str(value)

            setattr(organization, field, value)

        try:
            await self.db.commit()
            await self.db.refresh(organization)
        except IntegrityError as exc:
            await self.db.rollback()
            raise ValueError("The organization could not be updated.") from exc

        return organization

    async def update_status(
        self,
        organization: Organization,
        is_active: bool,
    ) -> Organization:
        organization.is_active = is_active
        await self.db.commit()
        await self.db.refresh(organization)
        return organization

    async def delete(
        self,
        organization: Organization,
        deleted_by_id: UUID | None = None,
        hard_delete: bool = False,
    ) -> None:
        """Deletes an organization entity from the database.

        By default, performs soft-deletion by setting is_deleted=True
        and deleted_at=datetime.now(UTC), preserving financial history and relationships.

        Args:
            organization: The organization entity to delete.
            deleted_by_id: Optional operator UUID responsible for the deletion.
            hard_delete: If True, physically deletes the record from the database.
        """
        if hard_delete:
            await self.db.delete(organization)
        else:
            organization.is_deleted = True
            organization.deleted_at = datetime.now(UTC)
            if deleted_by_id is not None:
                organization.updated_by_id = deleted_by_id

        await self.db.commit()
