/**
 * Enterprise Date & Time Utilities
 *
 * Implements the standard enterprise date strategy:
 * - Backend / API: Pure ISO 8601 UTC ('YYYY-MM-DDTHH:MM:SSZ')
 * - User View / UI: Localized formatting driven by user timezone and locale preferences
 */

export interface DateFormatOptions {
  /** Target IANA time zone (e.g., 'America/New_York', 'Asia/Kolkata'). Defaults to browser. */
  timeZone?: string;
  /** BCP 47 language tag (e.g., 'en-US', 'en-GB'). Defaults to browser. */
  locale?: string;
  /** Whether to include seconds in the output */
  includeSeconds?: boolean;
}

/**
 * Resolves the effective time zone (user preferred or browser default).
 */
export function resolveTimeZone(preferredTimeZone?: string | null): string {
  if (preferredTimeZone && preferredTimeZone.trim()) {
    return preferredTimeZone.trim();
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Resolves the effective locale (user preferred or browser default).
 */
export function resolveLocale(preferredLocale?: string | null): string {
  if (preferredLocale && preferredLocale.trim()) {
    return preferredLocale.trim();
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return 'en-US';
}

/**
 * Safely parses any date input into a valid Date object.
 */
function parseDate(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  const date = new Date(input);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Formats a UTC ISO timestamp into a localized, human-readable date and time.
 * Standard Format: "Oct 14, 2026, 04:41:58 PM"
 */
export function formatDateTime(
  input: string | Date | null | undefined,
  options: DateFormatOptions = {}
): string {
  const date = parseDate(input);
  if (!date) return '—';

  const locale = resolveLocale(options.locale);
  const timeZone = resolveTimeZone(options.timeZone);
  const includeSeconds = options.includeSeconds !== false; // Defaults to true for standard enterprise format

  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
      hour12: true,
      timeZone,
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

/**
 * Formats calendar date-only fields without timezone skew.
 * Example: "Oct 16, 2026"
 */
export function formatDateOnly(
  input: string | Date | null | undefined,
  options: DateFormatOptions = {}
): string {
  if (!input) return '—';

  // Handle pure YYYY-MM-DD date strings without shifting across timezones
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [year, month, day] = input.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const locale = resolveLocale(options.locale);
    try {
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC', // Keep date stable across world regions
      }).format(date);
    } catch {
      return input;
    }
  }

  const date = parseDate(input);
  if (!date) return '—';

  const locale = resolveLocale(options.locale);
  const timeZone = resolveTimeZone(options.timeZone);

  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone,
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

/**
 * Formats time-only fields.
 * Example: "05:54 PM"
 */
export function formatTimeOnly(
  input: string | Date | null | undefined,
  options: DateFormatOptions = {}
): string {
  const date = parseDate(input);
  if (!date) return '—';

  const locale = resolveLocale(options.locale);
  const timeZone = resolveTimeZone(options.timeZone);

  try {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: options.includeSeconds ? '2-digit' : undefined,
      timeZone,
    }).format(date);
  } catch {
    return date.toLocaleTimeString();
  }
}

/**
 * Formats a UTC timestamp into relative human time (e.g. "Just now", "5m ago", "2h ago", "Yesterday").
 * Falls back to short localized date for items older than 7 days.
 */
export function formatRelativeTime(
  input: string | Date | null | undefined,
  options: DateFormatOptions = {}
): string {
  const date = parseDate(input);
  if (!date) return '—';

  try {
    const now = new Date();
    const diffSecs = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

    if (diffSecs < 45) return 'Just now';
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return formatDateOnly(date, options);
  } catch {
    return 'Recently';
  }
}

/**
 * Full audit date string with time, timezone name, and offset for tooltips and compliance logs.
 * Example: "Friday, October 16, 2026 at 5:54:55 PM EDT (UTC-04:00)"
 */
export function formatFullAuditDateTime(
  input: string | Date | null | undefined,
  options: DateFormatOptions = {}
): string {
  const date = parseDate(input);
  if (!date) return '';

  const locale = resolveLocale(options.locale);
  const timeZone = resolveTimeZone(options.timeZone);

  try {
    const fullFormatted = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
      timeZone,
    }).format(date);

    return `${fullFormatted} [UTC: ${date.toISOString().replace('.000Z', 'Z')}]`;
  } catch {
    return date.toISOString();
  }
}
