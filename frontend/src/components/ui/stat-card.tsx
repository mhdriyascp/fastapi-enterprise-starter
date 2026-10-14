import React from 'react';
import { Card } from './card';

export interface StatCardProps {
  /** Metric label */
  title: string;
  /** Value string or number */
  value: React.ReactNode;
  /** Descriptive caption or status text */
  subtitle?: React.ReactNode;
  /** Icon displayed in the top right highlight container */
  icon: React.ReactNode;
  /** Optional icon background color */
  iconBg?: string;
  /** Optional icon color */
  iconColor?: string;
  /** Whether the card value is currently loading */
  isLoading?: boolean;
}

/**
 * Metric KPI card for overview dashboards.
 */
export function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBg = 'rgba(99, 102, 241, 0.15)',
  iconColor = '#818cf8',
  isLoading = false,
}: StatCardProps) {
  return (
    <Card padding="1.5rem">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {title}
        </span>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-md)',
            background: iconBg,
            color: iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
        {isLoading ? <div className="skeleton" style={{ width: '60px', height: '36px' }} /> : value}
      </div>
      {subtitle && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {subtitle}
        </div>
      )}
    </Card>
  );
}
