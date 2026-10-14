'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '@/lib/api-client';
import { Organization, OrganizationCreateInput, OrganizationUpdateInput } from '@/lib/types';
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
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@/lib/toast-context';
import { generateOrganizationCode } from '@/lib/code-generator';

/**
 * Enterprise Organizations & Multi-Tenant Accounts Workspace.
 * Implements complete CRUD capabilities:
 * - Create: POST /api/v1/organizations with code, name, legal name, tax ID, and contact details
 * - Read/Search: Filter by name, code, tax ID, or status
 * - Update: PATCH /api/v1/organizations/{id} with optimistic state updates
 * - Status Toggle: PATCH /api/v1/organizations/{id}/status for instant tenant activation/suspension
 * - Delete: DELETE /api/v1/organizations/{id} with modal confirmation safeguards
 */
export default function OrganizationsPage() {
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal Dialog States
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [viewingOrg, setViewingOrg] = useState<Organization | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [deleteCandidate, setDeleteCandidate] = useState<Organization | null>(null);
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
      const res = await apiFetch<Organization[]>('/organizations');
      setOrganizations(res || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve organizations.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleCopyId = (id: string | number) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(String(id));
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
      toast.info('Organization ID copied to clipboard');
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const res = await apiFetch<Organization[]>('/organizations');
        if (isMounted) {
          setOrganizations(res || []);
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
  }, [toast]);

  // Filter organizations by search and status
  const filtered = useMemo(() => {
    return organizations.filter((org) => {
      if (statusFilter === 'active' && !org.is_active) return false;
      if (statusFilter === 'inactive' && org.is_active) return false;

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
      if (field === 'name' && modalMode === 'create') {
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
        const payload: OrganizationUpdateInput = {
          name: formData.name.trim(),
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
      await apiFetch(`/organizations/${deleteCandidate.id}`, {
        method: 'DELETE',
      });
      toast.success(`Organization "${deleteCandidate.name}" deleted successfully.`);
      setDeleteCandidate(null);
      await loadOrganizations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete organization.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
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
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Organizations & Accounts
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Multi-tenant master organizations, billing profiles, and corporate legal entities.
          </p>
        </div>

        <div className="dashboard-toolbar-actions">
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
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '2.5rem', fontSize: '0.85rem', height: '36px' }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
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
          {(['all', 'active', 'inactive'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
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
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Organizations Master Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
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
                  <td colSpan={7}>
                    <div className="skeleton" style={{ height: '36px', width: '100%' }} />
                  </td>
                </tr>
              ))
            ) : filtered.length > 0 ? (
              filtered.map((org) => (
                <tr key={org.id}>
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
                        <div>Tax ID: <strong style={{ color: 'var(--text-primary)' }}>{org.tax_registration_number}</strong></div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>No Tax ID</span>
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
                  </td>

                  {/* Created At */}
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={13} color="var(--text-muted)" />
                      {new Date(org.created_at).toLocaleDateString()}
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

                      <button
                        type="button"
                        onClick={() => setDeleteCandidate(org)}
                        className="btn btn-danger"
                        style={{ padding: '0.35rem 0.65rem', height: '30px' }}
                        title="Delete organization"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No organizations found matching the current criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Individual Organization View Modal */}
      {viewingOrg && (
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
            if (e.target === e.currentTarget) setViewingOrg(null);
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '680px',
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

            {/* Structured Details Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* General & System Identifiers */}
              <div
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '1.2rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  General & System Identifiers
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>System Code</span>
                    <span className="badge badge-neutral" style={{ fontFamily: 'monospace', marginTop: '0.25rem' }}>
                      {viewingOrg.code}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Operational Status</span>
                    <span style={{ fontWeight: 600, color: viewingOrg.is_active ? '#22c55e' : '#ef4444', fontSize: '0.85rem' }}>
                      {viewingOrg.is_active ? 'Active Tenant' : 'Suspended / Inactive'}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Organization ID</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                      <code style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {viewingOrg.id}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopyId(viewingOrg.id)}
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

              {/* Corporate & Tax Registry */}
              <div
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '1.2rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Corporate & Tax Registry
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Tax Registration / VAT ID</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                      {viewingOrg.tax_registration_number || <span style={{ color: 'var(--text-muted)' }}>Not configured</span>}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Business Registration Number</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                      {viewingOrg.registration_number || <span style={{ color: 'var(--text-muted)' }}>Not configured</span>}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Public Reference ID</span>
                    <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                      {viewingOrg.public_id || `#${viewingOrg.id}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact & Digital Channels */}
              <div
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '1.2rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Contact & Digital Channels
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Corporate Email</span>
                    {viewingOrg.email ? (
                      <a
                        href={`mailto:${viewingOrg.email}`}
                        style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem', textDecoration: 'none' }}
                      >
                        <Mail size={13} />
                        <span>{viewingOrg.email}</span>
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Not configured</span>
                    )}
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Official Phone</span>
                    {viewingOrg.phone ? (
                      <a
                        href={`tel:${viewingOrg.phone}`}
                        style={{ color: 'var(--text-primary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem', textDecoration: 'none' }}
                      >
                        <Phone size={13} />
                        <span>{viewingOrg.phone}</span>
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Not configured</span>
                    )}
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Web Presence</span>
                    {viewingOrg.website ? (
                      <a
                        href={viewingOrg.website.startsWith('http') ? viewingOrg.website : `https://${viewingOrg.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem', textDecoration: 'none' }}
                      >
                        <Globe size={13} />
                        <span>Visit Website</span>
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Not configured</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Audit Trail & Timestamps */}
              <div
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '1.2rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Audit Trail & Records
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Created At</span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {new Date(viewingOrg.created_at).toLocaleString()}
                    </span>
                  </div>
                  {viewingOrg.updated_at && (
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Last Updated</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {new Date(viewingOrg.updated_at).toLocaleString()}
                      </span>
                    </div>
                  )}
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
                onClick={() => setViewingOrg(null)}
                className="btn btn-secondary"
              >
                Close
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
              maxWidth: '560px',
              padding: '2rem',
              boxShadow: 'var(--shadow-lg)',
              maxHeight: '90vh',
              overflowY: 'auto',
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
                    System Code <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)' }}>(Auto-generated)</span>
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
                    {modalMode === 'edit'
                      ? (selectedOrg?.code || 'SYSTEM_RECORD')
                      : (formData.code || generateOrganizationCode(formData.name) || 'AUTO_GENERATED')}
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
              maxWidth: '460px',
              padding: '2rem',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-danger-bg)',
                  color: '#fda4af',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Delete Organization?
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Code: {deleteCandidate.code}
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Are you sure you want to permanently delete{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{deleteCandidate.name}</strong>? All associated tenant configurations will be permanently removed. This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
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
                onClick={handleDeleteOrganization}
                disabled={isSubmitting}
                className="btn btn-danger"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="loading-spinner" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Organization</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
