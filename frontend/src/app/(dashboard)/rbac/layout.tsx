import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RBAC & Access Control Matrix',
  description: 'Configure enterprise roles, fine-grained system permissions, and role-based privilege mappings.',
};

export default function RbacLayout({ children }: { children: React.ReactNode }) {
  return children;
}
