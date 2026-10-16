'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
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
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Search,
  Loader2,
  RefreshCw,
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

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const { toast } = useToast();

  // Search filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Role Form Modal States
  const [roleModalMode, setRoleModalMode] = useState<'create' | 'edit' | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [viewingRole, setViewingRole] = useState<Role | null>(null);
  const [deleteRoleCandidate, setDeleteRoleCandidate] = useState<Role | null>(null);
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
  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) return roles;
    const q = searchQuery.toLowerCase();
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    );
  }, [roles, searchQuery]);

  // Filtered Permissions grouped by resource
  const groupedPermissions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = permissions.filter((p) => {
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
  }, [permissions, searchQuery]);

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
      if (field === 'name' && roleModalMode === 'create' && typeof value === 'string') {
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
      await apiFetch(`/roles/${deleteRoleCandidate.id}`, {
        method: 'DELETE',
      });
      toast.success(`Role "${deleteRoleCandidate.name}" deleted successfully.`);
      setDeleteRoleCandidate(null);
      await loadRbacData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete role.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

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
      await apiFetch(`/permissions/${deletePermissionCandidate.id}`, {
        method: 'DELETE',
      });
      toast.success(`Permission "${deletePermissionCandidate.code}" deleted successfully.`);
      setDeletePermissionCandidate(null);
      await loadRbacData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete permission.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
            Access Control & RBAC
          </h1>
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

        {/* Search Field */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.85rem',
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
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '2.4rem', fontSize: '0.85rem', height: '36px' }}
          />
        </div>
      </div>

      {/* Tab 1: Roles Management */}
      {activeTab === 'roles' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
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
                    <td colSpan={6}>
                      <div className="skeleton" style={{ height: '35px', width: '100%' }} />
                    </td>
                  </tr>
                ))
              ) : filteredRoles.length > 0 ? (
                filteredRoles.map((role) => (
                  <tr key={role.id}>
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
                      <span className={`badge ${role.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {role.is_active ? 'Active' : 'Disabled'}
                      </span>
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
                        {!role.is_system && (
                          <button
                            type="button"
                            onClick={() => setDeleteRoleCandidate(role)}
                            className="btn btn-danger"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                            title="Delete role"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No matching roles found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
                {perms.map((p) => (
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
                        <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                          {p.action}
                        </span>
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
                      {!p.is_system && (
                        <button
                          type="button"
                          onClick={() => setDeletePermissionCandidate(p)}
                          className="btn btn-danger"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                          title="Delete permission"
                        >
                          <Trash2 size={12} />
                        </button>
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
                  {roleModalMode === 'edit'
                    ? (selectedRole?.code || 'SYSTEM_ROLE')
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
      {deleteRoleCandidate && (
        <div className="modal-backdrop">
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '1.75rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f43f5e', marginBottom: '0.75rem' }}>
              Confirm Role Deletion
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to delete role <strong>&ldquo;{deleteRoleCandidate.name}&rdquo;</strong> (<code>{deleteRoleCandidate.code}</code>)?
              This action permanently detaches it from assigned users.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setDeleteRoleCandidate(null)}
                className="btn btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteRole}
                className="btn btn-danger"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                <span>Delete Role</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Permission Confirmation Dialog */}
      {deletePermissionCandidate && (
        <div className="modal-backdrop">
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '1.75rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f43f5e', marginBottom: '0.75rem' }}>
              Confirm Permission Deletion
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to delete permission <strong>&ldquo;{deletePermissionCandidate.name}&rdquo;</strong> (<code>{deletePermissionCandidate.code}</code>)?
              This action permanently removes this privilege from all roles.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setDeletePermissionCandidate(null)}
                className="btn btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePermission}
                className="btn btn-danger"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                <span>Delete Permission</span>
              </button>
            </div>
          </div>
        </div>
      )}
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
