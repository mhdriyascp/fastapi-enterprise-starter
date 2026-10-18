'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Menu as MenuIcon,
  Bell,
  Search,
  User as UserIcon,
  Shield,
  Layers,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  X,
  ArrowRight,
  DollarSign,
  Building2,
  Loader2,
  ExternalLink,
  LayoutDashboard,
  ShieldCheck,
  Database,
  Settings,
  Globe,
  MapPin,
  Clock,
  Coins,
  History,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { usePublicSettings } from '@/lib/use-public-settings';
import { apiFetch } from '@/lib/api-client';
import { NotificationItem, PagedResponse, UnreadCountResponse, MenuItem } from '@/lib/types';
import { formatDateTime, formatRelativeTime } from '@/lib/date-utils';
import { useMenus } from '@/hooks/use-menus';

export interface HeaderProps {
  /** Optional handler triggered when the mobile navigation hamburger icon is clicked */
  onToggleMobileSidebar?: () => void;
}

/**
 * Route catalog entry for global search with keyword auto-suggestions.
 */
interface RouteSuggestion {
  id: string;
  title: string;
  description: string;
  path: string;
  category: 'Dashboard' | 'Accounts' | 'Security & RBAC' | 'Administration' | 'Settings' | 'Master Data' | 'Audit & Logs';
  keywords: string[];
  permissions?: string[];
}

const SYSTEM_ROUTES: RouteSuggestion[] = [
  {
    id: 'r-dash',
    title: 'Executive CRM Dashboard',
    description: 'Executive KPIs, Sales Funnel, Receivables & Pipeline Overview',
    path: '/',
    category: 'Dashboard',
    keywords: ['home', 'kpi', 'revenue', 'arr', 'stats', 'analytics', 'funnel', 'pipeline', 'crm', 'overview'],
    permissions: [],
  },
  {
    id: 'r-orgs',
    title: 'Organizations & Accounts',
    description: 'Master multi-tenant organizations, tax profiles, and corporate legal entities',
    path: '/organizations',
    category: 'Accounts',
    keywords: ['organizations', 'accounts', 'tenants', 'clients', 'companies', 'legal', 'tax', 'org'],
    permissions: ['organization.read', 'organization.create', 'organization.manage'],
  },
  {
    id: 'r-users',
    title: 'Users & Team Operators',
    description: 'Manage staff accounts, team directory, and operator profiles',
    path: '/users',
    category: 'Administration',
    keywords: ['users', 'team', 'staff', 'operators', 'members', 'people', 'contacts', 'directory'],
    permissions: ['user.read', 'user.create', 'user.manage'],
  },
  {
    id: 'r-rbac',
    title: 'RBAC Access Control Suite',
    description: 'Comprehensive role-based access control, system permissions, and assignment matrix',
    path: '/rbac',
    category: 'Security & RBAC',
    keywords: ['rbac', 'access', 'security', 'privileges', 'roles', 'permissions', 'matrix'],
    permissions: ['role.read', 'permission.read', 'role.manage', 'permission.manage'],
  },
  {
    id: 'r-roles',
    title: 'Roles Management',
    description: 'Configure tenant and administrative roles and security parameters',
    path: '/rbac?tab=roles',
    category: 'Security & RBAC',
    keywords: ['roles', 'admin', 'operator', 'super admin', 'manager', 'role'],
    permissions: ['role.read', 'role.create', 'role.manage'],
  },
  {
    id: 'r-perms',
    title: 'System Permissions Registry',
    description: 'Granular resource.action privilege definitions',
    path: '/rbac?tab=permissions',
    category: 'Security & RBAC',
    keywords: ['permissions', 'privilege', 'resource', 'action', 'rules', 'grant'],
    permissions: ['permission.read', 'permission.create', 'permission.manage'],
  },
  {
    id: 'r-matrix',
    title: 'Role-Permission Access Matrix',
    description: 'Interactive matrix mapping roles to permissions with real-time toggle',
    path: '/rbac?tab=matrix',
    category: 'Security & RBAC',
    keywords: ['matrix', 'assign', 'privilege matrix', 'toggle', 'grid'],
    permissions: ['role.read', 'permission.read', 'role.update', 'permission.update'],
  },
  {
    id: 'r-menus',
    title: 'RBAC Navigation Menus',
    description: 'Dynamic hierarchical sidebar navigation tree architecture and ordering',
    path: '/menus',
    category: 'Settings',
    keywords: ['menus', 'navigation', 'sidebar', 'hierarchy', 'tree', 'order', 'sort'],
    permissions: ['menu.read', 'menu.create', 'menu.manage'],
  },
  {
    id: 'r-notifications',
    title: 'System Notifications & Activity Stream',
    description: 'Centralized operational alerts, security events, deal updates, and system activities',
    path: '/notifications',
    category: 'Settings',
    keywords: ['notifications', 'alerts', 'activity', 'events', 'feed', 'stream', 'inbox', 'messages'],
    permissions: ['notification.read', 'notification.create', 'notification.manage'],
  },
  {
    id: 'r-masters',
    title: 'Master Data Catalog',
    description: 'Centralized reference data: geography, currencies, languages, industries, and taxonomy',
    path: '/masters',
    category: 'Master Data',
    keywords: ['masters', 'master data', 'reference', 'catalog', 'countries', 'currencies', 'geography', 'lookup'],
    permissions: ['masters:read', 'master.read', 'masters:create', 'masters:manage'],
  },
  {
    id: 'r-masters-countries',
    title: 'Countries & Geographies',
    description: 'ISO country registry, phone codes, and international boundaries',
    path: '/masters?tab=countries',
    category: 'Master Data',
    keywords: ['countries', 'iso', 'geography', 'phone codes', 'regions'],
    permissions: ['masters:read', 'master.read'],
  },
  {
    id: 'r-masters-states',
    title: 'States & Provinces',
    description: 'Sub-national administrative territories and state codes',
    path: '/masters?tab=states',
    category: 'Master Data',
    keywords: ['states', 'provinces', 'regions', 'territories'],
    permissions: ['masters:read', 'master.read'],
  },
  {
    id: 'r-masters-cities',
    title: 'Cities & Municipalities',
    description: 'Urban municipalities, postal jurisdictions, and geographic hubs',
    path: '/masters?tab=cities',
    category: 'Master Data',
    keywords: ['cities', 'municipalities', 'towns', 'urban', 'postal'],
    permissions: ['masters:read', 'master.read'],
  },
  {
    id: 'r-masters-currencies',
    title: 'Currencies & Exchange Rates',
    description: 'Global ISO currency codes, symbols, decimal precision, and exchange rates',
    path: '/masters?tab=currencies',
    category: 'Master Data',
    keywords: ['currencies', 'money', 'exchange', 'forex', 'symbols', 'iso4217'],
    permissions: ['masters:read', 'master.read'],
  },
  {
    id: 'r-masters-timezones',
    title: 'Time Zones & Local Offsets',
    description: 'IANA timezone database and UTC daylight savings offsets',
    path: '/masters?tab=time-zones',
    category: 'Master Data',
    keywords: ['timezones', 'iana', 'utc', 'offsets', 'clock', 'time'],
    permissions: ['masters:read', 'master.read'],
  },
  {
    id: 'r-masters-languages',
    title: 'System Languages',
    description: 'Supported UI localization and communication language codes',
    path: '/masters?tab=languages',
    category: 'Master Data',
    keywords: ['languages', 'locale', 'i18n', 'translation', 'iso639'],
    permissions: ['masters:read', 'master.read'],
  },
  {
    id: 'r-masters-industries',
    title: 'Industries & Market Sectors',
    description: 'Commercial market segmentation, industry classifications, and verticals',
    path: '/masters?tab=industries',
    category: 'Master Data',
    keywords: ['industries', 'sectors', 'verticals', 'market', 'segmentation'],
    permissions: ['masters:read', 'master.read'],
  },
  {
    id: 'r-masters-brands',
    title: 'Commercial Brands Directory',
    description: 'Corporate brand entities, subsidiaries, and product line representations',
    path: '/masters?tab=brands',
    category: 'Master Data',
    keywords: ['brands', 'subsidiaries', 'trademarks', 'products', 'corporate'],
    permissions: ['masters:read', 'master.read'],
  },
  {
    id: 'r-masters-addresses',
    title: 'Facilities & Addresses',
    description: 'Verified physical address registry and facility location profiles',
    path: '/masters?tab=addresses',
    category: 'Master Data',
    keywords: ['addresses', 'facilities', 'locations', 'headquarters', 'buildings'],
    permissions: ['masters:read', 'master.read'],
  },
  {
    id: 'r-settings',
    title: 'System Configuration & Settings',
    description: 'Enterprise security parameters, session inactivity timeout, branding, and notification modules',
    path: '/settings',
    category: 'Settings',
    keywords: ['settings', 'configuration', 'security', 'timeout', 'branding', 'email', 'system', 'preferences'],
    permissions: ['settings.read', 'setting.read', 'settings.manage', 'setting.update', 'settings.update'],
  },
  {
    id: 'r-logs',
    title: 'System Audit & Activity Stream',
    description: 'Comprehensive operational activity stream, user access tracking, and security audit logs',
    path: '/system-logs',
    category: 'Audit & Logs',
    keywords: ['logs', 'audit', 'activity', 'events', 'security', 'tracking', 'history', 'stream'],
    permissions: ['activity_logs.read', 'activity_log.read', 'activity_logs.manage'],
  },
  {
    id: 'r-profile',
    title: 'Operator Profile & Preferences',
    description: 'Manage individual user profile, password, active session tokens, and display preferences',
    path: '/profile',
    category: 'Administration',
    keywords: ['profile', 'account', 'password', 'preferences', 'my account', 'security', 'operator'],
    permissions: [],
  },
];

/**
 * Normalizes backend route strings to working dashboard page paths.
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
 * Resolves icon identifier string into a styled Lucide React node for header menus.
 */
function getHeaderMenuIcon(icon: string | null, size = 15) {
  if (!icon) return <Layers size={size} />;
  const n = icon.toLowerCase();
  if (n.includes('dash') || n.includes('layout')) return <LayoutDashboard size={size} />;
  if (n.includes('build') || n.includes('org')) return <Building2 size={size} />;
  if (n.includes('user')) return <UserIcon size={size} />;
  if (n.includes('shield') || n.includes('role') || n.includes('perm') || n.includes('access') || n.includes('rbac')) return <ShieldCheck size={size} />;
  if (n.includes('data') || n.includes('master')) return <Database size={size} />;
  if (n.includes('setting')) return <Settings size={size} />;
  if (n.includes('globe') || n.includes('countr')) return <Globe size={size} />;
  if (n.includes('bell') || n.includes('notif')) return <Bell size={size} />;
  if (n.includes('pin') || n.includes('map') || n.includes('address')) return <MapPin size={size} />;
  if (n.includes('clock') || n.includes('time') || n.includes('zone')) return <Clock size={size} />;
  if (n.includes('coin') || n.includes('currency') || n.includes('cash')) return <Coins size={size} />;
  if (n.includes('file') || n.includes('log') || n.includes('history')) return <History size={size} />;
  return <Layers size={size} />;
}

/**
 * Enterprise Header component.
 * Features:
 * - Mobile sidebar navigation drawer toggle
 * - Global route search with instant auto-suggestions dropdown & keyboard shortcuts (⌘K / Esc)
 * - Configurable & RBAC-governed Top Header Navigation Menus
 * - Interactive Enterprise Notification Center with unread counters and filters
 * - Theme switcher dropdown & User account hover/click identity popover
 */
export function Header({ onToggleMobileSidebar }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout, hasPermission } = useAuth();
  const { menus } = useMenus();

  // Dynamic system public settings configuration
  const { settings: publicSettings } = usePublicSettings();
  const showThemeToggle = publicSettings.show_theme_toggle_in_header !== false;
  const showTopHeaderMenus = publicSettings.enable_top_header_menus !== false;

  const headerMenus = useMemo(() => {
    if (!menus) return [];
    return menus.filter(
      (m) => m.show_in_header !== false && !m.is_deleted && m.is_active !== false
    );
  }, [menus]);

  // Top Header Menu Dropdown Hover/Click State
  const [openDropdownMenuId, setOpenDropdownMenuId] = useState<string | number | null>(null);
  const [openedViaClickMenuId, setOpenedViaClickMenuId] = useState<string | number | null>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number } | null>(null);
  const menuDropdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subnavScrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(false);

  const isFinePointer = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  };

  const updateScrollButtons = () => {
    const el = subnavScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  };

  useEffect(() => {
    updateScrollButtons();
    const el = subnavScrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      updateScrollButtons();
    });
    observer.observe(el);
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [headerMenus]);

  const calculateDropdownPosition = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const dropdownEstimatedWidth = Math.min(260, Math.max(200, window.innerWidth - 24));
    // Anchor strictly at the bottom of the parent menu button
    const top = Math.round(rect.bottom + 2);
    // Align left edge directly to the parent button's left edge
    let left = Math.round(rect.left);

    // If extending right causes offscreen overflow, align right edge to button's right edge
    if (left + dropdownEstimatedWidth > window.innerWidth - 12) {
      left = Math.round(rect.right - dropdownEstimatedWidth);
    }

    // STRICT VIEWPORT BOUNDS: Always guarantee the dropdown is 100% visible on screen!
    const maxLeft = Math.max(12, window.innerWidth - dropdownEstimatedWidth - 12);
    left = Math.max(12, Math.min(left, maxLeft));

    return { top, left };
  };

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target?.closest?.('.top-header-subnav') && !target?.closest?.('.top-header-dropdown-menu')) {
        setOpenDropdownMenuId(null);
        setOpenedViaClickMenuId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdownMenuId(null);
        setOpenedViaClickMenuId(null);
      }
    };
    const handleScrollOrResize = (e: Event) => {
      // Do not close if scrolling inside the dropdown itself
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('.top-header-dropdown-menu')) {
        return;
      }
      setOpenDropdownMenuId(null);
      setOpenedViaClickMenuId(null);
    };

    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, []);

  const handleScrollLeft = () => {
    setOpenDropdownMenuId(null);
    setOpenedViaClickMenuId(null);
    subnavScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' });
  };

  const handleScrollRight = () => {
    setOpenDropdownMenuId(null);
    setOpenedViaClickMenuId(null);
    subnavScrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' });
  };

  const handleMenuMouseEnter = (id: string | number, e: React.MouseEvent<HTMLElement>) => {
    if (!isFinePointer()) return;
    if (menuDropdownTimeoutRef.current) {
      clearTimeout(menuDropdownTimeoutRef.current);
      menuDropdownTimeoutRef.current = null;
    }
    setDropdownCoords(calculateDropdownPosition(e.currentTarget));
    setOpenDropdownMenuId(id);
  };

  const handleMenuMouseLeave = () => {
    if (openedViaClickMenuId !== null) return;
    if (!isFinePointer()) return;
    menuDropdownTimeoutRef.current = setTimeout(() => {
      setOpenDropdownMenuId(null);
    }, 300);
  };

  const handleDropdownMouseEnter = () => {
    if (menuDropdownTimeoutRef.current) {
      clearTimeout(menuDropdownTimeoutRef.current);
      menuDropdownTimeoutRef.current = null;
    }
  };

  const handleDropdownMouseLeave = () => {
    if (openedViaClickMenuId !== null) return;
    if (!isFinePointer()) return;
    menuDropdownTimeoutRef.current = setTimeout(() => {
      setOpenDropdownMenuId(null);
    }, 250);
  };

  const handleMenuClick = (id: string | number, e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (openDropdownMenuId === id) {
      setOpenDropdownMenuId(null);
      setOpenedViaClickMenuId(null);
    } else {
      setDropdownCoords(calculateDropdownPosition(e.currentTarget));
      setOpenDropdownMenuId(id);
      setOpenedViaClickMenuId(id);
    }
  };

  const handleTrackWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && subnavScrollRef.current) {
      subnavScrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const activeOpenMenu = useMemo(() => {
    if (!openDropdownMenuId) return null;
    return headerMenus.find((m) => m.id === openDropdownMenuId) || null;
  }, [openDropdownMenuId, headerMenus]);

  const isRouteActive = (routePath: string) => {
    const clean = normalizeRoute(routePath);
    if (clean === '#') return false;
    if (clean.includes('?')) {
      const [pathPart, queryPart] = clean.split('?');
      if (pathname !== pathPart) return false;
      const tab = new URLSearchParams(queryPart).get('tab');
      const currentTab =
        searchParams?.get('tab') ||
        (pathname === '/masters' ? 'countries' : pathname === '/rbac' ? 'roles' : null);
      return currentTab === tab;
    }
    if (clean === '/') {
      return pathname === '/';
    }
    if (
      searchParams &&
      searchParams.toString().length > 0 &&
      (clean === '/masters' || clean === '/rbac')
    ) {
      return false;
    }
    return pathname === clean || pathname.startsWith(`${clean}/`);
  };

  const isParentRouteActive = (item: MenuItem) => {
    if (item.path && isRouteActive(item.path)) return true;
    if (item.children && item.children.length > 0) {
      return item.children.some((child) => child.path && isRouteActive(child.path));
    }
    return false;
  };

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);

  // Dynamic Notifications State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState<boolean>(false);

  // User Menu State
  const [showUserMenu, setShowUserMenu] = useState(false);

  // System Status Hover Tooltip State
  const [showStatusTooltip, setShowStatusTooltip] = useState(false);

  // Element Refs
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filtered notifications strictly for unread notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => !n.is_read);
  }, [notifications]);

  // Set of authorized route paths extracted from user's dynamic RBAC menus
  const userAuthorizedPaths = useMemo(() => {
    const paths = new Set<string>();
    function extract(items: MenuItem[]) {
      for (const item of items) {
        if (item.path && item.path !== '#') {
          paths.add(item.path);
        }
        if (item.children && item.children.length > 0) {
          extract(item.children);
        }
      }
    }
    extract(menus || []);
    return paths;
  }, [menus]);

  // Auto-suggestions based on search query, strictly filtered by RBAC permissions
  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();

    return SYSTEM_ROUTES.filter((r) => {
      // 1. RBAC Authorization Gate
      if (r.permissions && r.permissions.length > 0) {
        const hasDirectPermission = r.permissions.some((perm) => hasPermission(perm));
        const hasMenuAuthorization =
          userAuthorizedPaths.has(r.path) || userAuthorizedPaths.has(r.path.split('?')[0]);
        if (!hasDirectPermission && !hasMenuAuthorization) {
          return false;
        }
      }

      // 2. Query Match against title, description, path, category, or keywords
      return (
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.path.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.keywords.some((k) => k.toLowerCase().includes(q))
      );
    }).slice(0, 8);
  }, [searchQuery, hasPermission, userAuthorizedPaths]);

  const handleSelectRoute = (path: string) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    router.push(path);
  };

  // Load unread notifications from API (used on manual refresh and user interactions)
  const loadNotifications = React.useCallback(async () => {
    if (!user) return;
    try {
      setIsLoadingNotifications(true);
      const [notifRes, countRes] = await Promise.allSettled([
        apiFetch<PagedResponse<NotificationItem>>('/notifications?unread_only=true&page=1&page_size=25'),
        apiFetch<UnreadCountResponse>('/notifications/unread-count'),
      ]);
      if (notifRes.status === 'fulfilled') {
        setNotifications(notifRes.value.items.filter((n) => !n.is_read));
      }
      if (countRes.status === 'fulfilled') {
        setUnreadCount(countRes.value.unread_count);
      }
    } catch {
      // Retain existing notifications on network failure
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [user]);

  // Initial fetch and 30s polling
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    const fetchInitial = async () => {
      try {
        const [notifRes, countRes] = await Promise.allSettled([
          apiFetch<PagedResponse<NotificationItem>>('/notifications?unread_only=true&page=1&page_size=25'),
          apiFetch<UnreadCountResponse>('/notifications/unread-count'),
        ]);
        if (isMounted) {
          if (notifRes.status === 'fulfilled') {
            setNotifications(notifRes.value.items.filter((n) => !n.is_read));
          }
          if (countRes.status === 'fulfilled') {
            setUnreadCount(countRes.value.unread_count);
          }
        }
      } catch {
        // Ignore initial load failure
      }
    };

    void fetchInitial();

    const interval = setInterval(async () => {
      try {
        const res = await apiFetch<UnreadCountResponse>('/notifications/unread-count');
        if (isMounted) {
          setUnreadCount(res.unread_count);
        }
      } catch {
        // Ignore background poll errors
      }
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  const handleToggleNotifications = () => {
    const nextOpen = !showNotifications;
    setShowNotifications(nextOpen);
    if (nextOpen) {
      loadNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await apiFetch<{ updated: number }>('/notifications/mark-all-read', {
        method: 'POST',
      });
    } catch {
      loadNotifications();
    }
  };

  const handleToggleRead = async (id: number | string, currentIsRead: boolean, link?: string | null) => {
    const nextStatus = !currentIsRead;
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: nextStatus } : n))
    );
    setUnreadCount((prev) => (nextStatus ? Math.max(0, prev - 1) : prev + 1));

    try {
      await apiFetch<NotificationItem>(`/notifications/${id}/read`, {
        method: 'PATCH',
        body: JSON.stringify({ is_read: nextStatus }),
      });
      if (link) {
        setShowNotifications(false);
        router.push(link);
      }
    } catch {
      // Revert on error
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: currentIsRead } : n))
      );
      setUnreadCount((prev) => (currentIsRead ? Math.max(0, prev - 1) : prev + 1));
    }
  };

  const handleUserMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowUserMenu(true);
  };

  const handleUserMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setShowUserMenu(false);
    }, 200);
  };

  // Keyboard shortcut listener: ⌘K focuses search, Escape closes modals
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setShowNotifications(false);
        setShowUserMenu(false);
        setOpenDropdownMenuId(null);
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      const target = e.target as HTMLElement;
      if (!target?.closest?.('.top-header-subnav') && !target?.closest?.('.top-header-dropdown-menu')) {
        setOpenDropdownMenuId(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (menuDropdownTimeoutRef.current) {
        clearTimeout(menuDropdownTimeoutRef.current);
      }
    };
  }, []);

  // Keyboard navigation for search suggestions
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!isSearchOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSearchIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSearchIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = suggestions[selectedSearchIndex] || suggestions[0];
      if (target) {
        handleSelectRoute(target.path);
      }
    }
  };

  const displayName =
    user?.display_name ||
    (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : null) ||
    user?.email.split('@')[0] ||
    'User';

  const userInitial = user?.first_name
    ? user.first_name[0].toUpperCase()
    : user?.email
      ? user.email[0].toUpperCase()
      : 'U';

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

  return (
    <header className="top-header">
      {/* Top Row: Left-Aligned Search and Right Action Controls */}
      <div className="top-header-main">
        {/* Left Area: Mobile Navigation Toggle & Left-Aligned Global Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            flex: 1,
            maxWidth: '560px',
            minWidth: 0,
          }}
        >
          {onToggleMobileSidebar && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="mobile-sidebar-toggle"
              aria-label="Toggle navigation menu"
              title="Open navigation menu"
            >
              <MenuIcon size={20} />
            </button>
          )}

          {/* Global Search Bar with Auto-Suggestions Dropdown (Left Aligned) */}
          <div
            ref={searchContainerRef}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '560px',
            }}
          >
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
          ref={searchInputRef}
          type="text"
          placeholder="Search routes, modules, accounts... (⌘K)"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsSearchOpen(true);
            setSelectedSearchIndex(0);
          }}
          onFocus={() => setIsSearchOpen(true)}
          onKeyDown={handleSearchKeyDown}
          className="input-field"
          style={{
            paddingLeft: '2.4rem',
            paddingRight: '3.6rem',
            height: '40px',
            fontSize: '0.85rem',
            background: 'var(--bg-card)',
            borderColor: isSearchOpen ? 'var(--accent-primary)' : 'var(--border-subtle)',
            boxShadow: isSearchOpen ? '0 0 0 2px var(--accent-glow)' : 'none',
            transition: 'var(--transition)',
          }}
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setIsSearchOpen(false);
            }}
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={14} />
          </button>
        ) : (
          <span
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.6875rem',
              padding: '0.15rem 0.35rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--border-subtle)',
              color: 'var(--text-muted)',
              fontWeight: 600,
              pointerEvents: 'none',
            }}
          >
            ⌘K
          </span>
        )}

        {/* Floating Auto-Suggestions Dropdown */}
        {isSearchOpen && searchQuery.trim() && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              zIndex: 9999,
              backgroundColor: 'var(--bg-surface)',
              boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.65), 0 4px 12px rgba(0, 0, 0, 0.35)',
              padding: '0.5rem',
              borderRadius: 'var(--radius-lg)',
              maxHeight: '380px',
              overflowY: 'auto',
              border: '1px solid var(--border-color)',
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            <div
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                padding: '0.4rem 0.75rem',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Navigation Suggestions</span>
              <span>{suggestions.length} matching</span>
            </div>

            {suggestions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                {suggestions.map((item, idx) => {
                  const isSelected = idx === selectedSearchIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectRoute(item.path)}
                      onMouseEnter={() => setSelectedSearchIndex(idx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        padding: '0.65rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'var(--accent-glow)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.12s ease',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                            {item.title}
                          </span>
                          <span
                            className="badge badge-neutral"
                            style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}
                          >
                            {item.category}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            marginTop: '0.15rem',
                          }}
                        >
                          {item.description}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                        <code style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{item.path}</code>
                        <ArrowRight size={13} style={{ color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                No routes or pages found matching &ldquo;{searchQuery}&rdquo;.
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexShrink: 0 }}>
        {/* Theme Mode Selector as Dropdown (configurable via system settings) */}
        {showThemeToggle && (
          <ThemeToggle variant="dropdown" />
        )}

        {/* Enterprise Notification Center */}
        <div ref={notificationsRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={handleToggleNotifications}
            title="Notifications & Activity Stream"
            aria-label="Notifications"
            style={{
              position: 'relative',
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              background: showNotifications ? 'var(--border-subtle)' : 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  minWidth: '18px',
                  height: '18px',
                  borderRadius: '9px',
                  background: '#f43f5e',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  border: '2px solid var(--bg-app)',
                  boxShadow: '0 2px 4px rgba(244, 63, 94, 0.4)',
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* Designed Notifications Popover */}
          {showNotifications && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                width: '370px',
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                zIndex: 9999,
                backgroundColor: 'var(--bg-surface)',
                boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.65), 0 4px 12px rgba(0, 0, 0, 0.35)',
                border: '1px solid var(--border-color)',
                animation: 'fadeIn 0.15s ease-out',
              }}
            >
              {/* Header Toolbar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Unread Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="badge badge-primary" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                      {unreadCount} new
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-primary)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {/* Notification List (strictly unread notifications, no delete button) */}
              <div
                style={{
                  maxHeight: '320px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  paddingTop: '0.65rem',
                }}
              >
                {isLoadingNotifications && filteredNotifications.length === 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2rem 1rem',
                      gap: '0.5rem',
                      color: 'var(--text-muted)',
                      fontSize: '0.8rem',
                    }}
                  >
                    <Loader2 size={16} className="animate-spin" />
                    <span>Syncing notifications...</span>
                  </div>
                ) : filteredNotifications.length > 0 ? (
                  filteredNotifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleToggleRead(n.id, n.is_read, n.link)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        padding: '0.65rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--accent-glow)',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px',
                        }}
                      >
                        {getNotificationIcon(n.type)}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <span
                            style={{
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            {n.title}
                            {n.link && <ExternalLink size={11} color="var(--text-muted)" />}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }} title={formatDateTime(n.created_at)}>
                            {formatRelativeTime(n.created_at)}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem', lineHeight: 1.4 }}>
                          {n.message}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', marginTop: '6px', flexShrink: 0 }}>
                        <div
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: 'var(--accent-primary)',
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      padding: '2.5rem 1rem',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.8rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'var(--bg-input)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CheckCircle2 size={18} color="var(--accent-primary)" />
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>All caught up!</span>
                    <span>No unread notifications to display.</span>
                  </div>
                )}
              </div>

              {/* Popover Footer (Navigation to full notifications center without delete buttons) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '0.75rem',
                  marginTop: '0.5rem',
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: '0.75rem',
                }}
              >
                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                  {filteredNotifications.length > 0 ? `${filteredNotifications.length} unread` : 'No unread alerts'}
                </span>
                <Link
                  href="/notifications"
                  onClick={() => setShowNotifications(false)}
                  style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}
                >
                  View Full Notification Center &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill with Hover & Click Details Popover (Reduced Width) */}
        {user && (
          <div
            ref={userMenuRef}
            style={{ position: 'relative' }}
            onMouseEnter={handleUserMouseEnter}
            onMouseLeave={handleUserMouseLeave}
          >
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-haspopup="true"
              aria-expanded={showUserMenu}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.25rem 0.5rem',
                borderRadius: 'var(--radius-md)',
                background: showUserMenu ? 'var(--border-subtle)' : 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.8125rem',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'var(--transition)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-card)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  boxShadow: '0 2px 4px rgba(99, 102, 241, 0.2)',
                  flexShrink: 0,
                }}
              >
                {userInitial}
              </div>
              <span style={{ fontWeight: 600, maxWidth: '75px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </span>
              <ChevronDown
                size={12}
                style={{
                  color: 'var(--text-muted)',
                  transition: 'transform 0.15s ease',
                  transform: showUserMenu ? 'rotate(180deg)' : 'none',
                  flexShrink: 0,
                }}
              />
            </button>

            {/* Hover & Click User Details Popover */}
            {showUserMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '280px',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  zIndex: 9999,
                  backgroundColor: 'var(--bg-surface)',
                  boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.65), 0 4px 12px rgba(0, 0, 0, 0.35)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  animation: 'fadeIn 0.15s ease-out',
                }}
              >
                {/* User Identity Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    paddingBottom: '0.75rem',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {userInitial}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {displayName}
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={user.email}
                    >
                      {user.email}
                    </div>
                    <div style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span className="badge badge-success" style={{ fontSize: '0.625rem', padding: '0.1rem 0.4rem' }}>
                        <CheckCircle2 size={10} style={{ display: 'inline', marginRight: '2px' }} />
                        {user.status || 'Active'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Navigation Links */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <Link
                    href="/profile"
                    onClick={() => setShowUserMenu(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.5rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      transition: 'var(--transition)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--text-primary)';
                      e.currentTarget.style.background = 'var(--border-subtle)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-secondary)';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <UserIcon size={14} />
                    <span>Profile & Account</span>
                  </Link>

                  <Link
                    href="/rbac"
                    onClick={() => setShowUserMenu(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.5rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      transition: 'var(--transition)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--text-primary)';
                      e.currentTarget.style.background = 'var(--border-subtle)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-secondary)';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <Shield size={14} />
                    <span>Role & Security Matrix</span>
                  </Link>

                  <Link
                    href="/menus"
                    onClick={() => setShowUserMenu(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.5rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      transition: 'var(--transition)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--text-primary)';
                      e.currentTarget.style.background = 'var(--border-subtle)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-secondary)';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <Layers size={14} />
                    <span>Navigation Menus</span>
                  </Link>
                </div>

                {/* Sign Out Action */}
                <div
                  style={{
                    paddingTop: '0.5rem',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.5rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      border: 'none',
                      color: '#f43f5e',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(244, 63, 94, 0.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <LogOut size={14} />
                    <span>Sign Out of Platform</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Online Status Indicator with Enterprise Hover Tooltip */}
        <div
          style={{ position: 'relative' }}
          onMouseEnter={() => setShowStatusTooltip(true)}
          onMouseLeave={() => setShowStatusTooltip(false)}
          onFocus={() => setShowStatusTooltip(true)}
          onBlur={() => setShowStatusTooltip(false)}
          tabIndex={0}
          aria-haspopup="true"
          aria-expanded={showStatusTooltip}
          id="header-status-indicator"
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--accent-success-bg)',
              border: showStatusTooltip
                ? '1px solid rgba(16, 185, 129, 0.6)'
                : '1px solid rgba(16, 185, 129, 0.25)',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'var(--transition)',
              boxShadow: showStatusTooltip
                ? '0 0 14px rgba(16, 185, 129, 0.35)'
                : 'none',
            }}
            aria-label="System Status: Online & Operational (99.98% uptime)"
          >
            <div className="pulse-dot" />
          </div>

          {showStatusTooltip && (
            <div
              role="tooltip"
              className="card"
              style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                width: '310px',
                padding: '1.1rem',
                background: 'var(--bg-card)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                boxShadow:
                  '0 20px 35px -10px rgba(0, 0, 0, 0.45), 0 0 1px 1px rgba(16, 185, 129, 0.25)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                animation: 'fadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                pointerEvents: 'none',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: '0.65rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#10b981',
                      boxShadow: '0 0 8px #10b981',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    System Status
                  </span>
                </div>
                <span
                  className="badge badge-success"
                  style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}
                >
                  Online &amp; Operational
                </span>
              </div>

              {/* Uptime metric banner */}
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.5rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Rolling SLA Uptime
                </span>
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: '#10b981',
                    fontFamily: 'var(--font-geist-mono)',
                  }}
                >
                  99.98%
                </span>
              </div>

              {/* Service Health Breakdown */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  fontSize: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Core API Gateway</span>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>Active (24ms)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>PostgreSQL Cluster</span>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>Healthy (Connected)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>RBAC Security Policy</span>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>Synchronized</span>
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '0.5rem',
                  textAlign: 'center',
                }}
              >
                All enterprise services operating within normal parameters
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Bottom Sub-Header Bar: Configurable & RBAC-Governed Top Header Navigation Menus */}
      {showTopHeaderMenus && headerMenus.length > 0 && (
        <nav
          className="top-header-subnav"
          aria-label="Top Header Navigation"
        >
          {/* Slide Navigation to Left */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={handleScrollLeft}
              className="top-header-scroll-btn"
              aria-label="Slide navigation left"
              title="Slide left"
            >
              <ChevronLeft size={16} />
            </button>
          )}

          {/* Scrollable Navigation Track */}
          <div
            ref={subnavScrollRef}
            onScroll={() => {
              updateScrollButtons();
              setOpenDropdownMenuId(null);
            }}
            onWheel={handleTrackWheel}
            className="top-header-scroll-track"
          >
            {headerMenus.map((item) => {
              const hasChildren = item.children && item.children.length > 0;
              const isParentActive = isParentRouteActive(item);
              const isOpen = openDropdownMenuId === item.id;
              const cleanPath = normalizeRoute(item.path);

              if (hasChildren) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={(e) => handleMenuClick(item.id, e)}
                    onMouseEnter={(e) => handleMenuMouseEnter(item.id, e)}
                    onMouseLeave={handleMenuMouseLeave}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8125rem',
                      fontWeight: isParentActive || isOpen ? 700 : 500,
                      color: isParentActive || isOpen ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      background: isParentActive || isOpen
                        ? 'var(--accent-subtle)'
                        : 'transparent',
                      border: isParentActive || isOpen
                        ? '1px solid var(--accent-glow)'
                        : '1px solid transparent',
                      boxShadow: isOpen ? '0 0 10px rgba(56, 189, 248, 0.15)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                  >
                    {getHeaderMenuIcon(item.icon)}
                    <span>{item.title}</span>
                    <ChevronDown
                      size={12}
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.15s ease',
                        opacity: isOpen ? 1 : 0.7,
                        color: isOpen ? 'var(--accent-primary)' : 'currentColor',
                      }}
                    />
                  </button>
                );
              }

              const isItemActive = isRouteActive(cleanPath);
              return (
                <Link
                  key={item.id}
                  href={cleanPath}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8125rem',
                    fontWeight: isItemActive ? 700 : 500,
                    color: isItemActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    background: isItemActive ? 'var(--accent-subtle)' : 'transparent',
                    border: isItemActive ? '1px solid var(--accent-glow)' : '1px solid transparent',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (!isItemActive) {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isItemActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  {getHeaderMenuIcon(item.icon)}
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </div>

          {/* Slide Navigation to Right */}
          {canScrollRight && (
            <button
              type="button"
              onClick={handleScrollRight}
              className="top-header-scroll-btn"
              aria-label="Slide navigation right"
              title="Slide right"
            >
              <ChevronRight size={16} />
            </button>
          )}

          {/* Fixed-Position Floating Submenu Dropdown Portal (Mounted directly to document.body) */}
          {activeOpenMenu && dropdownCoords && typeof document !== 'undefined' && createPortal(
            <div
              className="top-header-dropdown-menu glass-panel"
              onMouseEnter={handleDropdownMouseEnter}
              onMouseLeave={handleDropdownMouseLeave}
              style={{
                position: 'fixed',
                top: `${dropdownCoords.top}px`,
                left: `${dropdownCoords.left}px`,
                minWidth: '240px',
                maxWidth: '340px',
                maxHeight: 'min(440px, calc(100vh - 140px))',
                overflowY: 'auto',
                padding: '0.45rem',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 24px 48px -4px rgba(0, 0, 0, 0.75), 0 10px 24px rgba(0, 0, 0, 0.5)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                zIndex: 999999,
                animation: 'fadeIn 0.12s ease-out',
              }}
            >
              {/* Invisible hover bridge to prevent mouseleave during transit */}
              <div
                style={{
                  position: 'absolute',
                  top: '-8px',
                  left: 0,
                  right: 0,
                  height: '8px',
                }}
              />

              <div
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-muted)',
                  padding: '0.35rem 0.65rem 0.25rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  marginBottom: '0.3rem',
                }}
              >
                {activeOpenMenu.title}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                {activeOpenMenu.children
                  .filter((child) => child.show_in_header !== false && !child.is_deleted && child.is_active !== false)
                  .map((child) => {
                    const childCleanPath = normalizeRoute(child.path);
                    const isChildSelected = isRouteActive(childCleanPath);
                    return (
                      <Link
                        key={child.id}
                        href={childCleanPath}
                        onClick={() => {
                          setTimeout(() => {
                            setOpenDropdownMenuId(null);
                            setOpenedViaClickMenuId(null);
                          }, 80);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.55rem',
                          padding: '0.45rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8rem',
                          fontWeight: isChildSelected ? 600 : 500,
                          color: isChildSelected
                            ? 'var(--accent-primary)'
                            : 'var(--text-primary)',
                          background: isChildSelected
                            ? 'var(--accent-glow)'
                            : 'transparent',
                          textDecoration: 'none',
                          transition: 'background 0.12s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isChildSelected) {
                            e.currentTarget.style.background = 'var(--bg-hover)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isChildSelected) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        <span style={{ color: isChildSelected ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                          {getHeaderMenuIcon(child.icon, 13)}
                        </span>
                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {child.title}
                        </span>
                        {isChildSelected ? (
                          <span className="badge badge-primary" style={{ fontSize: '0.625rem', padding: '0.1rem 0.4rem', flexShrink: 0 }}>
                            Active
                          </span>
                        ) : child.badge ? (
                          <span className="badge badge-neutral" style={{ fontSize: '0.625rem', padding: '0.1rem 0.35rem', flexShrink: 0 }}>
                            {child.badge}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
              </div>
            </div>,
            document.body
          )}
        </nav>
      )}
    </header>
  );
}
