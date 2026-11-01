import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Release Notes — DJIO ONE Enterprise Suite' };

const releases = [
  {
    version: 'v1.1.0',
    date: 'November 2025',
    type: 'Feature Release',
    badgeClass: 'badge-primary',
    changes: [
      { type: 'New', text: 'AI Assistant chat panel (floating FAB + header shortcut)' },
      { type: 'New', text: 'Dynamic footer with Privacy, Terms, Support, Docs, and Release Notes pages' },
      { type: 'New', text: 'DJIO ONE Enterprise Suite branding with custom logo upload in sidebar' },
      { type: 'New', text: 'Page breadcrumb bar between header and content section' },
      { type: 'Improved', text: 'Top header redesign — single fixed-height row with expanded search field' },
      { type: 'Improved', text: 'Header top-navigation menus now scroll left/right when content overflows' },
      { type: 'Improved', text: 'Submenu active color uses theme-aware accent variables (no hardcoded hex)' },
      { type: 'Improved', text: 'Dashboard widgets redesigned with 4 KPI cards, pipeline table, and system health' },
      { type: 'Fixed', text: 'Modal dialogs now render as fixed-position overlays (were rendering inline)' },
      { type: 'Fixed', text: 'Left sidebar collapse/expand toggle now works correctly for parent + child items' },
    ],
  },
  {
    version: 'v1.0.0',
    date: 'October 2025',
    type: 'Initial Release',
    badgeClass: 'badge-success',
    changes: [
      { type: 'New', text: 'Dual-tier collapsible sidebar: primary rail + contextual sub-panel' },
      { type: 'New', text: 'Dynamic RBAC-governed navigation menus loaded from /api/v1/menus/my-menus' },
      { type: 'New', text: 'Organizations module with full CRUD, bulk operations, soft-delete, and restore' },
      { type: 'New', text: 'Users & Team module with role assignment and status management' },
      { type: 'New', text: 'Access Control (RBAC) module with Roles, Permissions, and Permission Matrix' },
      { type: 'New', text: 'Master Data module: Countries, States, Cities, Currencies, Time Zones, Languages' },
      { type: 'New', text: 'Navigation Menus manager with drag-to-reorder and RBAC role visibility' },
      { type: 'New', text: 'Notifications Centre with real-time unread counters' },
      { type: 'New', text: 'System Logs with audit trail, filtering, and export' },
      { type: 'New', text: 'System Settings with feature flags and platform configuration' },
      { type: 'New', text: 'Enterprise deep-navy corporate theme with dark/light mode support' },
      { type: 'New', text: 'Responsive layout supporting desktop, tablet, and mobile breakpoints' },
    ],
  },
];

const typeStyles: Record<string, { color: string; label: string }> = {
  New: { color: '#3b82f6', label: 'New' },
  Improved: { color: '#10b981', label: 'Improved' },
  Fixed: { color: '#f59e0b', label: 'Fixed' },
  Breaking: { color: '#f43f5e', label: 'Breaking' },
};

export default function ChangelogPage() {
  return (
    <div className="static-page-wrap">
      <div className="static-page-header">
        <div className="badge badge-neutral" style={{ marginBottom: '0.75rem' }}>Changelog</div>
        <h1>Release Notes</h1>
        <p className="static-page-meta">All platform updates, improvements, and fixes — most recent first.</p>
      </div>

      <div className="static-page-body">
        {releases.map((release) => (
          <section key={release.version} style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0 }}>{release.version}</h2>
              <span className={`badge ${release.badgeClass}`}>{release.type}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{release.date}</span>
            </div>

            <div className="card" style={{ padding: '0' }}>
              {release.changes.map((change, idx) => {
                const style = typeStyles[change.type] ?? typeStyles.New;
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.85rem',
                      padding: '0.85rem 1.25rem',
                      borderBottom: idx < release.changes.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    }}
                  >
                    <span style={{
                      display: 'inline-block',
                      minWidth: '70px',
                      padding: '0.15rem 0.55rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: style.color,
                      background: `${style.color}18`,
                      border: `1px solid ${style.color}30`,
                      flexShrink: 0,
                      textAlign: 'center',
                    }}>
                      {style.label}
                    </span>
                    <span style={{ fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: 1.55 }}>{change.text}</span>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
