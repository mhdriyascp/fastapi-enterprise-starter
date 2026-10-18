'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '@/lib/api-client';
import { MenuItem, MenuCreateInput, MenuUpdateInput } from '@/lib/types';
import { useMenus } from '@/hooks/use-menus';
import { useToast } from '@/lib/toast-context';
import { useAuth } from '@/lib/auth-context';
import { generateMenuCode } from '@/lib/code-generator';
import { SearchableSelect, SelectOption } from '@/components/ui/searchable-select';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useDefaultPageSize } from '@/lib/use-page-size';
import {
  Plus,
  Edit2,
  Trash2,
  Route,
  RefreshCw,
  RotateCcw,
  Search,
  List,
  FolderTree,
  X,
  Layers,
  Shield,
  Building2,
  Users,
  Settings,
  BarChart3,
  Wallet,
  Receipt,
  AlertCircle,
  Loader2,
  Eye,
} from 'lucide-react';

/**
 * Resolves icon identifier string into a styled Lucide React node.
 */
function getMenuIcon(iconName: string | null): React.ReactNode {
  if (!iconName) return <Layers size={16} />;
  const normalized = iconName.toLowerCase();
  if (normalized.includes('build') || normalized.includes('org')) return <Building2 size={16} />;
  if (normalized.includes('user')) return <Users size={16} />;
  if (normalized.includes('shield') || normalized.includes('role') || normalized.includes('perm')) return <Shield size={16} />;
  if (normalized.includes('chart') || normalized.includes('report') || normalized.includes('analytic')) return <BarChart3 size={16} />;
  if (normalized.includes('setting')) return <Settings size={16} />;
  if (normalized.includes('wallet') || normalized.includes('cash')) return <Wallet size={16} />;
  if (normalized.includes('receipt') || normalized.includes('invoice')) return <Receipt size={16} />;
  return <Layers size={16} />;
}

/**
 * RBAC Menus Management & Administration Page.
 * Full CRUD workspace providing hierarchical tree visualization, high-density data table,
 * create/edit modals, child nesting, and live sidebar synchronization.
 */
export default function MenusPage() {
  const { user } = useAuth();
  const { refreshMenus: refreshSidebarMenus } = useMenus();
  const { toast } = useToast();
  const [menuTree, setMenuTree] = useState<MenuItem[]>([]);
  const [flatList, setFlatList] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'deleted'>('all');
  const [levelFilter, setLevelFilter] = useState<'all' | 'root' | 'submenus'>('all');
  const [pageSize] = useDefaultPageSize(15);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal States
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [viewingMenu, setViewingMenu] = useState<MenuItem | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<MenuItem | null>(null);
  const [isHardDelete, setIsHardDelete] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState<boolean>(false);
  const [bulkRestoreConfirmOpen, setBulkRestoreConfirmOpen] = useState<boolean>(false);
  const [bulkHardDeleteRequested, setBulkHardDeleteRequested] = useState<boolean>(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
  const [isBulkRestoring, setIsBulkRestoring] = useState<boolean>(false);
  const [restoreCandidate, setRestoreCandidate] = useState<MenuItem | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    if (user.is_super_admin) return true;
    return (user.roles || []).some((r: string) =>
      ['super_admin', 'superadmin', 'admin', 'system_admin'].includes(r.toLowerCase())
    );
  }, [user]);

  const canRestore = useMemo(() => {
    if (!user) return false;
    return Boolean(
      isAdmin ||
      user.is_super_admin ||
      user?.permissions?.includes('menu.restore') ||
      user?.permissions?.includes('*.manage')
    );
  }, [isAdmin, user]);

  const canDelete = useMemo(() => {
    if (!user) return false;
    return Boolean(
      isAdmin ||
      user.is_super_admin ||
      user?.permissions?.includes('menu.delete') ||
      user?.permissions?.includes('*.delete') ||
      user?.permissions?.includes('*.manage')
    );
  }, [isAdmin, user]);

  const canHardDelete = useMemo(() => {
    if (!user) return false;
    return Boolean(
      isAdmin ||
      user.is_super_admin ||
      user?.permissions?.includes('menu.hard_delete') ||
      user?.permissions?.includes('*.hard_delete')
    );
  }, [isAdmin, user]);

  // Form State
  const [formData, setFormData] = useState<{
    title: string;
    code: string;
    path: string;
    icon: string;
    sort_order: number;
    parent_id: string;
    is_active: boolean;
    show_in_header: boolean;
  }>({
    title: '',
    code: '',
    path: '',
    icon: 'layers',
    sort_order: 10,
    parent_id: '',
    is_active: true,
    show_in_header: true,
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Flatten tree into flat array for parent dropdown and table
  function flattenTree(items: MenuItem[]): MenuItem[] {
    const list: MenuItem[] = [];
    function traverse(nodes: MenuItem[]) {
      for (const node of nodes) {
        list.push(node);
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      }
    }
    traverse(items);
    return list;
  }

  // Load menu tree from backend
  const loadMenus = async () => {
    setIsLoading(true);
    try {
      let treeData: MenuItem[];
      try {
        treeData = await apiFetch<MenuItem[]>('/menus/tree');
      } catch {
        treeData = await apiFetch<MenuItem[]>('/menus/my-menus');
      }
      setMenuTree(treeData);
      setFlatList(flattenTree(treeData));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve menu data.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        let treeData: MenuItem[];
        try {
          treeData = await apiFetch<MenuItem[]>('/menus/tree');
        } catch {
          treeData = await apiFetch<MenuItem[]>('/menus/my-menus');
        }
        if (isMounted) {
          setMenuTree(treeData);
          setFlatList(flattenTree(treeData));
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to retrieve menu data.';
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

  // Filter items in table view
  const filteredFlatList = useMemo(() => {
    return flatList.filter((m) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesSearch =
          m.title.toLowerCase().includes(q) ||
          m.code.toLowerCase().includes(q) ||
          (m.path && m.path.toLowerCase().includes(q)) ||
          (m.route && m.route.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      if (statusFilter === 'all') {
        if (m.is_deleted) return false;
      } else if (statusFilter === 'active') {
        if (!m.is_active || m.is_deleted) return false;
      } else if (statusFilter === 'inactive') {
        if (m.is_active || m.is_deleted) return false;
      } else if (statusFilter === 'deleted') {
        if (!m.is_deleted) return false;
      }

      const isRoot = m.parent_id === null || m.parent_id === undefined || m.parent_id === '';
      if (levelFilter === 'root' && !isRoot) return false;
      if (levelFilter === 'submenus' && isRoot) return false;

      return true;
    });
  }, [flatList, search, statusFilter, levelFilter]);

  const menuCounts = useMemo(() => {
    return {
      all: flatList.filter((m) => !m.is_deleted).length,
      active: flatList.filter((m) => m.is_active && !m.is_deleted).length,
      inactive: flatList.filter((m) => !m.is_active && !m.is_deleted).length,
      deleted: flatList.filter((m) => Boolean(m.is_deleted)).length,
    };
  }, [flatList]);

  const totalRecords = flatList.length;
  const filteredCount = filteredFlatList.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedFlatList = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredFlatList.slice(start, start + pageSize);
  }, [filteredFlatList, safeCurrentPage, pageSize]);

  function validateField(name: string, value: string): string | null {
    const trimmed = (value || '').trim();

    switch (name) {
      case 'title':
        if (!trimmed) return 'Menu title is required';
        if (trimmed.length < 2) return 'Menu title must be at least 2 characters';
        if (trimmed.length > 100) return 'Menu title cannot exceed 100 characters';
        return null;

      case 'path':
        if (trimmed && !trimmed.startsWith('/') && !trimmed.startsWith('#')) {
          return 'Destination path must begin with / (e.g. /invoices)';
        }
        return null;

      default:
        return null;
    }
  }

  const handleFieldChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'title' && typeof value === 'string') {
        next.code = generateMenuCode(value);
      }
      return next;
    });
    if (touched[field] && typeof value === 'string') {
      const error = validateField(field, value);
      setFieldErrors((prev) => {
        const next = { ...prev };
        if (error) {
          next[field] = error;
        } else {
          delete next[field];
        }
        return next;
      });
    }
  };

  const handleFieldBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const val = (formData as Record<string, string | number | boolean>)[field];
    const error = validateField(field, typeof val === 'string' ? val : '');
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (error) {
        next[field] = error;
      } else {
        delete next[field];
      }
      return next;
    });
  };

  function openCreateModal(parentId: number | string = '') {
    setFormData({
      title: '',
      code: '',
      path: '',
      icon: 'layers',
      sort_order: 10,
      parent_id: parentId ? String(parentId) : '',
      is_active: true,
      show_in_header: true,
    });
    setFormError(null);
    setFieldErrors({});
    setTouched({});
    setModalMode('create');
  }

  function openEditModal(menu: MenuItem) {
    setSelectedMenu(menu);
    setFormData({
      title: menu.title,
      code: menu.code,
      path: menu.path || menu.route || '',
      icon: menu.icon || 'layers',
      sort_order: menu.sort_order ?? menu.order_no ?? 10,
      parent_id: menu.parent_id !== null && menu.parent_id !== undefined ? String(menu.parent_id) : '',
      is_active: menu.is_active,
      show_in_header: menu.show_in_header !== false,
    });
    setFormError(null);
    setFieldErrors({});
    setTouched({});
    setModalMode('edit');
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const fieldsToCheck = ['title', 'path'];
    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};

    for (const f of fieldsToCheck) {
      newTouched[f] = true;
      const val = (formData as Record<string, string | number | boolean>)[f];
      const error = validateField(f, typeof val === 'string' ? val : '');
      if (error) {
        newErrors[f] = error;
      }
    }

    setTouched(newTouched);
    setFieldErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstInvalid = Object.keys(newErrors)[0];
      const elem = document.getElementById(`menu-input-${firstInvalid}`);
      if (elem) {
        elem.focus();
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const derivedCode = (formData.code || generateMenuCode(formData.title)).trim().toLowerCase();

      if (modalMode === 'create') {
        const payload: MenuCreateInput = {
          title: formData.title.trim(),
          code: derivedCode,
          path: formData.path.trim() ? formData.path.trim() : null,
          icon: formData.icon.trim() || null,
          sort_order: Number(formData.sort_order) || 0,
          parent_id: formData.parent_id.trim() ? formData.parent_id.trim() : null,
          is_active: formData.is_active,
          show_in_header: formData.show_in_header,
        };

        await apiFetch<MenuItem>('/menus', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        toast.success(`Menu item "${formData.title}" created successfully!`);
      } else if (modalMode === 'edit' && selectedMenu) {
        const payload: MenuUpdateInput = {
          title: formData.title.trim(),
          code: derivedCode,
          path: formData.path.trim() ? formData.path.trim() : null,
          icon: formData.icon.trim() || null,
          sort_order: Number(formData.sort_order) || 0,
          parent_id: formData.parent_id.trim() ? formData.parent_id.trim() : null,
          is_active: formData.is_active,
          show_in_header: formData.show_in_header,
        };

        await apiFetch<MenuItem>(`/menus/${selectedMenu.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });

        toast.success(`Menu item "${formData.title}" updated successfully!`);
      }

      setModalMode(null);
      await loadMenus();
      await refreshSidebarMenus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Operation failed.';
      if (msg.toLowerCase().includes('code')) {
        setFieldErrors((prev) => ({ ...prev, code: msg }));
        setTouched((prev) => ({ ...prev, code: true }));
      } else {
        setFormError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleShowInHeader(item: MenuItem) {
    try {
      const nextVal = item.show_in_header === false;
      await apiFetch(`/menus/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ show_in_header: nextVal }),
      });
      toast.success(
        `Menu "${item.title}" ${nextVal ? 'will now show' : 'will no longer show'} in the top header.`
      );
      await loadMenus();
      await refreshSidebarMenus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update header display.';
      toast.error(msg);
    }
  }

  async function handleDeleteMenu() {
    if (!deleteCandidate) return;
    setIsSubmitting(true);

    try {
      await apiFetch(`/menus/${deleteCandidate.id}?hard_delete=${isHardDelete}`, {
        method: 'DELETE',
      });

      toast.success(
        isHardDelete
          ? `Menu "${deleteCandidate.title}" purged successfully.`
          : `Menu "${deleteCandidate.title}" soft-deleted / deactivated.`
      );
      setDeleteCandidate(null);
      await loadMenus();
      await refreshSidebarMenus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete menu item.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleToggleSelectAll = (items: MenuItem[]) => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((m) => m.id)));
    }
  };

  const handleToggleSelect = (id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    let successCount = 0;
    let failCount = 0;

    for (const menuId of selectedIds) {
      try {
        const query = bulkHardDeleteRequested ? '?hard_delete=true' : '?hard_delete=false';
        await apiFetch(`/menus/${menuId}${query}`, {
          method: 'DELETE',
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully processed ${successCount} menu item(s).`);
    }
    if (failCount > 0) {
      toast.error(`Failed to process ${failCount} menu item(s).`);
    }

    setSelectedIds(new Set());
    setBulkDeleteConfirmOpen(false);
    setIsBulkDeleting(false);
    await loadMenus();
    await refreshSidebarMenus();
  };

  const handleBulkRestore = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkRestoring(true);
    let successCount = 0;
    let failCount = 0;

    for (const menuId of selectedIds) {
      try {
        await apiFetch(`/menus/${menuId}/restore`, {
          method: 'POST',
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully restored ${successCount} menu item(s).`);
    }
    if (failCount > 0) {
      toast.error(`Failed to restore ${failCount} menu item(s).`);
    }

    setSelectedIds(new Set());
    setBulkRestoreConfirmOpen(false);
    setIsBulkRestoring(false);
    await loadMenus();
    await refreshSidebarMenus();
  };

  const handleConfirmRestore = async () => {
    if (!restoreCandidate) return;
    setIsRestoring(true);
    try {
      await apiFetch(`/menus/${restoreCandidate.id}/restore`, {
        method: 'POST',
      });
      toast.success(`Menu "${restoreCandidate.title}" restored successfully.`);
      setRestoreCandidate(null);
      await loadMenus();
      await refreshSidebarMenus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to restore menu.';
      toast.error(msg);
    } finally {
      setIsRestoring(false);
    }
  };

  // Hierarchical tree node component
  function renderTreeNode(item: MenuItem, depth: number = 0) {
    const hasChildren = item.children && item.children.length > 0;
    const pathValue = item.path || item.route;

    return (
      <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div
          className="glass-panel"
          style={{
            padding: '1rem 1.25rem',
            marginLeft: `${depth * 1.75}rem`,
            borderLeft: depth > 0 ? '3px solid var(--accent-primary)' : '1px solid var(--border-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            background: depth % 2 === 1 ? 'var(--bg-input)' : 'var(--bg-card)',
          }}
        >
          {/* Node Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {getMenuIcon(item.icon)}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {item.title}
                </span>
                <span className="badge badge-neutral" style={{ fontSize: '0.68rem', textTransform: 'lowercase' }}>
                  {item.code}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {pathValue ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}>
                    <Route size={12} />
                    <code>{pathValue}</code>
                  </span>
                ) : (
                  <span>Parent Folder</span>
                )}
                <span>Order: {item.sort_order ?? item.order_no ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Node Actions & Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span className={`badge ${item.is_active ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.68rem' }}>
              {item.is_active ? 'Active' : 'Disabled'}
            </span>

            <span
              className={`badge ${item.show_in_header !== false ? 'badge-info' : 'badge-neutral'}`}
              style={{ fontSize: '0.68rem', cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleShowInHeader(item);
              }}
              title="Click to toggle top header display"
            >
              {item.show_in_header !== false ? 'In Header: Yes' : 'In Header: No'}
            </span>

            {/* View Button */}
            <button
              type="button"
              onClick={() => setViewingMenu(item)}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
              title="View menu details"
            >
              <Eye size={13} />
              <span>View</span>
            </button>

            {/* Quick Add Child Button */}
            <button
              type="button"
              onClick={() => openCreateModal(item.id)}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
              title="Add child submenu"
            >
              <Plus size={13} />
              <span>Add Child</span>
            </button>

            {/* Edit Button */}
            <button
              type="button"
              onClick={() => openEditModal(item)}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
              title="Edit menu"
            >
              <Edit2 size={13} />
              <span>Edit</span>
            </button>

            {/* Restore and Permanent Purge or Deactivate */}
            {!item.is_active ? (
              <>
                {canRestore && (
                  <button
                    type="button"
                    onClick={() => setRestoreCandidate(item)}
                    className="btn btn-restore"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                    title="Restore menu"
                  >
                    <RotateCcw size={13} />
                    <span>Restore</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setDeleteCandidate(item);
                    setIsHardDelete(true);
                  }}
                  className="btn btn-danger"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                  title="Permanently purge menu"
                >
                  <Trash2 size={13} />
                  <span>Purge</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDeleteCandidate(item);
                  setIsHardDelete(false);
                }}
                className="btn btn-danger"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                title="Deactivate menu"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Nested Child Nodes */}
        {hasChildren && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {item.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Page Header & Action Controls */}
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
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              RBAC Navigation Menus
            </h1>
            <span className="badge badge-neutral" style={{ fontWeight: 600, fontSize: '0.75rem' }}>
              {filteredCount === totalRecords ? `${totalRecords} Total Menus` : `${filteredCount} of ${totalRecords} Menus`}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Configure dynamic enterprise navigation structure, route permissions, and role hierarchy.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* View Mode Switcher */}
          <div
            style={{
              display: 'inline-flex',
              padding: '2px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.75rem',
                fontSize: '0.8125rem',
                fontWeight: viewMode === 'table' ? 600 : 500,
                border: 'none',
                borderRadius: 'calc(var(--radius-md) - 2px)',
                background: viewMode === 'table' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'table' ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'var(--transition)',
              }}
            >
              <List size={14} />
              <span>Table View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.75rem',
                fontSize: '0.8125rem',
                fontWeight: viewMode === 'tree' ? 600 : 500,
                border: 'none',
                borderRadius: 'calc(var(--radius-md) - 2px)',
                background: viewMode === 'tree' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'tree' ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'var(--transition)',
              }}
            >
              <FolderTree size={14} />
              <span>Tree View</span>
            </button>
          </div>

          <button onClick={() => loadMenus()} className="btn btn-secondary" title="Reload menu tree">
            <RefreshCw size={14} className={isLoading ? 'loading-spinner' : ''} />
            <span>Reload</span>
          </button>

          {selectedIds.size > 0 && (statusFilter === 'deleted' || (selectedIds.size > 0 && flatList.filter((m) => selectedIds.has(m.id)).every((m) => Boolean(m.is_deleted)))) ? (
            <>
              {canRestore && (
                <button
                  id="btn-bulk-restore-menu"
                  type="button"
                  onClick={() => setBulkRestoreConfirmOpen(true)}
                  className="btn btn-restore"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                  title={`Restore ${selectedIds.size} selected menu(s)`}
                >
                  <RotateCcw size={14} />
                  <span>Restore ({selectedIds.size})</span>
                </button>
              )}
              {canHardDelete && (
                <button
                  id="btn-bulk-purge-menu"
                  type="button"
                  onClick={() => {
                    setBulkHardDeleteRequested(true);
                    setBulkDeleteConfirmOpen(true);
                  }}
                  className="btn btn-danger"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                  title={`Permanently purge ${selectedIds.size} selected menu(s)`}
                >
                  <Trash2 size={14} />
                  <span>Purge ({selectedIds.size})</span>
                </button>
              )}
            </>
          ) : (
            canDelete && selectedIds.size > 0 && (
              <button
                id="btn-bulk-delete-menu"
                type="button"
                onClick={() => {
                  setBulkHardDeleteRequested(false);
                  setBulkDeleteConfirmOpen(true);
                }}
                className="btn btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  color: 'var(--danger)',
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                }}
              >
                <Trash2 size={14} />
                <span>Delete ({selectedIds.size})</span>
              </button>
            )
          )}

          <button onClick={() => openCreateModal()} className="btn btn-primary">
            <Plus size={15} />
            <span>Add Menu Item</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '0.85rem 1rem',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.85rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search menus by title, code, or path..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="input-field"
            style={{ paddingLeft: '2.5rem', fontSize: '0.85rem', height: '38px', width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Status Filter Segmented Control */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-app)',
              padding: '0.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
            }}
          >
            {(['all', 'active', 'inactive', 'deleted'] as const).map((st) => {
              const count = menuCounts[st];
              return (
                <button
                  key={st}
                  id={`btn-filter-status-${st}`}
                  type="button"
                  onClick={() => {
                    setStatusFilter(st);
                    setSelectedIds(new Set());
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    border: 'none',
                    borderRadius: 'calc(var(--radius-md) - 2px)',
                    background: statusFilter === st ? 'var(--accent-primary)' : 'transparent',
                    color: statusFilter === st ? '#ffffff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span>{st}</span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      opacity: 0.85,
                      padding: '0 4px',
                      borderRadius: '4px',
                      background: statusFilter === st ? 'rgba(255,255,255,0.2)' : 'var(--bg-card)',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Level / Hierarchy Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <select
              value={levelFilter}
              onChange={(e) => {
                setLevelFilter(e.target.value as 'all' | 'root' | 'submenus');
                setCurrentPage(1);
              }}
              className="input-field"
              style={{ height: '38px', padding: '0 0.75rem', fontSize: '0.8125rem' }}
            >
              <option value="all">All Hierarchy</option>
              <option value="root">Root Menus Only</option>
              <option value="submenus">Submenus Only</option>
            </select>
          </div>

          {(search || statusFilter !== 'all' || levelFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setLevelFilter('all');
                setCurrentPage(1);
              }}
              className="btn btn-secondary"
              style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem' }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main View Container */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="skeleton" style={{ height: '64px', width: '100%' }} />
          <div className="skeleton" style={{ height: '64px', width: '100%' }} />
          <div className="skeleton" style={{ height: '64px', width: '100%' }} />
        </div>
      ) : viewMode === 'table' ? (
        <>
          {/* High-Density Data Table View (Default) */}
          <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '45px', textAlign: 'center' }}>#</th>
                <th style={{ width: '38px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredFlatList.length && filteredFlatList.length > 0}
                    onChange={() => handleToggleSelectAll(filteredFlatList)}
                    aria-label="Select all menu items"
                  />
                </th>
                <th>Menu Title</th>
                <th>System Code</th>
                <th>Destination Path</th>
                <th>Sort Order</th>
                <th>Status</th>
                <th>Header Nav</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedFlatList.length > 0 ? (
                paginatedFlatList.map((item, index) => (
                  <tr key={item.id} style={{ background: selectedIds.has(item.id) ? 'var(--accent-subtle)' : undefined }}>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                      {(safeCurrentPage - 1) * pageSize + index + 1}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => handleToggleSelect(item.id)}
                        aria-label={`Select ${item.title}`}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(99, 102, 241, 0.12)',
                            color: 'var(--accent-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {getMenuIcon(item.icon)}
                        </div>
                        <button
                          type="button"
                          onClick={() => setViewingMenu(item)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                          title="Click to view full details"
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
                            {item.title}
                          </div>
                          {item.parent_id && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              Child of: {flatList.find((p) => p.id === item.parent_id)?.title || 'Parent'}
                            </div>
                          )}
                        </button>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{item.code}</span>
                    </td>
                    <td>
                      {item.path || item.route ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <code>{item.path || item.route}</code>
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Folder group</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{item.sort_order ?? item.order_no ?? 0}</td>
                    <td>
                      <span className={`badge ${item.is_deleted ? 'badge-danger' : item.is_active ? 'badge-success' : 'badge-warning'}`}>
                        {item.is_deleted ? 'Deleted' : item.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleShowInHeader(item)}
                        className={`badge ${item.show_in_header !== false ? 'badge-info' : 'badge-neutral'}`}
                        style={{ cursor: 'pointer', border: 'none', background: item.show_in_header !== false ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-input)', color: item.show_in_header !== false ? '#38bdf8' : 'var(--text-muted)' }}
                        title="Click to toggle top header display"
                      >
                        {item.show_in_header !== false ? 'Visible' : 'Hidden'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => setViewingMenu(item)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                          title="View menu details"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>
                        {!item.is_active || item.is_deleted ? (
                          <>
                            {canRestore && (
                              <button
                                type="button"
                                onClick={() => setRestoreCandidate(item)}
                                className="btn btn-restore"
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                                title="Restore menu"
                              >
                                <RotateCcw size={13} />
                                <span>Restore</span>
                              </button>
                            )}
                            {canHardDelete && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteCandidate(item);
                                  setIsHardDelete(true);
                                }}
                                className="btn btn-danger"
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                                title="Permanently purge menu"
                              >
                                <Trash2 size={13} />
                                <span>Purge</span>
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteCandidate(item);
                              setIsHardDelete(false);
                            }}
                            className="btn btn-danger"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                            title="Soft delete menu"
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
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No matching menu items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Menus Table Pagination Footer */}
        {filteredCount > 0 && (
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
              Showing <strong>{(safeCurrentPage - 1) * pageSize + 1}</strong> to{' '}
              <strong>{Math.min(safeCurrentPage * pageSize, filteredCount)}</strong> of <strong>{filteredCount}</strong> menu items
              {filteredCount !== totalRecords && ` (filtered from ${totalRecords} total)`}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                Previous
              </button>
              <span style={{ padding: '0 0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Page {safeCurrentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </>
      ) : (
        /* Hierarchical Tree View (Second) */
        menuTree.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {menuTree.map((item) => renderTreeNode(item))}
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No navigation menu items found. Click &quot;Add Menu Item&quot; to build the tree.
          </div>
        )
      )}

      {/* Individual Menu Item View Modal */}
      {viewingMenu && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingMenu(null);
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
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(67, 56, 202, 0.25) 100%)',
                    color: 'var(--accent-primary)',
                    border: '1px solid rgba(99, 102, 241, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {getMenuIcon(viewingMenu.icon)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      {viewingMenu.title}
                    </h3>
                    <span className={`badge ${viewingMenu.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {viewingMenu.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Icon Token: <code style={{ color: 'var(--accent-primary)' }}>{viewingMenu.icon || 'layers'}</code>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingMenu(null)}
                className="btn btn-secondary"
                style={{ padding: '0.4rem', borderRadius: '50%', width: '32px', height: '32px' }}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Formatted Key-Value Tables */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Section 1: Navigation Hierarchy & Routing */}
              <div className="detail-table-section-title">
                <Route size={14} color="var(--accent-primary)" />
                <span>Navigation Route &amp; Hierarchy</span>
              </div>
              <table className="detail-spec-table">
                <tbody>
                  <tr>
                    <th>Title &amp; Navigation Label</th>
                    <td style={{ fontWeight: 600 }}>{viewingMenu.title}</td>
                  </tr>
                  <tr>
                    <th>Destination Path</th>
                    <td>
                      {viewingMenu.path || viewingMenu.route ? (
                        <code style={{ fontSize: '0.85rem', color: 'var(--accent-primary)' }}>
                          {viewingMenu.path || viewingMenu.route}
                        </code>
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Folder group (no route)</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th>Parent Navigation Item</th>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {viewingMenu.parent_id
                        ? flatList.find((p) => p.id === viewingMenu.parent_id)?.title || 'Parent Menu'
                        : 'Root / Top-Level Item'}
                    </td>
                  </tr>
                  <tr>
                    <th>Display Sort Order</th>
                    <td>
                      <span className="badge badge-neutral">
                        #{viewingMenu.sort_order ?? viewingMenu.order_no ?? 0}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th>Icon Token</th>
                    <td>
                      <code style={{ color: 'var(--accent-primary)', fontSize: '0.825rem' }}>
                        {viewingMenu.icon || 'layers'}
                      </code>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Section 2: System Identifiers & Access State */}
              <div className="detail-table-section-title">
                <Shield size={14} color="var(--accent-primary)" />
                <span>System Identifiers &amp; Access State</span>
              </div>
              <table className="detail-spec-table">
                <tbody>
                  <tr>
                    <th>System Identifier Code</th>
                    <td>
                      <span className="badge badge-neutral" style={{ fontFamily: 'monospace' }}>
                        {viewingMenu.code}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th>Navigation Visibility</th>
                    <td>
                      <span style={{ fontWeight: 600, color: viewingMenu.is_active ? '#22c55e' : '#ef4444', fontSize: '0.85rem' }}>
                        {viewingMenu.is_active ? 'Active / Visible in Sidebar' : 'Hidden / Inactive'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th>Top Header Display</th>
                    <td>
                      <span className={`badge ${viewingMenu.show_in_header !== false ? 'badge-info' : 'badge-neutral'}`}>
                        {viewingMenu.show_in_header !== false ? 'Visible in Header' : 'Sidebar Only'}
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
                onClick={() => setViewingMenu(null)}
                className="btn btn-secondary"
              >
                Close
              </button>

              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    const parentId = viewingMenu.id;
                    setViewingMenu(null);
                    openCreateModal(parentId);
                  }}
                  className="btn btn-secondary"
                >
                  <Plus size={14} />
                  <span>Add Child</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const menuToEdit = viewingMenu;
                    setViewingMenu(null);
                    openEditModal(menuToEdit);
                  }}
                  className="btn btn-primary"
                >
                  <Edit2 size={14} />
                  <span>Edit Menu</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal Dialog */}
      {modalMode && (
        <div className="modal-backdrop">
          <div
            className="modal-dialog glass-panel"
            style={{
              width: '100%',
              maxWidth: '740px',
              padding: 'clamp(1.5rem, 4vw, 2.25rem)',
              boxShadow: 'var(--shadow-xl)',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {modalMode === 'create' ? 'Create Menu Item' : 'Edit Menu Item'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {modalMode === 'create'
                    ? 'Define a new navigation link or parent container'
                    : `Modifying "${selectedMenu?.title}"`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Close dialog"
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

            <form onSubmit={handleFormSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label
                  htmlFor="menu-input-title"
                  style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}
                >
                  Menu Title <span style={{ color: '#f43f5e' }}>*</span>
                </label>
                <input
                  id="menu-input-title"
                  type="text"
                  placeholder="e.g. Sales Invoices"
                  value={formData.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  onBlur={() => handleFieldBlur('title')}
                  className={`input-field ${fieldErrors.title && touched.title ? 'has-error' : ''}`}
                  aria-invalid={Boolean(fieldErrors.title && touched.title)}
                  aria-describedby={fieldErrors.title && touched.title ? 'menu-error-title' : undefined}
                />
                {fieldErrors.title && touched.title && (
                  <div id="menu-error-title" className="field-error-text" role="alert">
                    <AlertCircle size={13} style={{ flexShrink: 0 }} />
                    <span>{fieldErrors.title}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                <div style={{ minWidth: 0 }}>
                  <label
                    style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}
                  >
                    System Code <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)' }}>(Auto-generated by API • Read-Only)</span>
                  </label>
                  <div
                    style={{
                      height: '42px',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 0.85rem',
                      background: 'var(--bg-card)',
                      border: '1px dashed var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: formData.title ? 'var(--color-primary-light, #38bdf8)' : 'var(--text-muted)',
                      letterSpacing: '0.05em',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                    }}
                  >
                    {formData.code || generateMenuCode(formData.title) || 'auto_menu_code'}
                  </div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <label
                    htmlFor="menu-input-path"
                    style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}
                  >
                    Destination Path
                  </label>
                  <input
                    id="menu-input-path"
                    type="text"
                    placeholder="e.g. /invoices or empty"
                    value={formData.path}
                    onChange={(e) => handleFieldChange('path', e.target.value)}
                    onBlur={() => handleFieldBlur('path')}
                    className={`input-field ${fieldErrors.path && touched.path ? 'has-error' : ''}`}
                    aria-invalid={Boolean(fieldErrors.path && touched.path)}
                    aria-describedby={fieldErrors.path && touched.path ? 'menu-error-path' : undefined}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                  {fieldErrors.path && touched.path && (
                    <div id="menu-error-path" className="field-error-text" role="alert">
                      <AlertCircle size={13} style={{ flexShrink: 0 }} />
                      <span>{fieldErrors.path}</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                <div style={{ minWidth: 0 }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Parent Category
                  </label>
                  <SearchableSelect
                    options={[
                      {
                        value: '',
                        label: 'None (Top-Level Root Item)',
                        sublabel: 'Creates a main navigation group',
                        icon: <Layers size={15} />,
                      },
                      ...flatList
                        .filter((item) => (modalMode === 'edit' && selectedMenu ? item.id !== selectedMenu.id : true))
                        .map((item): SelectOption => ({
                          value: String(item.id),
                          label: item.title,
                          sublabel: `(${item.code})`,
                          icon: <FolderTree size={15} />,
                          badge: item.is_active ? 'Active' : 'Disabled',
                          badgeVariant: item.is_active ? 'success' : 'danger',
                        })),
                    ]}
                    value={formData.parent_id}
                    onChange={(val) => setFormData((prev) => ({ ...prev, parent_id: val }))}
                    placeholder="Select parent category..."
                    searchPlaceholder="Search categories by title or code..."
                  />
                </div>

                <div style={{ minWidth: 0 }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Sort Order No
                  </label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                    className="input-field"
                    style={{ height: '42px', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Icon Identifier
                </label>
                <SearchableSelect
                  options={[
                    { value: 'layers', label: 'Default (Layers)', sublabel: 'Standard module stack', icon: <Layers size={16} /> },
                    { value: 'building', label: 'Organizations / Accounts', sublabel: 'Corporate client entities', icon: <Building2 size={16} /> },
                    { value: 'users', label: 'Users & Teams', sublabel: 'Staff and member directories', icon: <Users size={16} /> },
                    { value: 'shield', label: 'RBAC / Security', sublabel: 'Access control and roles', icon: <Shield size={16} /> },
                    { value: 'chart', label: 'Analytics / Reports', sublabel: 'Metrics and executive charts', icon: <BarChart3 size={16} /> },
                    { value: 'wallet', label: 'Finances / Cash Flow', sublabel: 'Corporate treasury and cash', icon: <Wallet size={16} /> },
                    { value: 'receipt', label: 'Billing / Invoices', sublabel: 'Accounts receivable and invoices', icon: <Receipt size={16} /> },
                    { value: 'settings', label: 'Configuration / Settings', sublabel: 'Platform configuration', icon: <Settings size={16} /> },
                  ]}
                  value={formData.icon}
                  onChange={(val) => setFormData((prev) => ({ ...prev, icon: val }))}
                  placeholder="Select an icon..."
                  searchPlaceholder="Search icons by name or module..."
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <input
                  type="checkbox"
                  id="is_active_toggle"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
                <label htmlFor="is_active_toggle" style={{ fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  Active and visible in role navigation
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <input
                  type="checkbox"
                  id="show_in_header_toggle"
                  checked={formData.show_in_header}
                  onChange={(e) => setFormData({ ...formData, show_in_header: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
                <label htmlFor="show_in_header_toggle" style={{ fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  Show in Top Header Navigation bar
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                  {isSubmitting ? (
                    <>
                      <Loader2 size={15} className="loading-spinner" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{modalMode === 'create' ? 'Create Menu' : 'Update Menu'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal Dialog */}
      <ConfirmationModal
        isOpen={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={handleDeleteMenu}
        title={isHardDelete ? "Purge Menu Item?" : "Deactivate Menu Item?"}
        subtitle={isHardDelete ? "This action permanently purges the navigation item from the database." : "This will deactivate the navigation item."}
        message={
          deleteCandidate ? (
            isHardDelete ? (
              <>
                Are you sure you want to <strong>permanently purge</strong> <strong>{deleteCandidate.title}</strong>? Any nested child navigation items or access assignments will also be deleted. This action <strong>cannot be undone</strong>.
              </>
            ) : (
              <>
                Are you sure you want to deactivate <strong>{deleteCandidate.title}</strong>? It can be restored back to active state or permanently purged later.
              </>
            )
          ) : null
        }
        confirmLabel={isHardDelete ? "Purge Menu Item" : "Deactivate Menu"}
        variant="danger"
        isLoading={isSubmitting}
      />

      {/* Restore Confirmation Modal Dialog */}
      <ConfirmationModal
        isOpen={!!restoreCandidate}
        onClose={() => setRestoreCandidate(null)}
        onConfirm={handleConfirmRestore}
        title="Restore Menu Item?"
        subtitle="This action reactivates the navigation item."
        message={
          restoreCandidate ? (
            <>
              Are you sure you want to restore <strong>{restoreCandidate.title}</strong>? It will become active and available in role navigation layouts.
            </>
          ) : null
        }
        confirmLabel="Confirm Restore"
        variant="primary"
        isLoading={isRestoring}
      />

      {/* Bulk Delete Confirmation Modal Dialog */}
      <ConfirmationModal
        isOpen={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        title={
          bulkHardDeleteRequested
            ? `Purge ${selectedIds.size} Selected Menu(s)?`
            : `Soft Delete ${selectedIds.size} Selected Menu(s)?`
        }
        subtitle={`${selectedIds.size} items selected`}
        message={
          <div>
            <p>
              Are you sure you want to delete the {selectedIds.size} selected menu item(s)?
            </p>
            {canHardDelete && (
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="bulk_menu_hard_delete_check"
                  checked={bulkHardDeleteRequested}
                  onChange={(e) => setBulkHardDeleteRequested(e.target.checked)}
                />
                <label htmlFor="bulk_menu_hard_delete_check" style={{ fontSize: '0.82rem', color: 'var(--danger)', fontWeight: 600 }}>
                  Purge records immediately (Bypass Trash)
                </label>
              </div>
            )}
          </div>
        }
        confirmLabel={
          bulkHardDeleteRequested
            ? `Purge (${selectedIds.size})`
            : `Soft Delete (${selectedIds.size})`
        }
        variant="danger"
        isLoading={isBulkDeleting}
      />

      {/* Bulk Restore Confirmation Modal Dialog */}
      <ConfirmationModal
        isOpen={bulkRestoreConfirmOpen}
        onClose={() => setBulkRestoreConfirmOpen(false)}
        onConfirm={handleBulkRestore}
        title={`Restore ${selectedIds.size} Selected Menu(s)?`}
        subtitle={`${selectedIds.size} items selected`}
        message={
          <p>
            Are you sure you want to restore the {selectedIds.size} selected menu item(s)? They will be reactivated and available in navigation layouts.
          </p>
        }
        confirmLabel={`Restore ${selectedIds.size} Menus`}
        variant="primary"
        isLoading={isBulkRestoring}
      />
    </div>
  );
}
