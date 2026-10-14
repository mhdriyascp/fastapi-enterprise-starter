'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '@/lib/api-client';
import { MenuItem, MenuCreateInput, MenuUpdateInput } from '@/lib/types';
import { useMenus } from '@/hooks/use-menus';
import { useToast } from '@/lib/toast-context';
import { generateMenuCode } from '@/lib/code-generator';
import { SearchableSelect, SelectOption } from '@/components/ui/searchable-select';
import {
  Plus,
  Edit2,
  Trash2,
  Route,
  RefreshCw,
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
  Copy,
  Check,
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
  const { refreshMenus: refreshSidebarMenus } = useMenus();
  const { toast } = useToast();
  const [menuTree, setMenuTree] = useState<MenuItem[]>([]);
  const [flatList, setFlatList] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');
  const [search, setSearch] = useState<string>('');

  // Modal States
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [viewingMenu, setViewingMenu] = useState<MenuItem | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [deleteCandidate, setDeleteCandidate] = useState<MenuItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState<{
    title: string;
    code: string;
    path: string;
    icon: string;
    sort_order: number;
    parent_id: string;
    is_active: boolean;
  }>({
    title: '',
    code: '',
    path: '',
    icon: 'layers',
    sort_order: 10,
    parent_id: '',
    is_active: true,
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleCopyId = (id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
      toast.info('Menu ID copied to clipboard');
    }
  };

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
    if (!search.trim()) return flatList;
    const q = search.toLowerCase();
    return flatList.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        (m.path && m.path.toLowerCase().includes(q)) ||
        (m.route && m.route.toLowerCase().includes(q))
    );
  }, [flatList, search]);

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
      if (field === 'title' && modalMode === 'create' && typeof value === 'string') {
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

  function openCreateModal(parentId: string = '') {
    setFormData({
      title: '',
      code: '',
      path: '',
      icon: 'layers',
      sort_order: 10,
      parent_id: parentId,
      is_active: true,
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
      parent_id: menu.parent_id || '',
      is_active: menu.is_active,
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

  async function handleDeleteMenu() {
    if (!deleteCandidate) return;
    setIsSubmitting(true);

    try {
      await apiFetch(`/menus/${deleteCandidate.id}`, {
        method: 'DELETE',
      });

      toast.success(`Menu "${deleteCandidate.title}" deleted.`);
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

            {/* Delete Button */}
            <button
              type="button"
              onClick={() => setDeleteCandidate(item)}
              className="btn btn-danger"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
              title="Delete menu"
            >
              <Trash2 size={13} />
            </button>
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
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            RBAC Navigation Menus
          </h2>
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

          <button onClick={() => openCreateModal()} className="btn btn-primary">
            <Plus size={15} />
            <span>Add Menu Item</span>
          </button>
        </div>
      </div>

      {/* Search Filter Toolbar */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Search menus by title, code, or path..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
          style={{ paddingLeft: '2.5rem', fontSize: '0.85rem', height: '38px' }}
        />
      </div>

      {/* Main View Container */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="skeleton" style={{ height: '64px', width: '100%' }} />
          <div className="skeleton" style={{ height: '64px', width: '100%' }} />
          <div className="skeleton" style={{ height: '64px', width: '100%' }} />
        </div>
      ) : viewMode === 'table' ? (
        /* High-Density Data Table View (Default) */
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Menu Title</th>
                <th>System Code</th>
                <th>Destination Path</th>
                <th>Sort Order</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFlatList.length > 0 ? (
                filteredFlatList.map((item) => (
                  <tr key={item.id}>
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
                      <span className={`badge ${item.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {item.is_active ? 'Active' : 'Disabled'}
                      </span>
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
                        <button
                          type="button"
                          onClick={() => setDeleteCandidate(item)}
                          className="btn btn-danger"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No matching menu items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 100,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingMenu(null);
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '620px',
              padding: '2rem',
              boxShadow: 'var(--shadow-lg)',
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

            {/* Structured Details Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Navigation Route & Hierarchy */}
              <div
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '1.2rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Navigation Route & Hierarchy
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Destination Path</span>
                    {viewingMenu.path || viewingMenu.route ? (
                      <code style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', display: 'block', marginTop: '0.25rem' }}>
                        {viewingMenu.path || viewingMenu.route}
                      </code>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Folder group (no route)</span>
                    )}
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Parent Navigation Item</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginTop: '0.25rem' }}>
                      {viewingMenu.parent_id
                        ? flatList.find((p) => p.id === viewingMenu.parent_id)?.title || 'Parent Menu'
                        : 'Root / Top-Level Item'}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Display Sort Order</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                      {viewingMenu.sort_order ?? viewingMenu.order_no ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* System Identifiers */}
              <div
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '1.2rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  System Identifiers & State
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Unique Code</span>
                    <span className="badge badge-neutral" style={{ fontFamily: 'monospace', marginTop: '0.25rem' }}>
                      {viewingMenu.code}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Visibility</span>
                    <span style={{ fontWeight: 600, color: viewingMenu.is_active ? '#22c55e' : '#ef4444', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                      {viewingMenu.is_active ? 'Visible in sidebar' : 'Hidden / Disabled'}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Menu Item ID</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                      <code style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {viewingMenu.id}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopyId(viewingMenu.id)}
                        className="btn btn-secondary"
                        style={{ padding: '0.2rem 0.4rem', height: '22px' }}
                        title="Copy UUID"
                      >
                        {copiedId ? <Check size={11} color="#22c55e" /> : <Copy size={11} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 100,
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '2rem',
              boxShadow: 'var(--shadow-lg)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
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
                }}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label
                    style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}
                  >
                    System Code <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)' }}>(Auto-generated)</span>
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
                    }}
                  >
                    {modalMode === 'edit'
                      ? (selectedMenu?.code || 'SYSTEM_RECORD')
                      : (formData.code || generateMenuCode(formData.title) || 'auto_menu_code')}
                  </div>
                </div>
                <div>
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
                  />
                  {fieldErrors.path && touched.path && (
                    <div id="menu-error-path" className="field-error-text" role="alert">
                      <AlertCircle size={13} style={{ flexShrink: 0 }} />
                      <span>{fieldErrors.path}</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', position: 'relative', zIndex: 25 }}>
                <div style={{ position: 'relative', zIndex: 26 }}>
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
                          value: item.id,
                          label: item.title,
                          sublabel: `(${item.code})`,
                          icon: <FolderTree size={15} />,
                          badge: item.is_active ? 'Active' : 'Disabled',
                          badgeVariant: item.is_active ? 'success' : 'neutral',
                        })),
                    ]}
                    value={formData.parent_id}
                    onChange={(val) => setFormData((prev) => ({ ...prev, parent_id: val }))}
                    placeholder="Select parent category..."
                    searchPlaceholder="Search categories by title or code..."
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Sort Order No
                  </label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                    className="input-field"
                    style={{ height: '42px' }}
                  />
                </div>
              </div>

              <div style={{ position: 'relative', zIndex: 20 }}>
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

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
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
      {deleteCandidate && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 100,
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '440px',
              padding: '2rem',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#f43f5e' }}>
              <AlertCircle size={24} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Delete Menu Item?
              </h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Are you sure you want to permanently delete <strong>{deleteCandidate.title}</strong>? Any nested child navigation items or access assignments will also be deleted.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="btn btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteMenu}
                disabled={isSubmitting}
                className="btn btn-danger"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="loading-spinner" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Confirm Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
