'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { PagedResponse, User, UserUpdatePayload } from '@/lib/types';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  Eye,
  Edit2,
  Trash2,
  X,
  UserCheck,
  Shield,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  AlertTriangle,
  Lock,
  RefreshCw,
  Users,
  CheckCircle2,
  XCircle,
  Plus,
} from 'lucide-react';

interface RoleOption {
  code: string;
  name: string;
  description: string;
  isSystem: boolean;
}

const AVAILABLE_ROLES: RoleOption[] = [
  { code: 'super_admin', name: 'Super Administrator', description: 'Full system governance & permissions', isSystem: true },
  { code: 'admin', name: 'Administrator', description: 'Manages platform & configurations', isSystem: true },
  { code: 'sales_manager', name: 'Sales Manager', description: 'Oversees sales operations & pipelines', isSystem: true },
  { code: 'sales_rep', name: 'Sales Representative', description: 'Handles assigned deals & customers', isSystem: true },
  { code: 'support_agent', name: 'Support Agent', description: 'Resolves client support issues', isSystem: true },
];

/**
 * Enterprise User Administration & Identity Governance Workspace.
 * Comprehensive user management with:
 * - Full CRUD: View (detail specification table), Edit/Update (profile, status, roles), and Soft-Delete.
 * - Quick one-click status toggle directly on table rows.
 * - Enforced Super Administrator security: Only a Super Admin can edit, toggle status, or delete a Super Admin.
 */
export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<PagedResponse<User> | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'disabled' | 'pending'>('all');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Create Form State
  const [createFormData, setCreateFormData] = useState({
    first_name: '',
    last_name: '',
    display_name: '',
    email: '',
    password: '',
    phone: '',
    status: 'active',
    role_codes: ['admin'],
  });
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);

  // Edit Form State
  const [editFormData, setEditFormData] = useState<{
    first_name: string;
    last_name: string;
    display_name: string;
    phone: string;
    status: string;
    role_codes: string[];
  }>({
    first_name: '',
    last_name: '',
    display_name: '',
    phone: '',
    status: 'active',
    role_codes: [],
  });
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  // Authority Flags
  const isCurrentSuperAdmin = useMemo(() => {
    return Boolean(
      currentUser?.is_super_admin ||
      currentUser?.roles?.includes('super_admin') ||
      currentUser?.email?.toLowerCase() === 'superadmin@gmail.com'
    );
  }, [currentUser]);

  const reloadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<PagedResponse<User>>(`/users?page=${page}&page_size=${pageSize}`);
      setData(res);
    } catch (err) {
      console.error('Failed to fetch users', err);
      toast.error('Failed to load users list from server.');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, toast]);

  useEffect(() => {
    let ignore = false;
    async function initUsers() {
      try {
        const res = await apiFetch<PagedResponse<User>>(`/users?page=${page}&page_size=${pageSize}`);
        if (!ignore) {
          setData(res);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch users', err);
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    initUsers();
    return () => {
      ignore = true;
    };
  }, [page, pageSize]);

  // Helper to determine if target user is super admin
  const isUserSuperAdmin = (u: User): boolean => {
    return Boolean(
      u.is_super_admin ||
      u.roles?.includes('super_admin') ||
      u.email.toLowerCase() === 'superadmin@gmail.com'
    );
  };

  // Helper to check if current operator can modify target user
  const canModifyUser = (target: User): { allowed: boolean; reason?: string } => {
    const isTargetSuper = isUserSuperAdmin(target);
    if (isTargetSuper && !isCurrentSuperAdmin) {
      return {
        allowed: false,
        reason: 'Protected Super Administrator: Only a Super Admin can edit or delete this account.',
      };
    }
    return { allowed: true };
  };

  // Status Toggle Handler
  const handleToggleStatus = async (targetUser: User) => {
    const check = canModifyUser(targetUser);
    if (!check.allowed) {
      toast.warning(check.reason || 'Action unauthorized');
      return;
    }

    if (currentUser?.id === targetUser.id && targetUser.status === 'active') {
      toast.warning('You cannot suspend your own logged-in account.');
      return;
    }

    setTogglingUserId(targetUser.id);
    try {
      const updated = await apiFetch<User>(`/users/${targetUser.id}/toggle-status`, {
        method: 'POST',
      });

      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((item) => (item.id === updated.id ? updated : item)),
        };
      });

      if (viewingUser?.id === updated.id) {
        setViewingUser(updated);
      }

      toast.success(
        `User ${updated.display_name || updated.email} status changed to ${
          updated.status === 'active' ? 'Active' : 'Suspended'
        }.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user status.';
      toast.error(msg);
    } finally {
      setTogglingUserId(null);
    }
  };

  // Toggle role selection in create form
  const toggleCreateRole = (roleCode: string) => {
    if (roleCode === 'super_admin' && !isCurrentSuperAdmin) {
      toast.warning('Only a Super Administrator can assign the Super Administrator role.');
      return;
    }

    setCreateFormData((prev) => {
      const exists = prev.role_codes.includes(roleCode);
      if (exists) {
        if (prev.role_codes.length === 1) {
          toast.info('User must have at least one active assigned role.');
          return prev;
        }
        return { ...prev, role_codes: prev.role_codes.filter((c) => c !== roleCode) };
      }
      return { ...prev, role_codes: [...prev.role_codes, roleCode] };
    });
  };

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!createFormData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createFormData.email.trim())) {
      errors.email = 'Invalid email address format.';
    }
    if (!createFormData.password) {
      errors.password = 'Password is required.';
    } else if (createFormData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    }
    if (createFormData.phone && createFormData.phone.length > 30) {
      errors.phone = 'Phone number cannot exceed 30 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setCreateFieldErrors(errors);
      return;
    }

    setIsCreating(true);
    try {
      const payload = {
        first_name: createFormData.first_name.trim() || null,
        last_name: createFormData.last_name.trim() || null,
        display_name: createFormData.display_name.trim() || null,
        email: createFormData.email.trim().toLowerCase(),
        password: createFormData.password,
        phone: createFormData.phone.trim() || null,
        status: createFormData.status,
        role_codes: createFormData.role_codes,
      };

      const created = await apiFetch<User>('/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      toast.success(`User ${created.display_name || created.email} created successfully.`);
      setIsCreateModalOpen(false);
      setCreateFormData({
        first_name: '',
        last_name: '',
        display_name: '',
        email: '',
        password: '',
        phone: '',
        status: 'active',
        role_codes: ['admin'],
      });
      setCreateFieldErrors({});
      reloadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register user.';
      toast.error(msg);
    } finally {
      setIsCreating(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (targetUser: User) => {
    const check = canModifyUser(targetUser);
    if (!check.allowed) {
      toast.warning(check.reason || 'Action unauthorized');
      return;
    }

    setEditingUser(targetUser);
    setEditFormData({
      first_name: targetUser.first_name || '',
      last_name: targetUser.last_name || '',
      display_name: targetUser.display_name || '',
      phone: targetUser.phone || '',
      status: targetUser.status || 'active',
      role_codes: targetUser.roles && targetUser.roles.length > 0 ? [...targetUser.roles] : ['admin'],
    });
    setEditFieldErrors({});
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const check = canModifyUser(editingUser);
    if (!check.allowed) {
      toast.error(check.reason || 'Action unauthorized');
      return;
    }

    const errors: Record<string, string> = {};
    if (!editFormData.display_name.trim()) {
      errors.display_name = 'Display name cannot be empty.';
    }
    if (editFormData.phone && editFormData.phone.length > 30) {
      errors.phone = 'Phone number cannot exceed 30 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setEditFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: UserUpdatePayload = {
        first_name: editFormData.first_name.trim() || null,
        last_name: editFormData.last_name.trim() || null,
        display_name: editFormData.display_name.trim() || null,
        phone: editFormData.phone.trim() || null,
        status: editFormData.status,
        role_codes: editFormData.role_codes,
      };

      const updated = await apiFetch<User>(`/users/${editingUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((item) => (item.id === updated.id ? updated : item)),
        };
      });

      if (viewingUser?.id === updated.id) {
        setViewingUser(updated);
      }

      toast.success(`User ${updated.display_name || updated.email} updated successfully.`);
      setEditingUser(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete User Confirmation
  const openDeleteModal = (targetUser: User) => {
    const check = canModifyUser(targetUser);
    if (!check.allowed) {
      toast.warning(check.reason || 'Action unauthorized');
      return;
    }

    if (currentUser?.id === targetUser.id) {
      toast.warning('You cannot delete your own logged-in account.');
      return;
    }

    setDeletingUser(targetUser);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;

    setIsDeleting(true);
    try {
      await apiFetch<void>(`/users/${deletingUser.id}`, {
        method: 'DELETE',
      });

      toast.success(`User ${deletingUser.display_name || deletingUser.email} has been deleted.`);
      setDeletingUser(null);
      if (viewingUser?.id === deletingUser.id) {
        setViewingUser(null);
      }
      reloadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user.';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle role selection in edit form
  const toggleRole = (roleCode: string) => {
    if (roleCode === 'super_admin' && !isCurrentSuperAdmin) {
      toast.warning('Only a Super Administrator can assign the Super Administrator role.');
      return;
    }

    setEditFormData((prev) => {
      const exists = prev.role_codes.includes(roleCode);
      if (exists) {
        if (prev.role_codes.length === 1) {
          toast.info('User must have at least one active assigned role.');
          return prev;
        }
        return { ...prev, role_codes: prev.role_codes.filter((c) => c !== roleCode) };
      }
      return { ...prev, role_codes: [...prev.role_codes, roleCode] };
    });
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return (data?.items || []).filter((u) => {
      // Query search
      if (search) {
        const q = search.toLowerCase();
        const matchesQuery =
          u.email.toLowerCase().includes(q) ||
          (u.display_name && u.display_name.toLowerCase().includes(q)) ||
          (u.first_name && u.first_name.toLowerCase().includes(q)) ||
          (u.last_name && u.last_name.toLowerCase().includes(q)) ||
          (u.phone && u.phone.toLowerCase().includes(q)) ||
          u.roles?.some((r) => r.toLowerCase().includes(q));

        if (!matchesQuery) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && u.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [data?.items, search, statusFilter]);

  // Statistics Summary
  const stats = useMemo(() => {
    const all = data?.items || [];
    return {
      total: data?.total || all.length,
      active: all.filter((u) => u.status === 'active').length,
      suspended: all.filter((u) => u.status === 'suspended').length,
      superAdmins: all.filter(isUserSuperAdmin).length,
    };
  }, [data]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              User Administration
            </h1>
            {isCurrentSuperAdmin ? (
              <span className="badge badge-primary" title="You have Super Administrator authority">
                <Shield size={12} style={{ marginRight: '4px' }} /> Super Admin Access
              </span>
            ) : (
              <span className="badge badge-neutral" title="Standard Administrator Session">
                <Lock size={12} style={{ marginRight: '4px' }} /> Operator Access
              </span>
            )}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Manage platform users, credentials, role assignments, and lifecycle governance.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.825rem' }}
            id="btn-new-user"
          >
            <Plus size={14} />
            <span>New User</span>
          </button>
          <button
            type="button"
            onClick={reloadUsers}
            disabled={isLoading}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.825rem' }}
            title="Refresh Users"
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        <div className="card glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ padding: '0.65rem', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)' }}>
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Users</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.total}</div>
          </div>
        </div>

        <div className="card glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ padding: '0.65rem', borderRadius: 'var(--radius-md)', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Active Accounts</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#22c55e' }}>{stats.active}</div>
          </div>
        </div>

        <div className="card glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ padding: '0.65rem', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <XCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Suspended Accounts</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>{stats.suspended}</div>
          </div>
        </div>

        <div className="card glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ padding: '0.65rem', borderRadius: 'var(--radius-md)', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
            <Shield size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Super Admins</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#a855f7' }}>{stats.superAdmins}</div>
          </div>
        </div>
      </div>

      {/* Controls & Filtering Toolbar */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', width: '320px', minWidth: '240px' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by name, email, phone, role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '2.4rem', height: '38px', fontSize: '0.85rem' }}
              id="user-search-input"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '0.6rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {(['all', 'active', 'suspended', 'disabled'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`btn ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.78rem',
                  height: '34px',
                  textTransform: 'capitalize',
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Showing <strong>{filteredUsers.length}</strong> user records
        </div>
      </div>

      {/* Main Table Card */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>User Name &amp; Profile</th>
              <th>Contact Email</th>
              <th>Phone</th>
              <th>Assigned Roles</th>
              <th>Status &amp; Toggle</th>
              <th>Registered</th>
              <th style={{ textAlign: 'right', paddingRight: '1.25rem' }}>Governance Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={7}>
                    <div className="skeleton" style={{ height: '42px', width: '100%' }} />
                  </td>
                </tr>
              ))
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user) => {
                const isSuper = isUserSuperAdmin(user);
                const { allowed: canEditOrDelete, reason: lockReason } = canModifyUser(user);
                const isSelf = currentUser?.id === user.id;

                return (
                  <tr key={user.id} style={{ opacity: user.status === 'disabled' ? 0.6 : 1 }}>
                    {/* User Identity Column */}
                    <td>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
                        onClick={() => setViewingUser(user)}
                        title="Click to view detailed user specification"
                      >
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: isSuper
                              ? 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)'
                              : 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            flexShrink: 0,
                            boxShadow: isSuper
                              ? '0 2px 10px rgba(168, 85, 247, 0.4)'
                              : '0 2px 8px rgba(99, 102, 241, 0.25)',
                          }}
                        >
                          {user.first_name ? user.first_name[0].toUpperCase() : user.email[0].toUpperCase()}
                        </div>
                        <div>
                          <div
                            style={{
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                            }}
                            className="hover-underline"
                          >
                            <span>{user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User'}</span>
                            {isSuper && (
                              <span title="Super Administrator Account" style={{ display: 'inline-flex' }}>
                                <Shield size={13} color="#a855f7" />
                              </span>
                            )}
                            {isSelf && (
                              <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', background: 'var(--bg-elevated)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                                You
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : 'Platform Operator'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Email Column */}
                    <td style={{ color: 'var(--text-secondary)' }}>
                      <a
                        href={`mailto:${user.email}`}
                        style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        className="hover-link"
                      >
                        <Mail size={13} color="var(--text-muted)" />
                        <span>{user.email}</span>
                      </a>
                    </td>

                    {/* Phone Column */}
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
                      {user.phone ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Phone size={12} color="var(--text-muted)" />
                          <span>{user.phone}</span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>&mdash;</span>
                      )}
                    </td>

                    {/* Roles Column */}
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {user.roles && user.roles.length > 0 ? (
                          user.roles.map((r) => (
                            <span
                              key={r}
                              className={`badge ${r === 'super_admin' ? 'badge-primary' : 'badge-neutral'}`}
                              style={{
                                fontSize: '0.7rem',
                                padding: '0.15rem 0.45rem',
                                textTransform: 'capitalize',
                              }}
                            >
                              {r === 'super_admin' ? 'Super Admin' : r.replace('_', ' ')}
                            </span>
                          ))
                        ) : (
                          <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                            No roles
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status & Quick Toggle Column */}
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(user)}
                          disabled={!canEditOrDelete || (isSelf && user.status === 'active') || togglingUserId === user.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '20px',
                            border: `1px solid ${user.status === 'active' ? 'rgba(34, 197, 94, 0.35)' : user.status === 'suspended' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                            background: user.status === 'active' ? 'rgba(34, 197, 94, 0.12)' : user.status === 'suspended' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: user.status === 'active' ? '#22c55e' : user.status === 'suspended' ? '#f59e0b' : '#ef4444',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: !canEditOrDelete || (isSelf && user.status === 'active') ? 'not-allowed' : 'pointer',
                            transition: 'var(--transition)',
                            opacity: !canEditOrDelete ? 0.6 : 1,
                          }}
                          title={
                            !canEditOrDelete
                              ? lockReason
                              : isSelf && user.status === 'active'
                              ? 'Cannot suspend your own account'
                              : `Click to switch status to ${user.status === 'active' ? 'Suspended' : 'Active'}`
                          }
                          id={`toggle-user-status-${user.id}`}
                        >
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor: user.status === 'active' ? '#22c55e' : user.status === 'suspended' ? '#f59e0b' : '#ef4444',
                            }}
                          />
                          <span>
                            {togglingUserId === user.id
                              ? 'Updating...'
                              : user.status === 'active'
                              ? 'Active'
                              : user.status === 'suspended'
                              ? 'Suspended'
                              : 'Disabled'}
                          </span>
                        </button>
                      </div>
                    </td>

                    {/* Registered Date Column */}
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Clock size={12} color="var(--text-muted)" />
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Governance Actions Column */}
                    <td style={{ textAlign: 'right', paddingRight: '1.25rem' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        {/* View Button */}
                        <button
                          type="button"
                          onClick={() => setViewingUser(user)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                          title="View user specifications"
                          id={`btn-view-${user.id}`}
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          disabled={!canEditOrDelete}
                          className="btn btn-secondary"
                          style={{
                            padding: '0.35rem 0.6rem',
                            fontSize: '0.75rem',
                            opacity: canEditOrDelete ? 1 : 0.45,
                            cursor: canEditOrDelete ? 'pointer' : 'not-allowed',
                          }}
                          title={canEditOrDelete ? 'Edit user profile & roles' : lockReason}
                          id={`btn-edit-${user.id}`}
                        >
                          {canEditOrDelete ? <Edit2 size={13} /> : <Lock size={13} />}
                          <span>Edit</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => openDeleteModal(user)}
                          disabled={!canEditOrDelete || isSelf}
                          className="btn btn-secondary"
                          style={{
                            padding: '0.35rem 0.6rem',
                            fontSize: '0.75rem',
                            color: canEditOrDelete && !isSelf ? '#ef4444' : 'var(--text-muted)',
                            opacity: canEditOrDelete && !isSelf ? 1 : 0.45,
                            cursor: canEditOrDelete && !isSelf ? 'pointer' : 'not-allowed',
                          }}
                          title={
                            isSelf
                              ? 'Cannot delete your own account'
                              : canEditOrDelete
                              ? 'Deactivate user account'
                              : lockReason
                          }
                          id={`btn-delete-${user.id}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                  <AlertCircle size={32} style={{ margin: '0 auto 0.75rem auto', color: 'var(--text-muted)' }} />
                  <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>No users found matching query.</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Try refining your search keyword or status filter.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {data && data.total_pages > 1 && (
          <div
            style={{
              padding: '1rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Showing Page <strong>{data.page}</strong> of <strong>{data.total_pages}</strong> ({data.total} total platform operators)
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                disabled={data.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                id="users-prev-page"
              >
                <ChevronLeft size={15} />
                <span>Previous</span>
              </button>
              <button
                disabled={data.page >= data.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                id="users-next-page"
              >
                <span>Next</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. Production-Ready User Detail Specification Inspector Modal             */}
      {/* ========================================================================= */}
      {viewingUser && (
        <div
          role="dialog"
          aria-modal="true"
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingUser(null);
          }}
        >
          <div
            className="modal-dialog card"
            style={{
              maxWidth: '680px',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: isUserSuperAdmin(viewingUser)
                      ? 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)'
                      : 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
                  }}
                >
                  {viewingUser.first_name ? viewingUser.first_name[0].toUpperCase() : viewingUser.email[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      {viewingUser.display_name || `${viewingUser.first_name || ''} ${viewingUser.last_name || ''}`.trim() || 'User Profile'}
                    </h3>
                    <span className={`badge ${viewingUser.status === 'active' ? 'badge-success' : viewingUser.status === 'suspended' ? 'badge-warning' : 'badge-danger'}`}>
                      {viewingUser.status === 'active' ? 'Active Account' : viewingUser.status === 'suspended' ? 'Suspended' : 'Disabled'}
                    </span>
                    {isUserSuperAdmin(viewingUser) && (
                      <span className="badge badge-primary">
                        <Shield size={11} style={{ marginRight: '3px' }} /> Super Admin
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Email: <span style={{ color: 'var(--text-primary)' }}>{viewingUser.email}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="btn btn-secondary"
                style={{ padding: '0.4rem', borderRadius: '50%' }}
                title="Close Inspector"
                id="close-user-inspector-btn"
              >
                <X size={16} />
              </button>
            </div>

            {/* Table-Formatted Specifications */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
              {/* Section 1: Account Identity & Profile */}
              <div>
                <div className="detail-table-section-title">
                  <UserCheck size={14} color="var(--accent-primary)" />
                  <span>Account Identity &amp; Profile</span>
                </div>
                <table className="detail-spec-table">
                  <tbody>
                    <tr>
                      <th>Display Name</th>
                      <td style={{ fontWeight: 600 }}>{viewingUser.display_name || 'Not configured'}</td>
                    </tr>
                    <tr>
                      <th>Legal Full Name</th>
                      <td>
                        {`${viewingUser.first_name || ''} ${viewingUser.last_name || ''}`.trim() || (
                          <span style={{ color: 'var(--text-muted)' }}>Not configured</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <th>Primary Email Address</th>
                      <td>
                        <a
                          href={`mailto:${viewingUser.email}`}
                          style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <Mail size={12} />
                          <span>{viewingUser.email}</span>
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <th>Phone Number</th>
                      <td>
                        {viewingUser.phone ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Phone size={12} color="var(--text-muted)" />
                            <span>{viewingUser.phone}</span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>No phone registered</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <th>Account Lifecycle Status</th>
                      <td>
                        <span style={{ fontWeight: 600, color: viewingUser.status === 'active' ? '#22c55e' : viewingUser.status === 'suspended' ? '#f59e0b' : '#ef4444', fontSize: '0.825rem' }}>
                          {viewingUser.status === 'active' ? 'Active Platform Operator' : viewingUser.status === 'suspended' ? 'Suspended / Inactive' : 'Disabled Account'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <th>Assigned Platform Roles</th>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {viewingUser.roles && viewingUser.roles.length > 0 ? (
                            viewingUser.roles.map((r) => (
                              <span
                                key={r}
                                className={`badge ${r === 'super_admin' ? 'badge-primary' : 'badge-neutral'}`}
                                style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}
                              >
                                {r === 'super_admin' ? 'Super Administrator' : r.replace('_', ' ')}
                              </span>
                            ))
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>No assigned roles</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Section 2: Authority & Governance */}
              <div>
                <div className="detail-table-section-title">
                  <Shield size={14} color="var(--accent-primary)" />
                  <span>Authority &amp; Governance Security</span>
                </div>
                <table className="detail-spec-table">
                  <tbody>
                    <tr>
                      <th>Super Admin Protection</th>
                      <td>
                        {isUserSuperAdmin(viewingUser) ? (
                          <span style={{ color: '#a855f7', fontWeight: 700, fontSize: '0.825rem' }}>
                            Protected (Only Super Administrators can edit or delete this account)
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
                            Standard Account (Governed by platform administrators)
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <th>Email Verification</th>
                      <td>
                        {viewingUser.email_verified_at ? (
                          <span style={{ color: '#22c55e', fontSize: '0.825rem', fontWeight: 600 }}>
                            Verified on {new Date(viewingUser.email_verified_at).toLocaleDateString()}
                          </span>
                        ) : (
                          <span style={{ color: '#f59e0b', fontSize: '0.825rem' }}>
                            Pending Verification
                          </span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Section 3: Audit Trail & Timestamps */}
              <div>
                <div className="detail-table-section-title">
                  <Calendar size={14} color="var(--accent-primary)" />
                  <span>Audit Trail &amp; Lifecycle Records</span>
                </div>
                <table className="detail-spec-table">
                  <tbody>
                    <tr>
                      <th>Account Registered</th>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(viewingUser.created_at).toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <th>Last Profile Modification</th>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {viewingUser.updated_at ? new Date(viewingUser.updated_at).toLocaleString() : 'Never modified'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '1rem',
              }}
            >
              <div>
                {canModifyUser(viewingUser).allowed && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = viewingUser;
                      setViewingUser(null);
                      openEditModal(target);
                    }}
                    className="btn btn-primary"
                    style={{ fontSize: '0.825rem', padding: '0.45rem 0.85rem' }}
                    id="edit-from-inspector-btn"
                  >
                    <Edit2 size={14} style={{ marginRight: '5px' }} />
                    <span>Edit Profile &amp; Roles</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="btn btn-secondary"
                id="close-user-detail-btn"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. Create New User Modal                                                  */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isCreating) setIsCreateModalOpen(false);
          }}
        >
          <div
            className="modal-dialog card"
            style={{
              maxWidth: '580px',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--accent-glow)',
                    color: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Users size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Create New User
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Register a new platform operator with security credentials and role assignments
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isCreating}
                className="btn btn-secondary"
                style={{ padding: '0.4rem', borderRadius: '50%' }}
                title="Cancel"
                id="btn-close-create-user"
              >
                <X size={16} />
              </button>
            </div>

            {/* Create Form */}
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Email & Password */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label htmlFor="create-user-email" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Email Address <span style={{ color: '#f43f5e' }}>*</span>
                  </label>
                  <input
                    id="create-user-email"
                    type="email"
                    required
                    value={createFormData.email}
                    onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                    className={`input ${createFieldErrors.email ? 'has-error' : ''}`}
                    placeholder="e.g. operator@company.com"
                  />
                  {createFieldErrors.email && (
                    <div style={{ color: '#f43f5e', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {createFieldErrors.email}
                    </div>
                  )}
                </div>
                <div>
                  <label htmlFor="create-user-password" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Initial Password <span style={{ color: '#f43f5e' }}>*</span>
                  </label>
                  <input
                    id="create-user-password"
                    type="password"
                    required
                    minLength={8}
                    value={createFormData.password}
                    onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                    className={`input ${createFieldErrors.password ? 'has-error' : ''}`}
                    placeholder="Min 8 characters"
                  />
                  {createFieldErrors.password && (
                    <div style={{ color: '#f43f5e', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {createFieldErrors.password}
                    </div>
                  )}
                </div>
              </div>

              {/* Names */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label htmlFor="create-user-firstname" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    First Name
                  </label>
                  <input
                    id="create-user-firstname"
                    type="text"
                    value={createFormData.first_name}
                    onChange={(e) => setCreateFormData({ ...createFormData, first_name: e.target.value })}
                    className="input"
                    placeholder="e.g. Sarah"
                  />
                </div>
                <div>
                  <label htmlFor="create-user-lastname" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Last Name
                  </label>
                  <input
                    id="create-user-lastname"
                    type="text"
                    value={createFormData.last_name}
                    onChange={(e) => setCreateFormData({ ...createFormData, last_name: e.target.value })}
                    className="input"
                    placeholder="e.g. Connor"
                  />
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label htmlFor="create-user-displayname" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Display Name (Optional)
                </label>
                <input
                  id="create-user-displayname"
                  type="text"
                  value={createFormData.display_name}
                  onChange={(e) => setCreateFormData({ ...createFormData, display_name: e.target.value })}
                  className="input"
                  placeholder="Defaults to Full Name or username"
                />
              </div>

              {/* Phone & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label htmlFor="create-user-phone" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Phone Number
                  </label>
                  <input
                    id="create-user-phone"
                    type="text"
                    value={createFormData.phone}
                    onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })}
                    className={`input ${createFieldErrors.phone ? 'has-error' : ''}`}
                    placeholder="e.g. +1 555-0199"
                  />
                  {createFieldErrors.phone && (
                    <div style={{ color: '#f43f5e', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {createFieldErrors.phone}
                    </div>
                  )}
                </div>
                <div>
                  <label htmlFor="create-user-status" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Initial Lifecycle Status
                  </label>
                  <select
                    id="create-user-status"
                    value={createFormData.status}
                    onChange={(e) => setCreateFormData({ ...createFormData, status: e.target.value })}
                    className="input"
                  >
                    <option value="active">Active (Full Access)</option>
                    <option value="suspended">Suspended (Access Paused)</option>
                    <option value="disabled">Disabled (Deactivated)</option>
                    <option value="pending">Pending (Awaiting Verification)</option>
                  </select>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Assigned Security Roles
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {AVAILABLE_ROLES.map((role) => {
                    const isSelected = createFormData.role_codes.includes(role.code);
                    const isRoleLocked = role.code === 'super_admin' && !isCurrentSuperAdmin;

                    return (
                      <div
                        key={role.code}
                        onClick={() => {
                          if (!isRoleLocked) toggleCreateRole(role.code);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.65rem 0.85rem',
                          borderRadius: 'var(--radius-md)',
                          background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-input)',
                          border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                          cursor: isRoleLocked ? 'not-allowed' : 'pointer',
                          opacity: isRoleLocked ? 0.5 : 1,
                          transition: 'var(--transition)',
                        }}
                        title={isRoleLocked ? 'Only Super Administrators can assign this role' : role.description}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isRoleLocked}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (!isRoleLocked) toggleCreateRole(role.code);
                            }}
                            style={{
                              width: '18px',
                              height: '18px',
                              cursor: isRoleLocked ? 'not-allowed' : 'pointer',
                              accentColor: 'var(--accent-primary)',
                            }}
                          />
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {role.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {role.description}
                            </div>
                          </div>
                        </div>
                        {role.code === 'super_admin' && (
                          <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                            <Shield size={11} style={{ marginRight: '3px' }} /> Core
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '0.75rem',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '1rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isCreating}
                  className="btn btn-secondary"
                  id="btn-cancel-create-user"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                  id="btn-submit-create-user"
                >
                  {isCreating && <RefreshCw size={14} className="spin" />}
                  <span>{isCreating ? 'Creating User...' : 'Register User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. Enterprise Edit User Modal                                             */}
      {/* ========================================================================= */}
      {editingUser && (
        <div
          role="dialog"
          aria-modal="true"
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) setEditingUser(null);
          }}
        >
          <div
            className="modal-dialog card"
            style={{
              maxWidth: '580px',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--accent-glow)',
                    color: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Users size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Edit User Account
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Update profile attributes, system lifecycle status, and security roles
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                disabled={isSubmitting}
                className="btn btn-secondary"
                style={{ padding: '0.4rem', borderRadius: '50%' }}
                title="Cancel"
                id="cancel-edit-user-btn"
              >
                <X size={16} />
              </button>
            </div>

            {/* Super Admin Notice */}
            {isUserSuperAdmin(editingUser) && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(168, 85, 247, 0.1)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '0.825rem',
                  color: 'var(--text-primary)',
                }}
              >
                <Shield size={16} color="#a855f7" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Super Administrator Account:</strong> You are modifying a core governance account. Changes affect root administrative permissions.
                </span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label htmlFor="edit-user-firstname" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    First Name
                  </label>
                  <input
                    id="edit-user-firstname"
                    type="text"
                    value={editFormData.first_name}
                    onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                    className="input"
                    placeholder="e.g. John"
                  />
                </div>
                <div>
                  <label htmlFor="edit-user-lastname" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Last Name
                  </label>
                  <input
                    id="edit-user-lastname"
                    type="text"
                    value={editFormData.last_name}
                    onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                    className="input"
                    placeholder="e.g. Doe"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-user-displayname" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Display Name <span style={{ color: '#f43f5e' }}>*</span>
                </label>
                <input
                  id="edit-user-displayname"
                  type="text"
                  value={editFormData.display_name}
                  onChange={(e) => setEditFormData({ ...editFormData, display_name: e.target.value })}
                  className={`input ${editFieldErrors.display_name ? 'has-error' : ''}`}
                  placeholder="e.g. John Doe (Director)"
                />
                {editFieldErrors.display_name && (
                  <div style={{ color: '#f43f5e', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {editFieldErrors.display_name}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label htmlFor="edit-user-phone" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Phone Number
                  </label>
                  <input
                    id="edit-user-phone"
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="input"
                    placeholder="e.g. +1 555-0199"
                  />
                </div>
                <div>
                  <label htmlFor="edit-user-status" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Lifecycle Status
                  </label>
                  <select
                    id="edit-user-status"
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="input"
                  >
                    <option value="active">Active (Full Access)</option>
                    <option value="suspended">Suspended (Access Paused)</option>
                    <option value="disabled">Disabled (Deactivated)</option>
                    <option value="pending">Pending (Awaiting Verification)</option>
                  </select>
                </div>
              </div>

              {/* Role Assignment Section */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Assigned Platform Roles
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {AVAILABLE_ROLES.map((role) => {
                    const isSelected = editFormData.role_codes.includes(role.code);
                    const isRoleLocked = role.code === 'super_admin' && !isCurrentSuperAdmin;

                    return (
                      <div
                        key={role.code}
                        onClick={() => {
                          if (!isRoleLocked) toggleRole(role.code);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.65rem 0.85rem',
                          borderRadius: 'var(--radius-md)',
                          background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-input)',
                          border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                          cursor: isRoleLocked ? 'not-allowed' : 'pointer',
                          opacity: isRoleLocked ? 0.5 : 1,
                          transition: 'var(--transition)',
                        }}
                        title={isRoleLocked ? 'Only Super Administrators can assign this role' : role.description}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isRoleLocked}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (!isRoleLocked) toggleRole(role.code);
                            }}
                            style={{
                              width: '18px',
                              height: '18px',
                              cursor: isRoleLocked ? 'not-allowed' : 'pointer',
                              accentColor: 'var(--accent-primary)',
                            }}
                          />
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {role.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {role.description}
                            </div>
                          </div>
                        </div>

                        {role.code === 'super_admin' && (
                          <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                            <Shield size={11} style={{ marginRight: '3px' }} /> Core
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '0.75rem',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '1rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={isSubmitting}
                  className="btn btn-secondary"
                  id="cancel-user-edit-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                  id="save-user-edit-btn"
                >
                  {isSubmitting && <RefreshCw size={14} className="spin" />}
                  <span>{isSubmitting ? 'Saving Changes...' : 'Save User Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. Delete Confirmation Dialog                                             */}
      {/* ========================================================================= */}
      {deletingUser && (
        <div
          role="dialog"
          aria-modal="true"
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setDeletingUser(null);
          }}
        >
          <div
            className="modal-dialog card"
            style={{
              maxWidth: '460px',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              border: '1px solid rgba(244, 63, 94, 0.35)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(244, 63, 94, 0.15)',
                  color: '#f43f5e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Confirm Account Deletion
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  This action performs a soft-deletion and disables account access.
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to deactivate and remove user{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {deletingUser.display_name || deletingUser.email}
              </strong>{' '}
              ({deletingUser.email})?
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '1rem',
              }}
            >
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                disabled={isDeleting}
                className="btn btn-secondary"
                id="cancel-delete-user-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  background: '#f43f5e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.5rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 2px 8px rgba(244, 63, 94, 0.35)',
                }}
                id="confirm-delete-user-btn"
              >
                <Trash2 size={14} />
                <span>{isDeleting ? 'Deleting...' : 'Delete User'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
