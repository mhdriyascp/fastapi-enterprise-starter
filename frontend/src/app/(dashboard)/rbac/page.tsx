'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import { useAuth } from '@/lib/auth-context';
import {
  Role,
  Permission,
  RoleCreateInput,
  RoleUpdateInput,
  PermissionCreateInput,
  PermissionUpdateInput,
  PagedResponse,
} from '@/lib/types';
import { generateRoleCode } from '@/lib/code-generator';
import { SearchableSelect, SelectOption } from '@/components/ui/searchable-select';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useDefaultPageSize } from '@/lib/use-page-size';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Search,
  Loader2,
  RefreshCw,
  RotateCcw,
  Key,
  Layers,
  Lock,
  X,
  Check,
  AlertCircle,
  Eye,
} from 'lucide-react';

const SUPER_ADMIN_EXCLUSIVE_PERMISSIONS = [
  'role.delete',
  'permission.create',
  'permission.update',
  'permission.delete',
];

/**
 * Inner component reading URL search parameters.
 */
function RbacWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams ? searchParams.get('tab') : null;
  const activeTab: 'roles' | 'permissions' | 'matrix' =
    rawTab && ['roles', 'permissions', 'matrix'].includes(rawTab)
      ? (rawTab as 'roles' | 'permissions' | 'matrix')
      : 'roles';

  const setActiveTab = (tab: 'roles' | 'permissions' | 'matrix') => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    params.set('tab', tab);
    router.replace(`/rbac?${params.toString()}`, { scroll: false });
  };

  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const { toast } = useToast();

  // Search and Filter controls
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleStatusFilter, setRoleStatusFilter] = useState<'all' | 'active' | 'inactive' | 'deleted'>('all');
  const [roleTypeFilter, setRoleTypeFilter] = useState<'all' | 'system' | 'custom'>('all');
  const [permissionStatusFilter, setPermissionStatusFilter] = useState<'all' | 'active' | 'inactive' | 'deleted'>('all');
  const [permissionResourceFilter, setPermissionResourceFilter] = useState<string>('all');
  const [pageSize] = useDefaultPageSize(15);
  const [rolesPage, setRolesPage] = useState<number>(1);

  // Role Multi-select and Bulk Action States
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [bulkRoleDeleteConfirmOpen, setBulkRoleDeleteConfirmOpen] = useState<boolean>(false);
  const [bulkRoleRestoreConfirmOpen, setBulkRoleRestoreConfirmOpen] = useState<boolean>(false);
  const [bulkRoleHardDeleteRequested, setBulkRoleHardDeleteRequested] = useState<boolean>(false);
  const [isBulkDeletingRoles, setIsBulkDeletingRoles] = useState<boolean>(false);
  const [isBulkRestoringRoles, setIsBulkRestoringRoles] = useState<boolean>(false);

  // Permission Multi-select and Bulk Action States
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set());
  const [bulkPermDeleteConfirmOpen, setBulkPermDeleteConfirmOpen] = useState<boolean>(false);
  const [bulkPermRestoreConfirmOpen, setBulkPermRestoreConfirmOpen] = useState<boolean>(false);
  const [bulkPermHardDeleteRequested, setBulkPermHardDeleteRequested] = useState<boolean>(false);
  const [isBulkDeletingPerms, setIsBulkDeletingPerms] = useState<boolean>(false);
  const [isBulkRestoringPerms, setIsBulkRestoringPerms] = useState<boolean>(false);

  // Role Form Modal States
  const [roleModalMode, setRoleModalMode] = useState<'create' | 'edit' | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [viewingRole, setViewingRole] = useState<Role | null>(null);
  const [deleteRoleCandidate, setDeleteRoleCandidate] = useState<Role | null>(null);
  const [isHardDelete, setIsHardDelete] = useState<boolean>(false);
  const [restoreRoleCandidate, setRestoreRoleCandidate] = useState<Role | null>(null);
  const [isRestoringRole, setIsRestoringRole] = useState<boolean>(false);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    if (user.is_super_admin) return true;
    return (user.roles || []).some((r: string) =>
      ['super_admin', 'superadmin', 'admin', 'system_admin'].includes(r.toLowerCase())
    );
  }, [user]);

  const canDeleteRole = useMemo(() => {
    if (!user) return false;
    return Boolean(
      isAdmin ||
      user?.permissions?.includes('role.delete') ||
      user?.permissions?.includes('*.manage')
    );
  }, [isAdmin, user]);

  const canHardDeleteRole = useMemo(() => {
    if (!user) return false;
    return Boolean(
      isAdmin ||
      user?.permissions?.includes('role.hard_delete') ||
      user?.permissions?.includes('*.hard_delete')
    );
  }, [isAdmin, user]);

  const canRestoreRole = useMemo(() => {
    if (!user) return false;
    return Boolean(
      isAdmin ||
      user?.permissions?.includes('role.restore') ||
      user?.permissions?.includes('*.manage')
    );
  }, [isAdmin, user]);

  const canDeletePerm = useMemo(() => {
    if (!user) return false;
    return Boolean(
      isAdmin ||
      user?.permissions?.includes('permission.delete') ||
      user?.permissions?.includes('*.manage')
    );
  }, [isAdmin, user]);

  const canHardDeletePerm = useMemo(() => {
    if (!user) return false;
    return Boolean(
      isAdmin ||
      user?.permissions?.includes('permission.hard_delete') ||
      user?.permissions?.includes('*.hard_delete')
    );
  }, [isAdmin, user]);

  const canRestorePerm = useMemo(() => {
    if (!user) return false;
    return Boolean(
      isAdmin ||
      user?.permissions?.includes('permission.restore') ||
      user?.permissions?.includes('*.manage')
    );
  }, [isAdmin, user]);

  const [roleFormData, setRoleFormData] = useState<RoleCreateInput & { is_active?: boolean }>({
    name: '',
    code: '',
    description: '',
    is_active: true,
  });

  // Permission Form Modal States
  const [permissionModalMode, setPermissionModalMode] = useState<'create' | 'edit' | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [viewingPermission, setViewingPermission] = useState<Permission | null>(null);
  const [deletePermissionCandidate, setDeletePermissionCandidate] = useState<Permission | null>(null);
  const [isHardDeletePerm, setIsHardDeletePerm] = useState<boolean>(false);
  const [restorePermCandidate, setRestorePermCandidate] = useState<Permission | null>(null);
  const [isRestoringPerm, setIsRestoringPerm] = useState<boolean>(false);
  const [permissionFormData, setPermissionFormData] = useState<PermissionCreateInput & { is_active?: boolean }>({
    name: '',
    code: '',
    resource: '',
    action: '',
    description: '',
    is_active: true,
  });

  // Role-Permission Matrix State
  const [matrixRole, setMatrixRole] = useState<Role | null>(null);
  const [assignedPermissionIds, setAssignedPermissionIds] = useState<Set<string>>(new Set());
  const [isMatrixLoading, setIsMatrixLoading] = useState<boolean>(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [roleFieldErrors, setRoleFieldErrors] = useState<Record<string, string>>({});
  const [roleTouched, setRoleTouched] = useState<Record<string, boolean>>({});
  const [permFieldErrors, setPermFieldErrors] = useState<Record<string, string>>({});
  const [permTouched, setPermTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load roles and permissions
  async function loadRbacData() {
    setIsLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.allSettled([
        apiFetch<PagedResponse<Role>>('/roles?page=1&page_size=100'),
        apiFetch<PagedResponse<Permission>>('/permissions?page=1&page_size=100'),
      ]);

      if (rolesRes.status === 'fulfilled') {
        const fetchedRoles = rolesRes.value.items || [];
        setRoles(fetchedRoles);
        if (fetchedRoles.length > 0 && !matrixRole) {
          setMatrixRole(fetchedRoles[0]);
        }
      }

      if (permsRes.status === 'fulfilled') {
        setPermissions(permsRes.value.items || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load RBAC data.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const [rolesRes, permsRes] = await Promise.allSettled([
          apiFetch<PagedResponse<Role>>('/roles?page=1&page_size=100'),
          apiFetch<PagedResponse<Permission>>('/permissions?page=1&page_size=100'),
        ]);

        if (!isMounted) return;

        if (rolesRes.status === 'fulfilled') {
          const fetchedRoles = rolesRes.value.items || [];
          setRoles(fetchedRoles);
          if (fetchedRoles.length > 0) {
            setMatrixRole(fetchedRoles[0]);
          }
        }

        if (permsRes.status === 'fulfilled') {
          setPermissions(permsRes.value.items || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to load RBAC data.';
          toast.error(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [toast]);

  // Load permissions assigned to matrixRole
  useEffect(() => {
    let isMounted = true;

    async function fetchRolePermissions() {
      if (!matrixRole) return;
      setIsMatrixLoading(true);
      try {
        const res = await apiFetch<{ role_id: string; permissions: Permission[] }>(
          `/roles/${matrixRole.id}/permissions`
        );
        if (isMounted) {
          const ids = new Set((res.permissions || []).map((p) => p.id));
          setAssignedPermissionIds(ids);
        }
      } catch {
        if (isMounted) {
          setAssignedPermissionIds(new Set());
        }
      } finally {
        if (isMounted) {
          setIsMatrixLoading(false);
        }
      }
    }

    fetchRolePermissions();

    return () => {
      isMounted = false;
    };
  }, [matrixRole]);

  // Filtered Roles
  const uniqueResources = useMemo(() => {
    const set = new Set<string>();
    for (const p of permissions) {
      if (p.resource) set.add(p.resource);
    }
    return Array.from(set).sort();
  }, [permissions]);

  const roleCounts = useMemo(() => {
    return {
      all: roles.filter((r) => !Boolean(r.is_deleted)).length,
      active: roles.filter((r) => r.is_active && !Boolean(r.is_deleted)).length,
      inactive: roles.filter((r) => !r.is_active && !Boolean(r.is_deleted)).length,
      deleted: roles.filter((r) => Boolean(r.is_deleted)).length,
    };
  }, [roles]);

  const permCounts = useMemo(() => {
    return {
      all: permissions.filter((p) => !Boolean(p.is_deleted)).length,
      active: permissions.filter((p) => p.is_active && !Boolean(p.is_deleted)).length,
      inactive: permissions.filter((p) => !p.is_active && !Boolean(p.is_deleted)).length,
      deleted: permissions.filter((p) => Boolean(p.is_deleted)).length,
    };
  }, [permissions]);

  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          r.name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (roleStatusFilter === 'all') {
        if (Boolean(r.is_deleted)) return false;
      } else if (roleStatusFilter === 'active') {
        if (!r.is_active || Boolean(r.is_deleted)) return false;
      } else if (roleStatusFilter === 'inactive') {
        if (r.is_active || Boolean(r.is_deleted)) return false;
      } else if (roleStatusFilter === 'deleted') {
        if (!Boolean(r.is_deleted)) return false;
      }

      if (roleTypeFilter === 'system' && !r.is_system) return false;
      if (roleTypeFilter === 'custom' && r.is_system) return false;

      return true;
    });
  }, [roles, searchQuery, roleStatusFilter, roleTypeFilter]);

  // Filtered Permissions grouped by resource
  const groupedPermissions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = permissions.filter((p) => {
      if (permissionResourceFilter !== 'all' && p.resource !== permissionResourceFilter) {
        return false;
      }
      if (permissionStatusFilter === 'all') {
        if (Boolean(p.is_deleted)) return false;
      } else if (permissionStatusFilter === 'active') {
        if (!p.is_active || Boolean(p.is_deleted)) return false;
      } else if (permissionStatusFilter === 'inactive') {
        if (p.is_active || Boolean(p.is_deleted)) return false;
      } else if (permissionStatusFilter === 'deleted') {
        if (!Boolean(p.is_deleted)) return false;
      }

      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.resource.toLowerCase().includes(q) ||
        p.action.toLowerCase().includes(q)
      );
    });

    const groups: Record<string, Permission[]> = {};
    for (const p of filtered) {
      const res = p.resource || 'general';
      if (!groups[res]) groups[res] = [];
      groups[res].push(p);
    }
    return groups;
  }, [permissions, searchQuery, permissionResourceFilter, permissionStatusFilter]);

  const totalRoles = roles.length;
  const filteredRolesCount = filteredRoles.length;
  const totalRolesPages = Math.max(1, Math.ceil(filteredRolesCount / pageSize));
  const safeRolesPage = Math.min(Math.max(1, rolesPage), totalRolesPages);
  const paginatedRoles = useMemo(() => {
    const start = (safeRolesPage - 1) * pageSize;
    return filteredRoles.slice(start, start + pageSize);
  }, [filteredRoles, safeRolesPage, pageSize]);

  const totalPermissions = permissions.length;
  const filteredPermissionsCount = useMemo(() => {
    return Object.values(groupedPermissions).reduce((acc, curr) => acc + curr.length, 0);
  }, [groupedPermissions]);

  // Validation functions
  function validateRoleField(name: string, value: string): string | null {
    const trimmed = (value || '').trim();
    switch (name) {
      case 'name':
        if (!trimmed) return 'Role name is required';
        if (trimmed.length < 2) return 'Role name must be at least 2 characters';
        if (trimmed.length > 100) return 'Role name cannot exceed 100 characters';
        return null;
      default:
        return null;
    }
  }

  const handleRoleFieldChange = (field: string, value: string | boolean) => {
    setRoleFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'name' && typeof value === 'string' && (!selectedRole || !selectedRole.is_system)) {
        next.code = generateRoleCode(value);
      }
      return next;
    });
    if (roleTouched[field] && typeof value === 'string') {
      const error = validateRoleField(field, value);
      setRoleFieldErrors((prev) => {
        const next = { ...prev };
        if (error) next[field] = error;
        else delete next[field];
        return next;
      });
    }
  };

  const handleRoleFieldBlur = (field: string) => {
    setRoleTouched((prev) => ({ ...prev, [field]: true }));
    const val = (roleFormData as unknown as Record<string, string | boolean | undefined>)[field];
    const error = validateRoleField(field, typeof val === 'string' ? val : '');
    setRoleFieldErrors((prev) => {
      const next = { ...prev };
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });
  };

  function validatePermField(name: string, value: string): string | null {
    const trimmed = (value || '').trim();
    switch (name) {
      case 'name':
        if (!trimmed) return 'Permission name is required';
        if (trimmed.length < 2) return 'Permission name must be at least 2 characters';
        if (trimmed.length > 100) return 'Permission name cannot exceed 100 characters';
        return null;
      case 'resource':
        if (permissionModalMode === 'create') {
          if (!trimmed) return 'Resource domain is required (e.g. organization)';
          if (!/^[a-z0-9_]+$/.test(trimmed)) return 'Resource must contain only lowercase letters and underscores';
        }
        return null;
      case 'action':
        if (permissionModalMode === 'create') {
          if (!trimmed) return 'Action name is required (e.g. export)';
          if (!/^[a-z0-9_]+$/.test(trimmed)) return 'Action must contain only lowercase letters and underscores';
        }
        return null;
      default:
        return null;
    }
  }

  const handlePermFieldChange = (field: string, value: string) => {
    setPermissionFormData((prev) => ({ ...prev, [field]: value }));
    if (permTouched[field]) {
      const error = validatePermField(field, value);
      setPermFieldErrors((prev) => {
        const next = { ...prev };
        if (error) next[field] = error;
        else delete next[field];
        return next;
      });
    }
  };

  const handlePermFieldBlur = (field: string) => {
    setPermTouched((prev) => ({ ...prev, [field]: true }));
    const val = (permissionFormData as unknown as Record<string, string | undefined>)[field];
    const error = validatePermField(field, typeof val === 'string' ? val : '');
    setPermFieldErrors((prev) => {
      const next = { ...prev };
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });
  };

  // Open Create Role Modal
  function openCreateRoleModal() {
    setRoleFormData({
      name: '',
      code: '',
      description: '',
      is_active: true,
    });
    setFormError(null);
    setRoleFieldErrors({});
    setRoleTouched({});
    setRoleModalMode('create');
  }

  // Open Edit Role Modal
  function openEditRoleModal(role: Role) {
    setSelectedRole(role);
    setRoleFormData({
      name: role.name,
      code: role.code,
      description: role.description || '',
      is_active: role.is_active,
    });
    setFormError(null);
    setRoleFieldErrors({});
    setRoleTouched({});
    setRoleModalMode('edit');
  }

  // Open Create Permission Modal
  function openCreatePermissionModal() {
    setSelectedPermission(null);
    setPermissionFormData({
      name: '',
      code: '',
      resource: '',
      action: '',
      description: '',
      is_active: true,
    });
    setFormError(null);
    setPermFieldErrors({});
    setPermTouched({});
    setPermissionModalMode('create');
  }

  // Open Edit Permission Modal
  function openEditPermissionModal(perm: Permission) {
    if (!perm) return;
    setSelectedPermission(perm);
    setPermissionFormData({
      name: perm.name,
      code: perm.code,
      resource: perm.resource,
      action: perm.action,
      description: perm.description || '',
      is_active: perm.is_active ?? true,
    });
    setFormError(null);
    setPermFieldErrors({});
    setPermTouched({});
    setPermissionModalMode('edit');
  }

  // Handle Role Submit (Create or Edit)
  async function handleRoleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const fieldsToCheck = ['name'];
    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};

    for (const f of fieldsToCheck) {
      newTouched[f] = true;
      const val = (roleFormData as unknown as Record<string, string | boolean | undefined>)[f];
      const error = validateRoleField(f, typeof val === 'string' ? val : '');
      if (error) newErrors[f] = error;
    }

    setRoleTouched(newTouched);
    setRoleFieldErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstInvalid = Object.keys(newErrors)[0];
      const elem = document.getElementById(`role-input-${firstInvalid}`);
      if (elem) elem.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      if (roleModalMode === 'create') {
        const cleanCode = (roleFormData.code || generateRoleCode(roleFormData.name)).trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const payload: RoleCreateInput = {
          name: roleFormData.name.trim(),
          code: cleanCode,
          description: roleFormData.description?.trim() || null,
        };

        const created = await apiFetch<Role>('/roles', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        toast.success(`Role "${created.name}" created successfully!`);
      } else if (roleModalMode === 'edit' && selectedRole) {
        const payload: RoleUpdateInput = {
          name: roleFormData.name.trim(),
          description: roleFormData.description?.trim() || null,
          is_active: roleFormData.is_active,
        };
        if (!selectedRole.is_system) {
          payload.code = (roleFormData.code || generateRoleCode(roleFormData.name))
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '_');
        }

        const updated = await apiFetch<Role>(`/roles/${selectedRole.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });

        toast.success(`Role "${updated.name}" updated successfully!`);
      }

      setRoleModalMode(null);
      await loadRbacData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save role.';
      if (msg.toLowerCase().includes('code')) {
        setRoleFieldErrors((prev) => ({ ...prev, code: msg }));
        setRoleTouched((prev) => ({ ...prev, code: true }));
      } else {
        setFormError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle Delete Role
  async function handleDeleteRole() {
    if (!deleteRoleCandidate) return;
    setIsSubmitting(true);

    try {
      await apiFetch(`/roles/${deleteRoleCandidate.id}?hard_delete=${isHardDelete}`, {
        method: 'DELETE',
      });
      toast.success(
        isHardDelete
          ? `Role "${deleteRoleCandidate.name}" permanently deleted.`
          : `Role "${deleteRoleCandidate.name}" deactivated / soft-deleted.`
      );
      setDeleteRoleCandidate(null);
      await loadRbacData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete role.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle Restore Role
  async function handleConfirmRestoreRole() {
    if (!restoreRoleCandidate) return;
    setIsRestoringRole(true);
    try {
      await apiFetch(`/roles/${restoreRoleCandidate.id}/restore`, {
        method: 'POST',
      });
      toast.success(`Role "${restoreRoleCandidate.name}" restored successfully.`);
      setRestoreRoleCandidate(null);
      await loadRbacData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to restore role.';
      toast.error(msg);
    } finally {
      setIsRestoringRole(false);
    }
  }

  const handleToggleSelectAllRoles = (items: Role[]) => {
    if (selectedRoleIds.size === items.filter((r) => !r.is_system).length && selectedRoleIds.size > 0) {
      setSelectedRoleIds(new Set());
    } else {
      setSelectedRoleIds(new Set(items.filter((r) => !r.is_system).map((r) => r.id)));
    }
  };

  const handleToggleSelectRole = (id: string) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDeleteRoles = async () => {
    if (selectedRoleIds.size === 0) return;
    setIsBulkDeletingRoles(true);
    let successCount = 0;
    let failCount = 0;

    for (const roleId of selectedRoleIds) {
      try {
        const query = bulkRoleHardDeleteRequested ? '?hard_delete=true' : '?hard_delete=false';
        await apiFetch(`/roles/${roleId}${query}`, {
          method: 'DELETE',
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully processed ${successCount} role(s).`);
    }
    if (failCount > 0) {
      toast.error(`Failed to process ${failCount} role(s).`);
    }

    setSelectedRoleIds(new Set());
    setBulkRoleDeleteConfirmOpen(false);
    setIsBulkDeletingRoles(false);
    await loadRbacData();
  };

  const handleBulkRestoreRoles = async () => {
    if (selectedRoleIds.size === 0) return;
    setIsBulkRestoringRoles(true);
    let successCount = 0;
    let failCount = 0;

    for (const roleId of selectedRoleIds) {
      try {
        await apiFetch(`/roles/${roleId}/restore`, {
          method: 'POST',
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully restored ${successCount} role(s).`);
    }
    if (failCount > 0) {
      toast.error(`Failed to restore ${failCount} role(s).`);
    }

    setSelectedRoleIds(new Set());
    setBulkRoleRestoreConfirmOpen(false);
    setIsBulkRestoringRoles(false);
    await loadRbacData();
  };

  // Handle Permission Submit (Create or Edit)
  async function handlePermissionSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const fieldsToCheck = permissionModalMode === 'create' ? ['name', 'resource', 'action'] : ['name'];
    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};

    for (const f of fieldsToCheck) {
      newTouched[f] = true;
      const val = (permissionFormData as unknown as Record<string, string | undefined>)[f];
      const error = validatePermField(f, typeof val === 'string' ? val : '');
      if (error) newErrors[f] = error;
    }

    setPermTouched(newTouched);
    setPermFieldErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstInvalid = Object.keys(newErrors)[0];
      const elem = document.getElementById(`perm-input-${firstInvalid}`);
      if (elem) elem.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      if (permissionModalMode === 'create') {
        const cleanResource = permissionFormData.resource.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const cleanAction = permissionFormData.action.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const expectedCode = `${cleanResource}.${cleanAction}`;

        const payload: PermissionCreateInput = {
          name: permissionFormData.name.trim(),
          code: expectedCode,
          resource: cleanResource,
          action: cleanAction,
          description: permissionFormData.description?.trim() || null,
        };

        const created = await apiFetch<Permission>('/permissions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        toast.success(`Permission "${created.code}" created successfully!`);
      } else if (permissionModalMode === 'edit') {
        if (!selectedPermission) {
          throw new Error('No permission selected for editing.');
        }

        const payload: PermissionUpdateInput = {
          name: permissionFormData.name.trim(),
          description: permissionFormData.description?.trim() || null,
        };

        if (!selectedPermission.is_system && permissionFormData.is_active !== undefined) {
          payload.is_active = permissionFormData.is_active;
        }

        const updated = await apiFetch<Permission>(`/permissions/${selectedPermission.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });

        toast.success(`Permission "${updated.code}" updated successfully!`);
      }

      setPermissionModalMode(null);
      setSelectedPermission(null);
      setPermissionFormData({ name: '', code: '', resource: '', action: '', description: '', is_active: true });
      await loadRbacData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save permission.';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle Delete Permission
  async function handleDeletePermission() {
    if (!deletePermissionCandidate) return;
    setIsSubmitting(true);

    try {
      await apiFetch(`/permissions/${deletePermissionCandidate.id}?hard_delete=${isHardDeletePerm}`, {
        method: 'DELETE',
      });
      toast.success(
        isHardDeletePerm
          ? `Permission "${deletePermissionCandidate.code}" permanently deleted.`
          : `Permission "${deletePermissionCandidate.code}" deactivated / soft-deleted.`
      );
      setDeletePermissionCandidate(null);
      await loadRbacData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete permission.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle Restore Permission
  async function handleConfirmRestorePermission() {
    if (!restorePermCandidate) return;
    setIsRestoringPerm(true);
    try {
      await apiFetch(`/permissions/${restorePermCandidate.id}/restore`, {
        method: 'POST',
      });
      toast.success(`Permission "${restorePermCandidate.code}" restored successfully.`);
      setRestorePermCandidate(null);
      await loadRbacData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to restore permission.';
      toast.error(msg);
    } finally {
      setIsRestoringPerm(false);
    }
  }

  const handleToggleSelectPerm = (id: string) => {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDeletePerms = async () => {
    if (selectedPermIds.size === 0) return;
    setIsBulkDeletingPerms(true);
    let successCount = 0;
    let failCount = 0;

    for (const permId of selectedPermIds) {
      try {
        const query = bulkPermHardDeleteRequested ? '?hard_delete=true' : '?hard_delete=false';
        await apiFetch(`/permissions/${permId}${query}`, {
          method: 'DELETE',
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully processed ${successCount} permission(s).`);
    }
    if (failCount > 0) {
      toast.error(`Failed to process ${failCount} permission(s).`);
    }

    setSelectedPermIds(new Set());
    setBulkPermDeleteConfirmOpen(false);
    setIsBulkDeletingPerms(false);
    await loadRbacData();
  };

  const handleBulkRestorePerms = async () => {
    if (selectedPermIds.size === 0) return;
    setIsBulkRestoringPerms(true);
    let successCount = 0;
    let failCount = 0;

    for (const permId of selectedPermIds) {
      try {
        await apiFetch(`/permissions/${permId}/restore`, {
          method: 'POST',
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully restored ${successCount} permission(s).`);
    }
    if (failCount > 0) {
      toast.error(`Failed to restore ${failCount} permission(s).`);
    }

    setSelectedPermIds(new Set());
    setBulkPermRestoreConfirmOpen(false);
    setIsBulkRestoringPerms(false);
    await loadRbacData();
  };

  // Toggle Single Permission in Matrix
  async function toggleMatrixPermission(permissionId: string) {
    if (!matrixRole) return;

    if (matrixRole.code === 'super_admin' || matrixRole.code === 'superadmin') {
      toast.error('The Super Administrator role possesses permanent full system governance privileges across all modules.');
      return;
    }

    const targetPerm = permissions.find((p) => p.id === permissionId);
    if (
      targetPerm &&
      SUPER_ADMIN_EXCLUSIVE_PERMISSIONS.includes(targetPerm.code) &&
      matrixRole.code !== 'super_admin' &&
      matrixRole.code !== 'superadmin'
    ) {
      toast.warning(
        `Permission "${targetPerm.code}" is exclusively reserved for the Super Administrator role and cannot be granted to other roles.`
      );
      return;
    }

    const isAssigned = assignedPermissionIds.has(permissionId);
    try {
      if (isAssigned) {
        await apiFetch(`/roles/${matrixRole.id}/permissions/${permissionId}`, {
          method: 'DELETE',
        });
        setAssignedPermissionIds((prev) => {
          const next = new Set(prev);
          next.delete(permissionId);
          return next;
        });
        toast.success('Permission revoked successfully.');
      } else {
        await apiFetch(`/roles/${matrixRole.id}/permissions/${permissionId}`, {
          method: 'POST',
        });
        setAssignedPermissionIds((prev) => new Set(prev).add(permissionId));
        toast.success('Permission assigned successfully.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update permission assignment.';
      toast.error(msg);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header & Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
              Access Control & RBAC
            </h1>
            <span className="badge badge-neutral" style={{ fontWeight: 600, fontSize: '0.75rem' }}>
              {activeTab === 'roles'
                ? (filteredRolesCount === totalRoles ? `${totalRoles} Total Roles` : `${filteredRolesCount} of ${totalRoles} Roles`)
                : activeTab === 'permissions'
                ? (filteredPermissionsCount === totalPermissions ? `${totalPermissions} Total Permissions` : `${filteredPermissionsCount} of ${totalPermissions} Permissions`)
                : `${totalRoles} Roles & ${totalPermissions} Permissions`}
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Enterprise Role-Based Access Control: Manage business roles, system permissions, and dynamic privilege matrices.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => {
              setIsRefreshing(true);
              loadRbacData();
            }}
            className="btn btn-secondary"
            disabled={isRefreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>

          {activeTab === 'roles' && selectedRoleIds.size > 0 && (
            roleStatusFilter === 'deleted' || roles.filter((r) => selectedRoleIds.has(r.id)).every((r) => Boolean(r.is_deleted)) ? (
              <>
                {canRestoreRole && (
                  <button
                    id="btn-bulk-restore-role"
                    type="button"
                    onClick={() => setBulkRoleRestoreConfirmOpen(true)}
                    className="btn btn-restore"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
                    title={`Restore ${selectedRoleIds.size} selected role(s)`}
                  >
                    <RotateCcw size={15} />
                    <span>Restore ({selectedRoleIds.size})</span>
                  </button>
                )}
                {canHardDeleteRole && (
                  <button
                    id="btn-bulk-purge-role"
                    type="button"
                    onClick={() => {
                      setBulkRoleHardDeleteRequested(true);
                      setBulkRoleDeleteConfirmOpen(true);
                    }}
                    className="btn btn-danger"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
                    title={`Permanently purge ${selectedRoleIds.size} selected role(s)`}
                  >
                    <Trash2 size={15} />
                    <span>Purge ({selectedRoleIds.size})</span>
                  </button>
                )}
              </>
            ) : (
              canDeleteRole && (
                <button
                  id="btn-bulk-delete-role"
                  type="button"
                  onClick={() => {
                    setBulkRoleHardDeleteRequested(false);
                    setBulkRoleDeleteConfirmOpen(true);
                  }}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                  title={`Delete ${selectedRoleIds.size} selected role(s)`}
                >
                  <Trash2 size={15} />
                  <span>Delete ({selectedRoleIds.size})</span>
                </button>
              )
            )
          )}

          {activeTab === 'permissions' && selectedPermIds.size > 0 && (
            permissionStatusFilter === 'deleted' || permissions.filter((p) => selectedPermIds.has(p.id)).every((p) => Boolean(p.is_deleted)) ? (
              <>
                {canRestorePerm && (
                  <button
                    id="btn-bulk-restore-perm"
                    type="button"
                    onClick={() => setBulkPermRestoreConfirmOpen(true)}
                    className="btn btn-restore"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
                    title={`Restore ${selectedPermIds.size} selected permission(s)`}
                  >
                    <RotateCcw size={15} />
                    <span>Restore ({selectedPermIds.size})</span>
                  </button>
                )}
                {canHardDeletePerm && (
                  <button
                    id="btn-bulk-purge-perm"
                    type="button"
                    onClick={() => {
                      setBulkPermHardDeleteRequested(true);
                      setBulkPermDeleteConfirmOpen(true);
                    }}
                    className="btn btn-danger"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
                    title={`Permanently purge ${selectedPermIds.size} selected permission(s)`}
                  >
                    <Trash2 size={15} />
                    <span>Purge ({selectedPermIds.size})</span>
                  </button>
                )}
              </>
            ) : (
              canDeletePerm && (
                <button
                  id="btn-bulk-delete-perm"
                  type="button"
                  onClick={() => {
                    setBulkPermHardDeleteRequested(false);
                    setBulkPermDeleteConfirmOpen(true);
                  }}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                  title={`Delete ${selectedPermIds.size} selected permission(s)`}
                >
                  <Trash2 size={15} />
                  <span>Delete ({selectedPermIds.size})</span>
                </button>
              )
            )
          )}

          {activeTab === 'roles' ? (
            <button
              type="button"
              onClick={openCreateRoleModal}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Plus size={16} />
              <span>New Role</span>
            </button>
          ) : activeTab === 'permissions' ? (
            <button
              type="button"
              onClick={openCreatePermissionModal}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Plus size={16} />
              <span>New Permission</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.75rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div role="tablist" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            id="rbac-tab-roles"
            role="tab"
            aria-selected={activeTab === 'roles'}
            onClick={() => setActiveTab('roles')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: activeTab === 'roles' ? 700 : 500,
              background: activeTab === 'roles' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'roles' ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'var(--transition)',
            }}
          >
            <Shield size={16} />
            <span>Roles ({roles.length})</span>
          </button>

          <button
            type="button"
            id="rbac-tab-permissions"
            role="tab"
            aria-selected={activeTab === 'permissions'}
            onClick={() => setActiveTab('permissions')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: activeTab === 'permissions' ? 700 : 500,
              background: activeTab === 'permissions' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'permissions' ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'var(--transition)',
            }}
          >
            <Key size={16} />
            <span>Permissions ({permissions.length})</span>
          </button>

          <button
            type="button"
            id="rbac-tab-matrix"
            role="tab"
            aria-selected={activeTab === 'matrix'}
            onClick={() => setActiveTab('matrix')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: activeTab === 'matrix' ? 700 : 500,
              background: activeTab === 'matrix' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'matrix' ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'var(--transition)',
            }}
          >
            <Layers size={16} />
            <span>Access Matrix</span>
          </button>
        </div>

        {/* Search and Filters Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* Search Field */}
          <div style={{ position: 'relative', width: '220px' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder={
                activeTab === 'roles'
                  ? 'Search roles...'
                  : activeTab === 'permissions'
                  ? 'Search permissions...'
                  : 'Filter matrix...'
              }
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setRolesPage(1);
              }}
              className="input-field"
              style={{ paddingLeft: '2.2rem', fontSize: '0.825rem', height: '36px' }}
            />
          </div>

          {activeTab === 'roles' && (
            <>
              {/* Status Segmented Buttons */}
              <div
                style={{
                  display: 'flex',
                  background: 'var(--bg-app)',
                  padding: '0.2rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                }}
              >
                {(['all', 'active', 'inactive', 'deleted'] as Array<'all' | 'active' | 'inactive' | 'deleted'>).map((st) => {
                  const count = roleCounts[st];
                  const isActive = roleStatusFilter === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setRoleStatusFilter(st);
                        setRolesPage(1);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        border: 'none',
                        borderRadius: 'calc(var(--radius-md) - 2px)',
                        background: isActive ? 'var(--accent-primary)' : 'transparent',
                        color: isActive ? '#ffffff' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                      }}
                    >
                      <span>{st}</span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          opacity: 0.85,
                          padding: '0 4px',
                          borderRadius: '4px',
                          background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--bg-card)',
                        }}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Role Type Filter */}
              <select
                value={roleTypeFilter}
                onChange={(e) => {
                  setRoleTypeFilter(e.target.value as 'all' | 'system' | 'custom');
                  setRolesPage(1);
                }}
                className="input-field"
                style={{ height: '36px', padding: '0 0.65rem', fontSize: '0.8rem' }}
              >
                <option value="all">All Role Types</option>
                <option value="system">System Roles</option>
                <option value="custom">Custom Roles</option>
              </select>

              {(searchQuery || roleStatusFilter !== 'all' || roleTypeFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setRoleStatusFilter('all');
                    setRoleTypeFilter('all');
                    setRolesPage(1);
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                >
                  Reset
                </button>
              )}
            </>
          )}

          {activeTab === 'permissions' && (
            <>
              {/* Permission Status Segmented Buttons */}
              <div
                style={{
                  display: 'flex',
                  background: 'var(--bg-app)',
                  padding: '0.2rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                }}
              >
                {(['all', 'active', 'inactive', 'deleted'] as Array<'all' | 'active' | 'inactive' | 'deleted'>).map((st) => {
                  const count = permCounts[st];
                  const isActive = permissionStatusFilter === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setPermissionStatusFilter(st)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        border: 'none',
                        borderRadius: 'calc(var(--radius-md) - 2px)',
                        background: isActive ? 'var(--accent-primary)' : 'transparent',
                        color: isActive ? '#ffffff' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                      }}
                    >
                      <span>{st}</span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          opacity: 0.85,
                          padding: '0 4px',
                          borderRadius: '4px',
                          background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--bg-card)',
                        }}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Resource Filter */}
              <select
                value={permissionResourceFilter}
                onChange={(e) => setPermissionResourceFilter(e.target.value)}
                className="input-field"
                style={{ height: '36px', padding: '0 0.65rem', fontSize: '0.8rem', textTransform: 'capitalize' }}
              >
                <option value="all">All Resources</option>
                {uniqueResources.map((res) => (
                  <option key={res} value={res}>
                    {res}
                  </option>
                ))}
              </select>

              {(searchQuery || permissionStatusFilter !== 'all' || permissionResourceFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setPermissionStatusFilter('all');
                    setPermissionResourceFilter('all');
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                >
                  Reset
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tab 1: Roles Management */}
      {activeTab === 'roles' && (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={
                        paginatedRoles.filter((r) => !r.is_system).length > 0 &&
                        paginatedRoles.filter((r) => !r.is_system).every((r) => selectedRoleIds.has(r.id))
                      }
                      onChange={() => handleToggleSelectAllRoles(paginatedRoles)}
                      title="Select all non-system roles on this page"
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ width: '45px', textAlign: 'center' }}>#</th>
                  <th>Role Name</th>
                  <th>System Code</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8}>
                        <div className="skeleton" style={{ height: '35px', width: '100%' }} />
                      </td>
                    </tr>
                  ))
                ) : paginatedRoles.length > 0 ? (
                  paginatedRoles.map((role, index) => (
                    <tr key={role.id}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedRoleIds.has(role.id)}
                          disabled={role.is_system}
                          onChange={() => handleToggleSelectRole(role.id)}
                          style={{ cursor: role.is_system ? 'not-allowed' : 'pointer' }}
                          title={role.is_system ? 'System roles cannot be bulk modified' : 'Select role'}
                        />
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                        {(safeRolesPage - 1) * pageSize + index + 1}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: 'var(--radius-md)',
                              background: role.is_system ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: role.is_system ? 'var(--accent-primary)' : '#10b981',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Shield size={16} />
                          </div>
                          <button
                            type="button"
                            onClick={() => setViewingRole(role)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                            title="Click to view full role details"
                          >
                            <div
                              style={{
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                transition: 'var(--transition)',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                            >
                              {role.name}
                            </div>
                          </button>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-neutral">{role.code}</span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', maxWidth: '300px' }}>
                        {role.description || 'No description provided'}
                      </td>
                      <td>
                        {role.is_system ? (
                          <span className="badge badge-primary">System Role</span>
                        ) : (
                          <span className="badge badge-neutral">Custom Role</span>
                        )}
                      </td>
                      <td>
                        {role.is_deleted ? (
                          <span className="badge badge-danger">Deleted</span>
                        ) : role.is_active ? (
                          <span className="badge badge-success">Active</span>
                        ) : (
                          <span className="badge badge-danger">Disabled</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => setViewingRole(role)}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                            title="View role details"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMatrixRole(role);
                              setActiveTab('matrix');
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                            title="View and edit permissions for this role"
                          >
                            <Key size={13} />
                            <span>Privileges</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditRoleModal(role)}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>
                          {(!role.is_active || role.is_deleted) ? (
                            <>
                              {canRestoreRole && (
                                <button
                                  type="button"
                                  onClick={() => setRestoreRoleCandidate(role)}
                                  className="btn btn-restore"
                                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                                  title="Restore deactivated/deleted role"
                                >
                                  <RotateCcw size={13} />
                                  <span>Restore</span>
                                </button>
                              )}
                              {!role.is_system && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteRoleCandidate(role);
                                    setIsHardDelete(true);
                                  }}
                                  className="btn btn-danger"
                                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                                  title="Permanently purge role from database"
                                >
                                  <Trash2 size={13} />
                                  <span>Purge</span>
                                </button>
                              )}
                            </>
                          ) : (
                            !role.is_system && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteRoleCandidate(role);
                                  setIsHardDelete(false);
                                }}
                                className="btn btn-danger"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                                title="Deactivate role"
                              >
                                <Trash2 size={13} />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No matching roles found.
                    </td>
                  </tr>
                )}
              </tbody>
          </table>
        </div>

        {/* Roles Table Pagination Footer */}
        {filteredRolesCount > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              padding: '0.85rem 1.25rem',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
            }}
          >
            <div>
              Showing <strong>{(safeRolesPage - 1) * pageSize + 1}</strong> to{' '}
              <strong>{Math.min(safeRolesPage * pageSize, filteredRolesCount)}</strong> of <strong>{filteredRolesCount}</strong> roles
              {filteredRolesCount !== totalRoles && ` (filtered from ${totalRoles} total)`}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setRolesPage((p) => Math.max(1, p - 1))}
                disabled={safeRolesPage <= 1}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                Previous
              </button>
              <span style={{ padding: '0 0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Page {safeRolesPage} of {totalRolesPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setRolesPage((p) => Math.min(totalRolesPages, p + 1))}
                disabled={safeRolesPage >= totalRolesPages}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </>
      )}

      {/* Tab 2: Permissions Registry */}
      {activeTab === 'permissions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {Object.entries(groupedPermissions).map(([resource, perms]) => (
            <div key={resource} className="glass-panel" style={{ padding: '1.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lock size={16} color="var(--accent-primary)" />
                  <h3
                    style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Resource: {resource}
                  </h3>
                </div>
                <span className="badge badge-neutral">{perms.length} Actions</span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '0.85rem',
                }}
              >
                {perms.map((p, pIdx) => (
                  <div
                    key={p.id}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <input
                            type="checkbox"
                            checked={selectedPermIds.has(p.id)}
                            disabled={p.is_system}
                            onChange={() => handleToggleSelectPerm(p.id)}
                            style={{ cursor: p.is_system ? 'not-allowed' : 'pointer' }}
                            title={p.is_system ? 'System permissions cannot be modified' : 'Select permission'}
                          />
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>#{pIdx + 1}</span>
                          <button
                            type="button"
                            onClick={() => setViewingPermission(p)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                            title="Click to view permission details"
                          >
                            <span
                              style={{
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                color: 'var(--text-primary)',
                                transition: 'var(--transition)',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                            >
                              {p.name}
                            </span>
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {p.is_deleted ? (
                            <span className="badge badge-danger" style={{ fontSize: '0.65rem', fontWeight: 700 }}>
                              Deleted
                            </span>
                          ) : !p.is_active ? (
                            <span className="badge badge-warning" style={{ fontSize: '0.65rem', fontWeight: 700 }}>
                              Inactive
                            </span>
                          ) : null}
                          {p.action === 'hard_delete' ? (
                            <span className="badge badge-danger" style={{ fontSize: '0.65rem', fontWeight: 700 }}>
                              Hard Delete
                            </span>
                          ) : p.action === 'delete' ? (
                            <span className="badge badge-warning" style={{ fontSize: '0.65rem', fontWeight: 700 }}>
                              Soft Delete
                            </span>
                          ) : p.action === 'restore' ? (
                            <span className="badge badge-success" style={{ fontSize: '0.65rem', fontWeight: 700 }}>
                              Restore
                            </span>
                          ) : (
                            <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                              {p.action}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        <code>{p.code}</code>
                      </div>
                      {p.description && (
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                          {p.description}
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => setViewingPermission(p)}
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                        title="View permission details"
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditPermissionModal(p)}
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                      {(!p.is_active || p.is_deleted) ? (
                        <>
                          {canRestorePerm && (
                            <button
                              type="button"
                              onClick={() => setRestorePermCandidate(p)}
                              className="btn btn-restore"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                              title="Restore deactivated/deleted permission"
                            >
                              <RotateCcw size={12} />
                              <span>Restore</span>
                            </button>
                          )}
                          {!p.is_system && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeletePermissionCandidate(p);
                                setIsHardDeletePerm(true);
                              }}
                              className="btn btn-danger"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                              title="Permanently purge permission"
                            >
                              <Trash2 size={12} />
                              <span>Purge</span>
                            </button>
                          )}
                        </>
                      ) : (
                        !p.is_system && (
                          <button
                            type="button"
                            onClick={() => {
                              setDeletePermissionCandidate(p);
                              setIsHardDeletePerm(false);
                            }}
                            className="btn btn-danger"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                            title="Deactivate permission"
                          >
                            <Trash2 size={12} />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Role-Permission Access Matrix */}
      {activeTab === 'matrix' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Target Role Selector Toolbar */}
          <div
            className="glass-panel"
            style={{
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <label htmlFor="rbac-matrix-role-select" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Configuring Privileges for Role:
              </label>
              <div style={{ width: '320px', minWidth: '260px' }}>
                <SearchableSelect
                  id="rbac-matrix-role-select"
                  options={roles.map((r): SelectOption => ({
                    value: r.id,
                    label: r.name,
                    sublabel: `(${r.code})`,
                    icon: <Shield size={15} style={{ color: r.is_system ? '#6366f1' : '#10b981' }} />,
                    badge: r.is_system ? 'System' : 'Custom',
                    badgeVariant: r.is_system ? 'primary' : 'neutral',
                  }))}
                  value={matrixRole?.id || ''}
                  onChange={(val) => {
                    const r = roles.find((item) => item.id === val);
                    if (r) setMatrixRole(r);
                  }}
                  placeholder="Select a role to configure..."
                  searchPlaceholder="Search roles by name or code..."
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span className="badge badge-success">
                {assignedPermissionIds.size} of {permissions.length} Granted
              </span>
              {matrixRole?.is_system && (
                <span className="badge badge-primary" title="System roles have pre-defined immutability">
                  System Protected
                </span>
              )}
            </div>
          </div>

          {/* System Role Explanatory Banner */}
          {(matrixRole?.code === 'super_admin' || matrixRole?.code === 'superadmin') && (
            <div
              style={{
                padding: '0.85rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '0.85rem',
              }}
            >
              <Shield size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
              <div>
                <strong>Root Governance Role:</strong> &ldquo;{matrixRole.name}&rdquo; possesses universal system governance permissions across all modules. To configure fine-grained module privileges, select Administrator or any operational role from the selector above.
              </div>
            </div>
          )}

          {/* Matrix Categorized Permissions */}
          {isMatrixLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="skeleton" style={{ height: '120px', width: '100%' }} />
              <div className="skeleton" style={{ height: '120px', width: '100%' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {Object.entries(groupedPermissions).map(([resource, perms]) => (
                <div key={resource} className="glass-panel" style={{ padding: '1.5rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '1rem',
                      paddingBottom: '0.5rem',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                      {resource} Permissions
                    </h3>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '0.75rem',
                    }}
                  >
                    {perms.map((p) => {
                      const isGranted = assignedPermissionIds.has(p.id);
                      const isExclusiveSuperAdmin =
                        SUPER_ADMIN_EXCLUSIVE_PERMISSIONS.includes(p.code) &&
                        matrixRole?.code !== 'super_admin' &&
                        matrixRole?.code !== 'superadmin';
                      const isLocked =
                        matrixRole?.code === 'super_admin' ||
                        matrixRole?.code === 'superadmin' ||
                        isExclusiveSuperAdmin;

                      return (
                        <div
                          key={p.id}
                          onClick={() => toggleMatrixPermission(p.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)',
                            background: isGranted ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-input)',
                            border: isGranted ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid var(--border-subtle)',
                            cursor: isLocked ? 'not-allowed' : 'pointer',
                            transition: 'var(--transition)',
                            opacity: isExclusiveSuperAdmin ? 0.6 : (matrixRole?.code === 'super_admin' || matrixRole?.code === 'superadmin') ? 0.8 : 1,
                          }}
                          title={
                            isExclusiveSuperAdmin
                              ? 'Exclusively reserved for Super Administrator role'
                              : undefined
                          }
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {p.name}
                              </span>
                              {isExclusiveSuperAdmin && (
                                <span className="badge badge-warning" style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem' }}>
                                  Super Admin Only
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              <code>{p.code}</code>
                            </div>
                          </div>
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '4px',
                              border: isGranted ? 'none' : '1px solid var(--border-card)',
                              background: isGranted ? 'var(--accent-primary)' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                            }}
                          >
                            {isGranted && <Check size={14} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Individual Role View Modal */}
      {viewingRole && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingRole(null);
          }}
        >
          <div
            className="modal-dialog glass-panel"
            style={{
              maxWidth: '680px',
              padding: '2rem',
              borderRadius: 'var(--radius-xl)',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid var(--border-color)',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: 'var(--radius-md)',
                    background: viewingRole.is_system ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: viewingRole.is_system ? 'var(--accent-primary)' : '#10b981',
                    border: viewingRole.is_system ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Shield size={24} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      {viewingRole.name}
                    </h3>
                    <span className={`badge ${viewingRole.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {viewingRole.is_active ? 'Active' : 'Disabled'}
                    </span>
                    {viewingRole.is_system && (
                      <span className="badge badge-primary">System Role</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    System Code: <span className="badge badge-neutral" style={{ fontFamily: 'monospace' }}>{viewingRole.code}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingRole(null)}
                className="btn btn-secondary"
                style={{ padding: '0.4rem', borderRadius: '50%', width: '32px', height: '32px' }}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Formatted Key-Value Tables */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Section 1: Role Specifications */}
              <div className="detail-table-section-title">
                <Shield size={14} color="var(--accent-primary)" />
                <span>Role Specifications &amp; Scope</span>
              </div>
              <table className="detail-spec-table">
                <tbody>
                  <tr>
                    <th>Role Title</th>
                    <td style={{ fontWeight: 600 }}>{viewingRole.name}</td>
                  </tr>
                  <tr>
                    <th>System Identifier Code</th>
                    <td>
                      <span className="badge badge-neutral" style={{ fontFamily: 'monospace' }}>
                        {viewingRole.code}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th>Operational Status</th>
                    <td>
                      <span style={{ fontWeight: 600, color: viewingRole.is_active ? '#22c55e' : '#ef4444', fontSize: '0.825rem' }}>
                        {viewingRole.is_active ? 'Active Role' : 'Suspended / Inactive'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th>Role Category</th>
                    <td style={{ fontWeight: 600, color: viewingRole.is_system ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                      {viewingRole.is_system ? 'Built-in System Definition (Protected)' : 'Custom Tenant Definition'}
                    </td>
                  </tr>
                  <tr>
                    <th>Detailed Description</th>
                    <td style={{ lineHeight: 1.5 }}>
                      {viewingRole.description || <span style={{ color: 'var(--text-muted)' }}>No detailed description configured for this role.</span>}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Section 2: Security & Identifier Audit */}
              <div className="detail-table-section-title">
                <Lock size={14} color="var(--accent-primary)" />
                <span>Security &amp; Identifier Audit</span>
              </div>
              <table className="detail-spec-table">
                <tbody>
                  <tr>
                    <th>Privileges Scope</th>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Configured via the Permission Matrix tab.
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Modal Actions Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '1.75rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-color)',
              }}
            >
              <button
                type="button"
                onClick={() => setViewingRole(null)}
                className="btn btn-secondary"
              >
                Close
              </button>

              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    const r = viewingRole;
                    setViewingRole(null);
                    setMatrixRole(r);
                    setActiveTab('matrix');
                  }}
                  className="btn btn-secondary"
                >
                  <Key size={14} />
                  <span>Configure Privileges</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const roleToEdit = viewingRole;
                    setViewingRole(null);
                    openEditRoleModal(roleToEdit);
                  }}
                  className="btn btn-primary"
                >
                  <Edit2 size={14} />
                  <span>Edit Role</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Permission View Modal */}
      {viewingPermission && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingPermission(null);
          }}
        >
          <div
            className="modal-dialog glass-panel"
            style={{
              maxWidth: '640px',
              padding: '2rem',
              borderRadius: 'var(--radius-xl)',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid var(--border-color)',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(67, 56, 202, 0.2) 100%)',
                    color: 'var(--accent-primary)',
                    border: '1px solid rgba(99, 102, 241, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Key size={24} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      {viewingPermission.name}
                    </h3>
                    <span className="badge badge-primary">
                      {viewingPermission.action}
                    </span>
                    {viewingPermission.is_system && (
                      <span className="badge badge-neutral">System Protected</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Resource: <strong style={{ color: 'var(--text-primary)' }}>{viewingPermission.resource}</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingPermission(null)}
                className="btn btn-secondary"
                style={{ padding: '0.4rem', borderRadius: '50%', width: '32px', height: '32px' }}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Formatted Key-Value Tables */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Section 1: Permission Specification */}
              <div className="detail-table-section-title">
                <Key size={14} color="var(--accent-primary)" />
                <span>Permission Specification</span>
              </div>
              <table className="detail-spec-table">
                <tbody>
                  <tr>
                    <th>Permission Name</th>
                    <td style={{ fontWeight: 600 }}>{viewingPermission.name}</td>
                  </tr>
                  <tr>
                    <th>Target Resource</th>
                    <td>
                      <code style={{ fontSize: '0.85rem', color: 'var(--accent-primary)' }}>
                        {viewingPermission.resource}
                      </code>
                    </td>
                  </tr>
                  <tr>
                    <th>Action Operation</th>
                    <td>
                      <span className="badge badge-primary" style={{ fontWeight: 600 }}>
                        {viewingPermission.action}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th>Protection Policy</th>
                    <td style={{ fontWeight: 600, color: viewingPermission.is_system ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                      {viewingPermission.is_system ? 'System Protected (Immutable)' : 'Custom Tenant Definition'}
                    </td>
                  </tr>
                  <tr>
                    <th>Detailed Description</th>
                    <td style={{ lineHeight: 1.5 }}>
                      {viewingPermission.description || <span style={{ color: 'var(--text-muted)' }}>No detailed description configured for this permission.</span>}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Section 2: System Identifiers & Audit */}
              <div className="detail-table-section-title">
                <Shield size={14} color="var(--accent-primary)" />
                <span>System Identifiers &amp; Audit</span>
              </div>
              <table className="detail-spec-table">
                <tbody>
                  <tr>
                    <th>System Identifier Code</th>
                    <td>
                      <span className="badge badge-neutral" style={{ fontFamily: 'monospace' }}>
                        {viewingPermission.code}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Modal Actions Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '1.75rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-color)',
              }}
            >
              <button
                type="button"
                onClick={() => setViewingPermission(null)}
                className="btn btn-secondary"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  const permToEdit = viewingPermission;
                  setViewingPermission(null);
                  openEditPermissionModal(permToEdit);
                }}
                className="btn btn-primary"
              >
                <Edit2 size={14} />
                <span>Edit Permission</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Create/Edit Modal */}
      {roleModalMode && (
        <div className="modal-backdrop">
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '480px',
              padding: '2rem',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {roleModalMode === 'create' ? 'Create Business Role' : 'Edit Business Role'}
              </h3>
              <button
                type="button"
                onClick={() => setRoleModalMode(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-danger-bg)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  color: '#fda4af',
                  fontSize: '0.825rem',
                  marginBottom: '1.25rem',
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleRoleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label
                  htmlFor="role-input-name"
                  style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}
                >
                  Role Name <span style={{ color: '#f43f5e' }}>*</span>
                </label>
                <input
                  id="role-input-name"
                  type="text"
                  placeholder="e.g. Sales Executive"
                  value={roleFormData.name}
                  onChange={(e) => handleRoleFieldChange('name', e.target.value)}
                  onBlur={() => handleRoleFieldBlur('name')}
                  className={`input-field ${roleFieldErrors.name && roleTouched.name ? 'has-error' : ''}`}
                  aria-invalid={Boolean(roleFieldErrors.name && roleTouched.name)}
                  aria-describedby={roleFieldErrors.name && roleTouched.name ? 'role-error-name' : undefined}
                />
                {roleFieldErrors.name && roleTouched.name && (
                  <div id="role-error-name" className="field-error-text" role="alert">
                    <AlertCircle size={13} style={{ flexShrink: 0 }} />
                    <span>{roleFieldErrors.name}</span>
                  </div>
                )}
              </div>

              <div>
                <label
                  style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}
                >
                  System Identifier Code <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)' }}>(Auto-generated by API • Read-Only)</span>
                </label>
                <div
                  style={{
                    height: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 0.85rem',
                    background: 'var(--bg-app)',
                    border: '1px dashed var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: roleFormData.name ? 'var(--color-primary-light, #38bdf8)' : 'var(--text-muted)',
                    letterSpacing: '0.05em',
                  }}
                >
                  {roleModalMode === 'edit' && selectedRole?.is_system
                    ? selectedRole.code
                    : (roleFormData.code || generateRoleCode(roleFormData.name) || 'auto_role_code')}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe privileges and responsibilities for this role..."
                  value={roleFormData.description || ''}
                  onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  className="input-field"
                  style={{ resize: 'vertical' }}
                />
              </div>

              {roleModalMode === 'edit' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <input
                    type="checkbox"
                    id="is_active_toggle"
                    checked={roleFormData.is_active ?? true}
                    onChange={(e) => setRoleFormData({ ...roleFormData, is_active: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                  />
                  <label htmlFor="is_active_toggle" style={{ fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    Role is Active
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setRoleModalMode(null)}
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : null}
                  <span>{roleModalMode === 'create' ? 'Create Role' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permission Create/Edit Modal */}
      {permissionModalMode && (
        <div className="modal-backdrop">
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '480px',
              padding: '2rem',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {permissionModalMode === 'create' ? 'Register New Permission' : 'Edit Permission'}
              </h3>
              <button
                type="button"
                onClick={() => setPermissionModalMode(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-danger-bg)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  color: '#fda4af',
                  fontSize: '0.825rem',
                  marginBottom: '1.25rem',
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handlePermissionSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label
                  htmlFor="perm-input-name"
                  style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}
                >
                  Permission Name <span style={{ color: '#f43f5e' }}>*</span>
                </label>
                <input
                  id="perm-input-name"
                  type="text"
                  placeholder="e.g. Export Organization Data"
                  value={permissionFormData.name}
                  onChange={(e) => handlePermFieldChange('name', e.target.value)}
                  onBlur={() => handlePermFieldBlur('name')}
                  className={`input-field ${permFieldErrors.name && permTouched.name ? 'has-error' : ''}`}
                  aria-invalid={Boolean(permFieldErrors.name && permTouched.name)}
                  aria-describedby={permFieldErrors.name && permTouched.name ? 'perm-error-name' : undefined}
                />
                {permFieldErrors.name && permTouched.name && (
                  <div id="perm-error-name" className="field-error-text" role="alert">
                    <AlertCircle size={13} style={{ flexShrink: 0 }} />
                    <span>{permFieldErrors.name}</span>
                  </div>
                )}
              </div>

              {permissionModalMode === 'create' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label
                        htmlFor="perm-input-resource"
                        style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}
                      >
                        Resource Domain <span style={{ color: '#f43f5e' }}>*</span>
                      </label>
                      <input
                        id="perm-input-resource"
                        type="text"
                        placeholder="e.g. organization"
                        value={permissionFormData.resource}
                        onChange={(e) => handlePermFieldChange('resource', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                        onBlur={() => handlePermFieldBlur('resource')}
                        className={`input-field ${permFieldErrors.resource && permTouched.resource ? 'has-error' : ''}`}
                        aria-invalid={Boolean(permFieldErrors.resource && permTouched.resource)}
                        aria-describedby={permFieldErrors.resource && permTouched.resource ? 'perm-error-resource' : undefined}
                      />
                      {permFieldErrors.resource && permTouched.resource && (
                        <div id="perm-error-resource" className="field-error-text" role="alert">
                          <AlertCircle size={13} style={{ flexShrink: 0 }} />
                          <span>{permFieldErrors.resource}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="perm-input-action"
                        style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}
                      >
                        Action Name <span style={{ color: '#f43f5e' }}>*</span>
                      </label>
                      <input
                        id="perm-input-action"
                        type="text"
                        placeholder="e.g. export"
                        value={permissionFormData.action}
                        onChange={(e) => handlePermFieldChange('action', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                        onBlur={() => handlePermFieldBlur('action')}
                        className={`input-field ${permFieldErrors.action && permTouched.action ? 'has-error' : ''}`}
                        aria-invalid={Boolean(permFieldErrors.action && permTouched.action)}
                        aria-describedby={permFieldErrors.action && permTouched.action ? 'perm-error-action' : undefined}
                      />
                      {permFieldErrors.action && permTouched.action && (
                        <div id="perm-error-action" className="field-error-text" role="alert">
                          <AlertCircle size={13} style={{ flexShrink: 0 }} />
                          <span>{permFieldErrors.action}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      Computed Security Code <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)' }}>(Auto-generated by API • Read-Only)</span>
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`${permissionFormData.resource.trim() || 'resource'}.${permissionFormData.action.trim() || 'action'}`}
                      className="input-field"
                      style={{ background: 'var(--bg-app)', opacity: 0.8 }}
                    />
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        System Identifier Code
                      </label>
                      <span className={`badge ${selectedPermission?.is_system ? 'badge-primary' : 'badge-neutral'}`} style={{ fontSize: '0.68rem' }}>
                        {selectedPermission?.is_system ? 'System Permission' : 'Custom Permission'}
                      </span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={permissionFormData.code}
                      className="input-field"
                      style={{ background: 'var(--bg-app)', opacity: 0.8, fontFamily: 'monospace', fontWeight: 600 }}
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      background: 'var(--bg-input)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: selectedPermission?.is_system ? 'not-allowed' : 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={permissionFormData.is_active ?? true}
                        disabled={selectedPermission?.is_system}
                        onChange={(e) => setPermissionFormData({ ...permissionFormData, is_active: e.target.checked })}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: selectedPermission?.is_system ? 'not-allowed' : 'pointer' }}
                      />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Active Status
                      </span>
                    </label>
                    {selectedPermission?.is_system && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Fixed by system
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Detail operations governed by this permission..."
                  value={permissionFormData.description || ''}
                  onChange={(e) => setPermissionFormData({ ...permissionFormData, description: e.target.value })}
                  className="input-field"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setPermissionModalMode(null)}
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : null}
                  <span>{permissionModalMode === 'create' ? 'Register Permission' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Role Confirmation Dialog */}
      <ConfirmationModal
        isOpen={!!deleteRoleCandidate}
        onClose={() => setDeleteRoleCandidate(null)}
        onConfirm={handleDeleteRole}
        title={isHardDelete ? "Permanently Delete Role?" : "Deactivate Role?"}
        subtitle={isHardDelete ? "This action permanently purges the role definition from the database." : "This action deactivates the role."}
        message={
          deleteRoleCandidate ? (
            isHardDelete ? (
              <>
                Are you sure you want to <strong>permanently purge</strong> role <strong>&ldquo;{deleteRoleCandidate.name}&rdquo;</strong> (<code>{deleteRoleCandidate.code}</code>)?
                This action <strong>cannot be undone</strong> and will remove all associated permissions and role mappings.
              </>
            ) : (
              <>
                Are you sure you want to deactivate role <strong>&ldquo;{deleteRoleCandidate.name}&rdquo;</strong> (<code>{deleteRoleCandidate.code}</code>)?
                The role can be restored back to active status or permanently purged later.
              </>
            )
          ) : null
        }
        confirmLabel={isHardDelete ? "Permanently Delete" : "Deactivate Role"}
        variant="danger"
        isLoading={isSubmitting}
      />

      {/* Restore Role Confirmation Dialog */}
      <ConfirmationModal
        isOpen={!!restoreRoleCandidate}
        onClose={() => setRestoreRoleCandidate(null)}
        onConfirm={handleConfirmRestoreRole}
        title="Confirm Role Restoration"
        subtitle="This action reactivates the role and restores its access privileges."
        message={
          restoreRoleCandidate ? (
            <>
              Are you sure you want to restore role <strong>&ldquo;{restoreRoleCandidate.name}&rdquo;</strong> (<code>{restoreRoleCandidate.code}</code>)?
              It will be restored to active status for assigned users.
            </>
          ) : null
        }
        confirmLabel="Restore Role"
        variant="primary"
        isLoading={isRestoringRole}
      />

      {/* Delete Permission Confirmation Dialog */}
      <ConfirmationModal
        isOpen={!!deletePermissionCandidate}
        onClose={() => setDeletePermissionCandidate(null)}
        onConfirm={handleDeletePermission}
        title={isHardDeletePerm ? "Permanently Delete Permission?" : "Deactivate Permission?"}
        subtitle={isHardDeletePerm ? "This action permanently purges the permission definition from the database." : "This action deactivates the permission."}
        message={
          deletePermissionCandidate ? (
            isHardDeletePerm ? (
              <>
                Are you sure you want to <strong>permanently purge</strong> permission <strong>&ldquo;{deletePermissionCandidate.name}&rdquo;</strong> (<code>{deletePermissionCandidate.code}</code>)?
                This action <strong>cannot be undone</strong> and will remove this privilege from all roles.
              </>
            ) : (
              <>
                Are you sure you want to deactivate permission <strong>&ldquo;{deletePermissionCandidate.name}&rdquo;</strong> (<code>{deletePermissionCandidate.code}</code>)?
                The permission can be restored back to active status or permanently purged later.
              </>
            )
          ) : null
        }
        confirmLabel={isHardDeletePerm ? "Permanently Delete" : "Deactivate Permission"}
        variant="danger"
        isLoading={isSubmitting}
      />

      {/* Restore Permission Confirmation Dialog */}
      <ConfirmationModal
        isOpen={!!restorePermCandidate}
        onClose={() => setRestorePermCandidate(null)}
        onConfirm={handleConfirmRestorePermission}
        title="Confirm Permission Restoration"
        subtitle="This action reactivates the permission and restores access."
        message={
          restorePermCandidate ? (
            <>
              Are you sure you want to restore permission <strong>&ldquo;{restorePermCandidate.name}&rdquo;</strong> (<code>{restorePermCandidate.code}</code>)?
              It will be restored to active status for assigned roles.
            </>
          ) : null
        }
        confirmLabel="Restore Permission"
        variant="primary"
        isLoading={isRestoringPerm}
      />

      {/* Bulk Delete Roles Confirmation Dialog */}
      <ConfirmationModal
        isOpen={bulkRoleDeleteConfirmOpen}
        onClose={() => setBulkRoleDeleteConfirmOpen(false)}
        onConfirm={handleBulkDeleteRoles}
        title={bulkRoleHardDeleteRequested ? `Permanently Purge ${selectedRoleIds.size} Roles?` : `Deactivate ${selectedRoleIds.size} Roles?`}
        subtitle={bulkRoleHardDeleteRequested ? "This action permanently purges the selected roles." : "This action deactivates the selected roles."}
        message={
          bulkRoleHardDeleteRequested ? (
            <>
              Are you sure you want to <strong>permanently purge</strong> the <strong>{selectedRoleIds.size}</strong> selected roles?
              This action <strong>cannot be undone</strong> and will remove all associated permissions and role mappings.
            </>
          ) : (
            <>
              Are you sure you want to deactivate the <strong>{selectedRoleIds.size}</strong> selected roles?
              The roles can be restored back to active status or permanently purged later.
            </>
          )
        }
        confirmLabel={bulkRoleHardDeleteRequested ? "Permanently Purge" : "Deactivate Roles"}
        variant="danger"
        isLoading={isBulkDeletingRoles}
      />

      {/* Bulk Restore Roles Confirmation Dialog */}
      <ConfirmationModal
        isOpen={bulkRoleRestoreConfirmOpen}
        onClose={() => setBulkRoleRestoreConfirmOpen(false)}
        onConfirm={handleBulkRestoreRoles}
        title={`Restore ${selectedRoleIds.size} Roles?`}
        subtitle="This action reactivates the selected roles."
        message={
          <>
            Are you sure you want to restore the <strong>{selectedRoleIds.size}</strong> selected roles?
            They will be restored to active status for assigned users.
          </>
        }
        confirmLabel="Restore Roles"
        variant="primary"
        isLoading={isBulkRestoringRoles}
      />

      {/* Bulk Delete Permissions Confirmation Dialog */}
      <ConfirmationModal
        isOpen={bulkPermDeleteConfirmOpen}
        onClose={() => setBulkPermDeleteConfirmOpen(false)}
        onConfirm={handleBulkDeletePerms}
        title={bulkPermHardDeleteRequested ? `Permanently Purge ${selectedPermIds.size} Permissions?` : `Deactivate ${selectedPermIds.size} Permissions?`}
        subtitle={bulkPermHardDeleteRequested ? "This action permanently purges the selected permissions." : "This action deactivates the selected permissions."}
        message={
          bulkPermHardDeleteRequested ? (
            <>
              Are you sure you want to <strong>permanently purge</strong> the <strong>{selectedPermIds.size}</strong> selected permissions?
              This action <strong>cannot be undone</strong> and will remove these privileges from all roles.
            </>
          ) : (
            <>
              Are you sure you want to deactivate the <strong>{selectedPermIds.size}</strong> selected permissions?
              The permissions can be restored back to active status or permanently purged later.
            </>
          )
        }
        confirmLabel={bulkPermHardDeleteRequested ? "Permanently Purge" : "Deactivate Permissions"}
        variant="danger"
        isLoading={isBulkDeletingPerms}
      />

      {/* Bulk Restore Permissions Confirmation Dialog */}
      <ConfirmationModal
        isOpen={bulkPermRestoreConfirmOpen}
        onClose={() => setBulkPermRestoreConfirmOpen(false)}
        onConfirm={handleBulkRestorePerms}
        title={`Restore ${selectedPermIds.size} Permissions?`}
        subtitle="This action reactivates the selected permissions."
        message={
          <>
            Are you sure you want to restore the <strong>{selectedPermIds.size}</strong> selected permissions?
            They will be restored to active status for assigned roles.
          </>
        }
        confirmLabel="Restore Permissions"
        variant="primary"
        isLoading={isBulkRestoringPerms}
      />
    </div>
  );
}

/**
 * Enterprise RBAC Administration & Management Dashboard.
 * Wrapped in Suspense boundary for Next.js App Router query parameter hydration.
 */
export default function RbacPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
          <div className="skeleton" style={{ height: '40px', width: '250px' }} />
          <div className="skeleton" style={{ height: '300px', width: '100%' }} />
        </div>
      }
    >
      <RbacWorkspace />
    </Suspense>
  );
}
