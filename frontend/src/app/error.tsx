'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Enterprise Route Error Boundary.
 * Catches unhandled segment runtime exceptions, reports digest keys, and provides safe recovery triggers.
 */
export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log unexpected exceptions to telemetry/monitoring
    console.error('Enterprise Route Exception captured:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        color: 'var(--text-primary)',
      }}
      role="alert"
      aria-live="assertive"
    >
      <div
        className="card"
        style={{
          maxWidth: '560px',
          width: '100%',
          textAlign: 'center',
          padding: '3rem 2.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
          border: '1px solid rgba(239, 68, 68, 0.3)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'rgba(239, 68, 68, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
          }}
        >
          <AlertTriangle size={32} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#ef4444',
            }}
          >
            System Exception Boundary
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
            Application Error Encountered
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0, lineHeight: 1.6 }}>
            {error.message || 'An unexpected runtime error occurred within the dashboard workspace.'}
          </p>
          {error.digest && (
            <div
              style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-geist-mono)',
                color: 'var(--text-muted)',
                background: 'var(--bg-elevated)',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                marginTop: '0.5rem',
              }}
            >
              Digest Reference: {error.digest}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'center',
            marginTop: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => reset()}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            id="error-reset-btn"
          >
            <RefreshCw size={14} />
            <span>Retry Operation</span>
          </button>
          <Link
            href="/"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
            id="error-home-btn"
          >
            <Home size={14} />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
