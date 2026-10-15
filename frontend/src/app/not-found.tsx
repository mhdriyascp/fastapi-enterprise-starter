import React from 'react';
import Link from 'next/link';
import { Compass, Home, ShieldAlert } from 'lucide-react';

/**
 * Enterprise 404 Not Found Page.
 * Provides accessible, semantic guidance and recovery navigation when requested resources are unavailable.
 */
export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-app)',
        padding: '2rem',
        color: 'var(--text-primary)',
      }}
      id="main-not-found"
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
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
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
            border: '1px solid rgba(239, 68, 68, 0.25)',
          }}
        >
          <Compass size={32} />
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
            HTTP 404 — Resource Not Located
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Page Not Found
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6, margin: 0 }}>
            The requested enterprise route does not exist or has been relocated under a modernized system URL structure.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            justifyContent: 'center',
            marginTop: '0.75rem',
            width: '100%',
          }}
        >
          <Link
            href="/"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
            id="not-found-home-btn"
          >
            <Home size={15} />
            <span>Return to Dashboard</span>
          </Link>
          <Link
            href="/login"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
            id="not-found-login-btn"
          >
            <ShieldAlert size={15} />
            <span>Operator Sign In</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
