'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from './api-client';
import { PublicSettingsResponse, SettingValue } from './types';

let cachedSettings: Record<string, SettingValue> | null = null;
let activeFetchPromise: Promise<Record<string, SettingValue>> | null = null;

/**
 * Fetches public system configuration settings with in-memory caching.
 *
 * @param forceRefresh - Whether to bypass memory cache and refetch from backend.
 * @returns Map of public setting key to SettingValue.
 */
export async function fetchPublicSettings(forceRefresh = false): Promise<Record<string, SettingValue>> {
  if (!forceRefresh && cachedSettings !== null) {
    return cachedSettings;
  }
  if (!activeFetchPromise || forceRefresh) {
    activeFetchPromise = apiFetch<PublicSettingsResponse>('/settings/public')
      .then((res) => {
        cachedSettings = res?.settings || {};
        return cachedSettings;
      })
      .catch(() => {
        return cachedSettings || {};
      })
      .finally(() => {
        activeFetchPromise = null;
      });
  }
  return activeFetchPromise;
}

/**
 * Invalidate the memory cache for public system settings.
 */
export function clearPublicSettingsCache(): void {
  cachedSettings = null;
  activeFetchPromise = null;
}

/**
 * Enterprise React hook to consume and react to system public settings.
 * Automatically listens for the custom `crm-settings-updated` browser event
 * to refresh state seamlessly without a full page reload.
 */
export function usePublicSettings() {
  const [settings, setSettings] = useState<Record<string, SettingValue>>(() => cachedSettings || {});
  const [isLoading, setIsLoading] = useState<boolean>(() => cachedSettings === null);

  const reload = useCallback(async () => {
    const data = await fetchPublicSettings(true);
    setSettings({ ...data });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchPublicSettings().then((data) => {
      if (isMounted) {
        setSettings({ ...data });
        setIsLoading(false);
      }
    });

    const handleSettingsUpdated = () => {
      clearPublicSettingsCache();
      fetchPublicSettings(true).then((data) => {
        if (isMounted) {
          setSettings({ ...data });
        }
      });
    };

    window.addEventListener('crm-settings-updated', handleSettingsUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener('crm-settings-updated', handleSettingsUpdated);
    };
  }, []);

  return { settings, isLoading, reload };
}
