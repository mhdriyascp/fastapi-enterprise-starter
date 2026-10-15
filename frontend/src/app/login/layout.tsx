import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Secure Authentication & Sign In',
  description: 'Sign in to the Enterprise CRM Platform with your corporate credentials, SSO, or multi-factor token.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
