'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api-client';
import { MenuItem } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';

export interface UseMenusResult {
  /** Hierarchical menu tree accessible by the current user */
  menus: MenuItem[];
  /** Whether the menu tree is currently loading */
  isLoading: boolean;
  /** Error message if menu retrieval failed */
  error: string | null;
  /** Function to trigger a manual reload of the menu tree */
  refreshMenus: () => Promise<void>;
}

// Global custom event name for synchronizing menu updates across all components
export const CRM_MENUS_UPDATED_EVENT = 'crm-menus-updated';

/**
 * Broadcasts a system-wide event notifying all navigation components
 * (sidebar, top header, page tables) to refresh their menu trees.
 */
export function broadcastMenusUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CRM_MENUS_UPDATED_EVENT));
  }
}

/**
 * Hook to retrieve role-authorized navigation menus for the authenticated user.
 * Automatically synchronizes across sidebar and header when menus are modified.
 */
export function useMenus(): UseMenusResult {
  const { user } = useAuth();
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const runFetch = async () => {
      if (!user) {
        if (isMounted) {
          setMenus([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        const data = await apiFetch<MenuItem[]>('/menus/my-menus');
        if (isMounted) {
          setMenus(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : 'Failed to load menus';
          setError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void runFetch();

    const handleMenusUpdated = () => {
      void runFetch();
    };

    window.addEventListener(CRM_MENUS_UPDATED_EVENT, handleMenusUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener(CRM_MENUS_UPDATED_EVENT, handleMenusUpdated);
    };
  }, [user]);

  const refreshMenus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<MenuItem[]>('/menus/my-menus');
      setMenus(data);
      broadcastMenusUpdated();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load menus';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    menus,
    isLoading,
    error,
    refreshMenus,
  };
}
