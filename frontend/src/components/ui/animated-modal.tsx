'use client';

import React, { useEffect, useRef, useState } from 'react';

export interface AnimatedModalProps {
  isOpen: boolean;
  onClose?: () => void;
  maxWidth?: string;
  padding?: string;
  dialogClassName?: string;
  dialogStyle?: React.CSSProperties;
  children: React.ReactNode;
  closeDuration?: number;
  disableBackdropClose?: boolean;
  ariaLabel?: string;
}

type ModalPhase = 'hidden' | 'visible' | 'closing';

/**
 * AnimatedModal — enterprise modal wrapper with enter and exit animations.
 * Uses requestAnimationFrame to defer state updates out of effect bodies,
 * keeping React reconciliation clean and satisfying the react-hooks/set-state-in-effect rule.
 */
export function AnimatedModal({
  isOpen,
  onClose,
  maxWidth = '560px',
  padding = '2rem',
  dialogClassName = '',
  dialogStyle,
  children,
  closeDuration = 220,
  disableBackdropClose = false,
  ariaLabel,
}: AnimatedModalProps) {
  const [phase, setPhase] = useState<ModalPhase>(() => (isOpen ? 'visible' : 'hidden'));
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearPending = () => {
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      if (timerRef.current !== null) { clearTimeout(timerRef.current); timerRef.current = null; }
    };

    if (isOpen && phase === 'hidden') {
      clearPending();
      // Defer into rAF so setState is in a callback, not synchronous in the effect body
      rafRef.current = requestAnimationFrame(() => setPhase('visible'));
    } else if (!isOpen && phase === 'visible') {
      clearPending();
      rafRef.current = requestAnimationFrame(() => {
        setPhase('closing');
        timerRef.current = setTimeout(() => setPhase('hidden'), closeDuration);
      });
    }

    return clearPending;
  }, [isOpen, phase, closeDuration]);

  // ESC key dismiss
  useEffect(() => {
    if (phase === 'hidden' || !onClose) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, onClose]);

  // Body scroll lock
  useEffect(() => {
    const shouldLock = phase === 'visible';
    if (shouldLock) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [phase]);

  if (phase === 'hidden') return null;

  const isClosing = phase === 'closing';

  return (
    <div
      className={`modal-backdrop${isClosing ? ' modal-backdrop-closing' : ''}`}
      onClick={(e) => {
        if (!disableBackdropClose && e.target === e.currentTarget && onClose) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div
        className={`modal-dialog glass-panel${isClosing ? ' modal-dialog-closing' : ''} ${dialogClassName}`.trim()}
        style={{ maxWidth, padding, ...dialogStyle }}
      >
        {children}
      </div>
    </div>
  );
}
