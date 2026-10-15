import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notifications & Operational Activity Feed',
  description: 'Centralized enterprise activity stream, operational advisories, security alerts, and system broadcast events.',
};

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
