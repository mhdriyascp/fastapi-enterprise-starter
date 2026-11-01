import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Documentation — DJIO ONE Enterprise Suite' };

const sections = [
  {
    title: 'Getting Started',
    icon: '🚀',
    items: [
      { label: 'Platform Overview', desc: 'Architecture, core concepts, and the dual-tier sidebar navigation system.' },
      { label: 'First Login & Setup', desc: 'Logging in, configuring your profile, and setting a secure password.' },
      { label: 'Inviting Team Members', desc: 'Adding users, assigning roles, and managing access permissions.' },
      { label: 'Organisation Configuration', desc: 'Provisioning tenant accounts and configuring settings.' },
    ],
  },
  {
    title: 'Modules & Features',
    icon: '⚙️',
    items: [
      { label: 'Organizations Module', desc: 'Managing multi-tenant accounts, CRM contacts, and billing entities.' },
      { label: 'Users & Team Module', desc: 'User directory, role assignment, and account lifecycle management.' },
      { label: 'Access Control (RBAC)', desc: 'Roles, permissions, and the permission matrix editor.' },
      { label: 'Master Data', desc: 'Countries, states, cities, currencies, time zones, and reference data.' },
      { label: 'Navigation Menus', desc: 'Dynamic sidebar configuration, RBAC-governed menu visibility.' },
      { label: 'Notifications Centre', desc: 'Real-time alerts, read/unread management, and audit events.' },
      { label: 'System Logs', desc: 'Activity audit trail, filtering, and export options.' },
    ],
  },
  {
    title: 'Administration',
    icon: '🔧',
    items: [
      { label: 'System Settings', desc: 'Feature flags, platform configuration, and maintenance mode.' },
      { label: 'Alembic Migrations', desc: 'Timestamped UTC revision IDs and domain-modular migration structure.' },
      { label: 'API Reference', desc: 'FastAPI auto-generated OpenAPI documentation at /api/v1/docs.' },
      { label: 'Security & RBAC Architecture', desc: 'Decoupled identity model, JWT auth, and permission enforcement.' },
    ],
  },
  {
    title: 'Developer Reference',
    icon: '💻',
    items: [
      { label: 'Backend Architecture', desc: 'Layered router → service → model → schema pattern with async SQLAlchemy 2.0.' },
      { label: 'Frontend Architecture', desc: 'Next.js 15 App Router, dual-tier sidebar, and dynamic menu system.' },
      { label: 'Environment Configuration', desc: 'Environment variables, .env setup, and deployment checklist.' },
      { label: 'Dual Identifier Strategy', desc: 'BigInteger PKs + UUIDv7 public_id pattern for all entities.' },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="static-page-wrap">
      <div className="static-page-header">
        <div className="badge badge-primary" style={{ marginBottom: '0.75rem' }}>Documentation</div>
        <h1>Documentation</h1>
        <p className="static-page-meta">
          Guides, references, and architecture documentation for the DJIO ONE Enterprise Suite.
        </p>
      </div>

      <div className="static-page-body">
        {sections.map((section) => (
          <section key={section.title}>
            <h2>{section.icon} {section.title}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
              {section.items.map((item) => (
                <div key={item.label} className="card" style={{ padding: '1.1rem 1.25rem', cursor: 'default' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>{item.label}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section style={{ marginTop: '2rem' }}>
          <h2>🔗 Quick Links</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', marginTop: '0.75rem' }}>
            {[
              { label: 'API Docs (OpenAPI)', href: '/api/v1/docs' },
              { label: 'Release Notes', href: '/changelog' },
              { label: 'Support', href: '/support' },
              { label: 'System Status', href: '/' },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="btn btn-secondary" style={{ height: '34px', fontSize: '0.8rem', padding: '0 1rem' }}>
                {l.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
