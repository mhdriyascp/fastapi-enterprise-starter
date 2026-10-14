'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Route alias redirecting legacy /access-control path to /rbac.
 */
export default function AccessControlRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/rbac');
  }, [router]);

  return null;
}
