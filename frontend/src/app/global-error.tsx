'use client';

import React from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Enterprise Global Error Boundary.
 * Catches unhandled failures in the root layout tree and renders an isolated system fallback.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#090d16',
          color: '#f8fafc',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          padding: '2rem',
        }}
      >
        <div
          style={{
            maxWidth: '520px',
            width: '100%',
            textAlign: 'center',
            background: '#0f172a',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '16px',
            padding: '3rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
            }}
          >
            <AlertOctagon size={34} />
          </div>

          <div>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#ef4444',
                marginBottom: '0.35rem',
              }}
            >
              Critical System Crash
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
              Root Layout Error
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
              The application encountered a critical runtime exception preventing the shell from rendering.
            </p>
            {error.digest && (
              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  background: '#1e293b',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  marginTop: '0.75rem',
                }}
              >
                Digest: {error.digest}
              </div>
            )}
          </div>

          <button
            onClick={() => reset()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              marginTop: '0.5rem',
            }}
            id="global-error-retry-btn"
          >
            <RefreshCw size={15} />
            <span>Reload Application</span>
          </button>
        </div>
      </body>
    </html>
  );
}
