'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Route alias redirecting legacy /access-control/permissions path to /rbac?tab=permissions.
 */
export default function AccessControlPermissionsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/rbac?tab=permissions');
  }, [router]);

  return null;
}
