'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/navigation/sidebar';
import { Header } from '@/components/navigation/header';

interface DashboardShellProps {
  children: React.ReactNode;
}

/**
 * Enterprise Dashboard Client Shell.
 * Manages authenticated session routing guards, responsive drawer states,
 * and high-contrast app shell structure.
 */
export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

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
    <div className="app-shell">
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />
      <div className="main-content">
        <Header
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        />
        <main id="main-content" className="page-body">
          {children}
        </main>
      </div>
    </div>
  );
}
