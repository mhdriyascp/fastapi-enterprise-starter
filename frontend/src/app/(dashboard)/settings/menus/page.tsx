'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Route alias redirecting legacy /settings/menus path to /menus.
 */
export default function SettingsMenusRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/menus');
  }, [router]);

  return null;
}
