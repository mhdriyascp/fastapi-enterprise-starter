'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Check, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  icon?: React.ReactNode;
}

export interface ToastContextType {
  /** Display a toaster notification on the top right corner */
  showToast: (message: string, type?: ToastType, duration?: number, icon?: React.ReactNode) => void;
  /** Manually dismiss a toast by its identifier */
  removeToast: (id: string) => void;
  /** Convenient semantic helpers */
  toast: {
    success: (message: string, duration?: number, icon?: React.ReactNode) => void;
    error: (message: string, duration?: number, icon?: React.ReactNode) => void;
    warning: (message: string, duration?: number, icon?: React.ReactNode) => void;
    info: (message: string, duration?: number, icon?: React.ReactNode) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Enterprise Toast Notification Provider.
 * Renders sleek, animated notifications anchored at the top-right corner
 * that automatically dismiss after a configurable timeout with progress indication.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    const existingTimer = timersRef.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration: number = 4000, icon?: React.ReactNode) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastItem = { id, message, type, duration, icon };

      setToasts((prev) => [...prev, newToast]);

      const timer = setTimeout(() => {
        removeToast(id);
      }, duration);

      timersRef.current.set(id, timer);
    },
    [removeToast]
  );

  const toastHelpers = {
    success: useCallback((msg: string, duration?: number, icon?: React.ReactNode) => showToast(msg, 'success', duration, icon), [showToast]),
    error: useCallback((msg: string, duration?: number, icon?: React.ReactNode) => showToast(msg, 'error', duration, icon), [showToast]),
    warning: useCallback((msg: string, duration?: number, icon?: React.ReactNode) => showToast(msg, 'warning', duration, icon), [showToast]),
    info: useCallback((msg: string, duration?: number, icon?: React.ReactNode) => showToast(msg, 'info', duration, icon), [showToast]),
  };

  function getToastStyles(type: ToastType) {
    switch (type) {
      case 'success':
        return {
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#14532d',
          iconColor: '#16a34a',
          iconBadgeBg: '#dcfce7',
          iconBadgeBorder: '#86efac',
          barColor: '#22c55e',
          closeColor: '#16a34a',
          closeHover: '#14532d',
          title: 'Success',
          icon: <Check size={18} strokeWidth={2.8} style={{ color: '#16a34a' }} />,
        };
      case 'error':
        return {
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          iconColor: '#dc2626',
          iconBadgeBg: '#fee2e2',
          iconBadgeBorder: '#fca5a5',
          barColor: '#ef4444',
          closeColor: '#dc2626',
          closeHover: '#7f1d1d',
          title: 'Error',
          icon: <AlertCircle size={18} strokeWidth={2.2} style={{ color: '#dc2626' }} />,
        };
      case 'warning':
        return {
          background: '#fffbeb',
          border: '1px solid #fde68a',
          color: '#92400e',
          iconColor: '#d97706',
          iconBadgeBg: '#fef3c7',
          iconBadgeBorder: '#fde047',
          barColor: '#f59e0b',
          closeColor: '#d97706',
          closeHover: '#78350f',
          title: 'Warning',
          icon: <AlertTriangle size={18} strokeWidth={2.2} style={{ color: '#d97706' }} />,
        };
      case 'info':
      default:
        return {
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          color: '#075985',
          iconColor: '#0284c7',
          iconBadgeBg: '#e0f2fe',
          iconBadgeBorder: '#7dd3fc',
          barColor: '#38bdf8',
          closeColor: '#0284c7',
          closeHover: '#0c4a6e',
          title: 'Notice',
          icon: <Info size={18} strokeWidth={2.2} style={{ color: '#0284c7' }} />,
        };
    }
  }

  return (
    <ToastContext.Provider value={{ showToast, removeToast, toast: toastHelpers }}>
      {children}

      {/* Top-Right Floating Toaster Stack */}
      <div
        className="toast-container"
        style={{
          position: 'fixed',
          top: '1.25rem',
          right: '1.25rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          pointerEvents: 'none',
          maxWidth: '420px',
          width: 'calc(100vw - 2.5rem)',
        }}
        aria-live="polite"
        role="region"
        aria-label="Notification center"
      >
        {toasts.map((t) => {
          const style = getToastStyles(t.type);
          return (
            <div
              key={t.id}
              className="toast-item"
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.85rem',
                padding: '0.75rem 0.95rem',
                borderRadius: 'var(--radius-lg, 12px)',
                background: style.background,
                border: style.border,
                color: style.color,
                boxShadow: '0 10px 25px -4px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
                position: 'relative',
                overflow: 'hidden',
                animation: 'toastSlideIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                {/* Visual Icon Badge Container */}
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: style.iconBadgeBg,
                    border: `1px solid ${style.iconBadgeBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  {t.icon || style.icon}
                </div>

                {/* Toast Message Body */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: style.color,
                      opacity: 0.85,
                    }}
                  >
                    {style.title}
                  </span>
                  <span
                    style={{
                      wordBreak: 'break-word',
                      color: style.color,
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      lineHeight: 1.4,
                    }}
                  >
                    {t.message}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss message"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: style.closeColor,
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'var(--transition)',
                  flexShrink: 0,
                  marginLeft: '0.25rem',
                  opacity: 0.8,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = style.closeHover;
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = style.closeColor;
                  e.currentTarget.style.opacity = '0.8';
                }}
              >
                <X size={15} />
              </button>

              {/* Progress timer bar */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  height: '3px',
                  background: style.barColor,
                  width: '100%',
                  opacity: 0.85,
                  animation: `toastProgress ${t.duration}ms linear forwards`,
                }}
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Access the application-wide toaster notification system.
 */
export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
