import { test, expect } from '@playwright/test';

/**
 * Public-surface smoke test.
 *
 * REPLACES the previous version, which had rotted into false confidence: it
 * asserted the landing page said "Build Your High-Authority / Creator Identity"
 * and signed in as admin@octanenexus.com with a password. Both belonged to the
 * pre-pivot product. The suite could not pass, so nobody ran it, so nothing
 * noticed when the daily-brief cron started returning 401 on every run.
 *
 * Design rules for this file, so it doesn't rot the same way:
 *   - No credentials. Everything here runs against the unauthenticated
 *     surface, so it works in CI and against production without secrets.
 *   - Assert on structure and behaviour (nav targets, status codes, gating),
 *     not on marketing copy, which changes every polish pass.
 *
 * Run against production:
 *   PLAYWRIGHT_BASE_URL=https://octane-nexus-6em9.vercel.app npx playwright test
 */

const PUBLIC_ROUTES = ['/', '/how-it-works', '/pricing', '/login'];

test.describe('public surface', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} responds 200 and renders`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status(), `${route} should not error`).toBeLessThan(400);
      await expect(page.locator('body')).toBeVisible();
      // A blank or crashed render still returns 200; assert real content.
      const text = await page.locator('body').innerText();
      expect(text.trim().length, `${route} rendered an empty body`).toBeGreaterThan(100);
    });
  }

  test('landing page routes visitors into signup', async ({ page }) => {
    await page.goto('/');
    const cta = page.locator('a[href*="/login"]').first();
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('footer links all resolve', async ({ page, request }) => {
    await page.goto('/');
    const hrefs = await page.locator('footer a').evaluateAll((links) =>
      links
        .map((l) => l.getAttribute('href'))
        .filter((h): h is string => !!h && h.startsWith('/'))
    );
    expect(hrefs.length).toBeGreaterThan(0);

    for (const href of [...new Set(hrefs)]) {
      const response = await request.get(href);
      expect(response.status(), `footer link ${href} is broken`).toBeLessThan(400);
    }
  });

  test('robots.txt and sitemap.xml exist', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.status(), 'robots.txt should not 404').toBe(200);
    expect(await robots.text()).toContain('Sitemap');

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status(), 'sitemap.xml should not 404').toBe(200);
    expect(await sitemap.text()).toContain('<urlset');
  });
});

test.describe('auth gating', () => {
  const PROTECTED = ['/dashboard', '/dashboard/brief', '/dashboard/settings'];

  for (const route of PROTECTED) {
    test(`${route} redirects anonymous users to login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

test.describe('critical endpoints', () => {
  /**
   * The regression that motivated this file. authorizeCron() must reject an
   * unauthenticated caller, but the response has to explain itself — a bare
   * 401 with no reason is what let a total outage hide for weeks.
   */
  test('daily-brief cron rejects unauthenticated callers with a reason', async ({ request }) => {
    const response = await request.get('/api/cron/daily-brief');
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
    expect(
      typeof body.reason === 'string' && body.reason.length > 0,
      'a 401 with no reason is how the last outage stayed invisible'
    ).toBe(true);
  });

  test('AI endpoints require authentication', async ({ request }) => {
    for (const route of ['/api/trending-topic', '/api/analyze-idea']) {
      const response = await request.post(route, { data: {} });
      expect(response.status(), `${route} must not be open`).toBe(401);
    }
  });

  /**
   * Health must be able to fail. It previously reported gemini.ok = true by
   * checking only that the env var was non-empty, which stayed green through
   * a complete Gemini outage.
   */
  test('health check reports a real Gemini verdict', async ({ request }) => {
    const response = await request.get('/api/health-check');
    const body = await response.json();

    expect(body).toHaveProperty('gemini');
    expect(body).toHaveProperty('database');
    expect(body).toHaveProperty('storage');

    // Degraded infrastructure must surface as a non-200.
    if (!body.ok) {
      expect(response.status()).toBe(503);
    } else {
      expect(response.status()).toBe(200);
      // A green Gemini verdict must name the model that answered, which is
      // only possible if a real request was actually made.
      expect(body.gemini.model, 'green gemini with no model means no probe ran').toBeTruthy();
    }
  });
});
