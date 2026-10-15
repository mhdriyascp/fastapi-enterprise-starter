'use client';

import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import {
  MasterCountry,
  MasterState,
  MasterCity,
  MasterCurrency,
  MasterTimeZone,
  MasterLanguage,
  MasterIndustry,
  MasterUnitOfMeasure,
  MasterTypeEntity,
  MasterListResponse,
} from '@/lib/types';
import {
  Globe,
  Coins,
  MapPin,
  Building,
  Clock,
  Languages,
  Briefcase,
  Scale,
  Home,
  MessageSquare,
  FileText,
  CreditCard,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  Layers,
  Sparkles,
  Database,
  X,
  AlertCircle,
} from 'lucide-react';

/** Master entity definition descriptor */
interface MasterConfig {
  key: string;
  title: string;
  singular: string;
  category: 'Geographic & Regional' | 'Financial & Commerce' | 'Classifications' | 'System Types';
  endpoint: string;
  icon: React.ReactNode;
  description: string;
  codeLabel?: string;
  hasCountry?: boolean;
  hasState?: boolean;
}

const MASTER_CONFIGS: MasterConfig[] = [
  // Geographic & Regional
  {
    key: 'countries',
    title: 'Countries',
    singular: 'Country',
    category: 'Geographic & Regional',
    endpoint: '/masters/countries',
    icon: <Globe size={16} />,
    description: 'Sovereign territories, ISO codes, phone prefixes, and national jurisdictions.',
    codeLabel: 'ISO Alpha-2 Code',
  },
  {
    key: 'states',
    title: 'States & Provinces',
    singular: 'State / Province',
    category: 'Geographic & Regional',
    endpoint: '/masters/states',
    icon: <MapPin size={16} />,
    description: 'Sub-national administrative divisions, federal states, and regional provinces.',
    codeLabel: 'State Code',
    hasCountry: true,
  },
  {
    key: 'cities',
    title: 'Cities',
    singular: 'City',
    category: 'Geographic & Regional',
    endpoint: '/masters/cities',
    icon: <Building size={16} />,
    description: 'Municipalities, metropolitan urban centers, and local operational cities.',
    hasCountry: true,
    hasState: true,
  },
  {
    key: 'time-zones',
    title: 'Time Zones',
    singular: 'Time Zone',
    category: 'Geographic & Regional',
    endpoint: '/masters/time-zones',
    icon: <Clock size={16} />,
    description: 'Standard IANA time zone identifiers and UTC offsets for schedule precision.',
    codeLabel: 'IANA Name',
  },

  // Financial & Commerce
  {
    key: 'currencies',
    title: 'Currencies',
    singular: 'Currency',
    category: 'Financial & Commerce',
    endpoint: '/masters/currencies',
    icon: <Coins size={16} />,
    description: 'Global ISO currency codes, symbols, decimal precision, and exchange tenders.',
    codeLabel: 'ISO 4217 Code',
  },
  {
    key: 'units-of-measure',
    title: 'Units of Measure',
    singular: 'Unit of Measure',
    category: 'Financial & Commerce',
    endpoint: '/masters/units-of-measure',
    icon: <Scale size={16} />,
    description: 'Quantifiable measurement units, weight, volume, length, and catalog metric tiers.',
    codeLabel: 'Unit Code',
  },

  // Classifications
  {
    key: 'industries',
    title: 'Industries',
    singular: 'Industry',
    category: 'Classifications',
    endpoint: '/masters/industries',
    icon: <Briefcase size={16} />,
    description: 'Standard industry verticals and corporate commercial classifications.',
    codeLabel: 'Industry Code',
  },
  {
    key: 'languages',
    title: 'Languages',
    singular: 'Language',
    category: 'Classifications',
    endpoint: '/masters/languages',
    icon: <Languages size={16} />,
    description: 'Official communication languages, locale codes, and vernacular native scripts.',
    codeLabel: 'Locale Code',
  },

  // System Types
  {
    key: 'address-types',
    title: 'Address Types',
    singular: 'Address Type',
    category: 'System Types',
    endpoint: '/masters/address-types',
    icon: <Home size={16} />,
    description: 'Location taxonomies (e.g. Registered Headquarters, Billing, Shipping, Branch).',
    codeLabel: 'Type Code',
  },
  {
    key: 'communication-types',
    title: 'Communication Types',
    singular: 'Communication Type',
    category: 'System Types',
    endpoint: '/masters/communication-types',
    icon: <MessageSquare size={16} />,
    description: 'Contact channels (e.g. Primary Email, Direct Phone, WhatsApp, Support Portal).',
    codeLabel: 'Channel Code',
  },
  {
    key: 'document-types',
    title: 'Document Types',
    singular: 'Document Type',
    category: 'System Types',
    endpoint: '/masters/document-types',
    icon: <FileText size={16} />,
    description: 'Commercial documentation contracts (e.g. Master Service Agreement, NDA, Invoice).',
    codeLabel: 'Document Code',
  },
  {
    key: 'identification-types',
    title: 'Identification Types',
    singular: 'Identification Type',
    category: 'System Types',
    endpoint: '/masters/identification-types',
    icon: <CreditCard size={16} />,
    description: 'Identity verification credentials (e.g. Passport, Tax ID, National Identity, CRN).',
    codeLabel: 'ID Type Code',
  },
];

type MasterRecord =
  | MasterCountry
  | MasterState
  | MasterCity
  | MasterCurrency
  | MasterTimeZone
  | MasterLanguage
  | MasterIndustry
  | MasterUnitOfMeasure
  | MasterTypeEntity;

function MastersWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams ? searchParams.get('tab') : null;
  const activeTab = rawTab && MASTER_CONFIGS.some((c) => c.key === rawTab) ? rawTab : 'countries';

  const activeConfig = useMemo(() => {
    return MASTER_CONFIGS.find((c) => c.key === activeTab) || MASTER_CONFIGS[0];
  }, [activeTab]);

  const asDict = (rec: unknown): Record<string, unknown> => {
    return (rec || {}) as Record<string, unknown>;
  };

  const setActiveTab = (tabKey: string) => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    params.set('tab', tabKey);
    params.delete('search');
    router.replace(`/masters?${params.toString()}`, { scroll: false });
  };

  const { toast } = useToast();

  // Master Data State
  const [records, setRecords] = useState<MasterRecord[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Related lookups for dropdowns in forms
  const [countriesLookup, setCountriesLookup] = useState<MasterCountry[]>([]);
  const [statesLookup, setStatesLookup] = useState<MasterState[]>([]);

  // Modal States
  const [viewingRecord, setViewingRecord] = useState<MasterRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<MasterRecord | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [deletingRecord, setDeletingRecord] = useState<MasterRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form Fields State
  const [formData, setFormData] = useState<Record<string, unknown>>({
    name: '',
    code: '',
    iso3_code: '',
    phone_code: '',
    symbol: '',
    decimal_places: 2,
    label: '',
    utc_offset: '',
    native_name: '',
    description: '',
    category: '',
    country_public_id: '',
    state_public_id: '',
    is_active: true,
  });

  // Load records for active master
  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      let filterParam = '';
      if (statusFilter === 'active') filterParam = '&is_active=true';
      if (statusFilter === 'inactive') filterParam = '&is_active=false';

      const res = await apiFetch<MasterListResponse<MasterRecord>>(
        `${activeConfig.endpoint}?limit=100&offset=0${filterParam}`
      );
      setRecords(res.items || []);
      setTotalCount(res.total || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to load ${activeConfig.title}.`;
      toast.error(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeConfig, statusFilter, toast]);

  // Initial and tab change load
  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        let filterParam = '';
        if (statusFilter === 'active') filterParam = '&is_active=true';
        if (statusFilter === 'inactive') filterParam = '&is_active=false';

        const res = await apiFetch<MasterListResponse<MasterRecord>>(
          `${activeConfig.endpoint}?limit=100&offset=0${filterParam}`
        );
        if (!ignore) {
          setRecords(res.items || []);
          setTotalCount(res.total || 0);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : `Failed to load ${activeConfig.title}.`;
          toast.error(msg);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [activeConfig, statusFilter, toast]);

  // Load countries lookup for State/City creation if needed
  useEffect(() => {
    if (activeConfig.hasCountry && countriesLookup.length === 0) {
      apiFetch<MasterListResponse<MasterCountry>>('/masters/countries?limit=100&is_active=true')
        .then((res) => setCountriesLookup(res.items || []))
        .catch(() => {});
    }
  }, [activeConfig.hasCountry, countriesLookup.length]);

  // Load states lookup if country selected in City form
  const handleCountryChangeInForm = async (countryPublicId: string) => {
    setFormData((prev) => ({ ...prev, country_public_id: countryPublicId, state_public_id: '' }));
    if (countryPublicId) {
      try {
        const res = await apiFetch<MasterListResponse<MasterState>>(
          `/masters/states?limit=100&country_public_id=${countryPublicId}&is_active=true`
        );
        setStatesLookup(res.items || []);
      } catch {
        setStatesLookup([]);
      }
    } else {
      setStatesLookup([]);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setFormData({
      name: '',
      code: '',
      iso3_code: '',
      phone_code: '',
      symbol: '',
      decimal_places: 2,
      label: '',
      utc_offset: '',
      native_name: '',
      description: '',
      category: 'Weight',
      country_public_id: countriesLookup[0]?.public_id || '',
      state_public_id: '',
      is_active: true,
    });
    if (activeConfig.hasState && countriesLookup[0]?.public_id) {
      handleCountryChangeInForm(countriesLookup[0].public_id);
    }
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (rec: MasterRecord) => {
    const raw = asDict(rec);
    setFormData({
      name: raw.name || '',
      code: raw.code || '',
      iso3_code: raw.iso3_code || '',
      phone_code: raw.phone_code || '',
      symbol: raw.symbol || '',
      decimal_places: raw.decimal_places ?? 2,
      label: raw.label || '',
      utc_offset: raw.utc_offset || '',
      native_name: raw.native_name || '',
      description: raw.description || '',
      category: raw.category || '',
      country_public_id: '',
      state_public_id: '',
      is_active: Boolean(raw.is_active),
    });
    setEditingRecord(rec);
  };

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {};

      if (formData.name) payload.name = (formData.name as string).trim();
      if (formData.code) payload.code = (formData.code as string).trim().toUpperCase();

      if (activeConfig.key === 'countries') {
        if (formData.iso3_code) payload.iso3_code = (formData.iso3_code as string).trim().toUpperCase();
        if (formData.phone_code) payload.phone_code = (formData.phone_code as string).trim();
      } else if (activeConfig.key === 'currencies') {
        if (formData.symbol) payload.symbol = (formData.symbol as string).trim();
        payload.decimal_places = Number(formData.decimal_places) || 2;
      } else if (activeConfig.key === 'time-zones') {
        payload.name = (formData.name as string).trim();
        payload.label = (formData.label as string).trim();
        if (formData.utc_offset) payload.utc_offset = (formData.utc_offset as string).trim();
      } else if (activeConfig.key === 'languages') {
        payload.code = (formData.code as string).trim().toLowerCase();
        if (formData.native_name) payload.native_name = (formData.native_name as string).trim();
      } else if (activeConfig.key === 'units-of-measure') {
        if (formData.symbol) payload.symbol = (formData.symbol as string).trim();
        if (formData.category) payload.category = (formData.category as string).trim();
      } else if (['industries', 'address-types', 'communication-types', 'document-types', 'identification-types'].includes(activeConfig.key)) {
        if (formData.description) payload.description = (formData.description as string).trim();
      } else if (activeConfig.key === 'states') {
        payload.country_public_id = formData.country_public_id;
        if (formData.code) payload.code = (formData.code as string).trim().toUpperCase();
      } else if (activeConfig.key === 'cities') {
        payload.country_public_id = formData.country_public_id;
        if (formData.state_public_id) payload.state_public_id = formData.state_public_id;
      }

      await apiFetch(activeConfig.endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      toast.success(`${activeConfig.singular} created successfully!`);
      setIsCreateModalOpen(false);
      loadRecords();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to create ${activeConfig.singular}.`;
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {};

      if (formData.name) payload.name = (formData.name as string).trim();
      if (formData.code) payload.code = (formData.code as string).trim().toUpperCase();
      payload.is_active = Boolean(formData.is_active);

      if (activeConfig.key === 'countries') {
        payload.iso3_code = formData.iso3_code ? (formData.iso3_code as string).trim().toUpperCase() : null;
        payload.phone_code = formData.phone_code ? (formData.phone_code as string).trim() : null;
      } else if (activeConfig.key === 'currencies') {
        payload.symbol = formData.symbol ? (formData.symbol as string).trim() : null;
        payload.decimal_places = Number(formData.decimal_places) || 2;
      } else if (activeConfig.key === 'time-zones') {
        payload.name = (formData.name as string).trim();
        payload.label = (formData.label as string).trim();
        payload.utc_offset = formData.utc_offset ? (formData.utc_offset as string).trim() : null;
      } else if (activeConfig.key === 'languages') {
        payload.code = (formData.code as string).trim().toLowerCase();
        payload.native_name = formData.native_name ? (formData.native_name as string).trim() : null;
      } else if (activeConfig.key === 'units-of-measure') {
        payload.symbol = formData.symbol ? (formData.symbol as string).trim() : null;
        payload.category = formData.category ? (formData.category as string).trim() : null;
      } else if (['industries', 'address-types', 'communication-types', 'document-types', 'identification-types'].includes(activeConfig.key)) {
        payload.description = formData.description ? (formData.description as string).trim() : null;
      }

      await apiFetch(`${activeConfig.endpoint}/${editingRecord.public_id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      toast.success(`${activeConfig.singular} updated successfully!`);
      setEditingRecord(null);
      loadRecords();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to update ${activeConfig.singular}.`;
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Toggle Status
  const handleToggleStatus = async (rec: MasterRecord) => {
    try {
      const newStatus = !rec.is_active;
      // Optimistic update
      setRecords((prev) =>
        prev.map((r) => (r.public_id === rec.public_id ? { ...r, is_active: newStatus } : r))
      );

      await apiFetch(`${activeConfig.endpoint}/${rec.public_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: newStatus }),
      });

      toast.success(`Status updated: ${newStatus ? 'Active' : 'Inactive'}`);
    } catch (err: unknown) {
      loadRecords(); // Revert on failure
      const msg = err instanceof Error ? err.message : 'Failed to toggle status.';
      toast.error(msg);
    }
  };

  // Handle Deactivate Confirm
  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;
    setIsSubmitting(true);
    try {
      await apiFetch(`${activeConfig.endpoint}/${deletingRecord.public_id}`, {
        method: 'DELETE',
      });
      toast.success(`${activeConfig.singular} deactivated successfully.`);
      setDeletingRecord(null);
      loadRecords();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to deactivate ${activeConfig.singular}.`;
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered records based on live search
  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => {
      const raw = asDict(r);
      const matchName = String(raw.name || '').toLowerCase().includes(q);
      const matchCode = String(raw.code || '').toLowerCase().includes(q);
      const matchLabel = String(raw.label || '').toLowerCase().includes(q);
      const matchIso = String(raw.iso3_code || '').toLowerCase().includes(q);
      const matchPhone = String(raw.phone_code || '').toLowerCase().includes(q);
      const matchDesc = String(raw.description || '').toLowerCase().includes(q);
      return matchName || matchCode || matchLabel || matchIso || matchPhone || matchDesc;
    });
  }, [records, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
              }}
            >
              <Database size={20} />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
              Master Data Governance
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Centralized reference tables and system taxonomies across geographic, financial, and organizational domains.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            id="btn-sync-master"
            type="button"
            onClick={() => {
              setIsRefreshing(true);
              loadRecords();
            }}
            className="btn btn-secondary"
            disabled={isRefreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>

          <button
            id="btn-create-master"
            type="button"
            onClick={openCreateModal}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <Plus size={16} />
            <span>New {activeConfig.singular}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        <div className="card stat-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Master Domain
            </span>
            <span style={{ color: 'var(--accent-primary)' }}>{activeConfig.icon}</span>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
            {activeConfig.title}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {activeConfig.category}
          </div>
        </div>

        <div className="card stat-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Total Records
            </span>
            <Layers size={18} color="#6366f1" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            {totalCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Registered in catalog
          </div>
        </div>

        <div className="card stat-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Active Ratio
            </span>
            <CheckCircle size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>
            {records.filter((r) => r.is_active).length} / {records.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Operational records
          </div>
        </div>

        <div className="card stat-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Total Domains
            </span>
            <Sparkles size={18} color="#a855f7" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            12 Catalogs
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Standard master data
          </div>
        </div>
      </div>

      {/* Master Data Categories Navigator Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {MASTER_CONFIGS.map((cfg) => {
          const isActive = cfg.key === activeTab;
          return (
            <button
              key={cfg.key}
              type="button"
              id={`master-nav-${cfg.key}`}
              onClick={() => setActiveTab(cfg.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                fontWeight: isActive ? 700 : 500,
                background: isActive ? 'var(--accent-primary)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                transition: 'var(--transition)',
                flexShrink: 0,
              }}
            >
              <span>{cfg.icon}</span>
              <span>{cfg.title}</span>
            </button>
          );
        })}
      </div>

      {/* Table Filter & Search Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            id="btn-filter-status-all"
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`btn ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem' }}
          >
            All Statuses
          </button>
          <button
            id="btn-filter-status-active"
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`btn ${statusFilter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem' }}
          >
            Active Only
          </button>
          <button
            id="btn-filter-status-inactive"
            type="button"
            onClick={() => setStatusFilter('inactive')}
            className={`btn ${statusFilter === 'inactive' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem' }}
          >
            Inactive Only
          </button>
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            id="input-search-master"
            type="text"
            className="input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeConfig.title}...`}
            style={{ paddingLeft: '2.25rem', height: '38px', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* Live Data Table */}
      <div className="table-container card">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Name / Label</th>
              {activeConfig.codeLabel && <th>{activeConfig.codeLabel}</th>}
              {activeConfig.key === 'countries' && <th>ISO3 Code</th>}
              {activeConfig.key === 'countries' && <th>Phone Code</th>}
              {activeConfig.key === 'currencies' && <th>Symbol</th>}
              {activeConfig.key === 'currencies' && <th>Decimals</th>}
              {activeConfig.key === 'time-zones' && <th>UTC Offset</th>}
              {activeConfig.key === 'languages' && <th>Native Script</th>}
              {activeConfig.key === 'units-of-measure' && <th>Category</th>}
              {activeConfig.key === 'states' && <th>Country Code</th>}
              {activeConfig.key === 'cities' && <th>Region</th>}
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '3rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <RefreshCw size={24} className="animate-spin" color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      Loading {activeConfig.title}...
                    </span>
                  </div>
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '3.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <Database size={32} color="var(--text-muted)" />
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      No {activeConfig.title} Records Found
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: '380px' }}>
                      {searchQuery
                        ? `No matching records for "${searchQuery}". Clear your search query to view all items.`
                        : `No entries registered in this catalog yet. Click "New ${activeConfig.singular}" to create the first record.`}
                    </p>
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8125rem' }}
                      >
                        Clear Search Filter
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec, index) => {
                const raw = asDict(rec);
                const nameDisplay = String(raw.name || raw.label || 'Unnamed');
                const codeDisplay = String(raw.code || raw.name || '—');

                return (
                  <tr key={rec.public_id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{index + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'var(--accent-glow)',
                            color: 'var(--accent-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {nameDisplay.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{nameDisplay}</div>
                          {raw.description ? (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {String(raw.description)}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    {activeConfig.codeLabel && (
                      <td>
                        <span className="badge badge-neutral" style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {codeDisplay}
                        </span>
                      </td>
                    )}

                    {activeConfig.key === 'countries' && (
                      <td>
                        <span className="badge badge-neutral" style={{ fontFamily: 'monospace' }}>
                          {String(raw.iso3_code || '—')}
                        </span>
                      </td>
                    )}

                    {activeConfig.key === 'countries' && (
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {String(raw.phone_code || '—')}
                      </td>
                    )}

                    {activeConfig.key === 'currencies' && (
                      <td>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          {String(raw.symbol || '—')}
                        </span>
                      </td>
                    )}

                    {activeConfig.key === 'currencies' && (
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {String(raw.decimal_places ?? 2)} decimals
                      </td>
                    )}

                    {activeConfig.key === 'time-zones' && (
                      <td>
                        <span className="badge badge-neutral" style={{ fontFamily: 'monospace' }}>
                          {String(raw.utc_offset || 'UTC')}
                        </span>
                      </td>
                    )}

                    {activeConfig.key === 'languages' && (
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {String(raw.native_name || '—')}
                      </td>
                    )}

                    {activeConfig.key === 'units-of-measure' && (
                      <td>
                        <span className="badge badge-primary">{String(raw.category || 'Standard')}</span>
                      </td>
                    )}

                    {activeConfig.key === 'states' && (
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {countriesLookup.find((c) => (c as unknown as { id: number }).id === raw.country_id)?.code ||
                          countriesLookup.find((c) => (c as unknown as { id: number }).id === raw.country_id)?.name ||
                          'Linked Country'}
                      </td>
                    )}

                    {activeConfig.key === 'cities' && (
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {countriesLookup.find((c) => (c as unknown as { id: number }).id === raw.country_id)?.name || 'Urban Region'}
                      </td>
                    )}

                    {/* Status Column with Quick Toggle Button */}
                    <td>
                      <button
                        id={`btn-toggle-status-${rec.public_id}`}
                        type="button"
                        onClick={() => handleToggleStatus(rec)}
                        title={`Click to toggle status to ${rec.is_active ? 'Inactive' : 'Active'}`}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0.2rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <span className={`badge ${rec.is_active ? 'badge-success' : 'badge-neutral'}`}>
                          {rec.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </button>
                    </td>

                    {/* Actions Column */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button
                          id={`btn-view-${rec.public_id}`}
                          type="button"
                          onClick={() => setViewingRecord(rec)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                          title="View record specifications"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                        <button
                          id={`btn-edit-${rec.public_id}`}
                          type="button"
                          onClick={() => openEditModal(rec)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                          title="Edit record details"
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          id={`btn-delete-${rec.public_id}`}
                          type="button"
                          onClick={() => setDeletingRecord(rec)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', color: '#ef4444' }}
                          title="Deactivate record"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* View Detail Modal (.detail-spec-table) */}
      {/* ========================================================================= */}
      {viewingRecord && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingRecord(null);
          }}
        >
          <div
            className="modal-dialog card"
            style={{
              maxWidth: '650px',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
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
                  {activeConfig.icon}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    {String(asDict(viewingRecord).name || asDict(viewingRecord).label || activeConfig.singular)}
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {activeConfig.title} Catalog Entry
                  </span>
                </div>
              </div>
              <button
                id="btn-close-view-master"
                type="button"
                onClick={() => setViewingRecord(null)}
                className="btn btn-secondary"
                style={{ padding: '0.4rem', borderRadius: '50%' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Spec Tables */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Master Identity & System Key
              </div>
              <table className="detail-spec-table">
                <tbody>
                  <tr>
                    <th>Entity Domain</th>
                    <td>{activeConfig.title} ({activeConfig.category})</td>
                  </tr>
                  <tr>
                    <th>Lifecycle Status</th>
                    <td>
                      <span className={`badge ${viewingRecord.is_active ? 'badge-success' : 'badge-neutral'}`}>
                        {viewingRecord.is_active ? 'Active & Operational' : 'Inactive & Archived'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '0.5rem' }}>
                Domain Attributes
              </div>
              <table className="detail-spec-table">
                <tbody>
                  {Object.entries(asDict(viewingRecord))
                    .filter(([k]) => !['public_id', 'is_active', 'id'].includes(k))
                    .map(([key, val]) => (
                      <tr key={key}>
                        <th style={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</th>
                        <td>{val !== null && val !== undefined ? String(val) : '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              <button
                type="button"
                onClick={() => {
                  const rec = viewingRecord;
                  setViewingRecord(null);
                  openEditModal(rec);
                }}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <Edit2 size={14} />
                <span>Edit Record</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Create Modal */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateModalOpen(false);
          }}
        >
          <div
            className="modal-dialog card"
            style={{
              maxWidth: '560px',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Create New {activeConfig.singular}
                </h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Register a new record in the {activeConfig.title} catalog
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '0.4rem', borderRadius: '50%' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Primary Name Field */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  {activeConfig.key === 'time-zones' ? 'IANA Canonical Identifier *' : 'Display Name *'}
                </label>
                <input
                  id="input-create-name"
                  type="text"
                  required
                  className="input"
                  value={String(formData.name || '')}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={activeConfig.key === 'time-zones' ? 'e.g. America/New_York or Asia/Dubai' : `e.g. ${activeConfig.singular} Name`}
                />
              </div>

              {/* Code field if applicable */}
              {activeConfig.codeLabel && activeConfig.key !== 'time-zones' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    {activeConfig.codeLabel} *
                  </label>
                  <input
                    id="input-create-code"
                    type="text"
                    required
                    className="input"
                    value={String(formData.code || '')}
                    onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder={`e.g. ${activeConfig.key === 'countries' ? 'US' : activeConfig.key === 'currencies' ? 'USD' : 'CODE'}`}
                    maxLength={activeConfig.key === 'countries' ? 2 : activeConfig.key === 'currencies' ? 3 : 30}
                    style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                  />
                </div>
              )}

              {/* Country specifics */}
              {activeConfig.key === 'countries' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      ISO3 Alpha-3 Code
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={String(formData.iso3_code || '')}
                      onChange={(e) => setFormData((prev) => ({ ...prev, iso3_code: e.target.value.toUpperCase() }))}
                      placeholder="e.g. USA"
                      maxLength={3}
                      style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Phone Calling Prefix
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={String(formData.phone_code || '')}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone_code: e.target.value }))}
                      placeholder="e.g. +1 or +971"
                    />
                  </div>
                </div>
              )}

              {/* Currency specifics */}
              {activeConfig.key === 'currencies' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Currency Symbol
                    </label>
                    <input
                      id="input-create-symbol"
                      type="text"
                      className="input"
                      value={String(formData.symbol || '')}
                      onChange={(e) => setFormData((prev) => ({ ...prev, symbol: e.target.value }))}
                      placeholder="e.g. $, €, ₹, د.إ"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Decimal Precision
                    </label>
                    <input
                      id="input-create-decimals"
                      type="number"
                      min={0}
                      max={4}
                      className="input"
                      value={Number(formData.decimal_places ?? 2)}
                      onChange={(e) => setFormData((prev) => ({ ...prev, decimal_places: parseInt(e.target.value, 10) || 0 }))}
                    />
                  </div>
                </div>
              )}

              {/* TimeZone specifics */}
              {activeConfig.key === 'time-zones' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Friendly Label *
                    </label>
                    <input
                      type="text"
                      required
                      className="input"
                      value={String(formData.label || '')}
                      onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
                      placeholder="e.g. Eastern Time (US & Canada)"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      UTC Offset
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={String(formData.utc_offset || '')}
                      onChange={(e) => setFormData((prev) => ({ ...prev, utc_offset: e.target.value }))}
                      placeholder="e.g. -05:00 or +04:00"
                    />
                  </div>
                </div>
              )}

              {/* Language specifics */}
              {activeConfig.key === 'languages' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Native Vernacular Script
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={String(formData.native_name || '')}
                    onChange={(e) => setFormData((prev) => ({ ...prev, native_name: e.target.value }))}
                    placeholder="e.g. العربية or Español"
                  />
                </div>
              )}

              {/* Unit of measure specifics */}
              {activeConfig.key === 'units-of-measure' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Symbol / Abbreviation
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={String(formData.symbol || '')}
                      onChange={(e) => setFormData((prev) => ({ ...prev, symbol: e.target.value }))}
                      placeholder="e.g. kg, l, m"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Category
                    </label>
                    <select
                      className="input"
                      value={String(formData.category || 'Weight')}
                      onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                    >
                      <option value="Weight">Weight</option>
                      <option value="Length">Length</option>
                      <option value="Volume">Volume</option>
                      <option value="Time">Time</option>
                      <option value="Quantity">Quantity / Each</option>
                    </select>
                  </div>
                </div>
              )}

              {/* State / City Country Selector */}
              {activeConfig.hasCountry && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Parent Country *
                  </label>
                  <select
                    required
                    className="input"
                    value={String(formData.country_public_id || '')}
                    onChange={(e) => handleCountryChangeInForm(e.target.value)}
                  >
                    <option value="">Select a country...</option>
                    {countriesLookup.map((c) => (
                      <option key={c.public_id} value={c.public_id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* City State Selector */}
              {activeConfig.hasState && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Parent State / Province (Optional)
                  </label>
                  <select
                    className="input"
                    value={String(formData.state_public_id || '')}
                    onChange={(e) => setFormData((prev) => ({ ...prev, state_public_id: e.target.value }))}
                  >
                    <option value="">None / Federal Municipality</option>
                    {statesLookup.map((s) => (
                      <option key={s.public_id} value={s.public_id}>
                        {s.name} {s.code ? `(${s.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Description field for taxonomy types */}
              {['industries', 'address-types', 'communication-types', 'document-types', 'identification-types'].includes(activeConfig.key) && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Description
                  </label>
                  <textarea
                    rows={3}
                    className="input"
                    value={String(formData.description || '')}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief explanatory scope for this classification..."
                    style={{ resize: 'vertical' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                <button
                  id="btn-cancel-create-master"
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  id="btn-save-create-master"
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
                >
                  {isSubmitting && <RefreshCw size={14} className="animate-spin" />}
                  <span>Save Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Edit Modal */}
      {/* ========================================================================= */}
      {editingRecord && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingRecord(null);
          }}
        >
          <div
            className="modal-dialog card"
            style={{
              maxWidth: '560px',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Edit {activeConfig.singular}
                </h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Update catalog attributes and operational state
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="btn btn-secondary"
                style={{ padding: '0.4rem', borderRadius: '50%' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Primary Name Field */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  {activeConfig.key === 'time-zones' ? 'IANA Canonical Identifier' : 'Display Name'}
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  value={String(formData.name || '')}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              {/* Code field */}
              {activeConfig.codeLabel && activeConfig.key !== 'time-zones' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    {activeConfig.codeLabel}
                  </label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={String(formData.code || '')}
                    onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                  />
                </div>
              )}

              {/* Specific fields */}
              {activeConfig.key === 'countries' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      ISO3 Alpha-3 Code
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={String(formData.iso3_code || '')}
                      onChange={(e) => setFormData((prev) => ({ ...prev, iso3_code: e.target.value.toUpperCase() }))}
                      maxLength={3}
                      style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Phone Calling Prefix
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={String(formData.phone_code || '')}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone_code: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {activeConfig.key === 'currencies' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Symbol
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={String(formData.symbol || '')}
                      onChange={(e) => setFormData((prev) => ({ ...prev, symbol: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Decimal Precision
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={4}
                      className="input"
                      value={Number(formData.decimal_places ?? 2)}
                      onChange={(e) => setFormData((prev) => ({ ...prev, decimal_places: parseInt(e.target.value, 10) || 0 }))}
                    />
                  </div>
                </div>
              )}

              {activeConfig.key === 'time-zones' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Label
                    </label>
                    <input
                      type="text"
                      required
                      className="input"
                      value={String(formData.label || '')}
                      onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      UTC Offset
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={String(formData.utc_offset || '')}
                      onChange={(e) => setFormData((prev) => ({ ...prev, utc_offset: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {/* Status Toggle in Edit Form */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Active Lifecycle Status
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Whether this record is operational and available in client forms
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(formData.is_active)}
                  onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
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
                  {isSubmitting && <RefreshCw size={14} className="animate-spin" />}
                  <span>Update Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Deactivate / Delete Confirmation Dialog */}
      {/* ========================================================================= */}
      {deletingRecord && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeletingRecord(null);
          }}
        >
          <div
            className="modal-dialog card"
            style={{
              maxWidth: '440px',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Deactivate {activeConfig.singular}?
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  This will change the operational state to inactive.
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Are you sure you want to deactivate{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {String(asDict(deletingRecord).name || asDict(deletingRecord).label || 'this record')}
              </strong>
              ? Inactive master records will no longer appear in operational dropdown selectors.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setDeletingRecord(null)}
                className="btn btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
              >
                {isSubmitting ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MastersPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
          <RefreshCw size={28} className="animate-spin" color="var(--accent-primary)" />
        </div>
      }
    >
      <MastersWorkspace />
    </Suspense>
  );
}
