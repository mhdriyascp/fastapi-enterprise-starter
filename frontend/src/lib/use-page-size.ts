import { useState, useEffect } from 'react';
import { apiFetch } from './api-client';
import { PublicSettingsResponse } from './types';

let cachedDefaultPageSize: number | null = null;
let fetchPromise: Promise<number> | null = null;

/**
 * Fetches and caches the system default page size from public settings.
 *
 * @param fallback - Default fallback value if the setting is absent or network fails.
 * @returns The resolved default page size integer.
 */
export async function getDefaultPageSizeFromSettings(fallback: number = 15): Promise<number> {
  if (cachedDefaultPageSize !== null) {
    return cachedDefaultPageSize;
  }
  if (!fetchPromise) {
    fetchPromise = apiFetch<PublicSettingsResponse>('/settings/public')
      .then((res) => {
        const val = Number(res?.settings?.default_page_size);
        const resolved = val > 0 && !isNaN(val) ? Math.floor(val) : fallback;
        cachedDefaultPageSize = resolved;
        return resolved;
      })
      .catch(() => {
        return fallback;
      });
  }
  return fetchPromise;
}

/**
 * Enterprise hook to retrieve and manage listing pagination sizes dynamically from system settings.
 * Automatically aligns listing views with the system configuration `general.default_page_size`.
 *
 * @param fallback - Initial baseline fallback (defaults to 15).
 * @returns Tuple of [pageSize, setPageSize].
 */
export function useDefaultPageSize(fallback: number = 15) {
  const [pageSize, setPageSize] = useState<number>(() => cachedDefaultPageSize ?? fallback);

  useEffect(() => {
    let isMounted = true;
    getDefaultPageSizeFromSettings(fallback).then((resolved) => {
      if (isMounted) {
        setPageSize((current) => (current === fallback ? resolved : current));
      }
    });
    return () => {
      isMounted = false;
    };
  }, [fallback]);

  return [pageSize, setPageSize] as const;
}
