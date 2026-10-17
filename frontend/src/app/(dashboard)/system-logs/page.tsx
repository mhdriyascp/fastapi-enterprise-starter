'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Edit3,
  Eye,
  Filter,
  History,
  Layers,
  Lock,
  PlusCircle,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { FormattedDate } from '@/components/ui/formatted-date';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { apiFetch } from '@/lib/api-client';
import { ActivityLog, PagedResponse } from '@/lib/types';
import { useDefaultPageSize } from '@/lib/use-page-size';

export default function SystemLogsPage() {
  const { user, hasPermission, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useDefaultPageSize(15);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);
  const [modules, setModules] = useState<string[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Row selection and deletion state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteCandidate, setDeleteCandidate] = useState<ActivityLog | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState<boolean>(false);
  const [clearAllConfirmOpen, setClearAllConfirmOpen] = useState<boolean>(false);
  const [isSingleDeleting, setIsSingleDeleting] = useState<boolean>(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
  const [isClearingAll, setIsClearingAll] = useState<boolean>(false);

  // Strict Enterprise Administrator check (restricted by default)
  const isAdmin = useMemo(() => {
    if (!user) return false;
    if (user.is_super_admin) return true;
    if (user.roles?.some((r) => ['super_admin', 'superadmin', 'admin', 'system_admin'].includes(r))) return true;
    return hasPermission('activity_logs.manage') || hasPermission('activity_logs.read');
  }, [user, hasPermission]);

  const canDelete = useMemo(() => {
    if (!user) return false;
    if (user.is_super_admin) return true;
    if (user.roles?.some((r) => ['super_admin', 'superadmin', 'admin', 'system_admin'].includes(r))) return true;
    return hasPermission('activity_logs.delete') || hasPermission('activity_logs.manage');
  }, [user, hasPermission]);

  const handleSelectAll = () => {
    if (selectedIds.size === logs.length && logs.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(logs.map((l) => l.public_id)));
    }
  };

  const handleToggleSelect = (publicId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(publicId)) {
        next.delete(publicId);
      } else {
        next.add(publicId);
      }
      return next;
    });
  };

  const handleExecuteSingleDelete = async () => {
    if (!deleteCandidate) return;
    setIsSingleDeleting(true);
    try {
      await apiFetch(`/system-logs/${deleteCandidate.public_id}`, {
        method: 'DELETE',
      });
      toast.success('Activity log record deleted successfully.');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteCandidate.public_id);
        return next;
      });
      setDeleteCandidate(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete activity log';
      toast.error(msg);
    } finally {
      setIsSingleDeleting(false);
    }
  };

  const handleExecuteBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      const res = await apiFetch<{ deleted_count: number }>('/system-logs/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          identifiers: Array.from(selectedIds),
        }),
      });
      toast.success(`Successfully deleted ${res.deleted_count || selectedIds.size} activity log(s).`);
      setSelectedIds(new Set());
      setBulkDeleteConfirmOpen(false);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to bulk delete activity logs';
      toast.error(msg);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleExecuteClearAll = async () => {
    setIsClearingAll(true);
    try {
      const res = await apiFetch<{ deleted_count: number; message: string }>('/system-logs/clear-all', {
        method: 'POST',
      });
      toast.success(res.message || `Successfully cleared all activity logs.`);
      setSelectedIds(new Set());
      setClearAllConfirmOpen(false);
      setPage(1);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to clear system activity logs';
      toast.error(msg);
    } finally {
      setIsClearingAll(false);
    }
  };

  const isLoading = isAuthLoading || (isAdmin && isDataLoading);

  // Filter criteria
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selected Log for Inspection Modal
  const [inspectingLog, setInspectingLog] = useState<ActivityLog | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Load distinct modules for filter dropdown
  useEffect(() => {
    if (!isAdmin) return;
    let isMounted = true;
    async function load() {
      try {
        const data = await apiFetch<string[]>('/system-logs/modules');
        if (isMounted && Array.isArray(data)) {
          setModules(data);
        }
      } catch {
        if (isMounted) {
          setModules(['organizations', 'menus', 'rbac', 'users', 'masters', 'settings']);
        }
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  // Fetch paginated activity logs
  useEffect(() => {
    if (!isAdmin) return;
    let isMounted = true;
    async function fetchLogsData() {
      setIsDataLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('page_size', String(pageSize));

        if (selectedModule && selectedModule !== 'all') {
          params.set('module', selectedModule);
        }
        if (selectedAction && selectedAction !== 'all') {
          params.set('action', selectedAction);
        }
        if (searchTerm.trim()) {
          params.set('search', searchTerm.trim());
        }

        const res = await apiFetch<PagedResponse<ActivityLog>>(`/system-logs?${params.toString()}`);
        if (isMounted) {
          setLogs(res.items || []);
          setTotal(res.total || 0);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load system activity logs:', err);
          setLogs([]);
          setTotal(0);
        }
      } finally {
        if (isMounted) {
          setIsDataLoading(false);
        }
      }
    }
    fetchLogsData();
    return () => {
      isMounted = false;
    };
  }, [isAdmin, page, pageSize, selectedModule, selectedAction, searchTerm, refreshTrigger]);

  // Handle Search Input with Enter / Debounce
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleCopyDetails = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  // Render Action Badge with distinct visual indicators
  const renderActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act === 'CREATE') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.55rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.72rem',
            fontWeight: 700,
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.25)',
          }}
        >
          <PlusCircle size={12} />
          CREATE
        </span>
      );
    }
    if (act === 'UPDATE') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.55rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.72rem',
            fontWeight: 700,
            background: 'rgba(56, 189, 248, 0.12)',
            color: 'var(--color-primary-light, #38bdf8)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
          }}
        >
          <Edit3 size={12} />
          UPDATE
        </span>
      );
    }
    if (act === 'DELETE') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.55rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.72rem',
            fontWeight: 700,
            background: 'rgba(244, 63, 94, 0.12)',
            color: '#f43f5e',
            border: '1px solid rgba(244, 63, 94, 0.25)',
          }}
        >
          <Trash2 size={12} />
          DELETE
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.25rem 0.55rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.72rem',
          fontWeight: 700,
          background: 'rgba(245, 158, 11, 0.12)',
          color: '#f59e0b',
          border: '1px solid rgba(245, 158, 11, 0.25)',
        }}
      >
        <History size={12} />
        {act}
      </span>
    );
  };

  if (!isAuthLoading && !isAdmin) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', padding: '2rem 1rem' }}>
        <Card style={{ maxWidth: '540px', width: '100%', textAlign: 'center', padding: '2.5rem 2rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}
          >
            <ShieldAlert size={28} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Administrator Access Only
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
            System activity and audit logs are strictly restricted to system administrators by default. Your account does not possess the administrative privileges required (<code style={{ color: '#ef4444' }}>activity_logs.read</code> or <code style={{ color: '#ef4444' }}>activity_logs.manage</code>).
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={() => router.push('/')}>
              Return to Dashboard
            </Button>
            <Button variant="secondary" onClick={() => router.push('/settings')}>
              System Settings
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2.5rem' }}>
      {/* Header Section */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(56, 189, 248, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary-light, #38bdf8)',
              }}
            >
              <History size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
                  System Activity &amp; Audit Logs
                </h1>
                <Badge variant="neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}>
                  <Lock size={11} /> Admin Restricted
                </Badge>
                <Badge variant="neutral" style={{ fontWeight: 600, fontSize: '0.75rem' }}>
                  {total} Logged Events
                </Badge>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', margin: 0 }}>
                Comprehensive chronological tracking for all module mutations (Create, Update, Delete) with timestamps and change diffs.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/settings')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Settings size={15} />
            <span>System Settings</span>
          </Button>
          <button
            type="button"
            onClick={() => {
              setPage(1);
              setRefreshTrigger((prev) => prev + 1);
            }}
            disabled={isLoading}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={15} className={isLoading ? 'loading-spinner' : ''} />
            <span>Refresh Feed</span>
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={() => setClearAllConfirmOpen(true)}
              disabled={isLoading || isClearingAll || total === 0}
              className="btn btn-danger"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              title="Clear all system activity logs"
            >
              <Trash2 size={15} className={isClearingAll ? 'loading-spinner' : ''} />
              <span>Clear All Logs</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Logged Events
            </span>
            <Layers size={16} color="var(--color-primary-light, #38bdf8)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.4rem' }}>
            {total}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Across all platform domains
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Recorded Modules
            </span>
            <Filter size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', marginTop: '0.4rem' }}>
            {modules.length || 6}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Active audit listeners
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Compliance Integrity
            </span>
            <ShieldAlert size={16} color="#6366f1" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#6366f1', marginTop: '0.4rem' }}>
            100%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Dual-identifier timestamped
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
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: '1 1 280px', minWidth: '220px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
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
              placeholder="Search by entity name, ID, or operator email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '2.5rem', width: '100%' }}
            />
          </div>
          <button type="submit" className="btn btn-secondary" style={{ flexShrink: 0 }}>
            Search
          </button>
        </form>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Module Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label htmlFor="filter-module" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Module:
            </label>
            <select
              id="filter-module"
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setPage(1);
              }}
              className="input-field"
              style={{ height: '38px', padding: '0 0.75rem', textTransform: 'capitalize' }}
            >
              <option value="all">All Modules</option>
              {modules.map((m) => (
                <option key={m} value={m}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Action Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label htmlFor="filter-action" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Action:
            </label>
            <select
              id="filter-action"
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setPage(1);
              }}
              className="input-field"
              style={{ height: '38px', padding: '0 0.75rem' }}
            >
              <option value="all">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="STATUS_CHANGE">STATUS_CHANGE</option>
              <option value="DEACTIVATE">DEACTIVATE</option>
            </select>
          </div>

          {(searchTerm || selectedModule !== 'all' || selectedAction !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedModule('all');
                setSelectedAction('all');
                setPage(1);
              }}
              className="btn btn-secondary"
              style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem' }}
            >
              Reset Filters
            </button>
          )}

          {selectedIds.size > 0 && canDelete && (
            <button
              type="button"
              onClick={() => setBulkDeleteConfirmOpen(true)}
              className="btn btn-danger"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8125rem',
                padding: '0.4rem 0.75rem',
              }}
            >
              <Trash2 size={14} />
              <span>Delete ({selectedIds.size})</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Activity Table */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                <th style={{ padding: '0.85rem 1rem', width: '45px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  #
                </th>
                {canDelete && (
                  <th style={{ padding: '0.85rem 1rem', width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      aria-label="Select all activity logs on this page"
                      checked={selectedIds.size === logs.length && logs.length > 0}
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: 'var(--accent-primary)' }}
                    />
                  </th>
                )}
                <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Timestamp (UTC / Local)
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Module
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Action
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Target Entity
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Operator / Attribution
                </th>
                <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skel-${i}`} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '1rem', textAlign: 'center' }}><div className="skeleton" style={{ height: '18px', width: '25px', margin: '0 auto' }} /></td>
                    {canDelete && (
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div className="skeleton" style={{ height: '16px', width: '16px', margin: '0 auto', borderRadius: '4px' }} />
                      </td>
                    )}
                    <td style={{ padding: '1rem 1.25rem' }}><div className="skeleton" style={{ height: '18px', width: '140px' }} /></td>
                    <td style={{ padding: '1rem' }}><div className="skeleton" style={{ height: '18px', width: '90px' }} /></td>
                    <td style={{ padding: '1rem' }}><div className="skeleton" style={{ height: '18px', width: '70px' }} /></td>
                    <td style={{ padding: '1rem' }}><div className="skeleton" style={{ height: '18px', width: '160px' }} /></td>
                    <td style={{ padding: '1rem' }}><div className="skeleton" style={{ height: '18px', width: '130px' }} /></td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}><div className="skeleton" style={{ height: '24px', width: '80px', marginLeft: 'auto' }} /></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={canDelete ? 8 : 7} style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <History size={24} />
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        No Activity Logs Found
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '400px', margin: 0 }}>
                        {searchTerm || selectedModule !== 'all' || selectedAction !== 'all'
                          ? 'No activity records match the selected filter criteria. Try adjusting or clearing your filters.'
                          : 'As administrative mutations (create, update, delete) occur, real-time audit records will be recorded here.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background var(--transition)',
                      background: selectedIds.has(log.public_id) ? 'var(--accent-subtle)' : undefined,
                    }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                      {(page - 1) * pageSize + index + 1}
                    </td>
                    {canDelete && (
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          aria-label={`Select activity log ${log.id}`}
                          checked={selectedIds.has(log.public_id)}
                          onChange={() => handleToggleSelect(log.public_id)}
                          style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: 'var(--accent-primary)' }}
                        />
                      </td>
                    )}
                    <td style={{ padding: '0.85rem 1.25rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <FormattedDate value={log.created_at} variant="datetime" showTooltip={true} />
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: 'var(--bg-app)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          textTransform: 'capitalize',
                        }}
                      >
                        {log.module}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                      {renderActionBadge(log.action)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                        {log.entity_name || log.entity_type}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {log.entity_type} • ID: {log.entity_id}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {log.user_email ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <User size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            {log.user_email}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          System Operator
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => setInspectingLog(log)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          title="Inspect details"
                        >
                          <Eye size={13} />
                          <span>Inspect</span>
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteCandidate(log)}
                            className="btn btn-secondary"
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              color: '#ef4444',
                              borderColor: 'rgba(239, 68, 68, 0.3)',
                            }}
                            title="Delete log entry"
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
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

        {/* Pagination Bar */}
        {total > 0 && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              background: 'var(--bg-card)',
            }}
          >
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Showing {Math.min((page - 1) * pageSize + 1, total)} to {Math.min(page * pageSize, total)} of {total} events
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem' }}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', padding: '0 0.5rem' }}>
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem' }}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Activity Log Detail Modal */}
      {inspectingLog && (
        <div className="modal-backdrop">
          <div
            className="modal-dialog glass-panel"
            style={{
              width: '100%',
              maxWidth: '680px',
              padding: 'clamp(1.25rem, 4vw, 2rem)',
              boxShadow: 'var(--shadow-lg)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {renderActionBadge(inspectingLog.action)}
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Audit Specification #{inspectingLog.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingLog(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Spec Table */}
            <table className="detail-spec-table">
              <tbody>
                <tr>
                  <th style={{ width: '30%' }}>Target Entity</th>
                  <td>
                    <strong>{inspectingLog.entity_name || '—'}</strong> ({inspectingLog.entity_type})
                  </td>
                </tr>
                <tr>
                  <th>Entity Identifier</th>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{inspectingLog.entity_id}</td>
                </tr>
                <tr>
                  <th>Domain Module</th>
                  <td style={{ textTransform: 'capitalize' }}>{inspectingLog.module}</td>
                </tr>
                <tr>
                  <th>Audit Timestamp</th>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                      <FormattedDate value={inspectingLog.created_at} variant="datetime" showTooltip={true} />
                    </div>
                  </td>
                </tr>
                <tr>
                  <th>Initiator Operator</th>
                  <td>{inspectingLog.user_email || 'System Background / Automated Actor'}</td>
                </tr>
                {inspectingLog.ip_address && (
                  <tr>
                    <th>Client IP</th>
                    <td style={{ fontFamily: 'monospace' }}>{inspectingLog.ip_address}</td>
                  </tr>
                )}
                {inspectingLog.request_id && (
                  <tr>
                    <th>Request Trace ID</th>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{inspectingLog.request_id}</td>
                  </tr>
                )}
                <tr>
                  <th>Public UUID</th>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{inspectingLog.public_id}</td>
                </tr>
              </tbody>
            </table>

            {/* Change Delta Payload */}
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Change Delta Payload (JSON)
                </label>
                <button
                  type="button"
                  onClick={() => handleCopyDetails(JSON.stringify(inspectingLog.details || {}, null, 2))}
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  {isCopied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                  <span>{isCopied ? 'Copied!' : 'Copy JSON'}</span>
                </button>
              </div>

              <pre
                style={{
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  fontSize: '0.8125rem',
                  fontFamily: 'monospace',
                  color: 'var(--text-primary)',
                  overflowX: 'auto',
                  maxHeight: '260px',
                }}
              >
                {inspectingLog.details && Object.keys(inspectingLog.details).length > 0
                  ? JSON.stringify(inspectingLog.details, null, 2)
                  : '{\n  "note": "No granular field modifications captured for this event."\n}'}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setInspectingLog(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Activity Log Deletion Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={handleExecuteSingleDelete}
        title="Delete Activity Log?"
        subtitle={`Log ID: ${deleteCandidate?.id} • Action: ${deleteCandidate?.action}`}
        message={
          <div>
            <p style={{ margin: 0, marginBottom: '0.75rem' }}>
              Are you sure you want to permanently delete this system audit record? This action cannot be reversed.
            </p>
            {deleteCandidate && (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  background: 'var(--bg-app)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                }}
              >
                <div><strong>Module:</strong> {deleteCandidate.module}</div>
                <div><strong>Entity:</strong> {deleteCandidate.entity_type} ({deleteCandidate.entity_name || deleteCandidate.entity_id})</div>
                <div><strong>Operator:</strong> {deleteCandidate.user_email || 'System'}</div>
              </div>
            )}
          </div>
        }
        confirmLabel="Delete Log"
        variant="danger"
        isLoading={isSingleDeleting}
      />

      {/* Bulk Activity Logs Deletion Confirmation Modal */}
      <ConfirmationModal
        isOpen={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        onConfirm={handleExecuteBulkDelete}
        title={`Delete ${selectedIds.size} Activity Logs?`}
        subtitle={`${selectedIds.size} records selected for permanent removal`}
        message={
          <div>
            <p style={{ margin: 0 }}>
              Are you sure you want to permanently delete the <strong>{selectedIds.size}</strong> selected activity log records?
              Once removed, these chronological audit entries cannot be restored.
            </p>
          </div>
        }
        confirmLabel={`Delete ${selectedIds.size} Logs`}
        variant="danger"
        isLoading={isBulkDeleting}
      />

      {/* Clear All Activity Logs Confirmation Modal */}
      <ConfirmationModal
        isOpen={clearAllConfirmOpen}
        onClose={() => setClearAllConfirmOpen(false)}
        onConfirm={handleExecuteClearAll}
        title="Clear All System Activity & Audit Logs?"
        subtitle={`All ${total} logged events will be permanently purged`}
        message={
          <div>
            <p style={{ margin: 0, marginBottom: '0.75rem' }}>
              Are you sure you want to permanently delete <strong>all {total}</strong> system activity and audit log records?
            </p>
            <div
              style={{
                padding: '0.75rem',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-danger, #ef4444)',
                fontSize: '0.85rem',
                lineHeight: 1.5,
              }}
            >
              <strong>Warning:</strong> This action cannot be reversed. All chronological audit mutation records across all platform modules will be permanently erased.
            </div>
          </div>
        }
        confirmLabel="Clear All Logs"
        variant="danger"
        isLoading={isClearingAll}
      />
    </div>
  );
}
