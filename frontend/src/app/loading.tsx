import React from 'react';

/**
 * Enterprise Route Loading Transition Skeleton.
 * Provides instant visual feedback and eliminates blank-page flashes during client-side transitions.
 */
export default function Loading() {
  return (
    <div
      style={{
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        maxWidth: '1400px',
        margin: '0 auto',
      }}
      role="status"
      aria-label="Loading workspace data"
    >
      {/* Header bar skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div className="skeleton" style={{ width: '240px', height: '32px', borderRadius: '8px' }} />
          <div className="skeleton" style={{ width: '380px', height: '18px', borderRadius: '6px' }} />
        </div>
        <div className="skeleton" style={{ width: '120px', height: '40px', borderRadius: '8px' }} />
      </div>

      {/* Metric card grid skeletons */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="card skeleton"
            style={{ height: '130px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}
          />
        ))}
      </div>

      {/* Main table/content skeleton */}
      <div
        className="card skeleton"
        style={{ height: '380px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}
      />
    </div>
  );
}
