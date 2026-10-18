'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { usePublicSettings } from '@/lib/use-public-settings';
import { ShieldAlert, Clock, LogOut, CheckCircle2 } from 'lucide-react';

/**
 * Enterprise Session Inactivity Configuration defaults.
 * Aligned with HIPAA Security Rule (§ 164.312(a)(2)(iii)) & SOC 2 Trust Services Criteria.
 */
export const SESSION_INACTIVITY_CONFIG = {
  /** Default timeout if not specified in system settings (15 minutes = 900,000 ms) */
  DEFAULT_TIMEOUT_MS: 15 * 60 * 1000,
  /** Pre-logout warning window (60 seconds = 60,000 ms) */
  WARNING_WINDOW_MS: 60 * 1000,
  /** Minimum interval between storage writes to prevent performance degradation */
  ACTIVITY_THROTTLE_MS: 5 * 1000,
  /** Cross-tab synchronization storage key */
  STORAGE_KEY: 'crm_last_activity_timestamp',
};

/**
 * SessionInactivityGuard Component.
 *
 * Enforces automated session termination after a configurable period of inactivity
 * (configured via system settings: enable_session_timeout and session_timeout_mins).
 * Provides a 60-second interactive countdown warning dialog before auto-logout.
 */
export function SessionInactivityGuard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { settings } = usePublicSettings();

  // Dynamic configuration from System Settings
  const timeoutMins = typeof settings.session_timeout_mins === 'number'
    ? Number(settings.session_timeout_mins)
    : 15;

  const isEnabled = settings.enable_session_timeout !== undefined
    ? Boolean(settings.enable_session_timeout) && timeoutMins > 0
    : timeoutMins > 0;

  const timeoutMs = Math.max(1, timeoutMins) * 60 * 1000;

  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const lastRecordedActivityRef = useRef<number>(0);
  const isLoggingOutRef = useRef<boolean>(false);

  /**
   * Resets the activity timestamp across both local ref and shared localStorage.
   */
  const recordActivity = useCallback(() => {
    const now = Date.now();
    lastRecordedActivityRef.current = now;

    // Throttle writes to localStorage to maintain smooth UI rendering
    try {
      const stored = localStorage.getItem(SESSION_INACTIVITY_CONFIG.STORAGE_KEY);
      const storedTime = stored ? parseInt(stored, 10) : 0;
      if (now - storedTime > SESSION_INACTIVITY_CONFIG.ACTIVITY_THROTTLE_MS) {
        localStorage.setItem(SESSION_INACTIVITY_CONFIG.STORAGE_KEY, now.toString());
      }
    } catch {
      // Fallback silently if storage is restricted
    }
  }, []);

  /**
   * Extends the session and dismisses the warning modal.
   */
  const handleStayLoggedIn = useCallback(() => {
    const now = Date.now();
    lastRecordedActivityRef.current = now;
    try {
      localStorage.setItem(SESSION_INACTIVITY_CONFIG.STORAGE_KEY, now.toString());
    } catch {
      // Ignore storage errors
    }
    setIsWarningVisible(false);
    setSecondsRemaining(60);
  }, []);

  /**
   * Terminates the session immediately and redirects to login with an audit reason.
   */
  const handleExplicitLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setIsWarningVisible(false);
    try {
      localStorage.removeItem(SESSION_INACTIVITY_CONFIG.STORAGE_KEY);
      await logout();
    } catch {
      router.push('/login?reason=inactivity');
    }
  }, [logout, router]);

  // Activity listeners across standard user inputs
  useEffect(() => {
    // If user is unauthenticated or feature is disabled in System Settings, disable tracking
    if (!user || !isEnabled) return;

    // Seed initial activity timestamp
    const now = Date.now();
    lastRecordedActivityRef.current = now;
    try {
      localStorage.setItem(SESSION_INACTIVITY_CONFIG.STORAGE_KEY, now.toString());
    } catch {
      // Storage unavailable fallback
    }

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    const handleUserInteraction = () => {
      recordActivity();
      // If warning is visible and user actively interacts, extend session
      if (isWarningVisible) {
        handleStayLoggedIn();
      }
    };

    // Attach listeners with passive flag for performance
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserInteraction, { passive: true });
    });

    // Cross-tab synchronization: sync activity from other open tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SESSION_INACTIVITY_CONFIG.STORAGE_KEY && e.newValue) {
        const remoteTimestamp = parseInt(e.newValue, 10);
        if (!isNaN(remoteTimestamp) && remoteTimestamp > lastRecordedActivityRef.current) {
          lastRecordedActivityRef.current = remoteTimestamp;
          setIsWarningVisible(false);
          setSecondsRemaining(60);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Heartbeat ticker checking idle duration every 1,000ms
    const intervalId = window.setInterval(() => {
      if (isLoggingOutRef.current) return;

      let effectiveLastActivity = lastRecordedActivityRef.current;
      try {
        const stored = localStorage.getItem(SESSION_INACTIVITY_CONFIG.STORAGE_KEY);
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed) && parsed > effectiveLastActivity) {
            effectiveLastActivity = parsed;
            lastRecordedActivityRef.current = parsed;
          }
        }
      } catch {
        // Fallback to in-memory ref
      }

      const idleDuration = Date.now() - effectiveLastActivity;
      const warningThreshold = Math.max(1000, timeoutMs - SESSION_INACTIVITY_CONFIG.WARNING_WINDOW_MS);

      if (idleDuration >= timeoutMs) {
        // Auto-logout triggered
        isLoggingOutRef.current = true;
        setIsWarningVisible(false);
        try {
          localStorage.removeItem(SESSION_INACTIVITY_CONFIG.STORAGE_KEY);
        } catch {
          // Ignore
        }
        logout().finally(() => {
          router.push('/login?reason=inactivity');
        });
      } else if (idleDuration >= warningThreshold) {
        // Enter warning countdown window
        const timeLeftMs = timeoutMs - idleDuration;
        const secondsLeft = Math.max(1, Math.ceil(timeLeftMs / 1000));
        setSecondsRemaining(secondsLeft);
        setIsWarningVisible(true);
      } else {
        // User is active, ensure warning is hidden
        if (isWarningVisible) {
          setIsWarningVisible(false);
        }
      }
    }, 1000);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserInteraction);
      });
      window.removeEventListener('storage', handleStorageChange);
      window.clearInterval(intervalId);
    };
  }, [user, isEnabled, timeoutMs, isWarningVisible, recordActivity, handleStayLoggedIn, logout, router]);

  if (!isWarningVisible || !user || !isEnabled) {
    return null;
  }

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 99999,
        background: 'rgba(5, 10, 20, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="inactivity-warning-title"
    >
      <div
        className="modal-container"
        style={{
          maxWidth: '460px',
          width: '100%',
          background: 'var(--bg-surface)',
          borderRadius: '16px',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(245, 158, 11, 0.15)',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header accent badge */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(217, 119, 6, 0.05))',
            padding: '1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.2)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldAlert size={24} color="#f59e0b" />
          </div>
          <div>
            <h3
              id="inactivity-warning-title"
              style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Session Inactivity Warning
            </h3>
            <p
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                margin: '0.2rem 0 0 0',
              }}
            >
              HIPAA (§ 164.312) &amp; SOC 2 Compliance Guard
            </p>
          </div>
        </div>

        {/* Content body with countdown */}
        <div style={{ padding: '1.5rem' }}>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.55,
              margin: '0 0 1.25rem 0',
            }}
          >
            You have been inactive for {Math.max(1, timeoutMins - 1)} minute{timeoutMins - 1 === 1 ? '' : 's'}. To safeguard sensitive business records and satisfy compliance mandates, your session will automatically terminate in:
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              padding: '0.9rem',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '10px',
              marginBottom: '1.25rem',
            }}
          >
            <Clock size={20} color="#f59e0b" />
            <span
              style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                color: '#f59e0b',
                fontFamily: 'monospace',
                letterSpacing: '0.05em',
              }}
            >
              00:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}
            </span>
          </div>

          <p
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              lineHeight: 1.45,
              margin: 0,
            }}
          >
            Click <strong>Stay Logged In</strong> to reset your session timer, or <strong>Log Out Now</strong> to securely close your active session.
          </p>
        </div>

        {/* Action button controls */}
        <div
          style={{
            padding: '1rem 1.5rem',
            background: 'rgba(0, 0, 0, 0.15)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
          }}
        >
          <button
            type="button"
            onClick={handleExplicitLogout}
            className="btn btn-secondary"
            style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
          >
            <LogOut size={14} />
            <span>Log Out Now</span>
          </button>
          <button
            type="button"
            onClick={handleStayLoggedIn}
            className="btn btn-primary"
            style={{
              padding: '0.55rem 1.25rem',
              fontSize: '0.85rem',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              borderColor: '#10b981',
            }}
          >
            <CheckCircle2 size={14} />
            <span>Stay Logged In</span>
          </button>
        </div>
      </div>
    </div>
  );
}
