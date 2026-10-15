import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

/**
 * Enterprise Robots.txt Policy Generator.
 * Protects administrative and API backend endpoints while linking the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteConfig.url.replace(/\/$/, '');

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login'],
        disallow: ['/api/', '/_next/', '/settings/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
