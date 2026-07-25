/**
 * Canonical public URL for the app.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL   — set this once you attach a real domain.
 *   2. VERCEL_PROJECT_PRODUCTION_URL — stable production alias, not the
 *      per-deployment URL, so canonical links don't churn on every deploy.
 *   3. The current deployment URL, as a last resort.
 *   4. localhost for dev.
 *
 * Always returns an origin with no trailing slash.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return stripTrailingSlash(withProtocol(explicit));

  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionUrl) return stripTrailingSlash(withProtocol(productionUrl));

  const deploymentUrl = process.env.VERCEL_URL?.trim();
  if (deploymentUrl) return stripTrailingSlash(withProtocol(deploymentUrl));

  return 'http://localhost:3000';
}

function withProtocol(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}
