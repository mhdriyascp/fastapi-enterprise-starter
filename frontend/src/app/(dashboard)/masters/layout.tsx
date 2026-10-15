import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Master Data Governance | Enterprise CRM',
  description:
    'Comprehensive enterprise master data catalog and reference tables across geographic, financial, and organizational taxonomies.',
  keywords: [
    'master data',
    'reference data',
    'currencies',
    'countries',
    'states',
    'cities',
    'time zones',
    'languages',
    'industries',
    'units of measure',
    'address types',
  ],
};

export default function MastersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
