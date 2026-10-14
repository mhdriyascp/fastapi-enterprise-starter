'use client';

import React, { useState, useRef, useEffect, useId, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { Badge, BadgeVariant } from './badge';

export interface SelectOption {
  /** Unique value identifier */
  value: string;
  /** Primary display text */
  label: string;
  /** Optional secondary text (e.g. system code, route, or category) */
  sublabel?: string;
  /** Optional icon prefix element */
  icon?: React.ReactNode;
  /** Optional badge text */
  badge?: string;
  /** Badge color variant matching design system */
  badgeVariant?: BadgeVariant;
  /** Whether this specific option cannot be selected */
  disabled?: boolean;
}

export interface SearchableSelectProps {
  /** HTML identifier for label linkage */
  id?: string;
  /** Input name */
  name?: string;
  /** List of selectable options */
  options: SelectOption[];
  /** Currently selected value */
  value: string;
  /** Callback fired on option selection */
  onChange: (value: string) => void;
  /** Placeholder when no option is selected */
  placeholder?: string;
  /** Placeholder for the search input */
  searchPlaceholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Allow clearing selection back to empty string */
  clearable?: boolean;
  /** Validation error indicator */
  hasError?: boolean;
  /** Custom container class */
  className?: string;
  /** Custom container inline styling */
  style?: React.CSSProperties;
  /** Custom empty results message */
  noOptionsMessage?: string;
  /** Optional aria-label */
  'aria-label'?: string;
}

/**
 * Enterprise Select2-style Searchable Combobox Component.
 * Supports keyword search, keyboard navigation, rich icons, badges,
 * and high-contrast light/dark theme styling without jQuery.
 */
export function SearchableSelect({
  id: explicitId,
  name,
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  disabled = false,
  clearable = false,
  hasError = false,
  className = '',
  style,
  noOptionsMessage = 'No matching options found',
  'aria-label': ariaLabel,
}: SearchableSelectProps) {
  const generatedId = useId();
  const componentId = explicitId || generatedId;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  // Identify currently selected option object
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value) || null;
  }, [options, value]);

  // Filter options based on live search query
  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(q);
      const matchSublabel = opt.sublabel?.toLowerCase().includes(q) || false;
      const matchValue = opt.value.toLowerCase().includes(q);
      const matchBadge = opt.badge?.toLowerCase().includes(q) || false;
      return matchLabel || matchSublabel || matchValue || matchBadge;
    });
  }, [options, searchQuery]);

  function openDropdown() {
    setSearchQuery('');
    setHighlightedIndex(
      selectedOption ? options.findIndex((o) => o.value === selectedOption.value) : 0
    );
    setIsOpen(true);
  }

  function closeDropdown() {
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
  }

  // Focus search input DOM element when popover opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle outside click to dismiss
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (!isOpen) {
          openDropdown();
        } else if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          const target = filteredOptions[highlightedIndex];
          if (!target.disabled) {
            onChange(target.value);
            closeDropdown();
          }
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          openDropdown();
        } else {
          setHighlightedIndex((prev) => {
            const next = prev < filteredOptions.length - 1 ? prev + 1 : 0;
            scrollIntoView(next);
            return next;
          });
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          openDropdown();
        } else {
          setHighlightedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : filteredOptions.length - 1;
            scrollIntoView(next);
            return next;
          });
        }
        break;

      case 'Escape':
        e.preventDefault();
        closeDropdown();
        break;

      case 'Tab':
        if (isOpen) {
          closeDropdown();
        }
        break;
    }
  };

  function scrollIntoView(index: number) {
    if (!listboxRef.current) return;
    const items = listboxRef.current.children;
    if (items[index]) {
      (items[index] as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  }

  function handleSelect(option: SelectOption) {
    if (option.disabled) return;
    onChange(option.value);
    closeDropdown();
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
    closeDropdown();
  }

  return (
    <div
      ref={containerRef}
      className={`searchable-select-container ${isOpen ? 'is-open' : ''} ${className}`}
      style={{ position: 'relative', width: '100%', zIndex: isOpen ? 1050 : undefined, ...style }}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden input for standard form compliance */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Main Trigger Box */}
      <div
        id={componentId}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`${componentId}-listbox`}
        aria-label={ariaLabel}
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) {
            if (isOpen) closeDropdown();
            else openDropdown();
          }
        }}
        className={`searchable-select-trigger ${hasError ? 'has-error' : ''} ${disabled ? 'disabled' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: '42px',
          padding: '0.5rem 0.85rem',
          background: 'var(--bg-input)',
          border: hasError ? '1px solid #f43f5e' : '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          transition: 'var(--transition)',
          boxShadow: isOpen ? '0 0 0 3px var(--accent-glow)' : 'none',
          borderColor: isOpen ? 'var(--accent-primary)' : undefined,
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
          {selectedOption ? (
            <>
              {selectedOption.icon && (
                <span style={{ display: 'inline-flex', color: 'var(--accent-primary)', flexShrink: 0 }}>
                  {selectedOption.icon}
                </span>
              )}
              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {selectedOption.label}
              </span>
              {selectedOption.sublabel && (
                <span
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    fontFamily: 'monospace',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {selectedOption.sublabel}
                </span>
              )}
              {selectedOption.badge && (
                <Badge variant={selectedOption.badgeVariant || 'primary'} style={{ fontSize: '0.7rem' }}>
                  {selectedOption.badge}
                </Badge>
              )}
            </>
          ) : (
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{placeholder}</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0, marginLeft: '0.5rem' }}>
          {clearable && selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear selection"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '50%',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#f43f5e')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <X size={14} />
            </button>
          )}

          <ChevronDown
            size={16}
            style={{
              color: 'var(--text-muted)',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          />
        </div>
      </div>

      {/* Floating Select2 Popover Menu */}
      {isOpen && (
        <div
          className="searchable-select-popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 9999,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
            animation: 'fadeInScale 0.15s ease-out forwards',
          }}
        >
          {/* Internal Live Search Box (Select2 Style) */}
          <div
            style={{
              padding: '0.5rem',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
            }}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder={searchPlaceholder}
                className="input-field"
                style={{
                  height: '34px',
                  paddingLeft: '2.1rem',
                  paddingRight: searchQuery ? '2rem' : '0.75rem',
                  fontSize: '0.8125rem',
                  background: 'var(--bg-input)',
                  width: '100%',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Option List */}
          <ul
            id={`${componentId}-listbox`}
            ref={listboxRef}
            role="listbox"
            style={{
              listStyle: 'none',
              margin: 0,
              padding: '0.35rem',
              maxHeight: '260px',
              overflowY: 'auto',
            }}
          >
            {filteredOptions.length === 0 ? (
              <li
                style={{
                  padding: '1.25rem 0.85rem',
                  textAlign: 'center',
                  fontSize: '0.825rem',
                  color: 'var(--text-muted)',
                }}
              >
                {noOptionsMessage}
              </li>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={opt.disabled}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                      cursor: opt.disabled ? 'not-allowed' : 'pointer',
                      opacity: opt.disabled ? 0.5 : 1,
                      background: isSelected
                        ? 'var(--accent-glow)'
                        : isHighlighted
                        ? 'var(--border-subtle)'
                        : 'transparent',
                      color: isSelected
                        ? 'var(--accent-primary)'
                        : 'var(--text-primary)',
                      transition: 'background 0.12s ease',
                      marginBottom: '2px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                      {opt.icon && (
                        <span
                          style={{
                            display: 'inline-flex',
                            color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)',
                            flexShrink: 0,
                          }}
                        >
                          {opt.icon}
                        </span>
                      )}
                      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: isSelected ? 600 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {opt.label}
                        </span>
                        {opt.sublabel && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                      {opt.badge && (
                        <Badge variant={opt.badgeVariant || 'neutral'} style={{ fontSize: '0.68rem', marginLeft: 'auto', marginRight: '0.5rem' }}>
                          {opt.badge}
                        </Badge>
                      )}
                    </div>

                    {isSelected && (
                      <Check size={15} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginLeft: '0.5rem' }} />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
