import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Identity & User Management',
  description: 'Manage system operators, organizational memberships, security privileges, and account lifecycle.',
};

export default function UsersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
