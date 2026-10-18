'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '@/lib/api-client';
import { PagedResponse, Organization, OrganizationCreateInput, OrganizationUpdateInput } from '@/lib/types';
import {
  Building2,
  Search,
  Clock,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  Mail,
  Phone,
  Globe,
  AlertCircle,
  Loader2,
  Power,
  Eye,
  ExternalLink,
  Shield,
  CheckCircle2,
  CheckSquare,
  Square,
  MinusSquare,
  RotateCcw,
} from 'lucide-react';
import { useToast } from '@/lib/toast-context';
import { useAuth } from '@/lib/auth-context';
import { generateOrganizationCode } from '@/lib/code-generator';
import { FormattedDate } from '@/components/ui/formatted-date';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useDefaultPageSize } from '@/lib/use-page-size';

/**
 * Enterprise Organizations & Multi-Tenant Accounts Workspace.
 * Implements complete CRUD capabilities:
 * - Create: POST /api/v1/organizations with code, name, legal name, tax ID, and contact details
 * - Read/Search: Filter by name, code, tax ID, or status
 * - Update: PATCH /api/v1/organizations/{id} with optimistic state updates
 * - Status Toggle: PATCH /api/v1/organizations/{id}/status for instant tenant activation/suspension
 * - Delete: DELETE /api/v1/organizations/{id} with modal confirmation safeguards
 * - Bulk Delete: Selection & multi-record deletion governed strictly by RBAC
 */
export default function OrganizationsPage() {
  const { toast } = useToast();
  const { user, hasPermission } = useAuth();
  const isAdmin = useMemo(() => {
    return Boolean(
      user?.is_super_admin ||
      user?.roles?.some((r) =>
        ['super_admin', 'superadmin', 'admin', 'system_admin'].includes(r.toLowerCase())
      )
    );
  }, [user]);

  const canDelete = Boolean(isAdmin || hasPermission('organization.delete') || hasPermission('organization.manage') || user?.is_super_admin);
  const canHardDelete = Boolean(isAdmin || user?.is_super_admin || hasPermission('organization.hard_delete') || hasPermission('*.hard_delete'));
  const canRestore = Boolean(isAdmin || hasPermission('organization.restore') || hasPermission('organization.manage') || user?.is_super_admin);

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState<boolean>(false);
  const [bulkHardDeleteRequested, setBulkHardDeleteRequested] = useState<boolean>(false);
  const [restoreCandidate, setRestoreCandidate] = useState<Organization | null>(null);
  const [bulkRestoreConfirmOpen, setBulkRestoreConfirmOpen] = useState<boolean>(false);
  const [isBulkRestoring, setIsBulkRestoring] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'deleted'>('all');
  const [pageSize] = useDefaultPageSize(15);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal Dialog States
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [viewingOrg, setViewingOrg] = useState<Organization | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Organization | null>(null);
  const [isHardDelete, setIsHardDelete] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Field-level validation state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Form Field State
  const [formData, setFormData] = useState<{
    name: string;
    code: string;
    legal_name: string;
    registration_number: string;
    tax_registration_number: string;
    email: string;
    phone: string;
    website: string;
    is_active: boolean;
  }>({
    name: '',
    code: '',
    legal_name: '',
    registration_number: '',
    tax_registration_number: '',
    email: '',
    phone: '',
    website: '',
    is_active: true,
  });

  const loadOrganizations = async () => {
    setIsRefreshing(true);
    try {
      const shouldIncludeDeleted = isAdmin || canRestore || canDelete;
      const url = `/organizations?page_size=100${shouldIncludeDeleted ? '&include_deleted=true' : ''}`;
      const res = await apiFetch<PagedResponse<Organization> | Organization[]>(url);
      const items = Array.isArray(res) ? res : (res?.items || []);
      setOrganizations(items);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve organizations.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const shouldIncludeDeleted = isAdmin || canRestore || canDelete;
        const url = `/organizations?page_size=100${shouldIncludeDeleted ? '&include_deleted=true' : ''}`;
        const res = await apiFetch<PagedResponse<Organization> | Organization[]>(url);
        if (isMounted) {
          const items = Array.isArray(res) ? res : (res?.items || []);
          setOrganizations(items);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to retrieve organizations.';
          toast.error(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [toast, isAdmin, canRestore, canDelete]);

  // Filter organizations by search and status
  const filtered = useMemo(() => {
    return organizations.filter((org) => {
      if (statusFilter === 'all' && org.is_deleted) return false;
      if (statusFilter === 'active' && (!org.is_active || org.is_deleted)) return false;
      if (statusFilter === 'inactive' && (org.is_active || org.is_deleted)) return false;
      if (statusFilter === 'deleted' && !org.is_deleted) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        org.name.toLowerCase().includes(q) ||
        org.code.toLowerCase().includes(q) ||
        (org.legal_name && org.legal_name.toLowerCase().includes(q)) ||
        (org.tax_registration_number && org.tax_registration_number.toLowerCase().includes(q)) ||
        (org.email && org.email.toLowerCase().includes(q))
      );
    });
  }, [organizations, search, statusFilter]);

  const selectedOrgs = useMemo(
    () => organizations.filter((o) => selectedIds.has(o.id)),
    [organizations, selectedIds]
  );
  const allSelectedAreDeleted = selectedOrgs.length > 0 && selectedOrgs.every((o) => o.is_deleted);

  const totalRecords = organizations.length;
  const filteredCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedOrgs = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safeCurrentPage, pageSize]);

  /**
   * Validates an individual form field against business constraints.
   */
  function validateField(name: string, value: string): string | null {
    const trimmed = (value || '').trim();

    switch (name) {
      case 'name':
        if (!trimmed) return 'Organization name is required';
        if (trimmed.length < 2) return 'Organization name must be at least 2 characters';
        if (trimmed.length > 255) return 'Organization name cannot exceed 255 characters';
        return null;

      case 'email':
        if (trimmed) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(trimmed)) {
            return 'Please enter a valid corporate email address (e.g. contact@domain.com)';
          }
        }
        return null;

      case 'phone':
        if (trimmed) {
          const phoneRegex = /^[+0-9\s()./-]{7,25}$/;
          if (!phoneRegex.test(trimmed)) {
            return 'Please enter a valid phone number (e.g. +1 555-0199)';
          }
        }
        return null;

      case 'website':
        if (trimmed) {
          const urlRegex = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;
          if (!urlRegex.test(trimmed)) {
            return 'Please enter a valid website URL (e.g. https://example.com)';
          }
        }
        return null;

      case 'tax_registration_number':
        if (trimmed && trimmed.length > 50) {
          return 'Tax ID cannot exceed 50 characters';
        }
        return null;

      case 'registration_number':
        if (trimmed && trimmed.length > 100) {
          return 'Registration number cannot exceed 100 characters';
        }
        return null;

      case 'legal_name':
        if (trimmed && trimmed.length > 255) {
          return 'Legal name cannot exceed 255 characters';
        }
        return null;

      default:
        return null;
    }
  }

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'name') {
        next.code = generateOrganizationCode(value);
      }
      return next;
    });
    if (touched[field]) {
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
    const val = (formData as Record<string, string | boolean>)[field];
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

  function openCreateModal() {
    setFormError(null);
    setFieldErrors({});
    setTouched({});
    setFormData({
      name: '',
      code: '',
      legal_name: '',
      registration_number: '',
      tax_registration_number: '',
      email: '',
      phone: '',
      website: '',
      is_active: true,
    });
    setSelectedOrg(null);
    setModalMode('create');
  }

  function openEditModal(org: Organization) {
    setFormError(null);
    setFieldErrors({});
    setTouched({});
    setFormData({
      name: org.name || '',
      code: org.code || '',
      legal_name: org.legal_name || '',
      registration_number: org.registration_number || '',
      tax_registration_number: org.tax_registration_number || '',
      email: org.email || '',
      phone: org.phone || '',
      website: org.website || '',
      is_active: org.is_active,
    });
    setSelectedOrg(org);
    setModalMode('edit');
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    // Validate all fields on submit (code is system-derived)
    const fieldsToCheck = [
      'name',
      'legal_name',
      'tax_registration_number',
      'registration_number',
      'email',
      'phone',
      'website',
    ];

    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};

    for (const f of fieldsToCheck) {
      newTouched[f] = true;
      const val = (formData as Record<string, string | boolean>)[f];
      const error = validateField(f, typeof val === 'string' ? val : '');
      if (error) {
        newErrors[f] = error;
      }
    }

    setTouched(newTouched);
    setFieldErrors(newErrors);

    // If there are validation errors, block submission and focus first invalid field
    if (Object.keys(newErrors).length > 0) {
      const firstInvalidField = Object.keys(newErrors)[0];
      const elem = document.getElementById(`org-input-${firstInvalidField}`);
      if (elem) {
        elem.focus();
      }
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        const derivedCode = (formData.code || generateOrganizationCode(formData.name)).trim().toUpperCase();
        const payload: OrganizationCreateInput = {
          name: formData.name.trim(),
          code: derivedCode,
          legal_name: formData.legal_name.trim() || null,
          registration_number: formData.registration_number.trim() || null,
          tax_registration_number: formData.tax_registration_number.trim() || null,
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          website: formData.website.trim() || null,
        };

        const created = await apiFetch<Organization>('/organizations', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        toast.success(`Organization "${created.name}" created successfully!`);
      } else if (modalMode === 'edit' && selectedOrg) {
        const derivedCode = (formData.code || generateOrganizationCode(formData.name)).trim().toUpperCase();
        const payload: OrganizationUpdateInput = {
          name: formData.name.trim(),
          code: derivedCode,
          legal_name: formData.legal_name.trim() || null,
          registration_number: formData.registration_number.trim() || null,
          tax_registration_number: formData.tax_registration_number.trim() || null,
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          website: formData.website.trim() || null,
          is_active: formData.is_active,
        };

        const updated = await apiFetch<Organization>(`/organizations/${selectedOrg.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });

        toast.success(`Organization "${updated.name}" updated successfully!`);
      }

      setModalMode(null);
      await loadOrganizations();
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

  async function handleToggleStatus(org: Organization) {
    const nextStatus = !org.is_active;
    try {
      await apiFetch<Organization>(`/organizations/${org.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: nextStatus }),
      });
      setOrganizations((prev) =>
        prev.map((o) => (o.id === org.id ? { ...o, is_active: nextStatus } : o))
      );
      toast.success(`Organization "${org.name}" marked ${nextStatus ? 'active' : 'inactive'}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update organization status.';
      toast.error(msg);
    }
  }

  async function handleDeleteOrganization() {
    if (!deleteCandidate) return;
    setIsSubmitting(true);
    try {
      await apiFetch(`/organizations/${deleteCandidate.id}?hard_delete=${isHardDelete}`, {
        method: 'DELETE',
      });
      toast.success(
        isHardDelete
          ? `Organization "${deleteCandidate.name}" purged successfully.`
          : `Organization "${deleteCandidate.name}" soft-deleted successfully.`
      );
      setDeleteCandidate(null);
      await loadOrganizations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete organization.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRestoreOrganization() {
    if (!restoreCandidate) return;
    setIsSubmitting(true);
    try {
      await apiFetch(`/organizations/${restoreCandidate.id}/restore`, {
        method: 'POST',
      });
      toast.success(`Organization "${restoreCandidate.name}" restored successfully.`);
      setRestoreCandidate(null);
      await loadOrganizations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to restore organization.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((o) => o.id)));
    }
  };

  const handleToggleSelect = (id: number) => {
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

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    let successCount = 0;
    const errors: string[] = [];

    for (const orgId of selectedIds) {
      try {
        const queryParam = bulkHardDeleteRequested ? '?hard_delete=true' : '?hard_delete=false';
        await apiFetch(`/organizations/${orgId}${queryParam}`, {
          method: 'DELETE',
        });
        successCount++;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(errorMsg);
      }
    }

    if (successCount > 0) {
      toast.success(
        bulkHardDeleteRequested
          ? `Successfully purged ${successCount} organization(s) permanently.`
          : `Successfully soft-deleted ${successCount} organization(s).`
      );
    }
    if (errors.length > 0) {
      toast.error(`Failed to delete ${errors.length} organization(s): ${errors[0]}`);
    }

    setSelectedIds(new Set());
    setBulkDeleteConfirmOpen(false);
    setIsBulkDeleting(false);
    await loadOrganizations();
  }

  async function handleBulkRestore() {
    if (selectedIds.size === 0) return;
    setIsBulkRestoring(true);
    let successCount = 0;
    const errors: string[] = [];

    for (const orgId of selectedIds) {
      try {
        await apiFetch(`/organizations/${orgId}/restore`, {
          method: 'POST',
        });
        successCount++;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(errorMsg);
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully restored ${successCount} organization(s).`);
    }
    if (errors.length > 0) {
      toast.error(`Failed to restore ${errors.length} organization(s): ${errors[0]}`);
    }

    setSelectedIds(new Set());
    setBulkRestoreConfirmOpen(false);
    setIsBulkRestoring(false);
    await loadOrganizations();
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
          gap: '1.25rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: 0 }}>
              Organizations & Accounts
            </h1>
            <span className="badge badge-neutral" style={{ fontWeight: 600, fontSize: '0.75rem' }}>
              {filteredCount === totalRecords ? `${totalRecords} Total Records` : `${filteredCount} of ${totalRecords} Records`}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Multi-tenant master organizations, billing profiles, and corporate legal entities.
          </p>
        </div>

        <div className="dashboard-toolbar-actions">
          {selectedIds.size > 0 && (statusFilter === 'deleted' || allSelectedAreDeleted) ? (
            <>
              {canRestore && (
                <button
                  type="button"
                  onClick={() => setBulkRestoreConfirmOpen(true)}
                  className="btn btn-restore"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  title={`Restore ${selectedIds.size} selected organization(s)`}
                >
                  <RotateCcw size={14} />
                  <span>Restore ({selectedIds.size})</span>
                </button>
              )}
              {canHardDelete && (
                <button
                  type="button"
                  onClick={() => {
                    setBulkHardDeleteRequested(true);
                    setBulkDeleteConfirmOpen(true);
                  }}
                  className="btn btn-danger"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  title={`Permanently purge ${selectedIds.size} selected organization(s)`}
                >
                  <Trash2 size={14} />
                  <span>Purge ({selectedIds.size})</span>
                </button>
              )}
            </>
          ) : (
            canDelete && selectedIds.size > 0 && (
              <button
                type="button"
                onClick={() => {
                  setBulkHardDeleteRequested(false);
                  setBulkDeleteConfirmOpen(true);
                }}
                className="btn btn-danger"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                title={`Delete ${selectedIds.size} selected organization(s)`}
              >
                <Trash2 size={14} />
                <span>Delete ({selectedIds.size})</span>
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => {
              setIsRefreshing(true);
              loadOrganizations();
            }}
            disabled={isRefreshing}
            className="btn btn-secondary"
            title="Reload organizations"
          >
            <RefreshCw size={14} className={isRefreshing ? 'loading-spinner' : ''} />
            <span>Sync</span>
          </button>

          <button type="button" onClick={openCreateModal} className="btn btn-primary">
            <Plus size={16} />
            <span>New Organization</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '0.75rem 1rem',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
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
            placeholder="Search by name, code, tax ID, email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="input-field"
            style={{ paddingLeft: '2.5rem', fontSize: '0.85rem', height: '36px' }}
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCurrentPage(1);
              }}
              style={{
                position: 'absolute',
                right: '0.65rem',
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

        {/* Status Filter Segmented Control */}
        <div
          style={{
            display: 'inline-flex',
            padding: '2px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {(
            (isAdmin
              ? ['all', 'active', 'inactive', 'deleted']
              : ['all', 'active', 'inactive']) as Array<'all' | 'active' | 'inactive' | 'deleted'>
          ).map((filter) => {
            const count = organizations.filter((o) => {
              if (filter === 'all') return !o.is_deleted;
              if (filter === 'active') return o.is_active && !o.is_deleted;
              if (filter === 'inactive') return !o.is_active && !o.is_deleted;
              if (filter === 'deleted') return o.is_deleted;
              return true;
            }).length;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => {
                  setStatusFilter(filter);
                  setCurrentPage(1);
                  setSelectedIds(new Set());
                }}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  border: 'none',
                  borderRadius: 'calc(var(--radius-md) - 2px)',
                  background: statusFilter === filter ? 'var(--accent-primary)' : 'transparent',
                  color: statusFilter === filter ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span>{filter}</span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    opacity: 0.85,
                    padding: '0 4px',
                    borderRadius: '4px',
                    background: statusFilter === filter ? 'rgba(255,255,255,0.2)' : 'var(--bg-card)',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Organizations Master Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '45px', textAlign: 'center' }}>#</th>
              <th style={{ width: '40px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: selectedIds.size > 0 ? 'var(--accent-primary)' : 'var(--text-muted)',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={selectedIds.size === filtered.length && filtered.length > 0 ? 'Deselect all' : 'Select all'}
                >
                  {selectedIds.size === filtered.length && filtered.length > 0 ? (
                    <CheckSquare size={16} />
                  ) : selectedIds.size > 0 ? (
                    <MinusSquare size={16} />
                  ) : (
                    <Square size={16} />
                  )}
                </button>
              </th>
              <th>Organization</th>
              <th>System Code</th>
              <th>Tax & Registration</th>
              <th>Contact Details</th>
              <th>Status</th>
              <th>Created</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={9}>
                    <div className="skeleton" style={{ height: '36px', width: '100%' }} />
                  </td>
                </tr>
              ))
            ) : paginatedOrgs.length > 0 ? (
              paginatedOrgs.map((org, index) => (
                <tr key={org.id} style={{ background: selectedIds.has(org.id) ? 'rgba(99, 102, 241, 0.06)' : undefined }}>
                  {/* Sequence Number */}
                  <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                    {(safeCurrentPage - 1) * pageSize + index + 1}
                  </td>
                  {/* Selection Checkbox */}
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleSelect(org.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: selectedIds.has(org.id) ? 'var(--accent-primary)' : 'var(--text-muted)',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {selectedIds.has(org.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                  </td>

                  {/* Name & Legal Entity */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: 'var(--radius-md)',
                          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(67, 56, 202, 0.2) 100%)',
                          color: 'var(--accent-primary)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Building2 size={18} />
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewingOrg(org)}
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
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem',
                            transition: 'var(--transition)',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                        >
                          {org.name}
                        </div>
                        {org.legal_name && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {org.legal_name}
                          </div>
                        )}
                      </button>
                    </div>
                  </td>

                  {/* System Code */}
                  <td>
                    <span className="badge badge-neutral" style={{ fontFamily: 'monospace' }}>
                      {org.code}
                    </span>
                  </td>

                  {/* Tax & Registration */}
                  <td>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {org.tax_registration_number ? (
                        <div>Tax No: <strong style={{ color: 'var(--text-primary)' }}>{org.tax_registration_number}</strong></div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>No Tax Reg</span>
                      )}
                      {org.registration_number && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Reg: {org.registration_number}</div>
                      )}
                    </div>
                  </td>

                  {/* Contact Details */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.78rem' }}>
                      {org.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                          <Mail size={12} color="var(--text-muted)" />
                          <span>{org.email}</span>
                        </div>
                      )}
                      {org.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                          <Phone size={12} color="var(--text-muted)" />
                          <span>{org.phone}</span>
                        </div>
                      )}
                      {org.website && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Globe size={12} color="var(--text-muted)" />
                          <a
                            href={org.website.startsWith('http') ? org.website : `https://${org.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}
                          >
                            Website
                          </a>
                        </div>
                      )}
                      {!org.email && !org.phone && !org.website && (
                        <span style={{ color: 'var(--text-muted)' }}>Not configured</span>
                      )}
                    </div>
                  </td>

                  {/* Status Toggle Badge */}
                  <td>
                    {org.is_deleted ? (
                      <span
                        className="badge badge-neutral"
                        style={{
                          background: 'rgba(239, 68, 68, 0.12)',
                          color: 'var(--danger)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                        title="Soft-deleted record preserved for audit trails"
                      >
                        <Trash2 size={11} />
                        Deleted
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(org)}
                        title={`Click to mark as ${org.is_active ? 'Inactive' : 'Active'}`}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        <span className={`badge ${org.is_active ? 'badge-success' : 'badge-danger'}`} style={{ cursor: 'pointer' }}>
                          <Power size={11} style={{ marginRight: '0.25rem' }} />
                          {org.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </button>
                    )}
                  </td>

                  {/* Created At */}
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={13} color="var(--text-muted)" />
                      <FormattedDate value={org.created_at} />
                    </div>
                  </td>

                  {/* Actions Column */}
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => setViewingOrg(org)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', height: '30px' }}
                        title="View organization details"
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditModal(org)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', height: '30px' }}
                        title="Edit organization"
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>

                      {org.is_deleted ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          {canRestore && (
                            <button
                              type="button"
                              onClick={() => setRestoreCandidate(org)}
                              className="btn btn-restore"
                              style={{ padding: '0.35rem 0.65rem', height: '30px' }}
                              title="Restore organization back to active"
                            >
                              <RotateCcw size={13} />
                              <span>Restore</span>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteCandidate(org);
                                setIsHardDelete(true);
                              }}
                              className="btn btn-danger"
                              style={{ padding: '0.35rem 0.65rem', height: '30px' }}
                              title="Permanently purge organization from database"
                            >
                              <Trash2 size={13} />
                              <span>Purge</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        canDelete && (
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteCandidate(org);
                              setIsHardDelete(false);
                            }}
                            className="btn btn-danger"
                            style={{ padding: '0.35rem 0.65rem', height: '30px' }}
                            title="Soft-delete organization"
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
                <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No organizations found matching the current criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
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
            <strong>{Math.min(safeCurrentPage * pageSize, filteredCount)}</strong> of <strong>{filteredCount}</strong> organizations
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

      {/* Individual Organization View Modal */}
      {viewingOrg && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingOrg(null);
          }}
        >
          <div
            className="modal-dialog glass-panel"
            style={{
              maxWidth: '680px',
              padding: '2rem',
              border: '1px solid var(--border-color)',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
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
                  <Building2 size={24} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      {viewingOrg.name}
                    </h3>
                    <span className={`badge ${viewingOrg.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {viewingOrg.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {viewingOrg.legal_name && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      Legal Entity: {viewingOrg.legal_name}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingOrg(null)}
                className="btn btn-secondary"
                style={{ padding: '0.4rem', borderRadius: '50%', width: '32px', height: '32px' }}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Table-Formatted Specification Sections */}
            <div>
              {/* Section 1: General Identifiers */}
              <div className="detail-table-section-title">
                <Building2 size={14} color="var(--accent-primary)" />
                <span>General &amp; Operational Identifiers</span>
              </div>
              <table className="detail-spec-table">
                <tbody>
                  <tr>
                    <th>Organization Name</th>
                    <td style={{ fontWeight: 600 }}>{viewingOrg.name}</td>
                  </tr>
                  <tr>
                    <th>System Identifier Code</th>
                    <td>
                      <span className="badge badge-neutral" style={{ fontFamily: 'monospace' }}>
                        {viewingOrg.code}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th>Operational Status</th>
                    <td>
                      <span style={{ fontWeight: 600, color: viewingOrg.is_active ? '#22c55e' : '#ef4444', fontSize: '0.825rem' }}>
                        {viewingOrg.is_active ? 'Active Tenant Account' : 'Suspended / Inactive'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Section 2: Corporate & Tax Registry */}
              <div className="detail-table-section-title">
                <Shield size={14} color="var(--accent-primary)" />
                <span>Corporate &amp; Tax Registry</span>
              </div>
              <table className="detail-spec-table">
                <tbody>
                  <tr>
                    <th>Formal Legal Name</th>
                    <td>{viewingOrg.legal_name || <span style={{ color: 'var(--text-muted)' }}>Not configured</span>}</td>
                  </tr>
                  <tr>
                    <th>Tax Registration / VAT ID</th>
                    <td style={{ fontWeight: 600 }}>
                      {viewingOrg.tax_registration_number || <span style={{ color: 'var(--text-muted)' }}>Not configured</span>}
                    </td>
                  </tr>
                  <tr>
                    <th>Commercial Registration Number</th>
                    <td style={{ fontWeight: 600 }}>
                      {viewingOrg.registration_number || <span style={{ color: 'var(--text-muted)' }}>Not configured</span>}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Section 3: Digital Channels & Communication */}
              <div className="detail-table-section-title">
                <Globe size={14} color="var(--accent-primary)" />
                <span>Contact &amp; Digital Channels</span>
              </div>
              <table className="detail-spec-table">
                <tbody>
                  <tr>
                    <th>Corporate Email</th>
                    <td>
                      {viewingOrg.email ? (
                        <a
                          href={`mailto:${viewingOrg.email}`}
                          style={{ color: 'var(--accent-primary)', fontSize: '0.825rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none' }}
                        >
                          <Mail size={13} />
                          <span>{viewingOrg.email}</span>
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Not configured</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th>Official Phone</th>
                    <td>
                      {viewingOrg.phone ? (
                        <a
                          href={`tel:${viewingOrg.phone}`}
                          style={{ color: 'var(--text-primary)', fontSize: '0.825rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none' }}
                        >
                          <Phone size={13} />
                          <span>{viewingOrg.phone}</span>
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Not configured</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th>Corporate Web Presence</th>
                    <td>
                      {viewingOrg.website ? (
                        <a
                          href={viewingOrg.website.startsWith('http') ? viewingOrg.website : `https://${viewingOrg.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--accent-primary)', fontSize: '0.825rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none' }}
                        >
                          <Globe size={13} />
                          <span>{viewingOrg.website}</span>
                          <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Not configured</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Section 4: Audit Trail */}
              <div className="detail-table-section-title">
                <CheckCircle2 size={14} color="var(--accent-primary)" />
                <span>Audit Trail &amp; Records</span>
              </div>
              <table className="detail-spec-table">
                <tbody>
                  <tr>
                    <th>Created Timestamp</th>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <FormattedDate value={viewingOrg.created_at} variant="datetime" includeSeconds />
                    </td>
                  </tr>
                  {viewingOrg.updated_at && (
                    <tr>
                      <th>Last Modified</th>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <FormattedDate value={viewingOrg.updated_at} variant="datetime" includeSeconds />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Actions Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '1.25rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-color)',
              }}
            >
              <button
                type="button"
                onClick={() => setViewingOrg(null)}
                className="btn btn-secondary"
              >
                Close Inspector
              </button>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    const orgToEdit = viewingOrg;
                    setViewingOrg(null);
                    openEditModal(orgToEdit);
                  }}
                  className="btn btn-primary"
                  style={{ gap: '0.4rem' }}
                >
                  <Edit2 size={14} />
                  <span>Edit Organization</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Organization Modal */}
      {modalMode && (
        <div
          className="modal-backdrop"
        >
          <div
            className="modal-dialog glass-panel"
            style={{
              maxWidth: '560px',
              padding: '2rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {modalMode === 'create' ? 'Create New Organization' : 'Edit Organization'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {modalMode === 'create'
                    ? 'Provision a new enterprise tenant organization in the CRM system.'
                    : `Modify details for tenant: ${selectedOrg?.code}`}
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
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.75rem 1rem',
                  background: 'var(--accent-danger-bg)',
                  border: '1px solid rgba(244, 63, 94, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  color: '#fda4af',
                  fontSize: '0.85rem',
                  marginBottom: '1.25rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: modalMode === 'create' ? '1.5fr 1fr' : '1fr', gap: '1rem' }}>
                <div>
                  <label
                    htmlFor="org-input-name"
                    style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}
                  >
                    Organization Name <span style={{ color: '#f43f5e' }}>*</span>
                  </label>
                  <input
                    id="org-input-name"
                    type="text"
                    placeholder="Acme International Corp"
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    onBlur={() => handleFieldBlur('name')}
                    className={`input-field ${fieldErrors.name && touched.name ? 'has-error' : ''}`}
                    aria-invalid={Boolean(fieldErrors.name && touched.name)}
                    aria-describedby={fieldErrors.name && touched.name ? 'org-error-name' : undefined}
                  />
                  {fieldErrors.name && touched.name && (
                    <div id="org-error-name" className="field-error-text" role="alert">
                      <AlertCircle size={13} style={{ flexShrink: 0 }} />
                      <span>{fieldErrors.name}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label
                    style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}
                  >
                    System Code <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)' }}>(Auto-generated by API • Read-Only)</span>
                  </label>
                  <div
                    style={{
                      height: '42px',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 0.85rem',
                      background: 'var(--bg-tertiary)',
                      border: '1px dashed var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: formData.name ? 'var(--color-primary-light, #38bdf8)' : 'var(--text-muted)',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {formData.code || generateOrganizationCode(formData.name) || 'AUTO_GENERATED'}
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="org-input-legal_name"
                  style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}
                >
                  Legal Registered Entity Name
                </label>
                <input
                  id="org-input-legal_name"
                  type="text"
                  placeholder="Acme International Private Limited"
                  value={formData.legal_name}
                  onChange={(e) => handleFieldChange('legal_name', e.target.value)}
                  onBlur={() => handleFieldBlur('legal_name')}
                  className={`input-field ${fieldErrors.legal_name && touched.legal_name ? 'has-error' : ''}`}
                  aria-invalid={Boolean(fieldErrors.legal_name && touched.legal_name)}
                  aria-describedby={fieldErrors.legal_name && touched.legal_name ? 'org-error-legal_name' : undefined}
                />
                {fieldErrors.legal_name && touched.legal_name && (
                  <div id="org-error-legal_name" className="field-error-text" role="alert">
                    <AlertCircle size={13} style={{ flexShrink: 0 }} />
                    <span>{fieldErrors.legal_name}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label
                    htmlFor="org-input-tax_registration_number"
                    style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}
                  >
                    Tax ID / VAT Number
                  </label>
                  <input
                    id="org-input-tax_registration_number"
                    type="text"
                    placeholder="TAX-9988221"
                    value={formData.tax_registration_number}
                    onChange={(e) => handleFieldChange('tax_registration_number', e.target.value)}
                    onBlur={() => handleFieldBlur('tax_registration_number')}
                    className={`input-field ${fieldErrors.tax_registration_number && touched.tax_registration_number ? 'has-error' : ''}`}
                    aria-invalid={Boolean(fieldErrors.tax_registration_number && touched.tax_registration_number)}
                    aria-describedby={fieldErrors.tax_registration_number && touched.tax_registration_number ? 'org-error-tax' : undefined}
                  />
                  {fieldErrors.tax_registration_number && touched.tax_registration_number && (
                    <div id="org-error-tax" className="field-error-text" role="alert">
                      <AlertCircle size={13} style={{ flexShrink: 0 }} />
                      <span>{fieldErrors.tax_registration_number}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="org-input-registration_number"
                    style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}
                  >
                    Registration Number
                  </label>
                  <input
                    id="org-input-registration_number"
                    type="text"
                    placeholder="REG-2026-0044"
                    value={formData.registration_number}
                    onChange={(e) => handleFieldChange('registration_number', e.target.value)}
                    onBlur={() => handleFieldBlur('registration_number')}
                    className={`input-field ${fieldErrors.registration_number && touched.registration_number ? 'has-error' : ''}`}
                    aria-invalid={Boolean(fieldErrors.registration_number && touched.registration_number)}
                    aria-describedby={fieldErrors.registration_number && touched.registration_number ? 'org-error-reg' : undefined}
                  />
                  {fieldErrors.registration_number && touched.registration_number && (
                    <div id="org-error-reg" className="field-error-text" role="alert">
                      <AlertCircle size={13} style={{ flexShrink: 0 }} />
                      <span>{fieldErrors.registration_number}</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label
                    htmlFor="org-input-email"
                    style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}
                  >
                    Corporate Email
                  </label>
                  <input
                    id="org-input-email"
                    type="email"
                    placeholder="contact@acme.com"
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    onBlur={() => handleFieldBlur('email')}
                    className={`input-field ${fieldErrors.email && touched.email ? 'has-error' : ''}`}
                    aria-invalid={Boolean(fieldErrors.email && touched.email)}
                    aria-describedby={fieldErrors.email && touched.email ? 'org-error-email' : undefined}
                  />
                  {fieldErrors.email && touched.email && (
                    <div id="org-error-email" className="field-error-text" role="alert">
                      <AlertCircle size={13} style={{ flexShrink: 0 }} />
                      <span>{fieldErrors.email}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="org-input-phone"
                    style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}
                  >
                    Corporate Phone
                  </label>
                  <input
                    id="org-input-phone"
                    type="tel"
                    placeholder="+1 555-0199"
                    value={formData.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    onBlur={() => handleFieldBlur('phone')}
                    className={`input-field ${fieldErrors.phone && touched.phone ? 'has-error' : ''}`}
                    aria-invalid={Boolean(fieldErrors.phone && touched.phone)}
                    aria-describedby={fieldErrors.phone && touched.phone ? 'org-error-phone' : undefined}
                  />
                  {fieldErrors.phone && touched.phone && (
                    <div id="org-error-phone" className="field-error-text" role="alert">
                      <AlertCircle size={13} style={{ flexShrink: 0 }} />
                      <span>{fieldErrors.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="org-input-website"
                  style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}
                >
                  Official Website URL
                </label>
                <input
                  id="org-input-website"
                  type="text"
                  placeholder="https://acme.com"
                  value={formData.website}
                  onChange={(e) => handleFieldChange('website', e.target.value)}
                  onBlur={() => handleFieldBlur('website')}
                  className={`input-field ${fieldErrors.website && touched.website ? 'has-error' : ''}`}
                  aria-invalid={Boolean(fieldErrors.website && touched.website)}
                  aria-describedby={fieldErrors.website && touched.website ? 'org-error-website' : undefined}
                />
                {fieldErrors.website && touched.website && (
                  <div id="org-error-website" className="field-error-text" role="alert">
                    <AlertCircle size={13} style={{ flexShrink: 0 }} />
                    <span>{fieldErrors.website}</span>
                  </div>
                )}
              </div>

              {modalMode === 'edit' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', paddingTop: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="org_active_checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="org_active_checkbox" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                    Tenant Organization Active
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
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
                    <span>{modalMode === 'create' ? 'Create Organization' : 'Save Changes'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={handleDeleteOrganization}
        title={isHardDelete ? "Purge Organization?" : "Soft Delete Organization?"}
        subtitle={deleteCandidate ? `Code: ${deleteCandidate.code}` : undefined}
        message={
          deleteCandidate ? (
            isHardDelete ? (
              <>
                Are you sure you want to <strong>permanently purge</strong>{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{deleteCandidate.name}</strong> from the database? This action <strong>cannot be undone</strong> and will erase all organizational data.
              </>
            ) : (
              <>
                Are you sure you want to soft delete{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{deleteCandidate.name}</strong>? The organization will be moved to deleted records, where you can restore it or permanently purge it later.
              </>
            )
          ) : null
        }
        confirmLabel={isHardDelete ? "Purge Organization" : "Soft Delete"}
        variant="danger"
        isLoading={isSubmitting}
      />

      {/* Restore Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!restoreCandidate}
        onClose={() => setRestoreCandidate(null)}
        onConfirm={handleRestoreOrganization}
        title="Restore Organization?"
        subtitle={restoreCandidate ? `Code: ${restoreCandidate.code}` : undefined}
        message={
          restoreCandidate ? (
            <>
              Are you sure you want to restore{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{restoreCandidate.name}</strong> back to active status? The organization will immediately be visible across CRM workspaces.
            </>
          ) : null
        }
        confirmLabel="Restore Organization"
        variant="primary"
        isLoading={isSubmitting}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        title={
          bulkHardDeleteRequested
            ? `Purge ${selectedIds.size} Selected Organization(s)?`
            : `Soft Delete ${selectedIds.size} Selected Organization(s)?`
        }
        subtitle={`${selectedIds.size} record${selectedIds.size === 1 ? '' : 's'} selected`}
        message={
          <div>
            <p>
              {bulkHardDeleteRequested ? (
                <>
                  Are you sure you want to <strong>permanently purge</strong> the {selectedIds.size} selected organization(s) from the database? This action <strong>cannot be undone</strong> and will erase all organizational data.
                </>
              ) : (
                <>
                  Are you sure you want to soft delete the {selectedIds.size} selected organization(s)? They will be moved to the <strong>Deleted</strong> tab, where they can be restored or permanently purged later.
                </>
              )}
            </p>
            {canHardDelete && !allSelectedAreDeleted && statusFilter !== 'deleted' && (
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="bulk_hard_delete_check"
                  checked={bulkHardDeleteRequested}
                  onChange={(e) => setBulkHardDeleteRequested(e.target.checked)}
                />
                <label htmlFor="bulk_hard_delete_check" style={{ fontSize: '0.82rem', color: 'var(--danger)', fontWeight: 600 }}>
                  Permanently purge records immediately (Bypass Trash)
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

      {/* Bulk Restore Confirmation Modal */}
      <ConfirmationModal
        isOpen={bulkRestoreConfirmOpen}
        onClose={() => setBulkRestoreConfirmOpen(false)}
        onConfirm={handleBulkRestore}
        title={`Restore ${selectedIds.size} Selected Organization(s)?`}
        subtitle={`${selectedIds.size} record${selectedIds.size === 1 ? '' : 's'} selected`}
        message={
          <p>
            Are you sure you want to restore the {selectedIds.size} selected organization(s) back to active status? They will immediately be visible across the active workspace.
          </p>
        }
        confirmLabel={`Restore (${selectedIds.size})`}
        variant="primary"
        isLoading={isBulkRestoring}
      />
    </div>
  );
}
