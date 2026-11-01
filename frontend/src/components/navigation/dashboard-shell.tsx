'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/navigation/sidebar';
import { Header } from '@/components/navigation/header';
import { SidebarStateProvider } from '@/lib/sidebar-context';
import { SessionInactivityGuard } from '@/components/security/session-inactivity-guard';
import { MessageSquare, Sparkles, X, ChevronUp } from 'lucide-react';
import { DashboardFooter } from '@/components/navigation/footer';

function useBreadcrumb(pathname: string, searchParams: ReturnType<typeof useSearchParams>) {
  const segments: { label: string; href?: string }[] = [];
  if (!pathname || pathname === '/') {
    segments.push({ label: 'Dashboard', href: '/' });
    return segments;
  }
  if (pathname.startsWith('/settings')) {
    segments.push({ label: 'Settings', href: '/settings' });
    const tab = searchParams?.get('tab');
    if (tab) segments.push({ label: tab.charAt(0).toUpperCase() + tab.slice(1) });
    return segments;
  }
  if (pathname.startsWith('/masters')) {
    segments.push({ label: 'Master Data', href: '/masters' });
    const tab = searchParams?.get('tab');
    if (tab) segments.push({ label: tab.charAt(0).toUpperCase() + tab.slice(1) });
    return segments;
  }
  if (pathname.startsWith('/rbac') || pathname.startsWith('/access-control')) {
    segments.push({ label: 'Access Control', href: '/rbac' });
    const tab = searchParams?.get('tab');
    if (tab) segments.push({ label: tab.charAt(0).toUpperCase() + tab.slice(1) });
    return segments;
  }
  if (pathname.startsWith('/organizations')) {
    segments.push({ label: 'Organizations', href: '/organizations' });
    return segments;
  }
  if (pathname.startsWith('/users')) {
    segments.push({ label: 'Users & Team', href: '/users' });
    return segments;
  }
  if (pathname.startsWith('/system-logs')) {
    segments.push({ label: 'System Logs', href: '/system-logs' });
    return segments;
  }
  if (pathname.startsWith('/menus') || pathname.startsWith('/settings/menus')) {
    segments.push({ label: 'Navigation Menus', href: '/menus' });
    return segments;
  }
  if (pathname.startsWith('/notifications')) {
    segments.push({ label: 'Notifications', href: '/notifications' });
    return segments;
  }
  const clean = pathname.replace(/^\//, '');
  segments.push({ label: clean.charAt(0).toUpperCase() + clean.slice(1) });
  return segments;
}

interface DashboardShellProps {
  children: React.ReactNode;
}

/**
 * Enterprise Dashboard Client Shell with Mailtrap-inspired Dual Sidebar Architecture.
 */
export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const breadcrumb = useBreadcrumb(pathname ?? '/', searchParams);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Listen for AI chat toggle event from header button
  useEffect(() => {
    const handler = () => setIsAiChatOpen((p) => !p);
    window.addEventListener('crm:toggle-ai-chat', handler);
    return () => window.removeEventListener('crm:toggle-ai-chat', handler);
  }, []);

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsMobileSidebarOpen(false);
  }

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-app)',
          gap: '1rem',
        }}
        role="status"
        aria-live="polite"
      >
        <div className="skeleton" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Authenticating secure enterprise session...
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarStateProvider>
      <div className="app-shell">
        <SessionInactivityGuard />
        <Sidebar
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />
        <div className="main-content">
          <Header
            onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          />

          {/* Page breadcrumb strip — between header and content */}
          <div className="page-breadcrumb-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}>
              <Link href="/" style={{ color: 'var(--text-muted)', transition: 'color 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Home
              </Link>
              {breadcrumb.map((seg, idx) => (
                <React.Fragment key={`${seg.label}-${idx}`}>
                  <span style={{ color: 'var(--border-color)', userSelect: 'none' }}>/</span>
                  {seg.href && idx < breadcrumb.length - 1 ? (
                    <Link href={seg.href} style={{ color: 'var(--text-secondary)', transition: 'color 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                    >
                      {seg.label}
                    </Link>
                  ) : (
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{seg.label}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <main id="main-content" className="page-body">
            {children}
          </main>
          <DashboardFooter />
        </div>
      </div>

      {/* Floating AI Chat Button & Panel */}
      <div className="ai-chat-fab-wrap">
        {isAiChatOpen && (
          <div className="ai-chat-panel">
            <div className="ai-chat-panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div className="ai-chat-avatar" style={{ position: 'relative' }}>
                  <Sparkles size={15} />
                  <span style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '9px', height: '9px', borderRadius: '50%', background: '#10b981', border: '2px solid var(--bg-surface)' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1 }}>AI Assistant</div>
                  <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: '2px' }}>● Active &amp; ready</div>
                </div>
              </div>
              <button type="button" onClick={() => setIsAiChatOpen(false)} className="ai-chat-close-btn" aria-label="Close AI Chat">
                <X size={15} />
              </button>
            </div>

            <div className="ai-chat-body" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', justifyContent: 'flex-start' }}>
              {/* AI greeting bubble */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <div className="ai-chat-avatar" style={{ width: '26px', height: '26px', borderRadius: '8px', flexShrink: 0 }}>
                  <Sparkles size={12} />
                </div>
                <div style={{ background: 'var(--accent-subtle)', border: '1px solid var(--border-glow)', borderRadius: '0 12px 12px 12px', padding: '0.65rem 0.85rem', maxWidth: '88%' }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    Hi! I&apos;m your CRM AI Assistant. I can help you with analytics, reports, customer data and more.
                  </div>
                </div>
              </div>

              {/* Suggested prompts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingLeft: '2rem' }}>
                {[
                  'Show me today\'s summary',
                  'Top organizations by activity',
                  'Pending tasks overview',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    style={{
                      textAlign: 'left', padding: '0.45rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.78rem', cursor: 'pointer',
                      transition: 'var(--transition)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="ai-chat-footer">
              <input
                type="text"
                placeholder="Ask anything..."
                className="ai-chat-input"
              />
              <button type="button" className="ai-chat-send-btn" aria-label="Send message">
                <ChevronUp size={16} />
              </button>
            </div>
          </div>
        )}
        <button
          type="button"
          className={`ai-chat-fab ${isAiChatOpen ? 'active' : ''}`}
          onClick={() => setIsAiChatOpen((p) => !p)}
          aria-label="Toggle AI Assistant"
          title="AI Assistant"
        >
          {isAiChatOpen ? <X size={20} /> : <MessageSquare size={20} />}
          {!isAiChatOpen && <span className="ai-fab-label">AI</span>}
        </button>
      </div>
    </SidebarStateProvider>
  );
}
