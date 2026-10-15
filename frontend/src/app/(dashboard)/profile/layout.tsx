import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Operator Profile & Security',
  description: 'View active operator details, assigned role privileges, active sessions, and security settings.',
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
