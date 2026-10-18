'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Bell,
  Search,
  Eye,
  CheckCircle2,
  DollarSign,
  Shield,
  Building2,
  ExternalLink,
  X,
  Loader2,
  CheckCheck,
  Trash2,
  RefreshCw,
  Radio,
  PlusCircle,
  Database,
  Sliders,
  Menu,
  History,
  User,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { NotificationItem, PagedResponse } from '@/lib/types';
import { useToast } from '@/lib/toast-context';
import { useAuth } from '@/lib/auth-context';
import { formatDateTime, formatRelativeTime } from '@/lib/date-utils';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { FormattedDate } from '@/components/ui/formatted-date';
import { useDefaultPageSize } from '@/lib/use-page-size';

export default function NotificationsPage() {
  const { toast } = useToast();
  const { user, hasPermission } = useAuth();
  const canDelete = Boolean(hasPermission('notification.delete') || hasPermission('notification.manage') || user?.is_super_admin);
  const canCreate = Boolean(hasPermission('notification.create') || hasPermission('notification.manage') || user?.is_super_admin);
  const canUpdate = Boolean(hasPermission('notification.update') || hasPermission('notification.manage') || user?.is_super_admin);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [availableModules, setAvailableModules] = useState<string[]>([
    'organizations',
    'masters',
    'rbac',
    'users',
    'settings',
    'menus',
    'activity_logs',
    'security',
    'system',
    'deal',
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDismissing, setIsDismissing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [pageSize] = useDefaultPageSize(15);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [viewingNotification, setViewingNotification] = useState<NotificationItem | null>(null);
  const [clearAllConfirmOpen, setClearAllConfirmOpen] = useState<boolean>(false);
  const [deleteCandidateNotification, setDeleteCandidateNotification] = useState<NotificationItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState<boolean>(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);

  // Create Notification Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newMessage, setNewMessage] = useState<string>('');
  const [newType, setNewType] = useState<string>('organizations');
  const [customType, setCustomType] = useState<string>('');
  const [newLink, setNewLink] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    apiFetch<string[]>('/notifications/modules')
      .then((mods) => {
        if (isMounted && Array.isArray(mods) && mods.length > 0) {
          setAvailableModules(mods);
          setNewType((prev) => (mods.includes(prev) ? prev : mods[0]));
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const refreshNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await apiFetch<PagedResponse<NotificationItem>>('/notifications?page=1&page_size=100');
      setNotifications(res.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load notifications';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadInitial = async () => {
      try {
        const res = await apiFetch<PagedResponse<NotificationItem>>('/notifications?page=1&page_size=100');
        if (isMounted) {
          setNotifications(res.items || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to load notifications';
          toast.error(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadInitial();
    return () => {
      isMounted = false;
    };
  }, [toast]);

  const handleMarkAllRead = async () => {
    if (!canUpdate) {
      toast.error('You do not have permission to update notifications.');
      return;
    }
    try {
      await apiFetch<{ updated: number }>('/notifications/mark-all-read', {
        method: 'POST',
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all notifications as read');
    }
  };

  const handleToggleRead = async (id: number | string, currentIsRead: boolean) => {
    if (!canUpdate) {
      toast.error('You do not have permission to update notifications.');
      return;
    }
    const nextStatus = !currentIsRead;
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, is_read: nextStatus, read_at: nextStatus ? new Date().toISOString() : null } : n
      )
    );
    if (viewingNotification && viewingNotification.id === id) {
      setViewingNotification((prev) =>
        prev ? { ...prev, is_read: nextStatus, read_at: nextStatus ? new Date().toISOString() : null } : null
      );
    }

    try {
      await apiFetch<NotificationItem>(`/notifications/${id}/read`, {
        method: 'PATCH',
        body: JSON.stringify({ is_read: nextStatus }),
      });
      toast.success(nextStatus ? 'Marked as read' : 'Marked as unread');
    } catch {
      // Revert on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: currentIsRead } : n))
      );
      if (viewingNotification && viewingNotification.id === id) {
        setViewingNotification((prev) =>
          prev ? { ...prev, is_read: currentIsRead } : null
        );
      }
      toast.error('Failed to update notification status');
    }
  };

  const handleClearAll = () => {
    if (!canDelete) {
      toast.error('You do not have permission to delete notifications.');
      return;
    }
    setClearAllConfirmOpen(true);
  };

  const confirmClearAll = async () => {
    setIsDismissing(true);
    try {
      await apiFetch<{ deleted: number }>('/notifications/clear-all', {
        method: 'DELETE',
      });
      setNotifications([]);
      setClearAllConfirmOpen(false);
      toast.success('All notifications cleared successfully');
    } catch {
      toast.error('Failed to clear notifications');
    } finally {
      setIsDismissing(false);
    }
  };

  const promptDeleteSingle = (notification: NotificationItem) => {
    if (!canDelete) {
      toast.error('You do not have permission to delete notifications.');
      return;
    }
    setDeleteCandidateNotification(notification);
  };

  const confirmDeleteSingle = async () => {
    if (!deleteCandidateNotification) return;
    setIsDismissing(true);
    try {
      await apiFetch(`/notifications/${deleteCandidateNotification.id}`, {
        method: 'DELETE',
      });
      setNotifications((prev) => prev.filter((n) => n.id !== deleteCandidateNotification.id));
      if (viewingNotification && viewingNotification.id === deleteCandidateNotification.id) {
        setViewingNotification(null);
      }
      toast.success('Notification dismissed');
      setDeleteCandidateNotification(null);
    } catch {
      toast.error('Failed to dismiss notification');
    } finally {
      setIsDismissing(false);
    }
  };

  const handleToggleSelectAll = (items: NotificationItem[]) => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((n) => n.id)));
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

    for (const notifId of selectedIds) {
      try {
        await apiFetch(`/notifications/${notifId}`, {
          method: 'DELETE',
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully deleted ${successCount} notification(s).`);
    }
    if (failCount > 0) {
      toast.error(`Failed to delete ${failCount} notification(s).`);
    }

    setSelectedIds(new Set());
    setBulkDeleteConfirmOpen(false);
    setIsBulkDeleting(false);
    await refreshNotifications();
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter((n) => !n.is_read).length;
    const security = notifications.filter((n) => n.type === 'security').length;
    const commercial = notifications.filter((n) => n.type === 'deal').length;
    return { total, unread, security, commercial };
  }, [notifications]);

  const notificationCounts = useMemo(() => {
    return {
      all: notifications.length,
      unread: notifications.filter((n) => !n.is_read).length,
      read: notifications.filter((n) => n.is_read).length,
    };
  }, [notifications]);

  // Filtering
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // Type filter
      if (selectedType !== 'all' && item.type !== selectedType) return false;
      // Status filter
      if (statusFilter === 'unread' && item.is_read) return false;
      if (statusFilter === 'read' && !item.is_read) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = item.title.toLowerCase().includes(q);
        const inMessage = item.message.toLowerCase().includes(q);
        const inLink = item.link?.toLowerCase().includes(q) || false;
        return inTitle || inMessage || inLink;
      }
      return true;
    });
  }, [notifications, selectedType, statusFilter, searchQuery]);

  const totalRecords = stats.total;
  const filteredCount = filteredNotifications.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedNotifications = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredNotifications.slice(start, start + pageSize);
  }, [filteredNotifications, safeCurrentPage, pageSize]);

  function formatModuleLabel(type: string): string {
    const clean = type.toLowerCase();
    const map: Record<string, string> = {
      organizations: 'Organizations',
      masters: 'Master Data',
      rbac: 'Access Control',
      users: 'Users & Teams',
      settings: 'System Settings',
      menus: 'Menu Architecture',
      activity_logs: 'System Activity',
      security: 'Security & Auth',
      system: 'System Maintenance',
      deal: 'Commercial Deals',
      tenant: 'Tenant Partition',
    };
    return map[clean] || clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  function getNotificationIcon(type: string) {
    const clean = type.toLowerCase();
    if (clean === 'organizations') return <Building2 size={16} color="#3b82f6" />;
    if (clean === 'masters') return <Database size={16} color="#8b5cf6" />;
    if (clean === 'rbac' || clean === 'security') return <Shield size={16} color="#f59e0b" />;
    if (clean === 'users') return <User size={16} color="#06b6d4" />;
    if (clean === 'settings') return <Sliders size={16} color="#6366f1" />;
    if (clean === 'menus') return <Menu size={16} color="#ec4899" />;
    if (clean === 'activity_logs') return <History size={16} color="#f97316" />;
    if (clean === 'deal' || clean === 'deals') return <DollarSign size={16} color="#10b981" />;
    if (clean === 'tenant') return <Building2 size={16} color="#818cf8" />;
    return <CheckCircle2 size={16} color="#38bdf8" />;
  }

  function getTypeBadge(type: string) {
    const clean = type.toLowerCase();
    const label = formatModuleLabel(clean);
    let badgeClass = 'badge badge-neutral';
    if (clean === 'deal' || clean === 'deals') badgeClass = 'badge badge-success';
    else if (clean === 'security' || clean === 'rbac') badgeClass = 'badge badge-warning';
    else if (clean === 'organizations' || clean === 'tenant') badgeClass = 'badge badge-primary';
    else if (clean === 'users' || clean === 'activity_logs') badgeClass = 'badge badge-info';
    return <span className={badgeClass}>{label}</span>;
  }

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) {
      toast.error('Title and message are required.');
      return;
    }
    const finalModule = newType === '__custom__' ? (customType.trim() || 'system') : newType;
    setIsSubmitting(true);
    try {
      const created = await apiFetch<NotificationItem>('/notifications', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle.trim(),
          message: newMessage.trim(),
          type: finalModule.toLowerCase(),
          link: newLink.trim() || null,
        }),
      });
      setNotifications((prev) => [created, ...prev]);
      toast.success(`Notification for ${finalModule} dispatched successfully`);
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewMessage('');
      setNewType('organizations');
      setCustomType('');
      setNewLink('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to dispatch notification';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-glow)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={18} />
            </span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Notifications &amp; Activity Stream
            </h1>
            <span className="badge badge-neutral" style={{ fontWeight: 600, fontSize: '0.75rem' }}>
              {filteredCount === totalRecords ? `${totalRecords} Total Alerts` : `${filteredCount} of ${totalRecords} Alerts`}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Live platform audit stream, security advisories, commercial deals, and system broadcast notifications.
          </p>
        </div>

        {/* Global Toolbar Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {canCreate && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary"
              title="Dispatch / Create Alert"
            >
              <PlusCircle size={15} />
              <span>Dispatch Alert</span>
            </button>
          )}
          <button
            type="button"
            onClick={refreshNotifications}
            className="btn btn-secondary"
            title="Refresh Notification Stream"
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          {stats.unread > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="btn btn-secondary"
              title="Mark all notifications as read"
            >
              <CheckCheck size={15} color="var(--accent-primary)" />
              <span>Mark All Read</span>
            </button>
          )}
          {selectedIds.size > 0 && canDelete && (
            <button
              type="button"
              onClick={() => setBulkDeleteConfirmOpen(true)}
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
          )}
          {notifications.length > 0 && canDelete && (
            <button
              type="button"
              onClick={handleClearAll}
              className="btn btn-danger"
              title="Clear all visible notifications"
            >
              <Trash2 size={14} />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
        }}
      >
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Event Alerts
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.4rem' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Across all operational categories
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Unread Notices
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: stats.unread > 0 ? '#f43f5e' : 'var(--text-primary)', marginTop: '0.4rem' }}>
            {stats.unread}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            {stats.unread > 0 ? 'Requires operator review' : 'All notices reviewed'}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Security Advisories
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.4rem' }}>
            {stats.security}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            RBAC and access policy alerts
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Commercial Updates
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', marginTop: '0.4rem' }}>
            {stats.commercial}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            ARR contract and billing events
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '420px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search notifications by title, content or URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '2.4rem', height: '40px', fontSize: '0.875rem' }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '0.75rem',
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

        {/* Dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Taxonomy Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="select-field"
            style={{ height: '40px', fontSize: '0.85rem' }}
          >
            <option value="all">All Modules &amp; Classifications</option>
            {availableModules.map((mod) => (
              <option key={mod} value={mod}>
                {formatModuleLabel(mod)}
              </option>
            ))}
          </select>

          {/* Status Segmented Buttons */}
          <div
            style={{
              display: 'inline-flex',
              padding: '2px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {(['all', 'unread', 'read'] as const).map((s) => {
              const count = notificationCounts[s];
              return (
                <button
                  key={s}
                  id={`btn-filter-status-${s}`}
                  type="button"
                  onClick={() => {
                    setStatusFilter(s);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    border: 'none',
                    borderRadius: 'calc(var(--radius-md) - 2px)',
                    background: statusFilter === s ? 'var(--accent-primary)' : 'transparent',
                    color: statusFilter === s ? '#ffffff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span>{s}</span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      opacity: 0.85,
                      padding: '0 4px',
                      borderRadius: '4px',
                      background: statusFilter === s ? 'rgba(255,255,255,0.2)' : 'var(--bg-card)',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Notifications Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '45px', textAlign: 'center' }}>#</th>
              <th style={{ width: '38px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredNotifications.length && filteredNotifications.length > 0}
                  onChange={() => handleToggleSelectAll(filteredNotifications)}
                  aria-label="Select all notifications"
                />
              </th>
              <th style={{ width: '14%' }}>Classification</th>
              <th style={{ width: '34%' }}>Title &amp; Message Summary</th>
              <th style={{ width: '15%' }}>Audience</th>
              <th style={{ width: '11%' }}>Status</th>
              <th style={{ width: '11%' }}>Created</th>
              <th style={{ width: '8%', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Loading platform notification stream...</span>
                  </div>
                </td>
              </tr>
            ) : filteredNotifications.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <Bell size={28} style={{ opacity: 0.35 }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      No notifications match your current filters.
                    </span>
                    <span style={{ fontSize: '0.8rem' }}>
                      Try adjusting your search query, status, or category selection.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedNotifications.map((n, index) => (
                <tr
                  key={n.id}
                  style={{
                    background: selectedIds.has(n.id) ? 'var(--accent-subtle)' : (!n.is_read ? 'var(--accent-glow)' : undefined),
                    cursor: 'pointer',
                  }}
                  onClick={() => setViewingNotification(n)}
                >
                  <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                    {(safeCurrentPage - 1) * pageSize + index + 1}
                  </td>
                  <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(n.id)}
                      onChange={() => handleToggleSelect(n.id)}
                      aria-label={`Select notification ${n.title}`}
                    />
                  </td>
                  {/* Taxonomy */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {getNotificationIcon(n.type)}
                      </span>
                      {getTypeBadge(n.type)}
                    </div>
                  </td>

                  {/* Title & Preview */}
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {n.title}
                      {n.link && <ExternalLink size={12} color="var(--text-muted)" />}
                    </div>
                    <div
                      style={{
                        fontSize: '0.785rem',
                        color: 'var(--text-secondary)',
                        marginTop: '0.2rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '480px',
                      }}
                    >
                      {n.message}
                    </div>
                  </td>

                  {/* Audience */}
                  <td>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Radio size={12} color="var(--accent-primary)" />
                      {n.user_id ? 'Targeted Operator' : 'System Broadcast'}
                    </span>
                  </td>

                  {/* Status */}
                  <td>
                    {n.is_read ? (
                      <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                        Read
                      </span>
                    ) : (
                      <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                        Unread
                      </span>
                    )}
                  </td>

                  {/* Timestamp */}
                  <td>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }} title={formatDateTime(n.created_at)}>
                      {formatRelativeTime(n.created_at)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      {canUpdate && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleRead(n.id, n.is_read);
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', gap: '0.35rem' }}
                          title={n.is_read ? 'Mark as Unread' : 'Mark as Read'}
                        >
                          <CheckCheck size={13} color={n.is_read ? 'var(--text-muted)' : 'var(--accent-primary)'} />
                          <span>{n.is_read ? 'Unread' : 'Read'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingNotification(n);
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', gap: '0.35rem' }}
                        title="View Detailed Specification"
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            promptDeleteSingle(n);
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem', color: '#f43f5e' }}
                          title="Dismiss notification"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Notifications Pagination Footer */}
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
            <strong>{Math.min(safeCurrentPage * pageSize, filteredCount)}</strong> of <strong>{filteredCount}</strong> alerts
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

      {/* Formatted Key-Value Detail Specification Modal */}
      {viewingNotification && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingNotification(null);
          }}
        >
          <div
            className="modal-dialog glass-panel"
            style={{
              maxWidth: '640px',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                paddingBottom: '1rem',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {getNotificationIcon(viewingNotification.type)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      {viewingNotification.title}
                    </h3>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Dispatched {formatDateTime(viewingNotification.created_at)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingNotification(null)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem', borderRadius: '50%', width: '32px', height: '32px' }}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Section 1: Overview Specification Table */}
            <div>
              <div className="detail-table-section-title">
                <Shield size={14} color="var(--accent-primary)" />
                <span>Event Specification</span>
              </div>
              <table className="detail-spec-table">
                <tbody>
                  <tr>
                    <th>Taxonomy Classification</th>
                    <td>{getTypeBadge(viewingNotification.type)}</td>
                  </tr>
                  <tr>
                    <th>Read Status</th>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span className={`badge ${viewingNotification.is_read ? 'badge-neutral' : 'badge-primary'}`}>
                          {viewingNotification.is_read ? 'Acknowledged (Read)' : 'Unread'}
                        </span>
                        {viewingNotification.read_at && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            at {formatDateTime(viewingNotification.read_at)}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <th>Target Audience</th>
                    <td>
                      {viewingNotification.user_id ? (
                        <span style={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                          Operator: {viewingNotification.user_id}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                          Global Broadcast (All Authenticated Operators)
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section 2: Detailed Content Body */}
            <div>
              <div className="detail-table-section-title">
                <Bell size={14} color="var(--accent-primary)" />
                <span>Content Payload &amp; Message</span>
              </div>
              <table className="detail-spec-table">
                <tbody>
                  <tr>
                    <th>Full Message</th>
                    <td style={{ lineHeight: 1.55, fontSize: '0.85rem' }}>
                      {viewingNotification.message}
                    </td>
                  </tr>
                  {viewingNotification.link && (
                    <tr>
                      <th>Action Destination</th>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <code style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {viewingNotification.link}
                          </code>
                          <Link
                            href={viewingNotification.link}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                            onClick={() => setViewingNotification(null)}
                          >
                            <ExternalLink size={12} />
                            <span>Navigate</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Section 3: Audit Identifiers */}
            <div>
              <div className="detail-table-section-title">
                <CheckCircle2 size={14} color="var(--accent-primary)" />
                <span>Audit &amp; System Identifiers</span>
              </div>
              <table className="detail-spec-table">
                <tbody>
                  <tr>
                    <th>Created Timestamp</th>
                    <td style={{ fontSize: '0.785rem', color: 'var(--text-secondary)' }}>
                      <FormattedDate value={viewingNotification.created_at} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {canUpdate && (
                  <button
                    type="button"
                    onClick={() => handleToggleRead(viewingNotification.id, viewingNotification.is_read)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8125rem', gap: '0.35rem' }}
                  >
                    <CheckCheck size={14} color={viewingNotification.is_read ? 'var(--text-muted)' : 'var(--accent-primary)'} />
                    <span>{viewingNotification.is_read ? 'Mark as Unread' : 'Mark as Read'}</span>
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => promptDeleteSingle(viewingNotification)}
                    className="btn btn-danger"
                    style={{ fontSize: '0.8125rem', gap: '0.35rem' }}
                  >
                    <Trash2 size={14} />
                    <span>Dismiss Notification</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setViewingNotification(null)}
                className="btn btn-secondary"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      <ConfirmationModal
        isOpen={clearAllConfirmOpen}
        onClose={() => setClearAllConfirmOpen(false)}
        onConfirm={confirmClearAll}
        isLoading={isDismissing}
        title="Dismiss All Notifications?"
        subtitle="This action will permanently remove all notifications."
        message="Are you sure you want to dismiss all visible notifications? Once cleared, these records cannot be recovered."
        confirmLabel="Dismiss All"
        variant="danger"
      />

      {/* Single Notification Dismissal Modal */}
      <ConfirmationModal
        isOpen={Boolean(deleteCandidateNotification)}
        onClose={() => setDeleteCandidateNotification(null)}
        onConfirm={confirmDeleteSingle}
        isLoading={isDismissing}
        title="Dismiss Notification?"
        subtitle="Remove this notification from your operational inbox."
        message={
          <span>
            Are you sure you want to dismiss notification{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              &ldquo;{deleteCandidateNotification?.title}&rdquo;
            </strong>
            ?
          </span>
        }
        confirmLabel="Dismiss"
        variant="danger"
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        isLoading={isBulkDeleting}
        title={`Dismiss ${selectedIds.size} Selected Notifications?`}
        subtitle="This action will remove the selected notifications from your inbox."
        message={`Are you sure you want to dismiss the ${selectedIds.size} selected notifications? Once cleared, these records cannot be recovered.`}
        confirmLabel={`Dismiss ${selectedIds.size} Notifications`}
        variant="danger"
      />

      {/* Dispatch / Create Notification Modal */}
      {isCreateModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setIsCreateModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 520,
              width: '100%',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-glow)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--accent-glow)',
                    color: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PlusCircle size={18} />
                </span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Dispatch System Notification
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNotification} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Target Domain Module *
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="select-field"
                  style={{ width: '100%', height: '40px', fontSize: '0.875rem' }}
                >
                  {availableModules.map((mod) => (
                    <option key={mod} value={mod}>
                      {formatModuleLabel(mod)} ({mod})
                    </option>
                  ))}
                  <option value="__custom__">+ Other / Custom Module...</option>
                </select>
              </div>

              {newType === '__custom__' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Custom Module Key *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. leads, invoices, subscriptions"
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', height: '40px', fontSize: '0.875rem' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Notification Subject / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. New Enterprise Account Registered"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', height: '40px', fontSize: '0.875rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Message Content *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detailed notification explanation..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', padding: '0.65rem', fontSize: '0.875rem', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Destination Link URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. /organizations or /settings"
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', height: '40px', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  <span>Dispatch Alert</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
