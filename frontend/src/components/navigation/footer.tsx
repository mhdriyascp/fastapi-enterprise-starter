'use client';

import React from 'react';
import Link from 'next/link';

const CURRENT_YEAR = new Date().getFullYear();

const footerLinks = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Use', href: '/terms' },
  { label: 'Support', href: '/support' },
  { label: 'Documentation', href: '/docs' },
  { label: 'Release Notes', href: '/changelog' },
];

/**
 * Enterprise footer shown at the bottom of every dashboard page.
 */
export function DashboardFooter() {
  return (
    <footer className="dashboard-footer">
      <div className="footer-inner">
        {/* Brand name only */}
        <div className="footer-brand-text">
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '-0.01em' }}>
            DJIO ONE
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
            Enterprise Suite
          </span>
        </div>

        {/* Navigation links */}
        <nav className="footer-links" aria-label="Footer navigation">
          {footerLinks.map((link) => (
            <Link key={link.href} href={link.href} className="footer-link">
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Copyright */}
        <div className="footer-copyright">
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            &copy; {CURRENT_YEAR} DJIO Technologies. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
