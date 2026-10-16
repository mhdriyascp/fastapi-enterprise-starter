'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  formatDateTime,
  formatDateOnly,
  formatTimeOnly,
  formatRelativeTime,
  formatFullAuditDateTime,
  DateFormatOptions,
} from '@/lib/date-utils';

export interface FormattedDateProps {
  /** The ISO 8601 UTC string or Date object from API */
  value: string | Date | null | undefined;
  /** Display presentation mode: 'datetime' (default), 'date', 'time', 'relative', or 'iso' */
  variant?: 'datetime' | 'date' | 'time' | 'relative' | 'iso';
  /** Whether to show seconds in datetime/time mode */
  includeSeconds?: boolean;
  /** Custom time zone override (defaults to user profile or browser) */
  timeZone?: string;
  /** Custom locale override (defaults to user profile or browser) */
  locale?: string;
  /** Custom fallback string when value is null/undefined */
  placeholder?: string;
  /** Whether to show full UTC and local audit tooltip on hover */
  showTooltip?: boolean;
  /** Additional CSS class name */
  className?: string;
  /** Optional inline style overrides */
  style?: React.CSSProperties;
}

/**
 * Standard Enterprise Formatted Date Component.
 *
 * Implements semantic `<time>` tag with hover audit tooltip and automatic
 * user-level timezone / locale resolution.
 */
export function FormattedDate({
  value,
  variant = 'datetime',
  includeSeconds = false,
  timeZone,
  locale,
  placeholder = '—',
  showTooltip = true,
  className,
  style,
}: FormattedDateProps) {
  const { user } = useAuth();

  if (!value) {
    return (
      <span className={className} style={{ color: 'var(--text-muted)', ...style }}>
        {placeholder}
      </span>
    );
  }

  // Resolve options from component props or user profile preferences
  const effectiveTimeZone = timeZone || (user as { timezone?: string | null })?.timezone || undefined;
  const effectiveLocale = locale || (user as { locale?: string | null })?.locale || undefined;

  const options: DateFormatOptions = {
    timeZone: effectiveTimeZone,
    locale: effectiveLocale,
    includeSeconds,
  };

  let displayText = '';
  switch (variant) {
    case 'date':
      displayText = formatDateOnly(value, options);
      break;
    case 'time':
      displayText = formatTimeOnly(value, options);
      break;
    case 'relative':
      displayText = formatRelativeTime(value, options);
      break;
    case 'iso':
      displayText = typeof value === 'string' ? value : value.toISOString();
      break;
    case 'datetime':
    default:
      displayText = formatDateTime(value, options);
      break;
  }

  const isoDateTime =
    typeof value === 'string'
      ? value
      : value instanceof Date && !isNaN(value.getTime())
        ? value.toISOString()
        : undefined;

  const tooltipText = showTooltip ? formatFullAuditDateTime(value, options) : undefined;

  return (
    <time
      dateTime={isoDateTime}
      title={tooltipText}
      suppressHydrationWarning
      className={className}
      style={style}
    >
      {displayText}
    </time>
  );
}
