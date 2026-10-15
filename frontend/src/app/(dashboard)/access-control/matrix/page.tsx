'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Route alias redirecting legacy /access-control/matrix path to /rbac?tab=matrix.
 */
export default function AccessControlMatrixRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/rbac?tab=matrix');
  }, [router]);

  return null;
}
