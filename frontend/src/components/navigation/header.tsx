'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  CheckCircle2,
  X,
  ArrowRight,
  DollarSign,
  Building2,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

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
  category: 'Dashboard' | 'Accounts' | 'Security & RBAC' | 'Administration' | 'Settings';
  keywords: string[];
}

/**
 * Enterprise dummy notification item.
 */
interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  type: 'deal' | 'security' | 'tenant' | 'system';
}

const SYSTEM_ROUTES: RouteSuggestion[] = [
  {
    id: 'r-dash',
    title: 'Executive CRM Dashboard',
    description: 'Executive KPIs, Sales Funnel, Receivables & Pipeline Overview',
    path: '/',
    category: 'Dashboard',
    keywords: ['home', 'kpi', 'revenue', 'arr', 'stats', 'analytics', 'funnel', 'salesforce', 'zoho'],
  },
  {
    id: 'r-orgs',
    title: 'Organizations & Accounts',
    description: 'Master multi-tenant organizations, tax profiles, and corporate legal entities',
    path: '/organizations',
    category: 'Accounts',
    keywords: ['organizations', 'accounts', 'tenants', 'clients', 'companies', 'legal', 'tax'],
  },
  {
    id: 'r-users',
    title: 'Users & Team Operators',
    description: 'Manage staff accounts, team directory, and operator profiles',
    path: '/users',
    category: 'Administration',
    keywords: ['users', 'team', 'staff', 'operators', 'members', 'people', 'contacts'],
  },
  {
    id: 'r-rbac',
    title: 'RBAC Access Control Suite',
    description: 'Comprehensive role-based access control, system permissions, and assignment matrix',
    path: '/rbac',
    category: 'Security & RBAC',
    keywords: ['rbac', 'access', 'security', 'privileges', 'roles', 'permissions', 'matrix'],
  },
  {
    id: 'r-roles',
    title: 'Roles Management',
    description: 'Configure tenant and administrative roles and security parameters',
    path: '/rbac?tab=roles',
    category: 'Security & RBAC',
    keywords: ['roles', 'admin', 'operator', 'super admin', 'manager', 'role'],
  },
  {
    id: 'r-perms',
    title: 'System Permissions Registry',
    description: 'Granular resource.action privilege definitions',
    path: '/rbac?tab=permissions',
    category: 'Security & RBAC',
    keywords: ['permissions', 'privilege', 'resource', 'action', 'rules', 'grant'],
  },
  {
    id: 'r-matrix',
    title: 'Role-Permission Access Matrix',
    description: 'Interactive matrix mapping roles to permissions with real-time toggle',
    path: '/rbac?tab=matrix',
    category: 'Security & RBAC',
    keywords: ['matrix', 'assign', 'privilege matrix', 'toggle', 'grid'],
  },
  {
    id: 'r-menus',
    title: 'RBAC Navigation Menus',
    description: 'Dynamic hierarchical sidebar navigation tree architecture and ordering',
    path: '/menus',
    category: 'Settings',
    keywords: ['menus', 'navigation', 'sidebar', 'hierarchy', 'tree', 'order', 'sort'],
  },
  {
    id: 'r-profile',
    title: 'Account Settings & Credentials',
    description: 'User profile details, credentials password rotation, and theme mode',
    path: '/profile',
    category: 'Settings',
    keywords: ['profile', 'password', 'credentials', 'account', 'security', 'theme', 'dark mode'],
  },
];

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Enterprise Contract Finalized',
    message: 'Acme International Corporation signed a $45,000 ARR multi-year SLA.',
    time: '12m ago',
    unread: true,
    type: 'deal',
  },
  {
    id: 'notif-2',
    title: 'Role Permissions Updated',
    message: 'Security policy updated: 4 permissions granted to "Regional_Manager".',
    time: '45m ago',
    unread: true,
    type: 'security',
  },
  {
    id: 'notif-3',
    title: 'New Tenant Partition Verified',
    message: 'Apex Global Holdings (ORG-002) database partition verified healthy.',
    time: '2h ago',
    unread: true,
    type: 'tenant',
  },
  {
    id: 'notif-4',
    title: 'Database Defragmentation Complete',
    message: 'Automated index maintenance completed with zero query degradation.',
    time: '6h ago',
    unread: false,
    type: 'system',
  },
  {
    id: 'notif-5',
    title: 'Q4 Billing Batch Auto-Reconciled',
    message: 'Zoho Books auto-settlement completed successfully for 48 accounts.',
    time: '1d ago',
    unread: false,
    type: 'deal',
  },
];

/**
 * Enterprise Header component.
 * Features:
 * - Mobile sidebar navigation drawer toggle
 * - Global route search with instant auto-suggestions dropdown & keyboard shortcuts (⌘K / Esc)
 * - Reduced operational status dot (without redundant text label)
 * - Interactive Enterprise Notification Center with unread counters and filters
 * - Theme switcher dropdown & User account hover/click identity popover
 */
export function Header({ onToggleMobileSidebar }: HeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuth();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);

  // Notifications State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');

  // User Menu State
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Element Refs
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Unread notifications count
  const unreadCount = useMemo(() => notifications.filter((n) => n.unread).length, [notifications]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    if (notifFilter === 'unread') {
      return notifications.filter((n) => n.unread);
    }
    return notifications;
  }, [notifications, notifFilter]);

  // Auto-suggestions based on search query
  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return SYSTEM_ROUTES.filter((r) => {
      return (
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.path.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.keywords.some((k) => k.toLowerCase().includes(q))
      );
    }).slice(0, 6);
  }, [searchQuery]);

  const handleSelectRoute = (path: string) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    router.push(path);
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const handleToggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: !n.unread } : n))
    );
  };

  const handleClearNotifications = () => {
    setNotifications([]);
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
    }

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
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
    <header className="top-header" style={{ position: 'relative' }}>
      {/* Left Area: Mobile Navigation Toggle & Left-Aligned Global Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, maxWidth: '440px', minWidth: 0 }}>
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
            maxWidth: '380px',
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
            className="glass-panel"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              zIndex: 70,
              boxShadow: 'var(--shadow-lg)',
              padding: '0.5rem',
              borderRadius: 'var(--radius-lg)',
              maxHeight: '380px',
              overflowY: 'auto',
              border: '1px solid var(--border-subtle)',
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
        {/* Theme Mode Selector as Dropdown */}
        <ThemeToggle variant="dropdown" />

        {/* Enterprise Notification Center */}
        <div ref={notificationsRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
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
              className="glass-panel"
              style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                width: '370px',
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                zIndex: 80,
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border-subtle)',
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
                    Notifications
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
                    Mark all read
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setNotifFilter('all')}
                  style={{
                    padding: '0.25rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: notifFilter === 'all' ? 'var(--border-subtle)' : 'transparent',
                    color: notifFilter === 'all' ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  All ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotifFilter('unread')}
                  style={{
                    padding: '0.25rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: notifFilter === 'unread' ? 'var(--border-subtle)' : 'transparent',
                    color: notifFilter === 'unread' ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {/* Notification List */}
              <div
                style={{
                  maxHeight: '300px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  paddingTop: '0.5rem',
                }}
              >
                {filteredNotifications.length > 0 ? (
                  filteredNotifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleToggleRead(n.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        padding: '0.65rem',
                        borderRadius: 'var(--radius-md)',
                        background: n.unread ? 'var(--accent-glow)' : 'transparent',
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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {n.title}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{n.time}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem', lineHeight: 1.4 }}>
                          {n.message}
                        </div>
                      </div>

                      {n.unread && (
                        <div
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: 'var(--accent-primary)',
                            marginTop: '6px',
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    No notifications to display.
                  </div>
                )}
              </div>

              {/* Popover Footer */}
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
                <button
                  type="button"
                  onClick={handleClearNotifications}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#f43f5e')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  Clear all
                </button>
                <Link
                  href="/dashboard"
                  onClick={() => setShowNotifications(false)}
                  style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}
                >
                  View Activity Feed
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
                className="glass-panel"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '280px',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  zIndex: 80,
                  boxShadow: 'var(--shadow-lg)',
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

        {/* Online Status Indicator (Moved to Top Right Corner) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'var(--accent-success-bg)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            cursor: 'default',
            flexShrink: 0,
          }}
          title="System Status: Online & Operational (99.98% uptime)"
          aria-label="System Online"
        >
          <div className="pulse-dot" />
        </div>
      </div>
    </header>
  );
}
