'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useMenus } from '@/hooks/use-menus';
import { MenuItem } from '@/lib/types';
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  Menu as MenuIcon,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  Layers,
  Globe,
  Database,
  Coins,
  MapPin,
  Clock,
  ExternalLink,
  Sparkles,
  Percent,
  Home,
  History,
  X,
} from 'lucide-react';

/**
 * Normalizes backend route strings to working dashboard page paths.
 * Prevents 404s from legacy seeds or unconfigured relative paths.
 */
function normalizeRoute(rawRoute: string | null | undefined): string {
  if (!rawRoute || rawRoute === '#') return '#';
  const clean = rawRoute.trim();
  if (clean === '/dashboard') return '/';
  if (clean === '/settings/menus') return '/menus';
  if (clean === '/access-control') return '/rbac';
  if (clean === '/access-control/roles') return '/rbac?tab=roles';
  if (clean === '/access-control/permissions') return '/rbac?tab=permissions';
  if (clean === '/access-control/matrix' || clean === '/access-control/access-matrix') return '/rbac?tab=matrix';
  if (clean === '/organizations/new') return '/organizations';
  if (clean === '/masters') return '/masters';
  if (clean === '/masters/countries' || clean === 'countries') return '/masters?tab=countries';
  if (clean === '/masters/states' || clean === 'states') return '/masters?tab=states';
  if (clean === '/masters/cities' || clean === 'cities') return '/masters?tab=cities';
  if (clean === '/masters/currencies' || clean === 'currencies') return '/masters?tab=currencies';
  if (clean === '/masters/time-zones' || clean === 'time-zones') return '/masters?tab=time-zones';
  if (clean === '/masters/languages' || clean === 'languages') return '/masters?tab=languages';
  if (clean === '/masters/industries' || clean === 'industries') return '/masters?tab=industries';
  if (clean === '/masters/address-types' || clean === 'address-types') return '/masters?tab=address-types';
  if (clean === '/masters/communication-types' || clean === 'communication-types') return '/masters?tab=communication-types';
  if (clean === '/masters/document-types' || clean === 'document-types') return '/masters?tab=document-types';
  if (clean === '/masters/identification-types' || clean === 'identification-types') return '/masters?tab=identification-types';
  if (clean === '/masters/units-of-measure' || clean === 'units-of-measure') return '/masters?tab=units-of-measure';
  if (clean === '/masters/taxes' || clean === 'taxes') return '/masters?tab=taxes';
  if (clean === '/masters/brands' || clean === 'brands') return '/masters?tab=brands';
  if (clean === '/masters/addresses' || clean === 'addresses') return '/masters?tab=addresses';
  if (clean === '/system-logs' || clean === '/logs' || clean === '/activity-logs') return '/system-logs';
  return clean;
}

/**
 * Enterprise Fallback Menus used when API returns empty or session is initializing.
 */
const FALLBACK_MENUS: MenuItem[] = [
  {
    id: 'fb-dash',
    public_id: 'fb-dash',
    code: 'dashboard',
    parent_id: null,
    title: 'Dashboard',
    path: '/',
    icon: 'layout-dashboard',
    sort_order: 1,
    is_active: true,
    children: [],
  },
  {
    id: 'fb-orgs',
    public_id: 'fb-orgs',
    code: 'organizations_root',
    parent_id: null,
    title: 'Organizations',
    path: '/organizations',
    icon: 'building',
    sort_order: 2,
    is_active: true,
    children: [
      {
        id: 'fb-orgs-all',
        public_id: 'fb-orgs-all',
        code: 'org_all',
        parent_id: 'fb-orgs',
        title: 'All Organizations',
        path: '/organizations',
        icon: 'list',
        sort_order: 1,
        is_active: true,
        children: [],
      },
    ],
  },
  {
    id: 'fb-masters',
    public_id: 'fb-masters',
    code: 'master_data_root',
    parent_id: null,
    title: 'Master Data',
    path: '/masters',
    icon: 'database',
    sort_order: 3,
    is_active: true,
    children: [
      {
        id: 'fb-masters-countries',
        public_id: 'fb-masters-countries',
        code: 'masters_countries',
        parent_id: 'fb-masters',
        title: 'Countries',
        path: '/masters?tab=countries',
        icon: 'globe',
        sort_order: 1,
        is_active: true,
        children: [],
      },
      {
        id: 'fb-masters-states',
        public_id: 'fb-masters-states',
        code: 'masters_states',
        parent_id: 'fb-masters',
        title: 'States & Provinces',
        path: '/masters?tab=states',
        icon: 'map-pin',
        sort_order: 2,
        is_active: true,
        children: [],
      },
      {
        id: 'fb-masters-cities',
        public_id: 'fb-masters-cities',
        code: 'masters_cities',
        parent_id: 'fb-masters',
        title: 'Cities',
        path: '/masters?tab=cities',
        icon: 'building',
        sort_order: 3,
        is_active: true,
        children: [],
      },
      {
        id: 'fb-masters-addresses',
        public_id: 'fb-masters-addresses',
        code: 'masters_addresses',
        parent_id: 'fb-masters',
        title: 'Addresses',
        path: '/masters?tab=addresses',
        icon: 'home',
        sort_order: 4,
        is_active: true,
        children: [],
      },
      {
        id: 'fb-masters-timezones',
        public_id: 'fb-masters-timezones',
        code: 'masters_timezones',
        parent_id: 'fb-masters',
        title: 'Time Zones',
        path: '/masters?tab=time-zones',
        icon: 'clock',
        sort_order: 5,
        is_active: true,
        children: [],
      },
      {
        id: 'fb-masters-currencies',
        public_id: 'fb-masters-currencies',
        code: 'masters_currencies',
        parent_id: 'fb-masters',
        title: 'Currencies',
        path: '/masters?tab=currencies',
        icon: 'coins',
        sort_order: 6,
        is_active: true,
        children: [],
      },
      {
        id: 'fb-masters-taxes',
        public_id: 'fb-masters-taxes',
        code: 'masters_taxes',
        parent_id: 'fb-masters',
        title: 'Taxes & Tariffs',
        path: '/masters?tab=taxes',
        icon: 'percent',
        sort_order: 7,
        is_active: true,
        children: [],
      },
      {
        id: 'fb-masters-uom',
        public_id: 'fb-masters-uom',
        code: 'masters_uom',
        parent_id: 'fb-masters',
        title: 'Units of Measure',
        path: '/masters?tab=units-of-measure',
        icon: 'scale',
        sort_order: 8,
        is_active: true,
        children: [],
      },
      {
        id: 'fb-masters-brands',
        public_id: 'fb-masters-brands',
        code: 'masters_brands',
        parent_id: 'fb-masters',
        title: 'Brands & Trademarks',
        path: '/masters?tab=brands',
        icon: 'sparkles',
        sort_order: 9,
        is_active: true,
        children: [],
      },
      {
        id: 'fb-masters-industries',
        public_id: 'fb-masters-industries',
        code: 'masters_industries',
        parent_id: 'fb-masters',
        title: 'Industries',
        path: '/masters?tab=industries',
        icon: 'briefcase',
        sort_order: 10,
        is_active: true,
        children: [],
      },
      {
        id: 'fb-masters-languages',
        public_id: 'fb-masters-languages',
        code: 'masters_languages',
        parent_id: 'fb-masters',
        title: 'Languages',
        path: '/masters?tab=languages',
        icon: 'languages',
        sort_order: 11,
        is_active: true,
        children: [],
      },
      {
        id: 'fb-masters-address-types',
        public_id: 'fb-masters-address-types',
        code: 'masters_address_types',
        parent_id: 'fb-masters',
        title: 'Address Types',
        path: '/masters?tab=address-types',
        icon: 'tag',
        sort_order: 12,
        is_active: true,
        children: [],
      },
      {
        id: 'fb-masters-comm-types',
        public_id: 'fb-masters-comm-types',
        code: 'masters_comm_types',
        parent_id: 'fb-masters',
        title: 'Communication Types',
        path: '/masters?tab=communication-types',
        icon: 'phone',
        sort_order: 13,
        is_active: true,
        children: [],
      },
      {
        id: 'fb-masters-doc-types',
        public_id: 'fb-masters-doc-types',
        code: 'masters_doc_types',
        parent_id: 'fb-masters',
        title: 'Document Types',
        path: '/masters?tab=document-types',
        icon: 'file-text',
        sort_order: 14,
        is_active: true,
        children: [],
      },
      {
        id: 'fb-masters-ident-types',
        public_id: 'fb-masters-ident-types',
        code: 'masters_ident_types',
        parent_id: 'fb-masters',
        title: 'Identification Types',
        path: '/masters?tab=identification-types',
        icon: 'credit-card',
        sort_order: 15,
        is_active: true,
        children: [],
      },
    ],
  },
  {
    id: 'fb-rbac',
    public_id: 'fb-rbac',
    code: 'access_control_root',
    parent_id: null,
    title: 'Access Control',
    path: '/rbac',
    icon: 'shield-check',
    sort_order: 4,
    is_active: true,
    children: [
      {
        id: 'fb-rbac-roles',
        public_id: 'fb-rbac-roles',
        code: 'rbac_roles',
        parent_id: 'fb-rbac',
        title: 'Roles',
        path: '/rbac?tab=roles',
        icon: 'user-check',
        sort_order: 1,
        is_active: true,
        children: [],
      },
      {
        id: 'fb-rbac-perms',
        public_id: 'fb-rbac-perms',
        code: 'rbac_permissions',
        parent_id: 'fb-rbac',
        title: 'Permissions',
        path: '/rbac?tab=permissions',
        icon: 'key',
        sort_order: 2,
        is_active: true,
        children: [],
      },
      {
        id: 'fb-rbac-matrix',
        public_id: 'fb-rbac-matrix',
        code: 'rbac_matrix',
        parent_id: 'fb-rbac',
        title: 'Access Matrix',
        path: '/rbac?tab=matrix',
        icon: 'layers',
        sort_order: 3,
        is_active: true,
        children: [],
      },
      {
        id: 'fb-rbac-users',
        public_id: 'fb-rbac-users',
        code: 'admin_users',
        parent_id: 'fb-rbac',
        title: 'User Administration',
        path: '/users',
        icon: 'users',
        sort_order: 4,
        is_active: true,
        children: [],
      },
    ],
  },
  {
    id: 'fb-settings',
    public_id: 'fb-settings',
    code: 'system_settings_root',
    parent_id: null,
    title: 'System Settings',
    path: '/settings',
    icon: 'settings',
    sort_order: 5,
    is_active: true,
    children: [
      {
        id: 'fb-settings-general',
        public_id: 'fb-settings-general',
        code: 'settings_general',
        parent_id: 'fb-settings',
        title: 'App Configurations',
        path: '/settings',
        icon: 'sliders',
        sort_order: 1,
        is_active: true,
        children: [],
      },
      {
        id: 'fb-settings-activity',
        public_id: 'fb-settings-activity',
        code: 'settings_activity_logs',
        parent_id: 'fb-settings',
        title: 'System Activity',
        path: '/system-logs',
        icon: 'history',
        sort_order: 2,
        is_active: true,
        children: [],
      },
      {
        id: 'fb-settings-notifications',
        public_id: 'fb-settings-notifications',
        code: 'settings_notifications',
        parent_id: 'fb-settings',
        title: 'Notifications & Alerts',
        path: '/notifications',
        icon: 'bell',
        sort_order: 3,
        is_active: true,
        children: [],
      },
      {
        id: 'fb-settings-menus',
        public_id: 'fb-settings-menus',
        code: 'settings_menus',
        parent_id: 'fb-settings',
        title: 'Menu Architecture',
        path: '/menus',
        icon: 'menu',
        sort_order: 4,
        is_active: true,
        children: [],
      },
      {
        id: 'fb-settings-profile',
        public_id: 'fb-settings-profile',
        code: 'settings_profile',
        parent_id: 'fb-settings',
        title: 'Account & Security',
        path: '/profile',
        icon: 'user',
        sort_order: 5,
        is_active: true,
        children: [],
      },
    ],
  },
];

/**
 * Recursively sorts navigation menu items and their nested children
 * strictly by sort_order / order_no ascending, followed by title alphabetically.
 */
function sortMenuItemsByOrder(items: MenuItem[]): MenuItem[] {
  return [...items]
    .sort((a, b) => {
      const orderA = a.sort_order ?? a.order_no ?? 0;
      const orderB = b.sort_order ?? b.order_no ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return a.title.localeCompare(b.title);
    })
    .map((item) => ({
      ...item,
      children: item.children ? sortMenuItemsByOrder(item.children) : [],
    }));
}

/**
 * Resolves a backend string identifier into a styled Lucide icon element.
 */
function getIconComponent(iconName: string | null): React.ReactNode {
  if (!iconName) return <Layers size={18} />;
  const normalized = iconName.toLowerCase();
  if (normalized.includes('dash')) return <LayoutDashboard size={18} />;
  if (normalized.includes('org') || normalized.includes('build')) return <Building2 size={18} />;
  if (normalized.includes('user')) return <Users size={18} />;
  if (normalized.includes('shield') || normalized.includes('role') || normalized.includes('rbac') || normalized.includes('perm'))
    return <ShieldCheck size={18} />;
  if (normalized.includes('menu')) return <MenuIcon size={18} />;
  if (normalized.includes('setting')) return <Settings size={18} />;
  if (normalized.includes('globe') || normalized.includes('public')) return <Globe size={18} />;
  if (normalized.includes('data') || normalized.includes('master')) return <Database size={18} />;
  if (normalized.includes('coin') || normalized.includes('curr') || normalized.includes('money')) return <Coins size={18} />;
  if (normalized.includes('pin') || normalized.includes('map') || normalized.includes('state')) return <MapPin size={18} />;
  if (normalized.includes('time') || normalized.includes('clock')) return <Clock size={18} />;
  if (normalized.includes('percent') || normalized.includes('tax')) return <Percent size={18} />;
  if (normalized.includes('sparkle') || normalized.includes('brand')) return <Sparkles size={18} />;
  if (normalized.includes('home') || normalized.includes('addr')) return <Home size={18} />;
  if (normalized.includes('log') || normalized.includes('hist') || normalized.includes('audit')) return <History size={18} />;
  return <Layers size={18} />;
}

export interface SidebarProps {
  /** Indicates whether the off-canvas drawer is toggled open on mobile viewports */
  isMobileOpen?: boolean;
  /** Callback fired to close the mobile drawer */
  onCloseMobile?: () => void;
}

/**
 * Evaluates whether a menu item is the single active route.
 * Leaf items match path and query params (e.g. `tab=roles` vs `tab=matrix`).
 * Containers with children do NOT claim active selection state to prevent duplicate highlights.
 */
function isRouteActive(
  item: MenuItem,
  currentPath: string,
  currentTab: string | null
): boolean {
  if (item.children && item.children.length > 0) {
    return false;
  }

  const rawRoute = item.route || item.path || '#';
  if (!rawRoute || rawRoute === '#') return false;

  const route = normalizeRoute(rawRoute);
  const [routePath, routeQuery] = route.split('?');

  if (routePath === '/') {
    return currentPath === '/';
  }

  if (currentPath !== routePath && !currentPath.startsWith(routePath + '/')) {
    return false;
  }

  if (routeQuery) {
    const itemParams = new URLSearchParams(routeQuery);
    const expectedTab = itemParams.get('tab');
    if (expectedTab) {
      const defaultTab = routePath === '/rbac' ? 'roles' : (routePath === '/masters' ? 'countries' : '');
      const actualTab = currentTab || defaultTab;
      return actualTab === expectedTab;
    }
  } else {
    if (routePath === '/rbac') {
      const actualTab = currentTab || 'roles';
      return actualTab === 'roles';
    }
    if (routePath === '/masters') {
      const actualTab = currentTab || 'countries';
      return actualTab === 'countries';
    }
  }

  return currentPath === routePath;
}

/**
 * Checks if a menu container has any active child descendant.
 */
function hasActiveChild(
  item: MenuItem,
  currentPath: string,
  currentTab: string | null
): boolean {
  if (!item.children || item.children.length === 0) return false;
  return item.children.some(
    (child) =>
      isRouteActive(child, currentPath, currentTab) ||
      hasActiveChild(child, currentPath, currentTab)
  );
}

/**
 * Enterprise Sidebar navigation component driven dynamically by `/api/v1/menus/my-menus`.
 * Renders hierarchical menus sorted by sort_order, active route highlighting, and current user session actions.
 */
function SidebarContent({ isMobileOpen = false, onCloseMobile }: SidebarProps = {}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams ? searchParams.get('tab') : null;
  const { user, logout } = useAuth();
  const { menus, isLoading } = useMenus();
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  // Use dynamic menu tree from backend, with graceful fallback if empty
  const effectiveMenus = useMemo(() => {
    return menus.length > 0 ? menus : FALLBACK_MENUS;
  }, [menus]);

  // Deterministically sort menu tree and sub-children based on sort_order
  const sortedMenus = useMemo(() => sortMenuItemsByOrder(effectiveMenus), [effectiveMenus]);

  function toggleExpand(id: number | string, currentlyExpanded: boolean) {
    setExpandedKeys((prev) => ({
      ...prev,
      [String(id)]: !currentlyExpanded,
    }));
  }

  function renderMenuItem(item: MenuItem, level: number = 0) {
    const hasChildren = item.children && item.children.length > 0;
    const isChildActive = Boolean(hasChildren && hasActiveChild(item, pathname, currentTab));
    // ONLY the active menu parent expands by default; other menus remain collapsed
    const isExpanded = expandedKeys[item.id] !== undefined ? expandedKeys[item.id] : isChildActive;
    const isExternal = item.is_external;
    const rawRoute = item.route || item.path || '#';
    const route = normalizeRoute(rawRoute);
    const isActive = isRouteActive(item, pathname, currentTab);

    if (hasChildren) {
      return (
        <div key={item.id} style={{ marginBottom: '0.25rem' }}>
          <div
            onClick={() => toggleExpand(item.id, isExpanded)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.55rem 0.65rem',
              paddingLeft: `${0.85 + level * 0.75}rem`,
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              color: isChildActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderLeft: '3px solid transparent',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'var(--transition)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.background = 'var(--border-subtle)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = isChildActive ? 'var(--text-primary)' : 'var(--text-secondary)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                color: 'inherit',
                flex: 1,
                minWidth: 0,
              }}
            >
              <span style={{ color: isChildActive ? 'var(--accent-primary)' : 'var(--text-muted)', display: 'flex', flexShrink: 0 }}>
                {getIconComponent(item.icon)}
              </span>
              <span style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.title}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(item.id, isExpanded);
              }}
              title={isExpanded ? 'Collapse sub-menu' : 'Expand sub-menu'}
              style={{
                background: 'transparent',
                border: 'none',
                color: isChildActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.3rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-sm)',
                transition: 'var(--transition)',
              }}
            >
              {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>
          </div>

          {isExpanded && (
            <div style={{ marginTop: '0.15rem' }}>
              {item.children.map((child) => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    const content = (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.65rem 0.85rem',
          paddingLeft: `${0.85 + level * 0.75}rem`,
          borderRadius: 'var(--radius-md)',
          fontSize: '0.875rem',
          fontWeight: isActive ? 600 : 500,
          color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
          background: isActive ? 'var(--accent-glow)' : 'transparent',
          borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
          transition: 'var(--transition)',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.background = 'var(--border-subtle)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          <span style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)', display: 'flex', flexShrink: 0 }}>
            {getIconComponent(item.icon)}
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
        </div>
        {item.badge && <span className="badge badge-primary">{item.badge}</span>}
        {isExternal && <ExternalLink size={14} style={{ color: 'var(--text-muted)' }} />}
      </div>
    );

    return isExternal ? (
      <a key={item.id} href={route} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginBottom: '0.15rem' }}>
        {content}
      </a>
    ) : (
      <Link key={item.id} href={route} onClick={() => onCloseMobile?.()} style={{ display: 'block', marginBottom: '0.15rem' }}>
        {content}
      </Link>
    );
  }

  return (
    <>
      {isMobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header */}
        <div
          style={{
            padding: '1.4rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link
            href="/"
            onClick={() => onCloseMobile?.()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
              }}
            >
              <Sparkles size={19} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.98rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                CRM Platform
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Enterprise Suite</div>
            </div>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge badge-primary">v2.0</span>
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="sidebar-close-btn"
                aria-label="Close menu"
                title="Close menu"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

      {/* Dynamic Navigation Section */}
      <div style={{ flex: 1, padding: '1.25rem 0.85rem', overflowY: 'auto' }}>
        <div
          style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            padding: '0 0.85rem 0.65rem 0.85rem',
          }}
        >
          Main Navigation
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem' }}>
            <div className="skeleton" style={{ height: '36px', width: '100%' }} />
            <div className="skeleton" style={{ height: '36px', width: '100%' }} />
            <div className="skeleton" style={{ height: '36px', width: '100%' }} />
            <div className="skeleton" style={{ height: '36px', width: '100%' }} />
          </div>
        ) : (
          sortedMenus.map((item) => renderMenuItem(item))
        )}
      </div>

      {/* User Footer Profile */}
      {user && (
        <div
          style={{
            padding: '1rem',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-input)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, textDecoration: 'none' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem',
                flexShrink: 0,
              }}
            >
              {user.first_name ? user.first_name[0].toUpperCase() : user.email[0].toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user.display_name || user.email}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Status: {user.status}</div>
            </div>
          </Link>
          <button
            onClick={() => logout()}
            title="Sign out"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#f43f5e';
              e.currentTarget.style.background = 'rgba(244, 63, 94, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </aside>
    </>
  );
}

/**
 * Suspense-wrapped Sidebar for Next.js App Router boundary safety.
 */
export function Sidebar(props: SidebarProps = {}) {
  return (
    <React.Suspense
      fallback={
        <aside className={`sidebar ${props.isMobileOpen ? 'mobile-open' : ''}`}>
          <div style={{ padding: '1.4rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="skeleton" style={{ height: '36px', width: '120px' }} />
          </div>
        </aside>
      }
    >
      <SidebarContent {...props} />
    </React.Suspense>
  );
}
