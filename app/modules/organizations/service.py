import re

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

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
    ) -> list[Organization]:
        result = await self.db.execute(
            select(Organization).order_by(Organization.id).offset(offset).limit(limit)
        )
        return list(result.scalars().all())

    async def get(self, organization_id: int) -> Organization | None:
        result = await self.db.execute(
            select(Organization).where(Organization.id == organization_id)
        )
        return result.scalar_one_or_none()

    async def update(
        self,
        organization: Organization,
        data: OrganizationUpdate,
    ) -> Organization:
        updates = data.model_dump(exclude_unset=True)

        for field, value in updates.items():
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

    async def delete(self, organization: Organization) -> None:
        """Deletes an organization entity from the database.

        Args:
            organization: The organization entity to delete.
        """
        await self.db.delete(organization)
        await self.db.commit()
