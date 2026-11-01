'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSidebarState } from '@/lib/sidebar-context';
import { useMenus } from '@/hooks/use-menus';
import { MenuItem } from '@/lib/types';
import {
  Home,
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  Settings,
  Database,
  Layers,
  Sparkles,
  BarChart3,
  Globe,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  ChevronRight,
  ChevronDown,
  LogOut,
  Coins,
  MapPin,
  Clock,
  History,
  Camera,
} from 'lucide-react';

export interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavSectionItem {
  id: string | number;
  title: string;
  path: string;
  icon: React.ReactNode;
  menu: MenuItem;
}

interface SecondaryMenuEntry {
  id: string;
  title: string;
  path: string;
  icon: string | null;
  depth: number;
  isLabel: boolean;
}

function normalizeRoute(rawRoute: string | null | undefined): string {
  if (!rawRoute || rawRoute === '#') return '#';
  const clean = rawRoute.trim();
  if (clean === '/dashboard') return '/';
  if (clean === '/settings/menus') return '/menus';
  if (clean === '/access-control') return '/rbac';
  if (clean === '/access-control/roles') return '/rbac?tab=roles';
  if (clean === '/access-control/permissions') return '/rbac?tab=permissions';
  if (clean === '/access-control/matrix' || clean === '/access-control/access-matrix') {
    return '/rbac?tab=matrix';
  }
  if (clean === '/organizations/new') return '/organizations';
  if (clean === '/masters') return '/masters';
  if (clean === '/masters/countries' || clean === 'countries') return '/masters?tab=countries';
  if (clean === '/masters/states' || clean === 'states') return '/masters?tab=states';
  if (clean === '/masters/cities' || clean === 'cities') return '/masters?tab=cities';
  if (clean === '/masters/currencies' || clean === 'currencies') return '/masters?tab=currencies';
  if (clean === '/masters/time-zones' || clean === 'time-zones') return '/masters?tab=time-zones';
  if (clean === '/masters/languages' || clean === 'languages') return '/masters?tab=languages';
  if (clean === '/masters/industries' || clean === 'industries') return '/masters?tab=industries';
  if (clean === '/masters/brands' || clean === 'brands') return '/masters?tab=brands';
  if (clean === '/masters/addresses' || clean === 'addresses') return '/masters?tab=addresses';
  if (clean === '/system-logs' || clean === '/logs' || clean === '/activity-logs') {
    return '/system-logs';
  }
  return clean;
}

function resolveMenuIcon(icon: string | null, size = 19): React.ReactNode {
  if (!icon) return <Layers size={size} />;
  const normalized = icon.toLowerCase();
  if (normalized.includes('home')) return <Home size={size} />;
  if (normalized.includes('dash') || normalized.includes('layout')) {
    return <LayoutDashboard size={size} />;
  }
  if (normalized.includes('build') || normalized.includes('org')) {
    return <Building2 size={size} />;
  }
  if (normalized.includes('user')) return <Users size={size} />;
  if (
    normalized.includes('shield') ||
    normalized.includes('role') ||
    normalized.includes('perm') ||
    normalized.includes('access') ||
    normalized.includes('rbac')
  ) {
    return <ShieldCheck size={size} />;
  }
  if (normalized.includes('data') || normalized.includes('master')) {
    return <Database size={size} />;
  }
  if (normalized.includes('setting')) return <Settings size={size} />;
  if (normalized.includes('globe') || normalized.includes('countr')) {
    return <Globe size={size} />;
  }
  if (normalized.includes('bell') || normalized.includes('notif')) {
    return <Bell size={size} />;
  }
  if (normalized.includes('pin') || normalized.includes('map') || normalized.includes('address')) {
    return <MapPin size={size} />;
  }
  if (normalized.includes('clock') || normalized.includes('time') || normalized.includes('zone')) {
    return <Clock size={size} />;
  }
  if (normalized.includes('coin') || normalized.includes('currency') || normalized.includes('cash')) {
    return <Coins size={size} />;
  }
  if (normalized.includes('file') || normalized.includes('log') || normalized.includes('history')) {
    return <History size={size} />;
  }
  if (normalized.includes('chart') || normalized.includes('report') || normalized.includes('analytic')) {
    return <BarChart3 size={size} />;
  }
  return <Layers size={size} />;
}

function sortMenuTree(items: MenuItem[]): MenuItem[] {
  return [...items]
    .sort((a, b) => {
      const leftOrder = a.sort_order ?? a.order_no ?? 0;
      const rightOrder = b.sort_order ?? b.order_no ?? 0;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return a.title.localeCompare(b.title);
    })
    .map((item) => ({
      ...item,
      children: sortMenuTree(item.children ?? []),
    }));
}

function extractSecondaryMenuEntries(
  items: MenuItem[],
  depth = 0
): SecondaryMenuEntry[] {
  const entries: SecondaryMenuEntry[] = [];
  const sortedItems = sortMenuTree(items).filter(
    (item) => !item.is_deleted && item.is_active !== false
  );

  for (const item of sortedItems) {
    const path = normalizeRoute(item.path ?? item.route);
    const hasChildren = (item.children ?? []).length > 0;

    if (path !== '#') {
      entries.push({
        id: String(item.id),
        title: item.title,
        path,
        icon: item.icon,
        depth,
        isLabel: false,
      });
    } else if (hasChildren) {
      entries.push({
        id: `label-${String(item.id)}`,
        title: item.title,
        path: '#',
        icon: item.icon,
        depth,
        isLabel: true,
      });
    }

    if (hasChildren) {
      entries.push(...extractSecondaryMenuEntries(item.children, depth + 1));
    }
  }

  return entries;
}

export function Sidebar({ isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams ? searchParams.get('tab') : null;
  const { logout } = useAuth();
  const { menus, isLoading, error, refreshMenus } = useMenus();
  const {
    isPrimaryCollapsed,
    togglePrimaryCollapse,
    setPrimaryCollapsed,
    isSecondaryCollapsed,
    setSecondaryCollapsed,
  } = useSidebarState();
  const [selectedPrimaryMenuId, setSelectedPrimaryMenuId] = useState<
    string | number | null
  >(null);

  const [customLogo, setCustomLogo] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('djio_brand_logo') ?? null;
  });
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setCustomLogo(dataUrl);
      localStorage.setItem('djio_brand_logo', dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const isLinkActive = useCallback((itemPath: string): boolean => {
    const cleanPath = normalizeRoute(itemPath);
    if (cleanPath === '#') return false;
    const [path, query] = cleanPath.split('?');
    if (path === '/') return pathname === '/';
    if (!pathname.startsWith(path)) return false;
    if (query) {
      const expectedTab = new URLSearchParams(query).get('tab');
      return currentTab === expectedTab;
    }
    return true;
  }, [currentTab, pathname]);

  const sortedVisibleMenus = useMemo(() => {
    return sortMenuTree(menus).filter(
      (item) => !item.is_deleted && item.is_active !== false
    );
  }, [menus]);

  const primaryItems = useMemo<NavSectionItem[]>(() => {
    return sortedVisibleMenus.map((item) => {
      const resolvedPath = normalizeRoute(item.path ?? item.route ?? item.children?.[0]?.path);
      return {
        id: item.id,
        title: item.title,
        path: resolvedPath,
        icon: resolveMenuIcon(item.icon, 19),
        menu: item,
      };
    });
  }, [sortedVisibleMenus]);

  const isRouteActiveInTree = useCallback(
    function checkTree(item: MenuItem): boolean {
      const route = normalizeRoute(item.path ?? item.route);
      if (route !== '#' && isLinkActive(route)) {
        return true;
      }
      return (item.children ?? []).some((child) => checkTree(child));
    },
    [isLinkActive]
  );

  const activePrimaryItem = useMemo(() => {
    const firstMatched = primaryItems.find((item) => {
      if (isLinkActive(item.path)) return true;
      return (item.menu.children ?? []).some((child) => isRouteActiveInTree(child));
    });
    return firstMatched ?? null;
  }, [isLinkActive, isRouteActiveInTree, primaryItems]);

  useEffect(() => {
    if (!activePrimaryItem) {
      return;
    }
    setSelectedPrimaryMenuId(activePrimaryItem.id);
    if ((activePrimaryItem.menu.children ?? []).length > 0) {
      setSecondaryCollapsed(false);
      setPrimaryCollapsed(true);
    } else {
      setSecondaryCollapsed(true);
      setPrimaryCollapsed(false);
    }
  // Only run when the active route changes, not on every state change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePrimaryItem?.id]);

  const handleNavClick = (item: NavSectionItem) => {
    setSelectedPrimaryMenuId(item.id);
    if ((item.menu.children ?? []).length > 0) {
      setSecondaryCollapsed(false);
      setPrimaryCollapsed(true);
    } else {
      setSecondaryCollapsed(true);
      setPrimaryCollapsed(false);
      onCloseMobile?.();
    }
  };

  const selectedPrimaryItem = useMemo(() => {
    if (selectedPrimaryMenuId === null) {
      return activePrimaryItem;
    }
    return (
      primaryItems.find((item) => item.id === selectedPrimaryMenuId) ??
      activePrimaryItem
    );
  }, [activePrimaryItem, primaryItems, selectedPrimaryMenuId]);

  const contextualSubItems = useMemo(() => {
    if (!selectedPrimaryItem) return null;
    const entries = extractSecondaryMenuEntries(selectedPrimaryItem.menu.children ?? []);
    if (entries.length === 0) return null;
    return {
      title: selectedPrimaryItem.title,
      items: entries,
    };
  }, [selectedPrimaryItem]);

  return (
    <>
      {isMobileOpen && (
        <div className="sidebar-backdrop" onClick={onCloseMobile} aria-hidden="true" />
      )}

      {/* =========================================================================
       * Tier 1: Primary Mailtrap Rail Sidebar
       * ========================================================================= */}
      <aside className={`sidebar-primary ${isMobileOpen ? 'mobile-open' : ''} ${isPrimaryCollapsed ? 'collapsed' : ''}`}>
        {/* Brand Header with Integrated Expand / Collapse Icon */}
        <div
          style={{
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isPrimaryCollapsed ? 'center' : 'space-between',
            padding: isPrimaryCollapsed ? '0' : '0 0.85rem 0 1rem',
            borderBottom: '1px solid var(--border-subtle)',
            position: 'relative',
          }}
        >
          <Link
            href="/"
            onClick={() => onCloseMobile?.()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              textDecoration: 'none',
              overflow: 'hidden',
              flex: 1,
              minWidth: 0,
            }}
          >
            {/* Logo — click area for upload */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                style={{
                  width: isPrimaryCollapsed ? '36px' : '34px',
                  height: isPrimaryCollapsed ? '36px' : '34px',
                  borderRadius: '9px',
                  background: customLogo ? 'transparent' : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: '#fff',
                  boxShadow: customLogo ? 'none' : '0 2px 8px rgba(59, 130, 246, 0.4)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'width 0.28s ease, height 0.28s ease',
                  position: 'relative',
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  logoInputRef.current?.click();
                }}
                title="Click to change logo"
              >
                {customLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={customLogo}
                    alt="Brand logo"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />
                ) : (
                  <Sparkles size={isPrimaryCollapsed ? 19 : 17} />
                )}
                {/* Hover overlay */}
                <div
                  className="logo-upload-hover"
                >
                  <Camera size={13} color="#fff" />
                </div>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                style={{ display: 'none' }}
                aria-label="Upload brand logo"
              />
            </div>

            {!isPrimaryCollapsed && (
              <div style={{ overflow: 'hidden', minWidth: 0 }}>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: '0.875rem',
                    letterSpacing: '-0.01em',
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    display: 'block',
                    lineHeight: 1.1,
                  }}
                >
                  DJIO ONE
                </span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 500,
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    display: 'block',
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                  }}
                >
                  Enterprise Suite
                </span>
              </div>
            )}
          </Link>

          {/* Toggle Button for Expanded Mode */}
          {!isPrimaryCollapsed && (
            <button
              type="button"
              onClick={togglePrimaryCollapse}
              title="Collapse sidebar to icons"
              aria-label="Collapse sidebar"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-sm)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
              }}
            >
              <PanelLeftClose size={15} />
            </button>
          )}
        </div>

        {/* Primary Navigation Item List */}
        <div style={{ flex: 1, padding: isPrimaryCollapsed ? '0.75rem 0.35rem' : '0.75rem 0.5rem', overflowY: 'auto' }}>
          {/* Toggle Button when Collapsed (Show Expand Icon at Top) */}
          {isPrimaryCollapsed && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <button
                type="button"
                onClick={togglePrimaryCollapse}
                title="Expand sidebar"
                aria-label="Expand sidebar"
                style={{
                  width: '36px',
                  height: '36px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.background = 'rgba(37, 99, 235, 0.2)';
                  e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                }}
              >
                <PanelLeftOpen size={17} />
              </button>
            </div>
          )}

          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', padding: '0 0.45rem' }}>
              <div className="skeleton" style={{ width: '100%', height: '36px', borderRadius: '10px' }} />
              <div className="skeleton" style={{ width: '100%', height: '36px', borderRadius: '10px' }} />
              <div className="skeleton" style={{ width: '100%', height: '36px', borderRadius: '10px' }} />
            </div>
          )}

          {error && !isLoading && (
            <div
              style={{
                margin: '0 0.45rem 0.75rem',
                padding: '0.65rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#fca5a5',
                fontSize: '0.78rem',
              }}
            >
              <div style={{ marginBottom: '0.5rem' }}>{error}</div>
              <button
                type="button"
                onClick={() => void refreshMenus()}
                style={{
                  padding: '0.3rem 0.55rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  background: 'transparent',
                  color: '#fecaca',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Section 1: Navigation (dynamic menu order from menus table) */}
          {!isPrimaryCollapsed && (
            <div
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-muted)',
                padding: '0 0.75rem 0.5rem',
              }}
            >
              Main Navigation
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {primaryItems.map((item) => {
              const hasChildren = (item.menu.children ?? []).length > 0;
              const hasActiveChild = (item.menu.children ?? []).some((child) =>
                isRouteActiveInTree(child)
              );
              const routeActive = isLinkActive(item.path) || hasActiveChild;
              const submenuOpen = selectedPrimaryItem?.id === item.id && !isSecondaryCollapsed && hasChildren;

              const bgColor = routeActive
                ? 'var(--accent-primary)'
                : submenuOpen
                  ? 'var(--accent-subtle)'
                  : 'transparent';
              const textColor = routeActive ? '#ffffff' : submenuOpen ? '#60a5fa' : 'var(--text-secondary)';
              const iconColor = routeActive ? '#ffffff' : submenuOpen ? '#60a5fa' : 'var(--text-muted)';

              const itemStyle: React.CSSProperties = {
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: isPrimaryCollapsed ? '0.65rem 0' : '0.55rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                color: textColor,
                background: bgColor,
                fontWeight: routeActive || submenuOpen ? 600 : 500,
                fontSize: '0.85rem',
                justifyContent: isPrimaryCollapsed ? 'center' : 'flex-start',
                transition: 'all 0.15s ease',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                textDecoration: 'none',
                textAlign: 'left',
              };

              const content = (
                <>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: iconColor }}>
                    {item.icon}
                  </span>
                  {!isPrimaryCollapsed && (
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                      {item.title}
                    </span>
                  )}
                  {!isPrimaryCollapsed && hasChildren && (
                    <span
                      style={{
                        display: 'flex',
                        color: iconColor,
                        transform: submenuOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                        flexShrink: 0,
                      }}
                    >
                      <ChevronDown size={14} />
                    </span>
                  )}
                </>
              );

              // No valid path and no children → disabled
              if (item.path === '#' && !hasChildren) {
                return (
                  <div key={String(item.id)} style={{ ...itemStyle, opacity: 0.45, cursor: 'not-allowed' }}>
                    {content}
                  </div>
                );
              }

              // Items with no real path but have children → pure toggle button (no navigation)
              if (item.path === '#' && hasChildren) {
                return (
                  <button
                    key={String(item.id)}
                    type="button"
                    onClick={() => handleNavClick(item)}
                    data-tooltip={isPrimaryCollapsed ? item.title : undefined}
                    className={isPrimaryCollapsed ? 'sidebar-nav-item-tooltip' : undefined}
                    style={itemStyle}
                    onMouseEnter={(e) => { if (!routeActive && !submenuOpen) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                    onMouseLeave={(e) => { if (!routeActive && !submenuOpen) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {content}
                  </button>
                );
              }

              // All other items (with or without children) → navigate via Link
              // onClick syncs sidebar state without blocking navigation
              return (
                <Link
                  key={String(item.id)}
                  href={item.path}
                  onClick={() => handleNavClick(item)}
                  data-tooltip={isPrimaryCollapsed ? item.title : undefined}
                  className={isPrimaryCollapsed ? 'sidebar-nav-item-tooltip' : undefined}
                  style={itemStyle}
                  onMouseEnter={(e) => { if (!routeActive && !submenuOpen) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                  onMouseLeave={(e) => { if (!routeActive && !submenuOpen) e.currentTarget.style.background = bgColor; }}
                >
                  {content}
                </Link>
              );
            })}
          </div>

          {contextualSubItems && (
            <div className="sidebar-mobile-submenus">
              <div
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-muted)',
                  padding: '1rem 0.75rem 0.5rem',
                }}
              >
                {contextualSubItems.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                {contextualSubItems.items.map((sub) => {
                  if (sub.isLabel) {
                    return (
                      <div
                        key={sub.id}
                        style={{
                          padding: `0.45rem 0.75rem 0.35rem ${0.75 + sub.depth * 0.75}rem`,
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {sub.title}
                      </div>
                    );
                  }

                  const active = isLinkActive(sub.path);
                  return (
                    <Link
                      key={sub.id}
                      href={sub.path}
                      onClick={() => onCloseMobile?.()}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: `0.5rem 0.75rem 0.5rem ${0.75 + sub.depth * 0.75}rem`,
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.82rem',
                        fontWeight: active ? 600 : 400,
                        color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        background: active ? 'var(--accent-subtle)' : 'transparent',
                        borderLeft: active ? '3px solid var(--accent-primary)' : '3px solid transparent',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = active ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.color = active ? 'var(--accent-primary)' : 'var(--text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = active ? 'var(--accent-subtle)' : 'transparent';
                        e.currentTarget.style.color = active ? 'var(--accent-primary)' : 'var(--text-secondary)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{ color: active ? 'var(--accent-primary)' : 'var(--text-muted)', display: 'flex' }}>
                          {resolveMenuIcon(sub.icon, 14)}
                        </span>
                        <span>{sub.title}</span>
                      </div>
                      {active && <ChevronRight size={13} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Utility Controls */}
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            padding: isPrimaryCollapsed ? '0.65rem 0' : '0.75rem 0.5rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => logout()}
            title="Sign out"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: isPrimaryCollapsed ? '6px' : '8px 10px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              fontWeight: 600,
            }}
          >
            <LogOut size={isPrimaryCollapsed ? 17 : 16} />
            {!isPrimaryCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* =========================================================================
       * Tier 2: Secondary Contextual Collapsible Sub-Sidebar (Mailtrap Style)
       * ========================================================================= */}
      {contextualSubItems && (
        <aside className={`sidebar-secondary ${isSecondaryCollapsed ? 'collapsed' : ''}`}>
          {/* Sub-Sidebar Header with Expand/Collapse toggle */}
          <div
            style={{
              height: '56px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 1rem',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <h2
              style={{
                fontSize: '0.92rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              {contextualSubItems.title}
            </h2>
            <button
              type="button"
              onClick={() => {
                if (isSecondaryCollapsed) {
                  setSecondaryCollapsed(false);
                  setPrimaryCollapsed(true);
                } else {
                  setSecondaryCollapsed(true);
                  setPrimaryCollapsed(false);
                }
              }}
              title={isSecondaryCollapsed ? 'Expand sub-sidebar' : 'Collapse sub-sidebar'}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-sm)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
              }}
            >
              {isSecondaryCollapsed ? <PanelRightOpen size={15} /> : <PanelRightClose size={15} />}
            </button>
          </div>

          {/* Sub-menu links */}
          <div style={{ flex: 1, padding: '0.75rem 0.65rem', overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {contextualSubItems.items.map((sub) => {
                if (sub.isLabel) {
                  return (
                    <div
                      key={sub.id}
                      style={{
                        padding: `0.45rem 0.75rem 0.35rem ${0.75 + sub.depth * 0.75}rem`,
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {sub.title}
                    </div>
                  );
                }

                const active = isLinkActive(sub.path);
                return (
                  <Link
                    key={sub.id}
                    href={sub.path}
                    onClick={() => onCloseMobile?.()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: `0.52rem 0.75rem 0.52rem ${0.75 + sub.depth * 0.75}rem`,
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.84rem',
                      fontWeight: active ? 600 : 400,
                      color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      background: active ? 'var(--accent-subtle)' : 'transparent',
                      borderLeft: active ? `3px solid var(--accent-primary)` : '3px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = active ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.color = active ? 'var(--accent-primary)' : 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = active ? 'var(--accent-subtle)' : 'transparent';
                      e.currentTarget.style.color = active ? 'var(--accent-primary)' : 'var(--text-secondary)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{ color: active ? 'var(--accent-primary)' : 'var(--text-muted)', display: 'flex' }}>
                        {resolveMenuIcon(sub.icon, 14)}
                      </span>
                      <span>{sub.title}</span>
                    </div>
                    {active && <ChevronRight size={13} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />}
                  </Link>
                );
              })}
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
