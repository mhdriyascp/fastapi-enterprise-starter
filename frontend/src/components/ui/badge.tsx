import React from 'react';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Visual variant matching the enterprise design system */
  variant?: BadgeVariant;
  /** Optional icon prefix */
  icon?: React.ReactNode;
  /** Badge content */
  children: React.ReactNode;
}

/**
 * Enterprise Badge primitive used for statuses, roles, and tags.
 */
export function Badge({
  variant = 'neutral',
  icon,
  children,
  className = '',
  style,
  ...props
}: BadgeProps) {
  const variantClass = `badge-${variant}`;

  return (
    <span className={`badge ${variantClass} ${className}`.trim()} style={style} {...props}>
      {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
