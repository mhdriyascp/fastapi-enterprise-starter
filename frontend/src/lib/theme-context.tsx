'use client';

import React, { createContext, useContext, useEffect, useSyncExternalStore, useCallback } from 'react';

export type Theme = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

export interface ThemeContextType {
  /** The user's explicitly selected theme setting ('dark', 'light', or 'system') */
  theme: Theme;
  /** The actively applied visual theme ('dark' or 'light') */
  resolvedTheme: ResolvedTheme;
  /** Function to update the active theme preference */
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'crm_theme';
const THEME_EVENT = 'crm:theme-change';

/**
 * Returns the operating system's preferred color scheme.
 */
function getSystemPreference(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Subscribes to custom theme changes and system media query changes.
 */
function subscribeTheme(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener('storage', callback);

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', callback);

  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener('storage', callback);
    mediaQuery.removeEventListener('change', callback);
  };
}

/**
 * Client snapshot reader for current stored theme setting.
 */
function getThemeSnapshot(): Theme {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (stored === 'dark' || stored === 'light' || stored === 'system') {
      return stored;
    }
  } catch {
    // Ignore storage restrictions
  }
  return 'system';
}

/**
 * Server snapshot reader (defaults to 'system' during SSR).
 */
function getServerSnapshot(): Theme {
  return 'system';
}

/**
 * Enterprise Theme Provider providing Dark, Light, and System modes.
 * Implements React 19 `useSyncExternalStore` for flicker-free, zero-cascading-render theme hydration,
 * and automatically synchronizes with OS preference when in 'system' mode.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerSnapshot);

  const resolvedTheme: ResolvedTheme =
    theme === 'system' ? getSystemPreference() : theme;

  // Synchronize DOM attributes whenever resolvedTheme changes
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', resolvedTheme);
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // Ignore private browsing storage errors
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Access the active theme context to read or update the current theme.
 *
 * @throws Error if used outside a ThemeProvider.
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
