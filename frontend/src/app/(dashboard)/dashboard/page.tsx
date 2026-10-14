'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Route alias redirecting legacy /dashboard path to root /.
 */
export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null;
}
