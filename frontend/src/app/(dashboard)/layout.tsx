import type { Metadata } from 'next';
import { DashboardShell } from '@/components/navigation/dashboard-shell';

export const metadata: Metadata = {
  title: 'Executive Intelligence & Operations Dashboard',
  description: 'Enterprise CRM operational dashboard: ARR metrics, pipeline stages, activity streams, and receivables.',
};

/**
 * Server Layout for Authenticated Dashboard Route Group.
 * Enables segment-level metadata inheritance and wraps children in the interactive DashboardShell.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
