'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { PagedResponse, SystemSetting, SettingValue } from '@/lib/types';
import { FormattedDate } from '@/components/ui/formatted-date';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import {
  Sliders,
  Shield,
  Globe,
  Bell,
  FileText,
  Cpu,
  Search,
  RefreshCw,
  Save,
  AlertCircle,
  Loader2,
  Lock,
  Eye,
  RotateCcw,
  Check,
  Copy,
  Clock,
  Layers,
  X,
  SlidersHorizontal,
  KeyRound,
  Network,
  Mail,
  Scale,
  ToggleLeft,
} from 'lucide-react';

type SettingCategory = 'all' | 'general' | 'security' | 'notifications' | 'governance' | 'features';

interface CategoryTab {
  id: SettingCategory;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  description: string;
}

const CATEGORY_TABS: CategoryTab[] = [
  { id: 'all', label: 'All Settings', icon: Sliders, description: 'Consolidated view of all platform parameters' },
  { id: 'general', label: 'General & Branding', icon: Globe, description: 'Company identity, timezone, and locale standards' },
  { id: 'security', label: 'Security & Access', icon: Shield, description: 'Authentication rules, session timeouts, and network access' },
  { id: 'notifications', label: 'Communications', icon: Bell, description: 'Transactional email, sender identities, and alert channels' },
  { id: 'governance', label: 'Governance & Compliance', icon: FileText, description: 'Retention windows, anonymization, and export roles' },
  { id: 'features', label: 'Feature Toggles', icon: Cpu, description: 'Platform capabilities, self-registration, and maintenance flags' },
];

interface SettingSectionConfig {
  id: string;
  category: SettingCategory;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  iconBg: string;
  iconColor: string;
  keys: string[];
}

const SETTING_SECTIONS: SettingSectionConfig[] = [
  {
    id: 'general_identity',
    category: 'general',
    title: 'Company Identity & Financial Baseline',
    description: 'Core organizational metadata, brand naming, operating currency, and fiscal cycles.',
    icon: Globe,
    iconBg: 'rgba(59, 130, 246, 0.12)',
    iconColor: '#3b82f6',
    keys: ['company_name', 'support_email', 'default_currency', 'fiscal_year_start_month'],
  },
  {
    id: 'general_localization',
    category: 'general',
    title: 'Localization & Regional Standards',
    description: 'System-wide calendar notations, temporal clocks, reference timezones, and regional conventions.',
    icon: Clock,
    iconBg: 'rgba(99, 102, 241, 0.12)',
    iconColor: '#818cf8',
    keys: ['default_timezone', 'default_locale', 'default_date_format', 'default_time_format'],
  },
  {
    id: 'security_auth',
    category: 'security',
    title: 'Authentication & Credential Complexity',
    description: 'Mandatory password complexity parameters, character diversity, and multi-factor requirements.',
    icon: KeyRound,
    iconBg: 'rgba(239, 68, 68, 0.12)',
    iconColor: '#ef4444',
    keys: ['password_min_length', 'password_require_uppercase', 'password_require_numbers', 'password_require_special', 'two_factor_policy'],
  },
  {
    id: 'security_network',
    category: 'security',
    title: 'Session & Network Governance',
    description: 'Inactivity expiration, brute-force mitigation lockouts, and IP perimeter boundaries.',
    icon: Network,
    iconBg: 'rgba(245, 158, 11, 0.12)',
    iconColor: '#f59e0b',
    keys: ['max_login_attempts', 'lockout_duration_mins', 'session_timeout_mins', 'ip_whitelist'],
  },
  {
    id: 'notifications_channels',
    category: 'notifications',
    title: 'Transactional Messaging & Alert Channels',
    description: 'Outbound dispatch protocols, notification banners, and system sender identities.',
    icon: Mail,
    iconBg: 'rgba(16, 185, 129, 0.12)',
    iconColor: '#10b981',
    keys: ['email_sender_name', 'email_sender_address', 'enable_in_app_notifications', 'enable_email_notifications'],
  },
  {
    id: 'governance_compliance',
    category: 'governance',
    title: 'Data Governance, Retention & Privacy',
    description: 'Regulatory compliance policies, immutable audit retention windows, and role export authorizations.',
    icon: Scale,
    iconBg: 'rgba(168, 85, 247, 0.12)',
    iconColor: '#a855f7',
    keys: ['audit_retention_days', 'gdpr_anonymize_on_delete', 'data_export_allowed_roles'],
  },
  {
    id: 'features_operational',
    category: 'features',
    title: 'Platform Capabilities & Operational Flags',
    description: 'Runtime feature switches, public onboarding gateways, and global maintenance states.',
    icon: ToggleLeft,
    iconBg: 'rgba(14, 165, 233, 0.12)',
    iconColor: '#0ea5e9',
    keys: ['maintenance_mode', 'allow_self_registration', 'multi_currency_enabled'],
  },
];

/**
 * Enterprise System Settings & App Configurations Workspace.
 *
 * Implements high-end enterprise SaaS administration:
 * - Grouped logical fieldset panels with section-level descriptions
 * - Dynamic category filtering & real-time search
 * - Single-setting undo and atomic bulk saving
 * - Keyboard shortcut (Cmd/Ctrl + S) for fast workflows
 * - Dual-identifier audit trail with microsecond-free ISO UTC formatting
 */
export default function SystemSettingsPage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();

  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [originalSettings, setOriginalSettings] = useState<SystemSetting[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<SettingCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const canEdit = hasPermission('settings.update') || hasPermission('super_admin');

  const fetchSettings = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await apiFetch<PagedResponse<SystemSetting>>('/settings?limit=100&sort_by=category&sort_order=asc');
      setSettings(response.items);
      setOriginalSettings(response.items);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load system settings.';
      toast.error(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const response = await apiFetch<PagedResponse<SystemSetting>>('/settings?limit=100&sort_by=category&sort_order=asc');
        if (isMounted) {
          setSettings(response.items);
          setOriginalSettings(response.items);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : 'Failed to load system settings.';
          toast.error(message);
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

  // Compute dirty pending changes
  const pendingChanges = useMemo(() => {
    const changes: Record<string, SettingValue> = {};
    for (const curr of settings) {
      const orig = originalSettings.find((s) => s.id === curr.id);
      if (orig && JSON.stringify(orig.value) !== JSON.stringify(curr.value)) {
        changes[curr.key] = curr.value;
      }
    }
    return changes;
  }, [settings, originalSettings]);

  const hasDirtyChanges = Object.keys(pendingChanges).length > 0;

  // Single field update
  const handleValueChange = (settingId: number, newValue: SettingValue) => {
    setSettings((prev) =>
      prev.map((s) => (s.id === settingId ? { ...s, value: newValue } : s))
    );
  };

  // Revert single field change
  const handleRevertSingle = (settingId: number) => {
    const original = originalSettings.find((s) => s.id === settingId);
    if (!original) return;
    setSettings((prev) =>
      prev.map((s) => (s.id === settingId ? { ...s, value: original.value } : s))
    );
  };

  // Revert all unsaved changes
  const handleDiscardChanges = () => {
    setSettings(originalSettings);
    toast.info('All unsaved changes were discarded.');
  };

  // Bulk save pending changes
  const handleSaveAll = useCallback(async () => {
    if (!hasDirtyChanges || isSaving) return;
    setIsSaving(true);
    const rollback = [...settings];

    try {
      const updated = await apiFetch<SystemSetting[]>('/settings/bulk', {
        method: 'PATCH',
        body: JSON.stringify({ settings: pendingChanges }),
      });

      // Update state with confirmed server values
      setSettings((prev) =>
        prev.map((item) => {
          const match = updated.find((u) => u.id === item.id);
          return match || item;
        })
      );
      setOriginalSettings((prev) =>
        prev.map((item) => {
          const match = updated.find((u) => u.id === item.id);
          return match || item;
        })
      );

      toast.success(`Successfully saved ${Object.keys(pendingChanges).length} configuration parameter(s).`);
    } catch (err: unknown) {
      setSettings(rollback);
      const message = err instanceof Error ? err.message : 'Failed to update system settings.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [hasDirtyChanges, isSaving, settings, pendingChanges, toast]);

  // Global keyboard shortcut: Cmd+S / Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        if (hasDirtyChanges) {
          e.preventDefault();
          handleSaveAll();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasDirtyChanges, handleSaveAll]);

  // Copy parameter key to clipboard
  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.info(`Copied key "${key}" to clipboard.`);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = settings.length;
    const publicCount = settings.filter((s) => s.is_public).length;
    const protectedCount = settings.filter((s) => s.is_system).length;
    return { total, publicCount, protectedCount };
  }, [settings]);

  // Filtered settings list
  const filteredSettings = useMemo(() => {
    return settings.filter((s) => {
      const matchesCategory = activeCategory === 'all' || s.category === activeCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.key.toLowerCase().includes(q) ||
        s.label.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [settings, activeCategory, searchQuery]);

  // Group filtered settings into structured sections
  const visibleSections = useMemo(() => {
    const filteredKeySet = new Set(filteredSettings.map((s) => s.key));

    return SETTING_SECTIONS.map((section) => {
      const sectionSettings = settings.filter(
        (s) => section.keys.includes(s.key) && filteredKeySet.has(s.key)
      );
      return {
        ...section,
        settings: sectionSettings,
      };
    }).filter((section) => {
      const matchesCategory = activeCategory === 'all' || section.category === activeCategory;
      return matchesCategory && section.settings.length > 0;
    });
  }, [settings, filteredSettings, activeCategory]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: hasDirtyChanges ? '6rem' : '3rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(79, 70, 229, 0.1) 100%)',
                border: '1px solid var(--border-glow)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
              }}
            >
              <SlidersHorizontal size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', margin: 0 }}>
                System Configurations
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
                Govern platform-wide defaults, security thresholds, localization rules, and feature flags.
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={fetchSettings}
            disabled={isLoading || isRefreshing}
            isLoading={isRefreshing}
            icon={<RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>

          {canEdit && hasDirtyChanges && (
            <Button
              type="button"
              variant="primary"
              onClick={handleSaveAll}
              disabled={isSaving}
              isLoading={isSaving}
              icon={<Save size={15} />}
            >
              Save Changes ({Object.keys(pendingChanges).length})
            </Button>
          )}
        </div>
      </div>

      {/* KPI Overview Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
        }}
      >
        <StatCard
          title="Total Parameters"
          value={metrics.total}
          subtitle="Distributed across 5 governance domains"
          icon={<Layers size={20} />}
          iconBg="rgba(99, 102, 241, 0.15)"
          iconColor="#818cf8"
          isLoading={isLoading}
        />
        <StatCard
          title="Public Client Keys"
          value={metrics.publicCount}
          subtitle="Exposed to client for app bootstrap"
          icon={<Eye size={20} />}
          iconBg="rgba(56, 189, 248, 0.15)"
          iconColor="#38bdf8"
          isLoading={isLoading}
        />
        <StatCard
          title="Protected System Keys"
          value={metrics.protectedCount}
          subtitle="Guarded baseline policies & secrets"
          icon={<Lock size={20} />}
          iconBg="rgba(168, 85, 247, 0.15)"
          iconColor="#a855f7"
          isLoading={isLoading}
        />
        <StatCard
          title="Pending Changes"
          value={Object.keys(pendingChanges).length}
          subtitle={hasDirtyChanges ? 'Uncommitted in local memory' : 'Synchronized with database'}
          icon={hasDirtyChanges ? <AlertCircle size={20} /> : <Check size={20} />}
          iconBg={hasDirtyChanges ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)'}
          iconColor={hasDirtyChanges ? '#f59e0b' : '#10b981'}
          isLoading={isLoading}
        />
      </div>

      {/* Filter Toolbar & Tab Bar */}
      <Card padding="0.75rem 1rem" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Category Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '0.35rem',
              overflowX: 'auto',
              paddingBottom: '0.2rem',
              flex: '1 1 auto',
            }}
          >
            {CATEGORY_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeCategory === tab.id;
              const count = tab.id === 'all'
                ? settings.length
                : settings.filter((s) => s.category === tab.id).length;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.55rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.84rem',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    border: isActive ? '1px solid var(--border-glow)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Icon size={15} style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                  <span>{tab.label}</span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.1rem 0.4rem',
                      borderRadius: 'var(--radius-full)',
                      background: isActive ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.08)',
                      color: isActive ? '#ffffff' : 'var(--text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%', maxWidth: 320 }}>
            <Search
              size={15}
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter keys or descriptions..."
              className="input-field"
              style={{ paddingLeft: '2.4rem', paddingRight: searchQuery ? '2.2rem' : '0.95rem' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '0.65rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.2rem',
                  display: 'flex',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Feedback Status */}
        {(searchQuery || activeCategory !== 'all') && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              paddingTop: '0.5rem',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <span>
              Showing <strong>{filteredSettings.length}</strong> of <strong>{settings.length}</strong> parameters across{' '}
              <strong>{visibleSections.length}</strong> logical section(s)
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveCategory('all');
                setSearchQuery('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-primary)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.78rem',
              }}
            >
              Reset all filters
            </button>
          </div>
        )}
      </Card>

      {/* Main Settings Sections */}
      {isLoading ? (
        <Card padding="4rem" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '1rem' }}>
            Loading Configuration Hierarchy...
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Fetching parameters from secure database partition.
          </p>
        </Card>
      ) : visibleSections.length === 0 ? (
        <Card padding="3.5rem" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              marginBottom: '1rem',
            }}
          >
            <Sliders size={26} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            No Matching Configuration Parameters
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: 440, marginTop: '0.35rem' }}>
            No system settings matched your filter criteria. Try clearing your query or switching tabs.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setActiveCategory('all');
              setSearchQuery('');
            }}
            style={{ marginTop: '1.25rem' }}
          >
            Clear Filters
          </Button>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {visibleSections.map((section) => {
            const SectionIcon = section.icon;

            return (
              <Card key={section.id} padding="0" style={{ overflow: 'hidden' }}>
                {/* Section Header */}
                <div
                  style={{
                    padding: '1.25rem 1.75rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: 'var(--radius-md)',
                        background: section.iconBg,
                        color: section.iconColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <SectionIcon size={18} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        {section.title}
                      </h2>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        {section.description}
                      </p>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 600,
                    }}
                  >
                    {section.settings.length} parameter{section.settings.length === 1 ? '' : 's'}
                  </span>
                </div>

                {/* Section Settings Rows */}
                <div>
                  {section.settings.map((setting, idx) => {
                    const isDirty = pendingChanges[setting.key] !== undefined;
                    const isLast = idx === section.settings.length - 1;

                    return (
                      <div
                        key={setting.id}
                        style={{
                          padding: '1.25rem 1.75rem',
                          borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
                          background: isDirty ? 'rgba(245, 158, 11, 0.03)' : 'transparent',
                          borderLeft: isDirty ? '3px solid var(--accent-warning)' : '3px solid transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '1.5rem',
                          transition: 'var(--transition)',
                        }}
                      >
                        {/* Left: Metadata & Documentation */}
                        <div style={{ flex: '1 1 360px', minWidth: 280 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.925rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {setting.label}
                            </span>

                            {isDirty && (
                              <Badge variant="warning">
                                Modified
                              </Badge>
                            )}

                            {setting.is_public ? (
                              <Badge variant="primary" icon={<Eye size={11} style={{ marginRight: 3 }} />}>
                                Public
                              </Badge>
                            ) : (
                              <Badge variant="neutral" icon={<Lock size={11} style={{ marginRight: 3 }} />}>
                                Protected
                              </Badge>
                            )}
                          </div>

                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', lineHeight: 1.45, marginTop: '0.35rem', marginBottom: '0.5rem' }}>
                            {setting.description || 'System baseline configuration property.'}
                          </p>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => handleCopyKey(setting.key)}
                              title="Click to copy parameter key"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                background: 'rgba(255, 255, 255, 0.05)',
                                padding: '0.15rem 0.5rem',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--text-primary)',
                                fontFamily: 'monospace',
                                fontSize: '0.75rem',
                                border: '1px solid var(--border-subtle)',
                                cursor: 'pointer',
                              }}
                            >
                              <span>{setting.key}</span>
                              {copiedKey === setting.key ? (
                                <Check size={11} style={{ color: 'var(--accent-success)' }} />
                              ) : (
                                <Copy size={11} style={{ color: 'var(--text-muted)' }} />
                              )}
                            </button>

                            <span>•</span>

                            <span>
                              Audit:{' '}
                              <FormattedDate value={setting.updated_at || setting.created_at} variant="datetime" />
                            </span>
                          </div>
                        </div>

                        {/* Right: Typed Form Control */}
                        <div style={{ flex: '0 0 auto', minWidth: 260, maxWidth: 320, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem' }}>
                          {/* Boolean Toggle Control */}
                          {setting.value_type === 'boolean' && (
                            <label
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                cursor: canEdit ? 'pointer' : 'not-allowed',
                                userSelect: 'none',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(setting.value)}
                                disabled={!canEdit}
                                onChange={(e) => handleValueChange(setting.id, e.target.checked)}
                                style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                              />
                              <div
                                style={{
                                  width: 46,
                                  height: 24,
                                  borderRadius: 'var(--radius-full)',
                                  background: setting.value ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.12)',
                                  border: '1px solid var(--border-subtle)',
                                  position: 'relative',
                                  transition: 'background 0.2s ease',
                                  boxShadow: setting.value ? '0 0 10px rgba(99, 102, 241, 0.35)' : 'none',
                                }}
                              >
                                <div
                                  style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    background: '#ffffff',
                                    position: 'absolute',
                                    top: 2,
                                    left: setting.value ? 24 : 3,
                                    transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                                  }}
                                />
                              </div>
                              <span
                                style={{
                                  fontSize: '0.825rem',
                                  fontWeight: 600,
                                  color: setting.value ? 'var(--text-primary)' : 'var(--text-muted)',
                                  minWidth: '55px',
                                }}
                              >
                                {setting.value ? 'Enabled' : 'Disabled'}
                              </span>
                            </label>
                          )}

                          {/* Integer Stepper Control */}
                          {setting.value_type === 'integer' && (
                            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
                              {setting.key === 'fiscal_year_start_month' ? (
                                <select
                                  value={typeof setting.value === 'number' ? setting.value : Number(setting.value) || 1}
                                  disabled={!canEdit}
                                  onChange={(e) => handleValueChange(setting.id, parseInt(e.target.value, 10))}
                                  className="input-field"
                                  style={{ width: '100%' }}
                                >
                                  <option value={1}>January (Month 1)</option>
                                  <option value={2}>February (Month 2)</option>
                                  <option value={3}>March (Month 3)</option>
                                  <option value={4}>April (Month 4)</option>
                                  <option value={5}>May (Month 5)</option>
                                  <option value={6}>June (Month 6)</option>
                                  <option value={7}>July (Month 7)</option>
                                  <option value={8}>August (Month 8)</option>
                                  <option value={9}>September (Month 9)</option>
                                  <option value={10}>October (Month 10)</option>
                                  <option value={11}>November (Month 11)</option>
                                  <option value={12}>December (Month 12)</option>
                                </select>
                              ) : (
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: 'var(--bg-input)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: 'var(--radius-md)',
                                    overflow: 'hidden',
                                    width: '100%',
                                    maxWidth: 170,
                                  }}
                                >
                                  <input
                                    type="number"
                                    value={typeof setting.value === 'number' ? setting.value : Number(setting.value) || 0}
                                    disabled={!canEdit}
                                    onChange={(e) => handleValueChange(setting.id, parseInt(e.target.value, 10) || 0)}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      outline: 'none',
                                      color: 'var(--text-primary)',
                                      fontSize: '0.875rem',
                                      fontWeight: 600,
                                      textAlign: 'right',
                                      padding: '0.55rem 0.65rem',
                                      width: '100%',
                                    }}
                                  />
                                  <span
                                    style={{
                                      fontSize: '0.75rem',
                                      color: 'var(--text-muted)',
                                      paddingRight: '0.75rem',
                                      paddingLeft: '0.25rem',
                                      fontWeight: 500,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {setting.key.includes('mins')
                                      ? 'mins'
                                      : setting.key.includes('days')
                                      ? 'days'
                                      : setting.key.includes('length')
                                      ? 'chars'
                                      : setting.key.includes('attempts')
                                      ? 'attempts'
                                      : 'units'}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* String & Select Controls */}
                          {setting.value_type === 'string' && (
                            <div style={{ width: '100%' }}>
                              {setting.key === 'two_factor_policy' ? (
                                <select
                                  value={typeof setting.value === 'string' ? setting.value : String(setting.value ?? '')}
                                  disabled={!canEdit}
                                  onChange={(e) => handleValueChange(setting.id, e.target.value)}
                                  className="input-field"
                                  style={{ width: '100%' }}
                                >
                                  <option value="disabled">Disabled</option>
                                  <option value="optional">Optional for Users</option>
                                  <option value="enforced">Enforced for All</option>
                                </select>
                              ) : setting.key === 'default_time_format' ? (
                                <select
                                  value={typeof setting.value === 'string' ? setting.value : String(setting.value ?? '')}
                                  disabled={!canEdit}
                                  onChange={(e) => handleValueChange(setting.id, e.target.value)}
                                  className="input-field"
                                  style={{ width: '100%' }}
                                >
                                  <option value="12h">12-Hour (AM/PM Standard)</option>
                                  <option value="24h">24-Hour (ISO Military)</option>
                                </select>
                              ) : setting.key === 'default_date_format' ? (
                                <select
                                  value={typeof setting.value === 'string' ? setting.value : String(setting.value ?? '')}
                                  disabled={!canEdit}
                                  onChange={(e) => handleValueChange(setting.id, e.target.value)}
                                  className="input-field"
                                  style={{ width: '100%' }}
                                >
                                  <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
                                  <option value="DD/MM/YYYY">DD/MM/YYYY (European)</option>
                                  <option value="MM/DD/YYYY">MM/DD/YYYY (US Standard)</option>
                                </select>
                              ) : setting.key === 'default_currency' ? (
                                <select
                                  value={typeof setting.value === 'string' ? setting.value : String(setting.value ?? '')}
                                  disabled={!canEdit}
                                  onChange={(e) => handleValueChange(setting.id, e.target.value)}
                                  className="input-field"
                                  style={{ width: '100%' }}
                                >
                                  <option value="USD">USD ($ - US Dollar)</option>
                                  <option value="EUR">EUR (€ - Euro)</option>
                                  <option value="GBP">GBP (£ - British Pound)</option>
                                  <option value="CAD">CAD ($ - Canadian Dollar)</option>
                                  <option value="AUD">AUD ($ - Australian Dollar)</option>
                                  <option value="JPY">JPY (¥ - Japanese Yen)</option>
                                  <option value="INR">INR (₹ - Indian Rupee)</option>
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={typeof setting.value === 'string' || typeof setting.value === 'number' ? setting.value : ''}
                                  disabled={!canEdit}
                                  onChange={(e) => handleValueChange(setting.id, e.target.value)}
                                  className="input-field"
                                  style={{ width: '100%' }}
                                />
                              )}
                            </div>
                          )}

                          {/* Array Chips Display */}
                          {setting.value_type === 'array' && (
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end', width: '100%' }}>
                              {Array.isArray(setting.value) && setting.value.length > 0 ? (
                                setting.value.map((item, chipIdx) => (
                                  <span
                                    key={chipIdx}
                                    style={{
                                      background: 'rgba(255, 255, 255, 0.06)',
                                      padding: '0.2rem 0.55rem',
                                      borderRadius: 'var(--radius-sm)',
                                      fontSize: '0.75rem',
                                      color: 'var(--text-primary)',
                                      border: '1px solid var(--border-subtle)',
                                      fontFamily: 'monospace',
                                    }}
                                  >
                                    {String(item)}
                                  </span>
                                ))
                              ) : (
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  None configured
                                </span>
                              )}
                            </div>
                          )}

                          {/* Single Setting Revert Button */}
                          {isDirty && (
                            <button
                              type="button"
                              onClick={() => handleRevertSingle(setting.id)}
                              title="Revert this parameter to saved value"
                              style={{
                                background: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.25)',
                                color: '#f59e0b',
                                borderRadius: 'var(--radius-sm)',
                                padding: '0.45rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'var(--transition)',
                              }}
                            >
                              <RotateCcw size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Floating Sticky Save Bar */}
      {hasDirtyChanges && (
        <div
          style={{
            position: 'fixed',
            bottom: '1.75rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bg-card-solid)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--border-glow)',
            boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.6), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.85rem 1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '2rem',
            zIndex: 100,
            maxWidth: '720px',
            width: '92vw',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertCircle size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                {Object.keys(pendingChanges).length} unsaved configuration change{Object.keys(pendingChanges).length === 1 ? '' : 's'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Press <kbd style={{ padding: '0.1rem 0.35rem', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px' }}>⌘S</kbd> or click save to apply
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={handleDiscardChanges}
              disabled={isSaving}
              icon={<RotateCcw size={14} />}
            >
              Discard
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={handleSaveAll}
              disabled={isSaving}
              isLoading={isSaving}
              icon={<Save size={15} />}
            >
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
