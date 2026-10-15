import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Organizations & Multi-Tenant Registry',
  description: 'Manage corporate accounts, enterprise subsidiaries, legal identifiers, and tenant-level configurations.',
};

export default function OrganizationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
