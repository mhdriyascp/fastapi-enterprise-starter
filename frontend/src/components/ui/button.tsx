import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual theme */
  variant?: ButtonVariant;
  /** Whether the button is in a busy loading state */
  isLoading?: boolean;
  /** Optional prefix icon */
  icon?: React.ReactNode;
}

/**
 * Enterprise Button primitive supporting primary, secondary, and danger styles with loading state.
 */
export function Button({
  variant = 'primary',
  isLoading = false,
  icon,
  children,
  disabled,
  className = '',
  style,
  ...props
}: ButtonProps) {
  const variantClass = `btn-${variant}`;

  return (
    <button
      disabled={disabled || isLoading}
      className={`btn ${variantClass} ${className}`.trim()}
      style={style}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 size={16} className="loading-spinner" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}
