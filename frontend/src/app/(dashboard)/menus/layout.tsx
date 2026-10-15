import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Navigation & Dynamic Menus',
  description: 'Manage hierarchical navigation menus, route access rules, and icon configurations.',
};

export default function MenusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
