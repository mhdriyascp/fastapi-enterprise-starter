import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Support — DJIO ONE Enterprise Suite' };

const supportChannels = [
  {
    title: 'Email Support',
    desc: 'Reach our enterprise support team for account, billing, and technical issues.',
    contact: 'support@djio.one',
    href: 'mailto:support@djio.one',
    badge: 'Response within 4 hours',
    badgeClass: 'badge-success',
  },
  {
    title: 'Technical Issues',
    desc: 'For API errors, integration failures, and performance issues.',
    contact: 'tech@djio.one',
    href: 'mailto:tech@djio.one',
    badge: 'Response within 8 hours',
    badgeClass: 'badge-primary',
  },
  {
    title: 'Security & Privacy',
    desc: 'Report security vulnerabilities or submit data-related requests.',
    contact: 'security@djio.one',
    href: 'mailto:security@djio.one',
    badge: 'Response within 24 hours',
    badgeClass: 'badge-warning',
  },
];

const faqs = [
  {
    q: 'How do I reset my password?',
    a: 'Navigate to the Login page and click "Forgot password". A reset link will be sent to your registered email.',
  },
  {
    q: 'How do I add a new user to my organisation?',
    a: 'Go to Users & Team from the left navigation, click "Invite User", and enter the email address and role.',
  },
  {
    q: 'How do I export my data?',
    a: 'Data export is available from each module\'s toolbar. Supported formats: CSV and JSON. Contact support for bulk exports.',
  },
  {
    q: 'Can I customise the navigation menus?',
    a: 'Yes. Go to Settings → Navigation Menus to add, reorder, or deactivate menu items and configure role visibility.',
  },
  {
    q: 'What SLA does the platform provide?',
    a: 'We target 99.9% uptime with a rolling 30-day measurement window. Status updates are posted on our status page.',
  },
];

export default function SupportPage() {
  return (
    <div className="static-page-wrap">
      <div className="static-page-header">
        <div className="badge badge-primary" style={{ marginBottom: '0.75rem' }}>Help Centre</div>
        <h1>Support</h1>
        <p className="static-page-meta">Get help with the DJIO ONE Enterprise Suite.</p>
      </div>

      <div className="static-page-body">
        {/* Support channels */}
        <section>
          <h2>Contact Support</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            {supportChannels.map((ch) => (
              <div key={ch.title} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <span className={`badge ${ch.badgeClass}`}>{ch.badge}</span>
                </div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.4rem' }}>{ch.title}</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.85rem' }}>{ch.desc}</p>
                <Link href={ch.href} style={{ fontSize: '0.82rem', color: 'var(--accent-primary)', fontWeight: 600 }}>{ch.contact}</Link>
              </div>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section style={{ marginTop: '2rem' }}>
          <h2>Frequently Asked Questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            {faqs.map((item) => (
              <div key={item.q} className="card" style={{ padding: '1.1rem 1.25rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>{item.q}</div>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{item.a}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: '2rem' }}>
          <h2>Documentation</h2>
          <p>Looking for guides and API references? Visit the <Link href="/docs" style={{ color: 'var(--accent-primary)' }}>Documentation</Link> section.</p>
        </section>
      </div>
    </div>
  );
}
