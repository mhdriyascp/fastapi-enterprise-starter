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

/**
 * Hook to retrieve role-authorized navigation menus for the authenticated user.
 */
export function useMenus(): UseMenusResult {
  const { user } = useAuth();
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadMenus() {
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
    }

    loadMenus();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const refreshMenus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<MenuItem[]>('/menus/my-menus');
      setMenus(data);
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
