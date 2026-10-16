'use client';

import React, { useEffect, useCallback } from 'react';
import { AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from './button';

export type ConfirmationModalVariant = 'danger' | 'warning' | 'primary';

export interface ConfirmationModalProps {
  /** Whether the modal is actively visible */
  isOpen: boolean;
  /** Callback triggered when user dismisses or cancels the modal */
  onClose: () => void;
  /** Callback triggered when user confirms the modal action */
  onConfirm: () => void | Promise<void>;
  /** Primary modal title */
  title: string;
  /** Optional secondary subtitle caption */
  subtitle?: string;
  /** Explanatory message describing the action consequences */
  message: React.ReactNode;
  /** Label for the confirmation button (defaults to "Confirm") */
  confirmLabel?: string;
  /** Label for the cancel button (defaults to "Cancel") */
  cancelLabel?: string;
  /** Visual variant affecting the icon badge and confirm button style */
  variant?: ConfirmationModalVariant;
  /** Whether the confirm action is currently executing in background */
  isLoading?: boolean;
  /** Optional custom icon override */
  icon?: React.ReactNode;
}

/**
 * Enterprise Warning & Confirmation Dialog.
 *
 * Implements a standardized, accessible modal across all CRM domain modules:
 * - Replaces browser native confirm/alert popups
 * - Glassmorphic backdrop with click-outside dismissal
 * - Keyboard ESC listener
 * - Contextual icon badge (Danger red / Warning amber / Primary indigo)
 * - Accessible ARIA attributes (role="dialog", aria-modal="true")
 */
export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  icon,
}: ConfirmationModalProps) {
  // ESC key listener to safely dismiss modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    },
    [onClose, isLoading]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      // Lock body scroll when modal is active
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  // Variant design tokens
  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  const badgeBg = isDanger
    ? 'rgba(239, 68, 68, 0.15)'
    : isWarning
    ? 'rgba(245, 158, 11, 0.15)'
    : 'rgba(99, 102, 241, 0.15)';

  const badgeColor = isDanger
    ? '#ef4444'
    : isWarning
    ? '#f59e0b'
    : 'var(--accent-primary)';

  const dialogBorder = isDanger
    ? '1px solid rgba(239, 68, 68, 0.35)'
    : isWarning
    ? '1px solid rgba(245, 158, 11, 0.35)'
    : '1px solid var(--border-glow)';

  const DefaultIcon = isDanger ? AlertCircle : isWarning ? AlertTriangle : AlertCircle;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1.25rem',
      }}
    >
      <div
        className="modal-dialog card glass-panel"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          border: dialogBorder,
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          animation: 'modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header Icon + Title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: badgeBg,
              color: badgeColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icon || <DefaultIcon size={22} />}
          </div>
          <div style={{ flex: 1 }}>
            <h3
              id="confirm-dialog-title"
              style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              {title}
            </h3>
            {subtitle && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem', display: 'block' }}>
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Descriptive Body */}
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          {message}
        </div>

        {/* Action Buttons Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="btn btn-primary"
            style={{
              background: isDanger ? '#ef4444' : isWarning ? '#d97706' : undefined,
              borderColor: isDanger ? '#ef4444' : isWarning ? '#d97706' : undefined,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontWeight: 600,
            }}
          >
            {isLoading && <Loader2 size={15} className="loading-spinner" />}
            <span>{isLoading ? 'Processing...' : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
