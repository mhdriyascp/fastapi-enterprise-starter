'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Route alias redirecting legacy /access-control/roles path to /rbac?tab=roles.
 */
export default function AccessControlRolesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/rbac?tab=roles');
  }, [router]);

  return null;
}
