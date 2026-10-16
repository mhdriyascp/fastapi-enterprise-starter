'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, clearStoredTokens, getStoredAccessToken, setStoredTokens } from './api-client';
import { TokenResponse, User } from './types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permissionCode: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Enterprise Authentication provider managing user identity state, login, and session lifecycles.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const hasPermission = useCallback(
    (permissionCode: string): boolean => {
      if (!user) return false;
      if (user.is_super_admin) return true;
      if (user.roles?.includes('super_admin')) return true;
      return user.permissions?.includes(permissionCode) ?? false;
    },
    [user]
  );

  const fetchCurrentUser = useCallback(async () => {
    const token = getStoredAccessToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const userData = await apiFetch<User>('/auth/me');
      setUser(userData);
      localStorage.setItem('crm_user', JSON.stringify(userData));
    } catch {
      clearStoredTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize session on mount
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      const token = getStoredAccessToken();
      if (!token) {
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const userData = await apiFetch<User>('/auth/me');
        if (isMounted) {
          setUser(userData);
          localStorage.setItem('crm_user', JSON.stringify(userData));
        }
      } catch {
        if (isMounted) {
          clearStoredTokens();
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initSession();

    function handleExpired() {
      clearStoredTokens();
      if (isMounted) {
        setUser(null);
      }
      router.push('/login');
    }

    window.addEventListener('auth:expired', handleExpired);

    return () => {
      isMounted = false;
      window.removeEventListener('auth:expired', handleExpired);
    };
  }, [router]);

  async function login(email: string, password: string): Promise<void> {
    setIsLoading(true);
    try {
      const tokens = await apiFetch<TokenResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setStoredTokens(tokens);
      const userData = await apiFetch<User>('/auth/me');
      setUser(userData);
      localStorage.setItem('crm_user', JSON.stringify(userData));
    } finally {
      setIsLoading(false);
    }
  }

  async function logout(): Promise<void> {
    const refreshToken = localStorage.getItem('crm_refresh_token');
    if (refreshToken) {
      try {
        await apiFetch('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch {
        // Ignore logout network errors and clean local state regardless
      }
    }
    clearStoredTokens();
    setUser(null);
    router.push('/login');
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        refreshUser: fetchCurrentUser,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Access the active authentication context.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
