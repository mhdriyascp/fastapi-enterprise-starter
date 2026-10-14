import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional custom padding (defaults to '1.75rem') */
  padding?: string;
  /** Children nodes */
  children: React.ReactNode;
}

/**
 * Enterprise Glassmorphic Card panel supporting backdrop blur and sleek borders.
 */
export function Card({
  padding = '1.75rem',
  children,
  className = '',
  style,
  ...props
}: CardProps) {
  return (
    <div
      className={`glass-panel ${className}`.trim()}
      style={{ padding, ...style }}
      {...props}
    >
      {children}
    </div>
  );
}
