import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

/**
 * Enterprise Web Application Manifest (PWA).
 * Provides metadata for desktop and mobile installability, application names, and theme colors.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: '/',
    display: 'standalone',
    background_color: siteConfig.themeColor.dark,
    theme_color: siteConfig.themeColor.dark,
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
