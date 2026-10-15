'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTheme, Theme } from '@/lib/theme-context';
import { Sun, Moon, Monitor, ChevronDown, Check } from 'lucide-react';

export interface ThemeToggleProps {
  /** Optional variant: 'segmented' (default) shows all 3 options, 'compact' cycles, 'dropdown' renders a sleek menu */
  variant?: 'segmented' | 'compact' | 'dropdown';
  /** Optional extra CSS class name */
  className?: string;
}

/**
 * Enterprise Theme Toggle supporting Dark, Light, and System modes.
 * Provides high visual polish, micro-animations, and full keyboard accessibility.
 */
export function ThemeToggle({ variant = 'segmented', className = '' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options: { id: Theme; label: string; icon: React.ReactNode }[] = [
    { id: 'light', label: 'Light', icon: <Sun size={14} /> },
    { id: 'dark', label: 'Dark', icon: <Moon size={14} /> },
    { id: 'system', label: 'System', icon: <Monitor size={14} /> },
  ];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (variant === 'dropdown') {
    const currentOption = options.find((opt) => opt.id === theme) || options[2];

    return (
      <div ref={dropdownRef} style={{ position: 'relative' }} className={className}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="true"
          aria-expanded={isOpen}
          title={`Theme: ${currentOption.label}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            height: '36px',
            padding: '0 0.75rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'var(--transition)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.borderColor = 'var(--border-card)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
          }}
        >
          {theme === 'system' ? (
            resolvedTheme === 'dark' ? <Moon size={15} /> : <Sun size={15} />
          ) : (
            currentOption.icon
          )}
          <span style={{ textTransform: 'capitalize' }}>{currentOption.label}</span>
          <ChevronDown
            size={13}
            style={{
              transition: 'transform 0.15s ease',
              transform: isOpen ? 'rotate(180deg)' : 'none',
              opacity: 0.7,
            }}
          />
        </button>

        {isOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              minWidth: '150px',
              padding: '0.35rem',
              borderRadius: 'var(--radius-md)',
              zIndex: 9999,
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.65), 0 4px 12px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <div
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                padding: '0.35rem 0.6rem 0.2rem',
                letterSpacing: '0.04em',
              }}
            >
              Theme Mode
            </div>
            {options.map((opt) => {
              const isSelected = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setTheme(opt.id);
                    setIsOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.6rem',
                    padding: '0.45rem 0.6rem',
                    borderRadius: 'calc(var(--radius-md) - 2px)',
                    border: 'none',
                    background: isSelected ? 'var(--accent-primary-subtle, rgba(99, 102, 241, 0.12))' : 'transparent',
                    color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                    fontSize: '0.8125rem',
                    fontWeight: isSelected ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                    textAlign: 'left',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'var(--border-subtle)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    {opt.icon}
                    <span>{opt.label}</span>
                  </span>
                  {isSelected && <Check size={14} style={{ color: 'var(--accent-primary)' }} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={() => {
          if (theme === 'dark') setTheme('light');
          else if (theme === 'light') setTheme('system');
          else setTheme('dark');
        }}
        title={`Theme: ${theme} (currently ${resolvedTheme})`}
        aria-label={`Toggle theme, current is ${theme}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '34px',
          height: '34px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          transition: 'var(--transition)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--text-primary)';
          e.currentTarget.style.borderColor = 'var(--border-card)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-secondary)';
          e.currentTarget.style.borderColor = 'var(--border-subtle)';
        }}
      >
        {resolvedTheme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label="Theme mode selector"
      className={`theme-toggle-group ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px',
        background: 'var(--theme-toggle-bg, rgba(255, 255, 255, 0.04))',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        gap: '2px',
      }}
    >
      {options.map((opt) => {
        const isSelected = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            aria-pressed={isSelected}
            title={`${opt.label} mode`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.3rem 0.55rem',
              fontSize: '0.75rem',
              fontWeight: isSelected ? 600 : 500,
              borderRadius: 'calc(var(--radius-md) - 2px)',
              border: 'none',
              background: isSelected
                ? 'var(--accent-primary)'
                : 'transparent',
              color: isSelected ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'var(--transition)',
              boxShadow: isSelected ? '0 1px 4px rgba(99, 102, 241, 0.3)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {opt.icon}
            <span style={{ fontSize: '0.72rem' }}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
