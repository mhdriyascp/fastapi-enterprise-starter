'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { KeyRound, Loader2, Palette, AlertCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useTheme } from '@/lib/theme-context';
import { useToast } from '@/lib/toast-context';
import { FormattedDate } from '@/components/ui/formatted-date';

/**
 * User Profile & Account Settings page.
 * Displays user profile metadata, theme preferences, and credentials rotation via `POST /api/v1/auth/change-password`.
 */
export default function ProfilePage() {
  const { user } = useAuth();
  const { theme, resolvedTheme } = useTheme();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function validateField(name: string, value: string, compareValue?: string): string | null {
    switch (name) {
      case 'currentPassword':
        if (!value) return 'Current password is required.';
        return null;
      case 'newPassword':
        if (!value) return 'New password is required.';
        if (value.length < 8) return 'New password must be at least 8 characters.';
        return null;
      case 'confirmPassword':
        if (!value) return 'Please confirm your new password.';
        if (value !== (compareValue !== undefined ? compareValue : newPassword)) {
          return 'Passwords do not match.';
        }
        return null;
      default:
        return null;
    }
  }

  const handleBlur = (name: string, value: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (error) next[name] = error;
      else delete next[name];
      return next;
    });
  };

  const handleChange = (name: string, value: string) => {
    if (name === 'currentPassword') setCurrentPassword(value);
    if (name === 'newPassword') {
      setNewPassword(value);
      if (touched.confirmPassword && confirmPassword) {
        const confirmErr = validateField('confirmPassword', confirmPassword, value);
        setFieldErrors((prev) => {
          const next = { ...prev };
          if (confirmErr) next.confirmPassword = confirmErr;
          else delete next.confirmPassword;
          return next;
        });
      }
    }
    if (name === 'confirmPassword') setConfirmPassword(value);

    if (touched[name]) {
      const error = validateField(name, value);
      setFieldErrors((prev) => {
        const next = { ...prev };
        if (error) next[name] = error;
        else delete next[name];
        return next;
      });
    }
  };

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const newErrors: Record<string, string> = {};
    const newTouched = { currentPassword: true, newPassword: true, confirmPassword: true };

    const currErr = validateField('currentPassword', currentPassword);
    if (currErr) newErrors.currentPassword = currErr;

    const newErr = validateField('newPassword', newPassword);
    if (newErr) newErrors.newPassword = newErr;

    const confirmErr = validateField('confirmPassword', confirmPassword);
    if (confirmErr) newErrors.confirmPassword = confirmErr;

    setTouched(newTouched);
    setFieldErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstInvalidKey = Object.keys(newErrors)[0];
      const elem = document.getElementById(`profile-input-${firstInvalidKey}`);
      if (elem) elem.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      toast.success('Password updated successfully. All sessions have been refreshed.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTouched({});
      setFieldErrors({});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to change password.';
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
          Account & Profile
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Manage your personal details, theme preferences, and security credentials.
        </p>
      </div>

      {/* User Details Panel */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 700,
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
            }}
          >
            {user?.first_name ? user.first_name[0].toUpperCase() : user?.email[0].toUpperCase()}
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {user?.display_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{user?.email}</p>
            <div style={{ marginTop: '0.4rem' }}>
              <span className="badge badge-success">Status: {user?.status}</span>
            </div>
          </div>
        </div>

        <div
          style={{
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Account Registered</span>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              <FormattedDate value={user?.created_at} variant="datetime" includeSeconds placeholder="N/A" />
            </div>
          </div>
        </div>
      </div>

      {/* Appearance & Theme Preferences Panel */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
          <Palette size={20} color="var(--accent-primary)" />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>Appearance & Theme</h3>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Customize interface appearance. Choose Light, Dark, or System mode to automatically match your device settings.
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '1rem 1.25rem',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Theme Mode</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Current mode: <strong style={{ textTransform: 'capitalize', color: 'var(--accent-primary)' }}>{theme}</strong> (active scheme: {resolvedTheme})
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Change Password Form */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
          <KeyRound size={20} color="var(--accent-primary)" />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>Change Password</h3>
        </div>

        {formError && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-danger-bg)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#fda4af',
              fontSize: '0.825rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label htmlFor="profile-input-currentPassword" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Current Password <span style={{ color: '#f43f5e' }}>*</span>
            </label>
            <input
              id="profile-input-currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => handleChange('currentPassword', e.target.value)}
              onBlur={() => handleBlur('currentPassword', currentPassword)}
              placeholder="••••••••••••"
              className={`input-field ${fieldErrors.currentPassword && touched.currentPassword ? 'has-error' : ''}`}
            />
            {fieldErrors.currentPassword && touched.currentPassword && (
              <div className="field-error-text" role="alert">
                <AlertCircle size={13} style={{ flexShrink: 0 }} />
                <span>{fieldErrors.currentPassword}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label htmlFor="profile-input-newPassword" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                New Password (min 8 chars) <span style={{ color: '#f43f5e' }}>*</span>
              </label>
              <input
                id="profile-input-newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => handleChange('newPassword', e.target.value)}
                onBlur={() => handleBlur('newPassword', newPassword)}
                placeholder="••••••••••••"
                className={`input-field ${fieldErrors.newPassword && touched.newPassword ? 'has-error' : ''}`}
              />
              {fieldErrors.newPassword && touched.newPassword && (
                <div className="field-error-text" role="alert">
                  <AlertCircle size={13} style={{ flexShrink: 0 }} />
                  <span>{fieldErrors.newPassword}</span>
                </div>
              )}
            </div>
            <div>
              <label htmlFor="profile-input-confirmPassword" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Confirm New Password <span style={{ color: '#f43f5e' }}>*</span>
              </label>
              <input
                id="profile-input-confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                onBlur={() => handleBlur('confirmPassword', confirmPassword)}
                placeholder="••••••••••••"
                className={`input-field ${fieldErrors.confirmPassword && touched.confirmPassword ? 'has-error' : ''}`}
              />
              {fieldErrors.confirmPassword && touched.confirmPassword && (
                <div className="field-error-text" role="alert">
                  <AlertCircle size={13} style={{ flexShrink: 0 }} />
                  <span>{fieldErrors.confirmPassword}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '0.5rem' }}>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="loading-spinner" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
