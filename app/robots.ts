import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/siteUrl';

/**
 * /robots.txt
 *
 * This route did not exist, so every crawler request produced a 404 (8 in the
 * last week alone) while app/layout.tsx advertised `robots: "index, follow"`.
 *
 * Dashboard and auth routes are disallowed: they're behind middleware anyway,
 * and letting them into the index just produces login-wall search results.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/identity', '/login', '/api/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
