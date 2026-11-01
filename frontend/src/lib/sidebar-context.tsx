'use client';

import React, { createContext, useContext, useState } from 'react';

interface SidebarStateContextType {
  isPrimaryCollapsed: boolean;
  togglePrimaryCollapse: () => void;
  setPrimaryCollapsed: (collapsed: boolean) => void;
  isSecondaryCollapsed: boolean;
  toggleSecondaryCollapse: () => void;
  setSecondaryCollapsed: (collapsed: boolean) => void;
  activeDomain: string;
  setActiveDomain: (domain: string) => void;
}

const SidebarStateContext = createContext<SidebarStateContextType | undefined>(undefined);

function getStoredBoolean(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value === 'true';
  } catch {
    return fallback;
  }
}

export function SidebarStateProvider({ children }: { children: React.ReactNode }) {
  const [isPrimaryCollapsed, setIsPrimaryCollapsed] = useState<boolean>(() =>
    getStoredBoolean('crm_sidebar_primary_collapsed', false)
  );
  const [isSecondaryCollapsed, setIsSecondaryCollapsed] = useState<boolean>(() =>
    getStoredBoolean('crm_sidebar_secondary_collapsed', true)
  );
  const [activeDomain, setActiveDomain] = useState('settings');

  const togglePrimaryCollapse = () => {
    setIsPrimaryCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('crm_sidebar_primary_collapsed', String(next));
      return next;
    });
  };

  const setPrimaryCollapsed = (collapsed: boolean) => {
    setIsPrimaryCollapsed(collapsed);
    localStorage.setItem('crm_sidebar_primary_collapsed', String(collapsed));
  };

  const toggleSecondaryCollapse = () => {
    setIsSecondaryCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('crm_sidebar_secondary_collapsed', String(next));
      return next;
    });
  };

  const setSecondaryCollapsed = (collapsed: boolean) => {
    setIsSecondaryCollapsed(collapsed);
    localStorage.setItem('crm_sidebar_secondary_collapsed', String(collapsed));
  };

  return (
    <SidebarStateContext.Provider
      value={{
        isPrimaryCollapsed,
        togglePrimaryCollapse,
        setPrimaryCollapsed,
        isSecondaryCollapsed,
        toggleSecondaryCollapse,
        setSecondaryCollapsed,
        activeDomain,
        setActiveDomain,
      }}
    >
      {children}
    </SidebarStateContext.Provider>
  );
}

export function useSidebarState(): SidebarStateContextType {
  const ctx = useContext(SidebarStateContext);
  if (!ctx) {
    throw new Error('useSidebarState must be used within a SidebarStateProvider');
  }
  return ctx;
}
