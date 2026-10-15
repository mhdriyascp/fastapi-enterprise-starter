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
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { NotificationItem, PagedResponse } from '@/lib/types';
import { useToast } from '@/lib/toast-context';

function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    const now = new Date();
    const date = new Date(dateStr);
    const diffSecs = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
    if (diffSecs < 60) return 'Just now';
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return 'Recently';
  }
}

export default function NotificationsPage() {
  const { toast } = useToast();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [viewingNotification, setViewingNotification] = useState<NotificationItem | null>(null);

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

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to dismiss all visible notifications?')) return;
    try {
      await apiFetch<{ deleted: number }>('/notifications/clear-all', {
        method: 'DELETE',
      });
      setNotifications([]);
      toast.success('All notifications cleared successfully');
    } catch {
      toast.error('Failed to clear notifications');
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter((n) => !n.is_read).length;
    const security = notifications.filter((n) => n.type === 'security').length;
    const commercial = notifications.filter((n) => n.type === 'deal').length;
    return { total, unread, security, commercial };
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

  function getNotificationIcon(type: NotificationItem['type']) {
    switch (type) {
      case 'deal':
        return <DollarSign size={16} color="#10b981" />;
      case 'security':
        return <Shield size={16} color="#f59e0b" />;
      case 'tenant':
        return <Building2 size={16} color="#818cf8" />;
      case 'system':
      default:
        return <CheckCircle2 size={16} color="#38bdf8" />;
    }
  }

  function getTypeBadge(type: NotificationItem['type']) {
    switch (type) {
      case 'deal':
        return <span className="badge badge-success">Deal / ARR</span>;
      case 'security':
        return <span className="badge badge-warning">Security &amp; RBAC</span>;
      case 'tenant':
        return <span className="badge badge-primary">Tenant Partition</span>;
      case 'system':
      default:
        return <span className="badge badge-neutral">System Maintenance</span>;
    }
  }

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
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Live platform audit stream, security advisories, commercial deals, and system broadcast notifications.
          </p>
        </div>

        {/* Global Toolbar Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
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
          {notifications.length > 0 && (
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
            <option value="all">All Classifications</option>
            <option value="deal">Commercial Deals (ARR)</option>
            <option value="security">Security &amp; RBAC</option>
            <option value="tenant">Tenant Partitions</option>
            <option value="system">System Maintenance</option>
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
            {(['all', 'unread', 'read'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  background: statusFilter === s ? 'var(--accent-glow)' : 'transparent',
                  color: statusFilter === s ? 'var(--accent-primary)' : 'var(--text-muted)',
                  transition: 'var(--transition)',
                  textTransform: 'capitalize',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '15%' }}>Classification</th>
              <th style={{ width: '38%' }}>Title &amp; Message Summary</th>
              <th style={{ width: '16%' }}>Audience</th>
              <th style={{ width: '12%' }}>Status</th>
              <th style={{ width: '11%' }}>Created</th>
              <th style={{ width: '8%', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Loading platform notification stream...</span>
                  </div>
                </td>
              </tr>
            ) : filteredNotifications.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
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
              filteredNotifications.map((n) => (
                <tr
                  key={n.id}
                  style={{
                    background: !n.is_read ? 'var(--accent-glow)' : undefined,
                    cursor: 'pointer',
                  }}
                  onClick={() => setViewingNotification(n)}
                >
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

                  {/* View Action */}
                  <td style={{ textAlign: 'right' }}>
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
                      {viewingNotification.created_at}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
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
    </div>
  );
}
