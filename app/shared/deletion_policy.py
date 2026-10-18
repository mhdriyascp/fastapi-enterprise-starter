from uuid import UUID

from sqlalchemy import exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.models.system.setting import SystemSetting
from app.modules.rbac.models import Permission, Role, RolePermission, UserRole
from app.modules.users.models import User

DEFAULT_ADMIN_ROLES = ["super_admin", "admin"]


async def get_permanent_delete_roles(db: AsyncSession) -> list[str]:
    """Retrieves the list of role codes authorized to perform permanent hard-deletions."""
    try:
        stmt = select(SystemSetting.value).where(
            SystemSetting.category == "data_retention",
            SystemSetting.key == "permanent_delete_roles",
        )
        res = (await db.execute(stmt)).scalar_one_or_none()
        if isinstance(res, list) and res:
            return [str(r).strip().lower() for r in res if str(r).strip()]

        # Fallback to security administrator roles if not explicitly set
        stmt_sec = select(SystemSetting.value).where(
            SystemSetting.category == "security",
            SystemSetting.key == "administrator_roles",
        )
        res_sec = (await db.execute(stmt_sec)).scalar_one_or_none()
        if isinstance(res_sec, list) and res_sec:
            return [str(r).strip().lower() for r in res_sec if str(r).strip()]
    except Exception:
        pass
    return DEFAULT_ADMIN_ROLES


async def get_permanent_delete_exceptions(db: AsyncSession) -> list[str]:
    """Retrieves module exceptions for permanent deletion from system settings."""
    try:
        stmt = select(SystemSetting.value).where(
            SystemSetting.category == "data_retention",
            SystemSetting.key == "permanent_delete_exceptions",
        )
        res = (await db.execute(stmt)).scalar_one_or_none()
        if isinstance(res, list) and res:
            return [str(r).strip().lower() for r in res if str(r).strip()]
    except Exception:
        pass
    return []


async def is_soft_delete_only_for_non_admins(db: AsyncSession) -> bool:
    """Checks whether non-admin delete operations must be soft-deleted by default."""
    try:
        stmt = select(SystemSetting.value).where(
            SystemSetting.category == "data_retention",
            SystemSetting.key == "soft_delete_only_for_non_admins",
        )
        res = (await db.execute(stmt)).scalar_one_or_none()
        if res is not None:
            return bool(res)
    except Exception:
        pass
    return True


async def is_user_administrator(db: AsyncSession, user_id: UUID) -> bool:
    """Checks if a user possesses an active administrator role."""
    admin_roles = await get_permanent_delete_roles(db)
    query = (
        select(UserRole.user_id)
        .join(Role, Role.id == UserRole.role_id)
        .where(
            UserRole.user_id == user_id,
            Role.is_active.is_(True),
            func.lower(Role.code).in_(admin_roles),
        )
    )
    return bool((await db.execute(select(exists(query)))).scalar_one())


async def is_user_authorized_for_hard_delete(
    db: AsyncSession,
    user: User,
    module: str,
) -> bool:
    """Evaluates whether the user is authorized to permanently delete a record.

    Policy:
    - Super administrators are always authorized.
    - Administrators (roles in permanent_delete_roles setting) have system generated
      hard-delete authorization unless a soft-only exception is active in settings.
    - Non-administrators can perform hard-delete ONLY if granted explicit RBAC permission
      (e.g., '{module}.hard_delete', 'masters:hard_delete', '*.hard_delete', or '*.*')
      or if a module exception in settings permits it.

    Args:
        db: Database session.
        user: The authenticated user initiating the deletion.
        module: The CRM domain or entity name (e.g., 'organizations', 'masters', 'users').

    Returns:
        True if the user has authorization for hard permanent deletion; False otherwise.
    """
    if getattr(user, "is_super_admin", False):
        return True

    clean_mod = module.strip().lower()
    exceptions = await get_permanent_delete_exceptions(db)

    # Check for soft-only exceptions in settings
    has_soft_exception = (
        f"{clean_mod}:soft_only" in exceptions
        or f"{clean_mod}:soft" in exceptions
        or f"{clean_mod}:prevent_hard" in exceptions
    )
    if has_soft_exception:
        return False

    is_admin = await is_user_administrator(db, user.id)
    if is_admin:
        return True

    has_hard_exception = (
        f"{clean_mod}:hard_allowed" in exceptions
        or f"{clean_mod}:hard" in exceptions
        or f"{clean_mod}:allow_hard" in exceptions
        or clean_mod in exceptions
    )
    if has_hard_exception:
        return True

    # Check for explicit RBAC permission granted to user's active roles
    singular_mod = (
        clean_mod[:-1]
        if clean_mod.endswith("s") and clean_mod not in ("masters", "rbac")
        else clean_mod
    )
    perm_codes = (
        f"{singular_mod}.hard_delete",
        f"{clean_mod}.hard_delete",
        f"{clean_mod}:hard_delete",
        "*.hard_delete",
        "*.*",
        "*.manage",
    )

    rbac_query = (
        select(UserRole.user_id)
        .join(Role, Role.id == UserRole.role_id)
        .join(RolePermission, RolePermission.role_id == Role.id)
        .join(Permission, Permission.id == RolePermission.permission_id)
        .where(
            UserRole.user_id == user.id,
            Role.is_active.is_(True),
            Permission.is_active.is_(True),
            Permission.code.in_(perm_codes),
        )
    )
    return bool((await db.execute(select(exists(rbac_query)))).scalar_one())


async def is_user_authorized_for_restore(
    db: AsyncSession,
    user: User,
    module: str,
) -> bool:
    """Evaluates whether the user is authorized to restore a soft-deleted record.

    Policy:
    - Super administrators are always authorized.
    - Administrators (roles in permanent_delete_roles setting) are authorized.
    - Any role granted explicit RBAC restore permission (e.g. '{module}.restore',
      '{module}:restore', '*.restore', or '*.*') is authorized.

    Args:
        db: Database session.
        user: The authenticated user initiating the restore.
        module: The CRM domain or entity name (e.g., 'masters', 'organizations').

    Returns:
        True if the user has authorization to restore records; False otherwise.
    """
    if getattr(user, "is_super_admin", False):
        return True

    is_admin = await is_user_administrator(db, user.id)
    if is_admin:
        return True

    clean_mod = module.strip().lower()
    singular_mod = (
        clean_mod[:-1]
        if clean_mod.endswith("s") and clean_mod not in ("masters", "rbac")
        else clean_mod
    )
    perm_codes = (
        f"{singular_mod}.restore",
        f"{clean_mod}.restore",
        f"{clean_mod}:restore",
        "*.restore",
        "*.*",
        "*.manage",
    )

    rbac_query = (
        select(UserRole.user_id)
        .join(Role, Role.id == UserRole.role_id)
        .join(RolePermission, RolePermission.role_id == Role.id)
        .join(Permission, Permission.id == RolePermission.permission_id)
        .where(
            UserRole.user_id == user.id,
            Role.is_active.is_(True),
            Permission.is_active.is_(True),
            Permission.code.in_(perm_codes),
        )
    )
    return bool((await db.execute(select(exists(rbac_query)))).scalar_one())


async def should_user_view_all_statuses(db: AsyncSession, user: User) -> bool:
    """Evaluates whether the user is authorized to view records across all statuses.

    Administrators can view all statuses (active, inactive, soft-deleted) across all modules.

    Args:
        db: Database session.
        user: The authenticated user requesting the listing.

    Returns:
        True if the user should view all record statuses.
    """
    try:
        stmt = select(SystemSetting.value).where(
            SystemSetting.category == "data_retention",
            SystemSetting.key == "admin_view_all_statuses",
        )
        res = (await db.execute(stmt)).scalar_one_or_none()
        enabled = bool(res) if res is not None else True
    except Exception:
        enabled = True

    if not enabled:
        return False

    if getattr(user, "is_super_admin", False):
        return True

    # Check if user has an administrator role or wildcard manage permissions
    is_admin = await is_user_administrator(db, user.id)
    if is_admin:
        return True

    # Check if user has universal management permission
    super_perm_query = (
        select(UserRole.user_id)
        .join(Role, Role.id == UserRole.role_id)
        .join(RolePermission, RolePermission.role_id == Role.id)
        .join(Permission, Permission.id == RolePermission.permission_id)
        .where(
            UserRole.user_id == user.id,
            Role.is_active.is_(True),
            Permission.is_active.is_(True),
            Permission.code.in_(("*.manage", "*.*", "*.read")),
        )
    )
    return bool((await db.execute(select(exists(super_perm_query)))).scalar_one())
