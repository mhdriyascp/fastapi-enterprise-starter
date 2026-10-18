'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sparkles, ArrowRight, Lock, Mail, AlertCircle, Loader2, ShieldAlert } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useToast } from '@/lib/toast-context';

/**
 * Inner login form component wrapped in Suspense for searchParams handling.
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const reason = searchParams.get('reason');
  const isInactivityLogout = reason === 'inactivity';

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  function validateField(name: string, value: string): string | null {
    if (name === 'email') {
      const trimmed = value.trim();
      if (!trimmed) return 'Work email is required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Please enter a valid work email address.';
      return null;
    }
    if (name === 'password') {
      if (!value) return 'Password is required.';
      return null;
    }
    return null;
  }

  const handleBlur = (name: string, value: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    const err = validateField(name, value);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (err) next[name] = err;
      else delete next[name];
      return next;
    });
  };

  const handleInputChange = (name: string, value: string) => {
    if (name === 'email') setEmail(value);
    if (name === 'password') setPassword(value);
    if (touched[name]) {
      const err = validateField(name, value);
      setFieldErrors((prev) => {
        const next = { ...prev };
        if (err) next[name] = err;
        else delete next[name];
        return next;
      });
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const emailErr = validateField('email', email);
    const passErr = validateField('password', password);
    const newErrors: Record<string, string> = {};
    if (emailErr) newErrors.email = emailErr;
    if (passErr) newErrors.password = passErr;

    setTouched({ email: true, password: true });
    setFieldErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstInvalid = Object.keys(newErrors)[0];
      const elem = document.getElementById(`login-input-${firstInvalid}`);
      if (elem) elem.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      toast.success('Signed in successfully!');
      router.push('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials. Please verify your email and password.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      {/* HIPAA & SOC 2 Inactivity Logout Notice */}
      {isInactivityLogout && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            color: '#f59e0b',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            lineHeight: 1.45,
          }}
          role="alert"
        >
          <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Session Inactivity Timeout (HIPAA &amp; SOC 2):</strong> You were automatically logged out after 15 minutes of inactivity to protect sensitive enterprise data. Please sign in again to continue.
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-danger-bg)',
            border: '1px solid rgba(244, 63, 94, 0.25)',
            color: '#fca5a5',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
          }}
          role="alert"
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label
            htmlFor="login-input-email"
            style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: '0.5rem',
            }}
          >
            Work Email <span style={{ color: '#f43f5e' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <Mail
              size={17}
              style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              id="login-input-email"
              type="text"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              onBlur={() => handleBlur('email', email)}
              className={`input-field ${fieldErrors.email && touched.email ? 'has-error' : ''}`}
              style={{ paddingLeft: '2.75rem' }}
            />
          </div>
          {fieldErrors.email && touched.email && (
            <div className="field-error-text" role="alert">
              <AlertCircle size={13} style={{ flexShrink: 0 }} />
              <span>{fieldErrors.email}</span>
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="login-input-password"
            style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: '0.5rem',
            }}
          >
            Password <span style={{ color: '#f43f5e' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <Lock
              size={17}
              style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              id="login-input-password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              onBlur={() => handleBlur('password', password)}
              className={`input-field ${fieldErrors.password && touched.password ? 'has-error' : ''}`}
              style={{ paddingLeft: '2.75rem' }}
            />
          </div>
          {fieldErrors.password && touched.password && (
            <div className="field-error-text" role="alert">
              <AlertCircle size={13} style={{ flexShrink: 0 }} />
              <span>{fieldErrors.password}</span>
            </div>
          )}
        </div>

        <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="loading-spinner" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Sign In to Dashboard</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

/**
 * Authentication login page.
 * Authenticates user credentials via `POST /api/v1/auth/login`, manages tokens via `AuthProvider`,
 * and redirects authenticated sessions to the dashboard overview.
 */
export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 20%, var(--bg-card-hover) 0%, var(--bg-app) 75%)',
        padding: '1.5rem',
        position: 'relative',
      }}
    >
      {/* Top Right Theme Selector */}
      <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', zIndex: 50 }}>
        <ThemeToggle />
      </div>

      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              margin: '0 auto 1.25rem',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.45)',
            }}
          >
            <Sparkles size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
            CRM Enterprise Portal
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Sign in to access your role-based CRM management workspace.
          </p>
        </div>

        {/* Suspense-wrapped login card */}
        <Suspense
          fallback={
            <div className="glass-panel" style={{ padding: '2rem', minHeight: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 size={24} className="loading-spinner" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
