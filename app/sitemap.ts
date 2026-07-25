import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/siteUrl';

/**
 * /sitemap.xml — public marketing surface only.
 *
 * Deliberately excludes /login, /identity, and everything under /dashboard:
 * those are gated by middleware and have no business in a search index.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  return [
    { url: `${siteUrl}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/how-it-works`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/pricing`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
  ];
}
