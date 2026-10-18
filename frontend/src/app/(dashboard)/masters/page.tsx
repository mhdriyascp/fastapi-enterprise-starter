'use client';

import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import { useAuth } from '@/lib/auth-context';
import { generateMasterCode } from '@/lib/code-generator';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { FormattedDate } from '@/components/ui/formatted-date';
import { SearchableSelect, SelectOption } from '@/components/ui/searchable-select';
import { useDefaultPageSize } from '@/lib/use-page-size';
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
  MasterBrand,
  MasterTax,
  MasterAddress,
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
  RotateCcw,
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  Layers,
  Sparkles,
  Database,
  X,
  AlertCircle,
  Percent,
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
    key: 'addresses',
    title: 'Addresses',
    singular: 'Address',
    category: 'Geographic & Regional',
    endpoint: '/masters/addresses',
    icon: <Home size={16} />,
    description: 'Physical postal locations, facilities, operating headquarters, and verified addresses.',
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
    key: 'taxes',
    title: 'Taxes & Tariffs',
    singular: 'Tax Rate',
    category: 'Financial & Commerce',
    endpoint: '/masters/taxes',
    icon: <Percent size={16} />,
    description: 'Fiscal tax levies, VAT, GST, state duties, and jurisdiction calculation rules.',
    codeLabel: 'Tax Code',
    hasCountry: true,
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
    key: 'brands',
    title: 'Brands & Trademarks',
    singular: 'Brand',
    category: 'Classifications',
    endpoint: '/masters/brands',
    icon: <Sparkles size={16} />,
    description: 'Commercial trademarks, registered brands, and company trade lines.',
    codeLabel: 'Brand Code',
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
  | MasterTypeEntity
  | MasterBrand
  | MasterTax
  | MasterAddress;

function MastersWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams ? searchParams.get('tab') : null;
  const activeTab = useMemo(() => {
    return rawTab && MASTER_CONFIGS.some((c) => c.key === rawTab) ? rawTab : 'countries';
  }, [rawTab]);

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
  const { user } = useAuth();

  const isAdmin = useMemo(() => {
    if (!user) return false;
    if (user.is_super_admin) return true;
    return (user.roles || []).some((r: string) =>
      ['super_admin', 'superadmin', 'admin', 'system_admin'].includes(r.toLowerCase())
    );
  }, [user]);

  // Master Data State
  const [records, setRecords] = useState<MasterRecord[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'deleted'>('all');
  const [pageSize] = useDefaultPageSize(15);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Related lookups for dropdowns in forms
  const [countriesLookup, setCountriesLookup] = useState<MasterCountry[]>([]);
  const [statesLookup, setStatesLookup] = useState<MasterState[]>([]);
  const [addressTypesLookup, setAddressTypesLookup] = useState<MasterTypeEntity[]>([]);
  const [currenciesLookup, setCurrenciesLookup] = useState<MasterCurrency[]>([]);

  // Manual code catalog check (Country ISO, State Abbreviation, Currency ISO 4217 are user-controlled, not read-only system slugs)
  const isManualCodeMaster = useMemo(() => {
    return ['countries', 'states', 'currencies'].includes(activeConfig.key);
  }, [activeConfig.key]);

  // Memoized Select2 options for Form comboboxes
  const countrySelectOptions: SelectOption[] = useMemo(() => {
    return countriesLookup.map((c) => ({
      value: String(c.id),
      label: `${c.name} (${c.code})`,
      sublabel: c.code,
      badge: c.iso3_code || undefined,
    }));
  }, [countriesLookup]);

  const currencySelectOptions: SelectOption[] = useMemo(() => {
    return currenciesLookup.map((curr) => ({
      value: String(curr.id ?? ''),
      label: `${curr.name} (${curr.code})`,
      sublabel: curr.symbol ? `Symbol: ${curr.symbol}` : curr.code,
      badge: curr.symbol || undefined,
    }));
  }, [currenciesLookup]);

  const stateSelectOptions: SelectOption[] = useMemo(() => {
    return statesLookup.map((s) => ({
      value: String(s.id),
      label: s.code ? `${s.name} (${s.code})` : s.name,
      sublabel: s.code || undefined,
    }));
  }, [statesLookup]);

  const taxTypeSelectOptions: SelectOption[] = useMemo(() => [
    { value: 'percentage', label: 'Percentage (%)', sublabel: 'Proportional tax calculation' },
    { value: 'fixed', label: 'Fixed Levy', sublabel: 'Flat transaction duty' },
  ], []);

  const uomCategorySelectOptions: SelectOption[] = useMemo(() => [
    { value: 'Weight', label: 'Weight', sublabel: 'Mass (kg, g, lb)' },
    { value: 'Length', label: 'Length', sublabel: 'Linear (m, cm, ft)' },
    { value: 'Volume', label: 'Volume', sublabel: 'Capacity (l, ml, gal)' },
    { value: 'Time', label: 'Time', sublabel: 'Duration (hr, min, sec)' },
    { value: 'Quantity', label: 'Quantity / Each', sublabel: 'Count (pcs, box, pack)' },
  ], []);

  const addressTypeSelectOptions: SelectOption[] = useMemo(() => {
    if (addressTypesLookup.length === 0) {
      return [{ value: '1', label: 'Primary / Registered', sublabel: 'HQ' }];
    }
    return addressTypesLookup.map((t) => ({
      value: String((t as unknown as { id: number }).id || 1),
      label: `${t.name} (${t.code})`,
      sublabel: t.code,
    }));
  }, [addressTypesLookup]);

  // Modal States
  const [viewingRecord, setViewingRecord] = useState<MasterRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<MasterRecord | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [deletingRecord, setDeletingRecord] = useState<MasterRecord | null>(null);
  const [isHardDelete, setIsHardDelete] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState<boolean>(false);
  const [bulkHardDeleteRequested, setBulkHardDeleteRequested] = useState<boolean>(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
  const [bulkRestoreConfirmOpen, setBulkRestoreConfirmOpen] = useState<boolean>(false);
  const [isBulkRestoring, setIsBulkRestoring] = useState<boolean>(false);
  const [restoreCandidate, setRestoreCandidate] = useState<MasterRecord | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  const canRestore = useMemo(() => {
    if (!user) return false;
    if (user.is_super_admin) return true;
    return Boolean(
      isAdmin ||
      user?.permissions?.includes('masters:restore') ||
      user?.permissions?.includes('masters.restore') ||
      user?.permissions?.includes('*.manage')
    );
  }, [isAdmin, user]);

  const canHardDelete = useMemo(() => {
    if (!user) return false;
    return Boolean(
      isAdmin ||
      user.is_super_admin ||
      user?.permissions?.includes('masters:hard_delete') ||
      user?.permissions?.includes('*.hard_delete')
    );
  }, [isAdmin, user]);

  const canDelete = useMemo(() => {
    if (!user) return false;
    return Boolean(
      isAdmin ||
      user.is_super_admin ||
      user?.permissions?.includes('masters:delete') ||
      user?.permissions?.includes('masters.delete') ||
      user?.permissions?.includes('*.manage')
    );
  }, [isAdmin, user]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isCustomCodeEntered, setIsCustomCodeEntered] = useState<boolean>(false);

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
    country_id: '',
    default_currency_id: '',
    state_id: '',
    city_id: '',
    rate: 0,
    tax_type: 'percentage',
    address_line1: '',
    address_line2: '',
    landmark: '',
    postal_code: '',
    address_type_id: 1,
    is_active: true,
  });

  // Load records for active master
  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const filterParam = isAdmin || canRestore || canHardDelete ? '&include_deleted=true' : '';

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
  }, [activeConfig, isAdmin, canRestore, canHardDelete, toast]);

  // Initial and tab change load
  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const filterParam = isAdmin || canRestore || canHardDelete ? '&include_deleted=true' : '';

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
  }, [activeConfig, isAdmin, canRestore, canHardDelete, statusFilter, toast]);

  // Load countries lookup for State/City creation if needed
  useEffect(() => {
    if (activeConfig.hasCountry && countriesLookup.length === 0) {
      apiFetch<MasterListResponse<MasterCountry>>('/masters/countries?limit=100&is_active=true')
        .then((res) => setCountriesLookup(res.items || []))
        .catch(() => {});
    }
  }, [activeConfig.hasCountry, countriesLookup.length]);

  // Load address types lookup if needed
  useEffect(() => {
    if (activeConfig.key === 'addresses' && addressTypesLookup.length === 0) {
      apiFetch<MasterListResponse<MasterTypeEntity>>('/masters/address-types?limit=100&is_active=true')
        .then((res) => setAddressTypesLookup(res.items || []))
        .catch(() => {});
    }
  }, [activeConfig.key, addressTypesLookup.length]);

  // Load currencies lookup for Country form if needed
  useEffect(() => {
    if (activeConfig.key === 'countries' && currenciesLookup.length === 0) {
      apiFetch<MasterListResponse<MasterCurrency>>('/masters/currencies?limit=100&is_active=true')
        .then((res) => setCurrenciesLookup(res.items || []))
        .catch(() => {});
    }
  }, [activeConfig.key, currenciesLookup.length]);

  // Load states lookup if country selected in City form
  const handleCountryChangeInForm = async (countryId: number | string) => {
    const numId = Number(countryId);
    setFormData((prev) => ({ ...prev, country_id: numId || '', state_id: '' }));
    if (numId) {
      try {
        const res = await apiFetch<MasterListResponse<MasterState>>(
          `/masters/states?limit=100&country_id=${numId}&is_active=true`
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
    setFieldErrors({});
    setIsCustomCodeEntered(false);
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
      country_id: countriesLookup[0]?.id || '',
      default_currency_id: '',
      state_id: '',
      city_id: '',
      rate: 0,
      tax_type: 'percentage',
      address_line1: '',
      address_line2: '',
      landmark: '',
      postal_code: '',
      address_type_id: addressTypesLookup[0]?.id || 1,
      is_active: true,
    });
    if (activeConfig.hasState && countriesLookup[0]?.id) {
      handleCountryChangeInForm(countriesLookup[0].id);
    }
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (rec: MasterRecord) => {
    setFieldErrors({});
    setIsCustomCodeEntered(true);
    const raw = asDict(rec);
    setFormData({
      name: raw.name || raw.address_line1 || '',
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
      country_id: raw.country_id || '',
      default_currency_id: raw.default_currency_id || '',
      state_id: raw.state_id || '',
      city_id: raw.city_id || '',
      rate: raw.rate !== undefined ? Number(raw.rate) : 0,
      tax_type: raw.tax_type || 'percentage',
      address_line1: raw.address_line1 || '',
      address_line2: raw.address_line2 || '',
      landmark: raw.landmark || '',
      postal_code: raw.postal_code || '',
      address_type_id: raw.address_type_id || 1,
      is_active: Boolean(raw.is_active),
    });
    if (raw.country_id) {
      handleCountryChangeInForm(raw.country_id as number);
    }
    setEditingRecord(rec);
  };

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    const nameVal = String(formData.name || '').trim();
    if (!nameVal) {
      errors.name = activeConfig.key === 'time-zones'
        ? 'IANA canonical identifier is required.'
        : activeConfig.key === 'addresses'
        ? 'Address line 1 is required.'
        : `${activeConfig.singular} name is required.`;
    }
    if (activeConfig.key === 'time-zones' && !String(formData.label || '').trim()) {
      errors.label = 'Friendly label is required.';
    }
    if (activeConfig.hasCountry && !formData.country_id) {
      errors.country_id = 'Parent country is required.';
    }
    if (activeConfig.key === 'countries') {
      const codeVal = String(formData.code || '').trim();
      if (!codeVal) {
        errors.code = 'ISO Alpha-2 code is required.';
      } else if (codeVal.length !== 2 || !/^[A-Za-z]{2}$/.test(codeVal)) {
        errors.code = 'ISO Alpha-2 code must be exactly 2 letters.';
      }

      const iso3Val = String(formData.iso3_code || '').trim();
      if (iso3Val && (iso3Val.length !== 3 || !/^[A-Za-z]{3}$/.test(iso3Val))) {
        errors.iso3_code = 'ISO Alpha-3 code must be exactly 3 letters.';
      }
    }
    if (activeConfig.key === 'currencies') {
      const codeVal = String(formData.code || '').trim().toUpperCase();
      if (!codeVal) {
        errors.code = 'ISO 4217 currency code is required.';
      } else if (codeVal.length !== 3 || !/^[A-Za-z]{3}$/.test(codeVal)) {
        errors.code = 'Currency code must be exactly 3 uppercase letters (e.g. USD, EUR, INR).';
      }
    }
    if (activeConfig.key === 'states') {
      const codeVal = String(formData.code || '').trim();
      if (codeVal && codeVal.length > 20) {
        errors.code = 'State code cannot exceed 20 characters.';
      }
    }
    if (activeConfig.key === 'taxes' && (formData.rate === undefined || formData.rate === null || isNaN(Number(formData.rate)))) {
      errors.rate = 'Tax rate is required.';
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {};

      const maxLen = activeConfig.key === 'countries' ? 2 : activeConfig.key === 'currencies' ? 3 : 30;
      if (formData.name) payload.name = (formData.name as string).trim();
      const rawCode = (formData.code ? String(formData.code) : (formData.name ? generateMasterCode(String(formData.name), maxLen) : '')).trim();
      if (rawCode) payload.code = activeConfig.key === 'languages' ? rawCode.toLowerCase() : rawCode.toUpperCase();

      if (activeConfig.key === 'countries') {
        const countryCode = String(formData.code || '').trim().toUpperCase();
        if (countryCode) payload.code = countryCode;
        const iso3 = formData.iso3_code ? String(formData.iso3_code).trim().toUpperCase() : null;
        if (iso3) payload.iso3_code = iso3;
        if (formData.phone_code) payload.phone_code = (formData.phone_code as string).trim();
        if (formData.default_currency_id) payload.default_currency_id = Number(formData.default_currency_id);
      } else if (activeConfig.key === 'currencies') {
        const currCode = String(formData.code || '').trim().toUpperCase();
        if (currCode) payload.code = currCode;
        if (formData.symbol) payload.symbol = (formData.symbol as string).trim();
        payload.decimal_places = Number(formData.decimal_places) || 2;
      } else if (activeConfig.key === 'time-zones') {
        payload.name = (formData.name as string).trim();
        payload.label = (formData.label as string).trim();
        if (formData.utc_offset) payload.utc_offset = (formData.utc_offset as string).trim();
      } else if (activeConfig.key === 'languages') {
        payload.code = (payload.code || (formData.name ? generateMasterCode(String(formData.name), 10) : '')).toString().toLowerCase();
        if (formData.native_name) payload.native_name = (formData.native_name as string).trim();
      } else if (activeConfig.key === 'units-of-measure') {
        if (formData.symbol) payload.symbol = (formData.symbol as string).trim();
        if (formData.category) payload.category = (formData.category as string).trim();
      } else if (activeConfig.key === 'taxes') {
        payload.name = (formData.name as string).trim();
        payload.code = (payload.code || (formData.name ? generateMasterCode(String(formData.name), 30) : '')).toString().toUpperCase();
        payload.rate = Number(formData.rate) || 0;
        payload.tax_type = (formData.tax_type as string) || 'percentage';
        payload.country_id = Number(formData.country_id);
      } else if (activeConfig.key === 'brands') {
        payload.name = (formData.name as string).trim();
        payload.code = (payload.code || (formData.name ? generateMasterCode(String(formData.name), 30) : '')).toString().toUpperCase();
        if (formData.description) payload.description = (formData.description as string).trim();
      } else if (activeConfig.key === 'addresses') {
        payload.address_line1 = (formData.address_line1 as string || formData.name as string || '').trim();
        if (formData.address_line2) payload.address_line2 = (formData.address_line2 as string).trim();
        if (formData.landmark) payload.landmark = (formData.landmark as string).trim();
        if (formData.postal_code) payload.postal_code = (formData.postal_code as string).trim();
        payload.country_id = Number(formData.country_id);
        if (formData.state_id) payload.state_id = Number(formData.state_id);
        if (formData.city_id) payload.city_id = Number(formData.city_id);
        payload.address_type_id = Number(formData.address_type_id) || 1;
      } else if (['industries', 'address-types', 'communication-types', 'document-types', 'identification-types'].includes(activeConfig.key)) {
        if (formData.description) payload.description = (formData.description as string).trim();
      } else if (activeConfig.key === 'states') {
        payload.country_id = Number(formData.country_id);
        if (formData.code) payload.code = String(formData.code).trim().toUpperCase();
        else if (formData.name) payload.code = generateMasterCode(String(formData.name), 10);
      } else if (activeConfig.key === 'cities') {
        payload.country_id = Number(formData.country_id);
        if (formData.state_id) payload.state_id = Number(formData.state_id);
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
    const errors: Record<string, string> = {};
    const nameVal = String(formData.name || '').trim();
    if (!nameVal) {
      errors.name = activeConfig.key === 'time-zones'
        ? 'IANA canonical identifier is required.'
        : activeConfig.key === 'addresses'
        ? 'Address line 1 is required.'
        : `${activeConfig.singular} name is required.`;
    }
    if (activeConfig.key === 'time-zones' && !String(formData.label || '').trim()) {
      errors.label = 'Friendly label is required.';
    }
    if (activeConfig.key === 'countries') {
      const codeVal = String(formData.code || '').trim();
      if (!codeVal) {
        errors.code = 'ISO Alpha-2 code is required.';
      } else if (codeVal.length !== 2 || !/^[A-Za-z]{2}$/.test(codeVal)) {
        errors.code = 'ISO Alpha-2 code must be exactly 2 letters.';
      }

      const iso3Val = String(formData.iso3_code || '').trim();
      if (iso3Val && (iso3Val.length !== 3 || !/^[A-Za-z]{3}$/.test(iso3Val))) {
        errors.iso3_code = 'ISO Alpha-3 code must be exactly 3 letters.';
      }
    }
    if (activeConfig.key === 'currencies') {
      const codeVal = String(formData.code || '').trim().toUpperCase();
      if (!codeVal) {
        errors.code = 'ISO 4217 currency code is required.';
      } else if (codeVal.length !== 3 || !/^[A-Za-z]{3}$/.test(codeVal)) {
        errors.code = 'Currency code must be exactly 3 uppercase letters (e.g. USD, EUR, INR).';
      }
    }
    if (activeConfig.key === 'states') {
      const codeVal = String(formData.code || '').trim();
      if (codeVal && codeVal.length > 20) {
        errors.code = 'State code cannot exceed 20 characters.';
      }
    }
    if (activeConfig.key === 'taxes' && (formData.rate === undefined || formData.rate === null || isNaN(Number(formData.rate)))) {
      errors.rate = 'Tax rate is required.';
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {};

      if (formData.name) payload.name = (formData.name as string).trim();
      if (!isManualCodeMaster && activeConfig.codeLabel && activeConfig.key !== 'time-zones') {
        const maxLen = activeConfig.key === 'titles' || activeConfig.key === 'languages' ? 10 : 30;
        const generated = generateMasterCode(String(formData.name), maxLen);
        payload.code = activeConfig.key === 'languages'
          ? (formData.code ? String(formData.code).trim().toLowerCase() : generated.toLowerCase())
          : (formData.code ? String(formData.code).trim().toUpperCase() : generated.toUpperCase());
      } else if (formData.code) {
        payload.code = (formData.code as string).trim().toUpperCase();
      }
      payload.is_active = Boolean(formData.is_active);

      if (activeConfig.key === 'countries') {
        if (formData.code) payload.code = (formData.code as string).trim().toUpperCase();
        payload.iso3_code = formData.iso3_code ? (formData.iso3_code as string).trim().toUpperCase() : null;
        payload.phone_code = formData.phone_code ? (formData.phone_code as string).trim() : null;
        payload.default_currency_id = formData.default_currency_id ? Number(formData.default_currency_id) : null;
      } else if (activeConfig.key === 'currencies') {
        if (formData.code) payload.code = String(formData.code).trim().toUpperCase();
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
      } else if (activeConfig.key === 'taxes') {
        if (formData.name) payload.name = (formData.name as string).trim();
        if (formData.code) payload.code = (formData.code as string).trim().toUpperCase();
        if (formData.rate !== undefined) payload.rate = Number(formData.rate);
        if (formData.tax_type) payload.tax_type = formData.tax_type;
        if (formData.country_id) payload.country_id = Number(formData.country_id);
      } else if (activeConfig.key === 'states') {
        if (formData.country_id) payload.country_id = Number(formData.country_id);
        if (formData.code) payload.code = String(formData.code).trim().toUpperCase();
      } else if (activeConfig.key === 'brands') {
        if (formData.name) payload.name = (formData.name as string).trim();
        if (formData.code) payload.code = (formData.code as string).trim().toUpperCase();
        payload.description = formData.description ? (formData.description as string).trim() : null;
      } else if (activeConfig.key === 'addresses') {
        if (formData.address_line1 || formData.name) {
          payload.address_line1 = (formData.address_line1 as string || formData.name as string).trim();
        }
        payload.address_line2 = formData.address_line2 ? (formData.address_line2 as string).trim() : null;
        payload.landmark = formData.landmark ? (formData.landmark as string).trim() : null;
        payload.postal_code = formData.postal_code ? (formData.postal_code as string).trim() : null;
        if (formData.country_id) payload.country_id = Number(formData.country_id);
        payload.state_id = formData.state_id ? Number(formData.state_id) : null;
        payload.city_id = formData.city_id ? Number(formData.city_id) : null;
        if (formData.address_type_id) payload.address_type_id = Number(formData.address_type_id);
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

  // Handle Deactivate / Delete Confirm
  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;
    setIsSubmitting(true);
    try {
      await apiFetch(`${activeConfig.endpoint}/${deletingRecord.public_id}?hard_delete=${isHardDelete}`, {
        method: 'DELETE',
      });
      toast.success(
        isHardDelete
          ? `${activeConfig.singular} purged successfully.`
          : `${activeConfig.singular} soft-deleted / deactivated successfully.`
      );
      setDeletingRecord(null);
      loadRecords();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to delete ${activeConfig.singular}.`;
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleSelectAll = (items: MasterRecord[]) => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((r) => r.public_id)));
    }
  };

  const handleToggleSelect = (id: string) => {
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
    const errors: string[] = [];

    for (const publicId of selectedIds) {
      try {
        const query = bulkHardDeleteRequested ? '?hard_delete=true' : '?hard_delete=false';
        await apiFetch(`${activeConfig.endpoint}/${publicId}${query}`, {
          method: 'DELETE',
        });
        successCount++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(msg);
      }
    }

    if (successCount > 0) {
      toast.success(
        bulkHardDeleteRequested
          ? `Successfully purged ${successCount} ${activeConfig.singular.toLowerCase()}(s) permanently.`
          : `Successfully soft-deleted ${successCount} ${activeConfig.singular.toLowerCase()}(s).`
      );
    }
    if (errors.length > 0) {
      toast.error(`Failed to delete ${errors.length} record(s): ${errors[0]}`);
    }

    setSelectedIds(new Set());
    setBulkDeleteConfirmOpen(false);
    setIsBulkDeleting(false);
    loadRecords();
  };

  const handleBulkRestore = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkRestoring(true);
    let successCount = 0;
    const errors: string[] = [];

    for (const publicId of selectedIds) {
      try {
        await apiFetch(`${activeConfig.endpoint}/${publicId}/restore`, {
          method: 'POST',
        });
        successCount++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(msg);
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully restored ${successCount} ${activeConfig.singular.toLowerCase()}(s).`);
    }
    if (errors.length > 0) {
      toast.error(`Failed to restore ${errors.length} record(s): ${errors[0]}`);
    }

    setSelectedIds(new Set());
    setBulkRestoreConfirmOpen(false);
    setIsBulkRestoring(false);
    loadRecords();
  };

  const handleConfirmRestore = async () => {
    if (!restoreCandidate) return;
    setIsRestoring(true);
    try {
      await apiFetch(`${activeConfig.endpoint}/${restoreCandidate.public_id}/restore`, {
        method: 'POST',
      });
      toast.success(`${activeConfig.singular} restored successfully.`);
      setRestoreCandidate(null);
      loadRecords();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to restore ${activeConfig.singular}.`;
      toast.error(msg);
    } finally {
      setIsRestoring(false);
    }
  };

  // Filtered records based on live search and active status filter
  const filteredRecords = useMemo(() => {
    let list = records;
    if (statusFilter === 'all') {
      list = list.filter((r) => !((r as unknown as { is_deleted?: boolean }).is_deleted));
    } else if (statusFilter === 'active') {
      list = list.filter((r) => r.is_active && !((r as unknown as { is_deleted?: boolean }).is_deleted));
    } else if (statusFilter === 'inactive') {
      list = list.filter((r) => !r.is_active && !((r as unknown as { is_deleted?: boolean }).is_deleted));
    } else if (statusFilter === 'deleted') {
      list = list.filter((r) => Boolean((r as unknown as { is_deleted?: boolean }).is_deleted));
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => {
      const raw = asDict(r);
      const matchName = String(raw.name || '').toLowerCase().includes(q);
      const matchCode = String(raw.code || '').toLowerCase().includes(q);
      const matchLabel = String(raw.label || '').toLowerCase().includes(q);
      const matchIso = String(raw.iso3_code || '').toLowerCase().includes(q);
      const matchPhone = String(raw.phone_code || '').toLowerCase().includes(q);
      const matchDesc = String(raw.description || '').toLowerCase().includes(q);
      const matchAddress =
        String(raw.address_line1 || '').toLowerCase().includes(q) ||
        String(raw.postal_code || '').toLowerCase().includes(q);
      return matchName || matchCode || matchLabel || matchIso || matchPhone || matchDesc || matchAddress;
    });
  }, [records, searchQuery, statusFilter]);

  const masterCounts = useMemo(() => {
    return {
      all: records.filter((r) => !((r as unknown as { is_deleted?: boolean }).is_deleted)).length,
      active: records.filter((r) => r.is_active && !((r as unknown as { is_deleted?: boolean }).is_deleted)).length,
      inactive: records.filter((r) => !r.is_active && !((r as unknown as { is_deleted?: boolean }).is_deleted)).length,
      deleted: records.filter((r) => Boolean((r as unknown as { is_deleted?: boolean }).is_deleted)).length,
    };
  }, [records]);

  const filteredCount = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedRecords = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, safeCurrentPage, pageSize]);

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
            <span className="badge badge-neutral" style={{ fontWeight: 600, fontSize: '0.75rem' }}>
              {filteredCount === totalCount ? `${totalCount} Records (${activeConfig.title})` : `${filteredCount} of ${totalCount} Records (${activeConfig.title})`}
            </span>
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

          {selectedIds.size > 0 && (statusFilter === 'deleted' || (selectedIds.size > 0 && records.filter((r) => selectedIds.has(r.public_id)).every((r) => Boolean((r as unknown as { is_deleted?: boolean }).is_deleted)))) ? (
            <>
              {canRestore && (
                <button
                  id="btn-bulk-restore-master"
                  type="button"
                  onClick={() => setBulkRestoreConfirmOpen(true)}
                  className="btn btn-restore"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
                  title={`Restore ${selectedIds.size} selected record(s)`}
                >
                  <RotateCcw size={15} />
                  <span>Restore ({selectedIds.size})</span>
                </button>
              )}
              {canHardDelete && (
                <button
                  id="btn-bulk-purge-master"
                  type="button"
                  onClick={() => {
                    setBulkHardDeleteRequested(true);
                    setBulkDeleteConfirmOpen(true);
                  }}
                  className="btn btn-danger"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
                  title={`Permanently purge ${selectedIds.size} selected record(s)`}
                >
                  <Trash2 size={15} />
                  <span>Purge ({selectedIds.size})</span>
                </button>
              )}
            </>
          ) : (
            canDelete && selectedIds.size > 0 && (
              <button
                id="btn-bulk-delete-master"
                type="button"
                onClick={() => {
                  setBulkHardDeleteRequested(false);
                  setBulkDeleteConfirmOpen(true);
                }}
                className="btn btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  color: 'var(--danger)',
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                }}
              >
                <Trash2 size={15} />
                <span>Delete ({selectedIds.size})</span>
              </button>
            )
          )}

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
            {MASTER_CONFIGS.length} Catalogs
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
            const count = masterCounts[filter];
            return (
              <button
                key={filter}
                id={`btn-filter-status-${filter}`}
                type="button"
                onClick={() => {
                  setStatusFilter(filter);
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
              <th style={{ width: '40px', textAlign: 'center' }}>#</th>
              <th style={{ width: '38px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredRecords.length && filteredRecords.length > 0}
                  onChange={() => handleToggleSelectAll(filteredRecords)}
                  aria-label="Select all master records"
                />
              </th>
              <th>Name / Label</th>
              {activeConfig.codeLabel && <th>{activeConfig.codeLabel}</th>}
              {activeConfig.key === 'countries' && <th>ISO3 Code</th>}
              {activeConfig.key === 'countries' && <th>Phone Code</th>}
              {activeConfig.key === 'countries' && <th>Default Currency</th>}
              {activeConfig.key === 'currencies' && <th>Symbol</th>}
              {activeConfig.key === 'currencies' && <th>Decimals</th>}
              {activeConfig.key === 'time-zones' && <th>UTC Offset</th>}
              {activeConfig.key === 'languages' && <th>Native Script</th>}
              {activeConfig.key === 'units-of-measure' && <th>Category</th>}
              {activeConfig.key === 'states' && <th>Country Code</th>}
              {activeConfig.key === 'cities' && <th>Region</th>}
              {activeConfig.key === 'taxes' && <th>Tax Rate</th>}
              {activeConfig.key === 'taxes' && <th>Tax Type</th>}
              {activeConfig.key === 'taxes' && <th>Country</th>}
              {activeConfig.key === 'addresses' && <th>Postal Code</th>}
              {activeConfig.key === 'addresses' && <th>Country</th>}
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={22} style={{ textAlign: 'center', padding: '3rem' }}>
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
                <td colSpan={22} style={{ textAlign: 'center', padding: '3.5rem' }}>
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
              paginatedRecords.map((rec, index) => {
                const raw = asDict(rec);
                const nameDisplay = String(raw.name || raw.label || raw.address_line1 || 'Unnamed');
                const codeDisplay = String(raw.code || (raw.postal_code ? `ZIP: ${raw.postal_code}` : '—'));

                return (
                  <tr key={rec.public_id} style={{ background: selectedIds.has(rec.public_id) ? 'var(--accent-subtle)' : undefined }}>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>{(safeCurrentPage - 1) * pageSize + index + 1}</td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(rec.public_id)}
                        onChange={() => handleToggleSelect(rec.public_id)}
                        aria-label={`Select ${nameDisplay}`}
                      />
                    </td>
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

                    {activeConfig.key === 'countries' && (
                      <td>
                        {raw.default_currency ? (
                          <span
                            className="badge badge-info"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <strong>{String((raw.default_currency as { code?: string }).code || '')}</strong>
                            {(raw.default_currency as { symbol?: string }).symbol && (
                              <span style={{ opacity: 0.85 }}>({String((raw.default_currency as { symbol?: string }).symbol)})</span>
                            )}
                          </span>
                        ) : raw.default_currency_id ? (
                          <span className="badge badge-neutral">ID #{String(raw.default_currency_id)}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
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

                    {activeConfig.key === 'taxes' && (
                      <td>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          {raw.rate !== undefined ? `${raw.rate}%` : '—'}
                        </span>
                      </td>
                    )}

                    {activeConfig.key === 'taxes' && (
                      <td>
                        <span className="badge badge-neutral" style={{ textTransform: 'uppercase' }}>
                          {String(raw.tax_type || 'percentage')}
                        </span>
                      </td>
                    )}

                    {activeConfig.key === 'taxes' && (
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {countriesLookup.find((c) => (c as unknown as { id: number }).id === raw.country_id)?.name || 'Linked Country'}
                      </td>
                    )}

                    {activeConfig.key === 'addresses' && (
                      <td>
                        <span className="badge badge-neutral" style={{ fontFamily: 'monospace' }}>
                          {String(raw.postal_code || '—')}
                        </span>
                      </td>
                    )}

                    {activeConfig.key === 'addresses' && (
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {countriesLookup.find((c) => (c as unknown as { id: number }).id === raw.country_id)?.name || 'Linked Country'}
                      </td>
                    )}

                    {/* Status Column with Quick Toggle Button */}
                    <td>
                      {(rec as unknown as { is_deleted?: boolean }).is_deleted ? (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          <Trash2 size={11} />
                          <span>Deleted</span>
                        </span>
                      ) : (
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
                          <span className={`badge ${rec.is_active ? 'badge-success' : 'badge-danger'}`}>
                            {rec.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </button>
                      )}
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
                        {(rec as unknown as { is_deleted?: boolean }).is_deleted ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            {canRestore && (
                              <button
                                id={`btn-restore-${rec.public_id}`}
                                type="button"
                                onClick={() => setRestoreCandidate(rec)}
                                className="btn btn-restore"
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                                title="Restore deactivated record"
                              >
                                <RotateCcw size={13} />
                                <span>Restore</span>
                              </button>
                            )}
                            <button
                              id={`btn-purge-${rec.public_id}`}
                              type="button"
                              onClick={() => {
                                setDeletingRecord(rec);
                                setIsHardDelete(true);
                              }}
                              className="btn btn-danger"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                              title="Permanently purge record from database"
                            >
                              <Trash2 size={13} />
                              <span>Purge</span>
                            </button>
                          </div>
                        ) : (
                          <>
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
                              onClick={() => {
                                setDeletingRecord(rec);
                                setIsHardDelete(false);
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', color: '#ef4444' }}
                              title="Deactivate / soft-delete record"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Masters Table Pagination Footer */}
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
            <strong>{Math.min(safeCurrentPage * pageSize, filteredCount)}</strong> of <strong>{filteredCount}</strong> records
            {filteredCount !== totalCount && ` (filtered from ${totalCount} total in ${activeConfig.title})`}
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
                      <span className={`badge ${viewingRecord.is_active ? 'badge-success' : 'badge-danger'}`}>
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
                        <td>
                          {val !== null && val !== undefined ? (
                            key.endsWith('_at') || (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) ? (
                              <FormattedDate value={String(val)} />
                            ) : (
                              String(val)
                            )
                          ) : (
                            '—'
                          )}
                        </td>
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

            <form onSubmit={handleCreateSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Primary Name Field */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  {activeConfig.key === 'time-zones'
                    ? 'IANA Canonical Identifier *'
                    : activeConfig.key === 'addresses'
                    ? 'Address Line 1 *'
                    : 'Display Name *'}
                </label>
                <input
                  id="input-create-name"
                  type="text"
                  className={`input ${fieldErrors.name ? 'has-error' : ''}`}
                  value={String(formData.name || '')}
                  onChange={(e) => {
                    const newName = e.target.value;
                    if (isManualCodeMaster) {
                      setFormData((prev) => ({
                        ...prev,
                        name: newName,
                        address_line1: newName,
                        ...(!isCustomCodeEntered
                          ? {
                              code:
                                activeConfig.key === 'countries'
                                  ? generateMasterCode(newName, 2)
                                  : activeConfig.key === 'currencies'
                                  ? generateMasterCode(newName, 3)
                                  : generateMasterCode(newName, 10),
                              ...(activeConfig.key === 'countries'
                                ? { iso3_code: generateMasterCode(newName, 3) }
                                : {}),
                            }
                          : {}),
                      }));
                    } else {
                      const maxLen = 30;
                      const autoCode = generateMasterCode(newName, maxLen);
                      setFormData((prev) => ({
                        ...prev,
                        name: newName,
                        address_line1: newName,
                        code: activeConfig.key === 'languages' ? autoCode.toLowerCase() : autoCode,
                      }));
                    }
                  }}
                  placeholder={
                    activeConfig.key === 'time-zones'
                      ? 'e.g. America/New_York or Asia/Dubai'
                      : activeConfig.key === 'addresses'
                      ? 'Street address, building number, suite'
                      : `e.g. ${activeConfig.singular} Name`
                  }
                />
                {fieldErrors.name && (
                  <div className="field-error-text" role="alert">
                    <AlertCircle size={13} style={{ flexShrink: 0 }} />
                    <span>{fieldErrors.name}</span>
                  </div>
                )}
              </div>

              {/* Code field if applicable - strictly read-only and auto-generated for non-manual masters */}
              {activeConfig.codeLabel && activeConfig.key !== 'time-zones' && !isManualCodeMaster && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {activeConfig.codeLabel}
                    </label>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Auto-generated from Name • Read-Only</span>
                  </div>
                  <input
                    id="input-create-code"
                    type="text"
                    readOnly
                    tabIndex={-1}
                    className="input"
                    value={String(formData.code || '')}
                    placeholder="Auto-generated from Name"
                    style={{
                      textTransform: activeConfig.key === 'languages' ? 'lowercase' : 'uppercase',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      background: 'var(--bg-app)',
                      cursor: 'not-allowed',
                      opacity: 0.85,
                      borderColor: 'var(--border-subtle, var(--border-color))',
                    }}
                  />
                </div>
              )}

              {/* State specifics: Editable State Code */}
              {activeConfig.key === 'states' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <label htmlFor="input-create-state-code" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      State Code
                    </label>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Abbreviation (e.g. CA, NY, KL)</span>
                  </div>
                  <input
                    id="input-create-state-code"
                    type="text"
                    maxLength={20}
                    className={`input ${fieldErrors.code ? 'has-error' : ''}`}
                    value={String(formData.code || '')}
                    onChange={(e) => {
                      setIsCustomCodeEntered(true);
                      setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }));
                    }}
                    placeholder="e.g. CA or NY"
                    style={{
                      textTransform: 'uppercase',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                    }}
                  />
                  {fieldErrors.code && (
                    <div className="field-error-text" role="alert">
                      <AlertCircle size={13} style={{ flexShrink: 0 }} />
                      <span>{fieldErrors.code}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Country specifics: Editable ISO Alpha-2, ISO Alpha-3, and Phone Prefix */}
              {activeConfig.key === 'countries' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <label htmlFor="input-create-country-code" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          ISO Alpha-2 Code *
                        </label>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>2 Letters (e.g. US)</span>
                      </div>
                      <input
                        id="input-create-country-code"
                        type="text"
                        maxLength={2}
                        className={`input ${fieldErrors.code ? 'has-error' : ''}`}
                        value={String(formData.code || '')}
                        onChange={(e) => {
                          setIsCustomCodeEntered(true);
                          setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }));
                        }}
                        placeholder="e.g. US"
                        style={{
                          textTransform: 'uppercase',
                          fontFamily: 'monospace',
                          fontWeight: 600,
                        }}
                      />
                      {fieldErrors.code && (
                        <div className="field-error-text" role="alert">
                          <AlertCircle size={13} style={{ flexShrink: 0 }} />
                          <span>{fieldErrors.code}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <label htmlFor="input-create-country-iso3" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          ISO3 Alpha-3 Code
                        </label>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>3 Letters (Optional)</span>
                      </div>
                      <input
                        id="input-create-country-iso3"
                        type="text"
                        maxLength={3}
                        className={`input ${fieldErrors.iso3_code ? 'has-error' : ''}`}
                        value={String(formData.iso3_code || '')}
                        onChange={(e) => {
                          setIsCustomCodeEntered(true);
                          setFormData((prev) => ({ ...prev, iso3_code: e.target.value.toUpperCase() }));
                        }}
                        placeholder="e.g. USA"
                        style={{
                          textTransform: 'uppercase',
                          fontFamily: 'monospace',
                          fontWeight: 600,
                        }}
                      />
                      {fieldErrors.iso3_code && (
                        <div className="field-error-text" role="alert">
                          <AlertCircle size={13} style={{ flexShrink: 0 }} />
                          <span>{fieldErrors.iso3_code}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="input-create-country-phone-code" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Phone Calling Prefix
                    </label>
                    <input
                      id="input-create-country-phone-code"
                      type="text"
                      className="input"
                      value={String(formData.phone_code || '')}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone_code: e.target.value }))}
                      placeholder="e.g. +1 or +91"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="select-create-country-currency"
                      style={{
                        display: 'block',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        marginBottom: '0.35rem',
                      }}
                    >
                      Default Currency
                    </label>
                    <SearchableSelect
                      id="select-create-country-currency"
                      options={[
                        { value: '', label: 'None / Select Default Currency' },
                        ...currencySelectOptions,
                      ]}
                      value={String(formData.default_currency_id || '')}
                      onChange={(val) =>
                        setFormData((prev) => ({ ...prev, default_currency_id: val ? Number(val) : '' }))
                      }
                      placeholder="Search currency by code or name..."
                      searchPlaceholder="Search currency..."
                    />
                  </div>
                </>
              )}

              {/* Currency specifics: Editable ISO 4217 Code, Symbol, Decimal Places */}
              {activeConfig.key === 'currencies' && (
                <>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <label htmlFor="input-create-currency-code" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        ISO 4217 Currency Code *
                      </label>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>3 Letters (e.g. USD, EUR, INR)</span>
                    </div>
                    <input
                      id="input-create-currency-code"
                      type="text"
                      maxLength={3}
                      className={`input ${fieldErrors.code ? 'has-error' : ''}`}
                      value={String(formData.code || '')}
                      onChange={(e) => {
                        setIsCustomCodeEntered(true);
                        setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }));
                      }}
                      placeholder="e.g. USD"
                      style={{
                        textTransform: 'uppercase',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                      }}
                    />
                    {fieldErrors.code && (
                      <div className="field-error-text" role="alert">
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{fieldErrors.code}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label htmlFor="input-create-currency-symbol" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                        Currency Symbol
                      </label>
                      <input
                        id="input-create-currency-symbol"
                        type="text"
                        className="input"
                        value={String(formData.symbol || '')}
                        onChange={(e) => setFormData((prev) => ({ ...prev, symbol: e.target.value }))}
                        placeholder="e.g. $, €, ₹, £"
                      />
                    </div>
                    <div>
                      <label htmlFor="input-create-currency-decimals" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                        Decimal Precision
                      </label>
                      <input
                        id="input-create-currency-decimals"
                        type="number"
                        min={0}
                        max={4}
                        className="input"
                        value={Number(formData.decimal_places ?? 2)}
                        onChange={(e) => setFormData((prev) => ({ ...prev, decimal_places: parseInt(e.target.value, 10) || 0 }))}
                      />
                    </div>
                  </div>
                </>
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
                      className={`input ${fieldErrors.label ? 'has-error' : ''}`}
                      value={String(formData.label || '')}
                      onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
                      placeholder="e.g. Eastern Time (US & Canada)"
                    />
                    {fieldErrors.label && (
                      <div className="field-error-text" role="alert">
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{fieldErrors.label}</span>
                      </div>
                    )}
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
                    <SearchableSelect
                      id="select-create-uom-category"
                      options={uomCategorySelectOptions}
                      value={String(formData.category || 'Weight')}
                      onChange={(val) => setFormData((prev) => ({ ...prev, category: val || 'Weight' }))}
                      placeholder="Select measurement category..."
                      searchPlaceholder="Search category..."
                    />
                  </div>
                </div>
              )}

              {/* State / City Country Selector (Select2 SearchableSelect) */}
              {activeConfig.hasCountry && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Parent Country *
                  </label>
                  <SearchableSelect
                    id="select-create-parent-country"
                    options={countrySelectOptions}
                    value={String(formData.country_id || '')}
                    onChange={(val) => handleCountryChangeInForm(val)}
                    placeholder="Select a country..."
                    searchPlaceholder="Search country by name or code..."
                    hasError={Boolean(fieldErrors.country_id)}
                    clearable
                  />
                  {fieldErrors.country_id && (
                    <div className="field-error-text" role="alert">
                      <AlertCircle size={13} style={{ flexShrink: 0 }} />
                      <span>{fieldErrors.country_id}</span>
                    </div>
                  )}
                </div>
              )}

              {/* City State Selector (Select2 SearchableSelect) */}
              {activeConfig.hasState && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Parent State / Province (Optional)
                  </label>
                  <SearchableSelect
                    id="select-create-parent-state"
                    options={stateSelectOptions}
                    value={String(formData.state_id || '')}
                    onChange={(val) => setFormData((prev) => ({ ...prev, state_id: val ? Number(val) : '' }))}
                    placeholder="None / Federal Municipality"
                    searchPlaceholder="Search state or province..."
                    clearable
                  />
                </div>
              )}

              {/* Tax specifics */}
              {activeConfig.key === 'taxes' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Tax Rate (%) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={`input ${fieldErrors.rate ? 'has-error' : ''}`}
                      value={Number(formData.rate ?? 0)}
                      onChange={(e) => setFormData((prev) => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                      placeholder="e.g. 5.00 or 15.00"
                    />
                    {fieldErrors.rate && (
                      <div className="field-error-text" role="alert">
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{fieldErrors.rate}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Calculation Type *
                    </label>
                    <SearchableSelect
                      id="select-create-tax-type"
                      options={taxTypeSelectOptions}
                      value={String(formData.tax_type || 'percentage')}
                      onChange={(val) => setFormData((prev) => ({ ...prev, tax_type: val || 'percentage' }))}
                      placeholder="Select calculation type..."
                    />
                  </div>
                </div>
              )}

              {/* Address specifics */}
              {activeConfig.key === 'addresses' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                        Address Line 2 (Optional)
                      </label>
                      <input
                        type="text"
                        className="input"
                        value={String(formData.address_line2 || '')}
                        onChange={(e) => setFormData((prev) => ({ ...prev, address_line2: e.target.value }))}
                        placeholder="Floor, apartment, suite"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                        Postal / ZIP Code
                      </label>
                      <input
                        type="text"
                        className="input"
                        value={String(formData.postal_code || '')}
                        onChange={(e) => setFormData((prev) => ({ ...prev, postal_code: e.target.value }))}
                        placeholder="e.g. 10001 or 90210"
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={String(formData.landmark || '')}
                      onChange={(e) => setFormData((prev) => ({ ...prev, landmark: e.target.value }))}
                      placeholder="e.g. Near Central Station"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Address Type
                    </label>
                    <SearchableSelect
                      id="select-create-address-type"
                      options={addressTypeSelectOptions}
                      value={String(formData.address_type_id || '1')}
                      onChange={(val) => setFormData((prev) => ({ ...prev, address_type_id: Number(val) || 1 }))}
                      placeholder="Select address classification..."
                    />
                  </div>
                </>
              )}

              {/* Description field for taxonomy types and brands */}
              {['industries', 'brands', 'address-types', 'communication-types', 'document-types', 'identification-types'].includes(activeConfig.key) && (
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
                    Edit {activeConfig.singular}
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Update catalog attributes and operational state
                  </span>
                </div>
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

            <form onSubmit={handleEditSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Primary Name Field */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  {activeConfig.key === 'time-zones'
                    ? 'IANA Canonical Identifier'
                    : activeConfig.key === 'addresses'
                    ? 'Address Line 1'
                    : 'Display Name'}
                </label>
                <input
                  type="text"
                  className={`input ${fieldErrors.name ? 'has-error' : ''}`}
                  value={String(formData.name || '')}
                  onChange={(e) => {
                    const newName = e.target.value;
                    const maxLen = activeConfig.key === 'titles' || activeConfig.key === 'languages' ? 10 : 30;
                    const autoCode = generateMasterCode(newName, maxLen);
                    setFormData((prev) => ({
                      ...prev,
                      name: newName,
                      address_line1: newName,
                      ...(activeConfig.codeLabel && !isManualCodeMaster && activeConfig.key !== 'time-zones'
                        ? {
                            code:
                              activeConfig.key === 'languages'
                                ? autoCode.toLowerCase()
                                : autoCode.toUpperCase(),
                          }
                        : {}),
                    }));
                  }}
                />
                {fieldErrors.name && (
                  <div className="field-error-text" role="alert">
                    <AlertCircle size={13} style={{ flexShrink: 0 }} />
                    <span>{fieldErrors.name}</span>
                  </div>
                )}
              </div>

              {/* Code field for non-manual masters */}
              {activeConfig.codeLabel && activeConfig.key !== 'time-zones' && !isManualCodeMaster && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {activeConfig.codeLabel}
                    </label>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>System Code • Read-Only</span>
                  </div>
                  <input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    className="input"
                    value={String(formData.code || '')}
                    style={{
                      textTransform: activeConfig.key === 'languages' ? 'lowercase' : 'uppercase',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      background: 'var(--bg-app)',
                      cursor: 'not-allowed',
                      opacity: 0.85,
                      borderColor: 'var(--border-subtle, var(--border-color))',
                    }}
                  />
                </div>
              )}

              {/* State specifics: Editable State Code in Edit Modal */}
              {activeConfig.key === 'states' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <label htmlFor="input-edit-state-code" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      State Code
                    </label>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Abbreviation (e.g. CA, NY, KL)</span>
                  </div>
                  <input
                    id="input-edit-state-code"
                    type="text"
                    maxLength={20}
                    className={`input ${fieldErrors.code ? 'has-error' : ''}`}
                    value={String(formData.code || '')}
                    onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. CA or NY"
                    style={{
                      textTransform: 'uppercase',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                    }}
                  />
                  {fieldErrors.code && (
                    <div className="field-error-text" role="alert">
                      <AlertCircle size={13} style={{ flexShrink: 0 }} />
                      <span>{fieldErrors.code}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Country specifics: Editable ISO codes and phone prefix in Edit Modal */}
              {activeConfig.key === 'countries' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <label htmlFor="input-edit-country-code" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          ISO Alpha-2 Code *
                        </label>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>2 Letters</span>
                      </div>
                      <input
                        id="input-edit-country-code"
                        type="text"
                        maxLength={2}
                        className={`input ${fieldErrors.code ? 'has-error' : ''}`}
                        value={String(formData.code || '')}
                        onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                        placeholder="e.g. US"
                        style={{
                          textTransform: 'uppercase',
                          fontFamily: 'monospace',
                          fontWeight: 600,
                        }}
                      />
                      {fieldErrors.code && (
                        <div className="field-error-text" role="alert">
                          <AlertCircle size={13} style={{ flexShrink: 0 }} />
                          <span>{fieldErrors.code}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <label htmlFor="input-edit-country-iso3" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          ISO3 Alpha-3 Code
                        </label>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>3 Letters (Optional)</span>
                      </div>
                      <input
                        id="input-edit-country-iso3"
                        type="text"
                        maxLength={3}
                        className={`input ${fieldErrors.iso3_code ? 'has-error' : ''}`}
                        value={String(formData.iso3_code || '')}
                        onChange={(e) => setFormData((prev) => ({ ...prev, iso3_code: e.target.value.toUpperCase() }))}
                        placeholder="e.g. USA"
                        style={{
                          textTransform: 'uppercase',
                          fontFamily: 'monospace',
                          fontWeight: 600,
                        }}
                      />
                      {fieldErrors.iso3_code && (
                        <div className="field-error-text" role="alert">
                          <AlertCircle size={13} style={{ flexShrink: 0 }} />
                          <span>{fieldErrors.iso3_code}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="input-edit-country-phone-code" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Phone Calling Prefix
                    </label>
                    <input
                      id="input-edit-country-phone-code"
                      type="text"
                      className="input"
                      value={String(formData.phone_code || '')}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone_code: e.target.value }))}
                      placeholder="e.g. +1 or +91"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="select-edit-country-currency"
                      style={{
                        display: 'block',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        marginBottom: '0.35rem',
                      }}
                    >
                      Default Currency
                    </label>
                    <SearchableSelect
                      id="select-edit-country-currency"
                      options={[
                        { value: '', label: 'None / Select Default Currency' },
                        ...currencySelectOptions,
                      ]}
                      value={String(formData.default_currency_id || '')}
                      onChange={(val) =>
                        setFormData((prev) => ({ ...prev, default_currency_id: val ? Number(val) : '' }))
                      }
                      placeholder="Search currency by code or name..."
                      searchPlaceholder="Search currency..."
                    />
                  </div>
                </>
              )}

              {/* Currency specifics: Editable ISO 4217 Code, Symbol, Decimal Places */}
              {activeConfig.key === 'currencies' && (
                <>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <label htmlFor="input-edit-currency-code" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        ISO 4217 Currency Code *
                      </label>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>3 Letters (e.g. USD, EUR, INR)</span>
                    </div>
                    <input
                      id="input-edit-currency-code"
                      type="text"
                      maxLength={3}
                      className={`input ${fieldErrors.code ? 'has-error' : ''}`}
                      value={String(formData.code || '')}
                      onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="e.g. USD"
                      style={{
                        textTransform: 'uppercase',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                      }}
                    />
                    {fieldErrors.code && (
                      <div className="field-error-text" role="alert">
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{fieldErrors.code}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label htmlFor="input-edit-currency-symbol" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                        Currency Symbol
                      </label>
                      <input
                        id="input-edit-currency-symbol"
                        type="text"
                        className="input"
                        value={String(formData.symbol || '')}
                        onChange={(e) => setFormData((prev) => ({ ...prev, symbol: e.target.value }))}
                        placeholder="e.g. $, €, ₹, £"
                      />
                    </div>
                    <div>
                      <label htmlFor="input-edit-currency-decimals" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                        Decimal Precision
                      </label>
                      <input
                        id="input-edit-currency-decimals"
                        type="number"
                        min={0}
                        max={4}
                        className="input"
                        value={Number(formData.decimal_places ?? 2)}
                        onChange={(e) => setFormData((prev) => ({ ...prev, decimal_places: parseInt(e.target.value, 10) || 0 }))}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Time zone specifics */}
              {activeConfig.key === 'time-zones' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Label
                    </label>
                    <input
                      type="text"
                      className={`input ${fieldErrors.label ? 'has-error' : ''}`}
                      value={String(formData.label || '')}
                      onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
                    />
                    {fieldErrors.label && (
                      <div className="field-error-text" role="alert">
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{fieldErrors.label}</span>
                      </div>
                    )}
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

              {/* Unit of measure specifics (Select2 SearchableSelect) in Edit Modal */}
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
                    <SearchableSelect
                      id="select-edit-uom-category"
                      options={uomCategorySelectOptions}
                      value={String(formData.category || 'Weight')}
                      onChange={(val) => setFormData((prev) => ({ ...prev, category: val || 'Weight' }))}
                      placeholder="Select measurement category..."
                      searchPlaceholder="Search category..."
                    />
                  </div>
                </div>
              )}

              {/* State / City Country Selector (Select2 SearchableSelect) in Edit Modal */}
              {activeConfig.hasCountry && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Parent Country *
                  </label>
                  <SearchableSelect
                    id="select-edit-parent-country"
                    options={countrySelectOptions}
                    value={String(formData.country_id || '')}
                    onChange={(val) => handleCountryChangeInForm(val)}
                    placeholder="Select a country..."
                    searchPlaceholder="Search country by name or code..."
                    hasError={Boolean(fieldErrors.country_id)}
                    clearable
                  />
                  {fieldErrors.country_id && (
                    <div className="field-error-text" role="alert">
                      <AlertCircle size={13} style={{ flexShrink: 0 }} />
                      <span>{fieldErrors.country_id}</span>
                    </div>
                  )}
                </div>
              )}

              {/* City State Selector (Select2 SearchableSelect) in Edit Modal */}
              {activeConfig.hasState && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Parent State / Province (Optional)
                  </label>
                  <SearchableSelect
                    id="select-edit-parent-state"
                    options={stateSelectOptions}
                    value={String(formData.state_id || '')}
                    onChange={(val) => setFormData((prev) => ({ ...prev, state_id: val ? Number(val) : '' }))}
                    placeholder="None / Federal Municipality"
                    searchPlaceholder="Search state or province..."
                    clearable
                  />
                </div>
              )}

              {/* Tax specifics in Edit Modal */}
              {activeConfig.key === 'taxes' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={`input ${fieldErrors.rate ? 'has-error' : ''}`}
                      value={Number(formData.rate ?? 0)}
                      onChange={(e) => setFormData((prev) => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                    />
                    {fieldErrors.rate && (
                      <div className="field-error-text" role="alert">
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{fieldErrors.rate}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Calculation Type
                    </label>
                    <SearchableSelect
                      id="select-edit-tax-type"
                      options={taxTypeSelectOptions}
                      value={String(formData.tax_type || 'percentage')}
                      onChange={(val) => setFormData((prev) => ({ ...prev, tax_type: val || 'percentage' }))}
                      placeholder="Select calculation type..."
                    />
                  </div>
                </div>
              )}

              {/* Address specifics in Edit Modal */}
              {activeConfig.key === 'addresses' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                        Address Line 2 (Optional)
                      </label>
                      <input
                        type="text"
                        className="input"
                        value={String(formData.address_line2 || '')}
                        onChange={(e) => setFormData((prev) => ({ ...prev, address_line2: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                        Postal / ZIP Code
                      </label>
                      <input
                        type="text"
                        className="input"
                        value={String(formData.postal_code || '')}
                        onChange={(e) => setFormData((prev) => ({ ...prev, postal_code: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={String(formData.landmark || '')}
                      onChange={(e) => setFormData((prev) => ({ ...prev, landmark: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Address Type
                    </label>
                    <SearchableSelect
                      id="select-edit-address-type"
                      options={addressTypeSelectOptions}
                      value={String(formData.address_type_id || '1')}
                      onChange={(val) => setFormData((prev) => ({ ...prev, address_type_id: Number(val) || 1 }))}
                      placeholder="Select address classification..."
                    />
                  </div>
                </>
              )}

              {/* Description field for taxonomy types and brands */}
              {['industries', 'brands', 'address-types', 'communication-types', 'document-types', 'identification-types'].includes(activeConfig.key) && (
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
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
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
      <ConfirmationModal
        isOpen={!!deletingRecord}
        onClose={() => setDeletingRecord(null)}
        onConfirm={handleDeleteConfirm}
        title={isHardDelete ? `Purge ${activeConfig.singular}?` : `Deactivate ${activeConfig.singular}?`}
        subtitle={isHardDelete ? "This will permanently purge this record from the database." : "This will change the operational state to inactive."}
        message={
          deletingRecord ? (
            isHardDelete ? (
              <>
                Are you sure you want to <strong>permanently purge</strong>{' '}
                <strong style={{ color: 'var(--text-primary)' }}>
                  {String(asDict(deletingRecord).name || asDict(deletingRecord).label || 'this record')}
                </strong>
                ? This action <strong>cannot be undone</strong> and will remove the record completely from the system.
              </>
            ) : (
              <>
                Are you sure you want to deactivate{' '}
                <strong style={{ color: 'var(--text-primary)' }}>
                  {String(asDict(deletingRecord).name || asDict(deletingRecord).label || 'this record')}
                </strong>
                ? Inactive master records can be restored or permanently purged later.
              </>
            )
          ) : null
        }
        confirmLabel={isHardDelete ? "Purge" : "Confirm Deactivation"}
        variant="danger"
        isLoading={isSubmitting}
      />

      {/* Restore Confirmation Dialog */}
      <ConfirmationModal
        isOpen={!!restoreCandidate}
        onClose={() => setRestoreCandidate(null)}
        onConfirm={handleConfirmRestore}
        title={`Restore ${activeConfig.singular}?`}
        subtitle="This will restore the record back to active state."
        message={
          restoreCandidate ? (
            <>
              Are you sure you want to restore{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {String(asDict(restoreCandidate).name || asDict(restoreCandidate).label || 'this record')}
              </strong>
              ? It will be reinstated and accessible across all system lookups.
            </>
          ) : null
        }
        confirmLabel={`Restore ${activeConfig.singular}`}
        variant="primary"
        isLoading={isRestoring}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmationModal
        isOpen={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        title={
          bulkHardDeleteRequested
            ? `Purge ${selectedIds.size} Selected ${activeConfig.singular}(s)?`
            : `Soft Delete ${selectedIds.size} Selected ${activeConfig.singular}(s)?`
        }
        subtitle={`${selectedIds.size} record${selectedIds.size === 1 ? '' : 's'} selected`}
        message={
          <div>
            <p>
              {bulkHardDeleteRequested ? (
                <>
                  Are you sure you want to <strong>permanently purge</strong> the {selectedIds.size} selected {activeConfig.singular.toLowerCase()}(s) from the database? This action <strong>cannot be undone</strong>.
                </>
              ) : (
                <>
                  Are you sure you want to soft delete the {selectedIds.size} selected {activeConfig.singular.toLowerCase()}(s)? They will be moved to the <strong>Deleted</strong> tab, where they can be restored or permanently purged later.
                </>
              )}
            </p>
            {canHardDelete && statusFilter !== 'deleted' && (
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="bulk_master_hard_delete_check"
                  checked={bulkHardDeleteRequested}
                  onChange={(e) => setBulkHardDeleteRequested(e.target.checked)}
                />
                <label htmlFor="bulk_master_hard_delete_check" style={{ fontSize: '0.82rem', color: 'var(--danger)', fontWeight: 600 }}>
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

      {/* Bulk Restore Confirmation Dialog */}
      <ConfirmationModal
        isOpen={bulkRestoreConfirmOpen}
        onClose={() => setBulkRestoreConfirmOpen(false)}
        onConfirm={handleBulkRestore}
        title={`Restore ${selectedIds.size} Selected ${activeConfig.singular}(s)?`}
        subtitle={`${selectedIds.size} record${selectedIds.size === 1 ? '' : 's'} selected`}
        message={
          <p>
            Are you sure you want to restore the {selectedIds.size} selected {activeConfig.singular.toLowerCase()}(s) back to active status? They will immediately be visible across reference lookups.
          </p>
        }
        confirmLabel={`Restore (${selectedIds.size})`}
        variant="primary"
        isLoading={isBulkRestoring}
      />
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
