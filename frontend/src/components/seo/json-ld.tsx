import React from 'react';
import { siteConfig } from '@/config/site';

interface JsonLdProps {
  type?: 'WebApplication' | 'Organization' | 'BreadcrumbList';
  customData?: Record<string, unknown>;
}

/**
 * Enterprise JSON-LD Structured Data Component.
 * Injects Schema.org structured metadata into HTML head for rich snippet discovery and semantic validation.
 */
export function JsonLd({ type = 'WebApplication', customData = {} }: JsonLdProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': type,
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'All',
    creator: {
      '@type': 'Organization',
      name: siteConfig.creator,
      url: siteConfig.url,
    },
    ...customData,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
