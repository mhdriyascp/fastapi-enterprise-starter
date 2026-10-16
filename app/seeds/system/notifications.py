from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.models.system.notification import Notification


async def seed_notifications(db: AsyncSession) -> None:
    """Seeds initial enterprise operational, deal, security, and tenant notifications."""
    count_stmt = select(func.count()).select_from(Notification)
    existing_count = (await db.execute(count_stmt)).scalar_one()

    if existing_count > 0:
        return

    sample_notifications = [
        {
            "title": "Enterprise Contract Finalized",
            "message": "Acme International Corporation signed a $45,000 ARR multi-year SLA.",
            "type": "deal",
            "link": "/organizations",
            "is_read": False,
        },
        {
            "title": "Role Permissions Updated",
            "message": "Security policy updated: 4 permissions granted to 'Regional_Manager'.",
            "type": "security",
            "link": "/rbac?tab=roles",
            "is_read": False,
        },
        {
            "title": "New Tenant Partition Verified",
            "message": "Apex Global Holdings (ORG-002) database partition verified healthy.",
            "type": "tenant",
            "link": "/organizations",
            "is_read": False,
        },
        {
            "title": "Database Defragmentation Complete",
            "message": "Automated index maintenance completed with zero query degradation.",
            "type": "system",
            "link": "/dashboard",
            "is_read": True,
        },
        {
            "title": "Q4 Billing Batch Auto-Reconciled",
            "message": "Financial ledger auto-settlement completed successfully for 48 accounts.",
            "type": "deal",
            "link": "/dashboard",
            "is_read": True,
        },
        {
            "title": "SSL Certificate Auto-Renewed",
            "message": "Cloudflare edge wildcard certificate successfully renewed for 365 days.",
            "type": "system",
            "link": "/dashboard",
            "is_read": False,
        },
    ]

    for item in sample_notifications:
        notification = Notification(
            user_id=None,  # Broadcast system-wide to all operators
            title=item["title"],
            message=item["message"],
            type=item["type"],
            link=item["link"],
            is_read=item["is_read"],
        )
        db.add(notification)

    await db.flush()
