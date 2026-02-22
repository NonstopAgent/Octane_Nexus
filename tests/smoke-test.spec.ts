import { test, expect } from '@playwright/test';

test.describe('Night Shift - Full Audit Journey', () => {
  test('Real Login → Full Audit (Landing, Dashboard, Library, Production, Post Lab)', async ({
    page,
  }) => {
    // ========== 1. Landing Page (/)
    await page.goto('/');
    await expect(page.getByText(/Build Your High-Authority|Creator Identity/)).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByRole('link', { name: /Get Started|Login/i }).first()
    ).toBeVisible();

    // ========== 2. Real Login Flow
    await page.goto('/login');
    await page.waitForURL(/\/login/, { timeout: 5000 });

    await page.getByLabel('Email').fill('admin@octanenexus.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: /Sign In/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // ========== 3. Dashboard (/dashboard)
    await page.goto('/dashboard');
    await expect(
      page.getByText(/Welcome|Brand Vision|Dashboard/i)
    ).toBeVisible({ timeout: 10000 });
    // Main stats/cards area (multiple main elements exist; take first)
    await expect(page.getByRole('main').first()).toBeVisible();

    // ========== 4. Library (/dashboard/library)
    await page.getByRole('link', { name: 'Library' }).click();
    await page.waitForURL(/\/dashboard\/library/, { timeout: 15000 });

    // Wait for real content to load
    await page.waitForLoadState('networkidle');

    // Assert Video Inspiration section visible (real YouTube thumbnails or fallback)
    await expect(page.getByText('Video Inspiration')).toBeVisible({ timeout: 15000 });

    // Assert Creator Tools list (CapCut, Notion) - multiple instances exist; take first
    await expect(page.getByText(/CapCut|Notion/).first()).toBeVisible({ timeout: 5000 });

    // ========== 5. Production (/dashboard/production)
    await page.getByRole('link', { name: 'Production' }).click();
    await page.waitForURL(/\/dashboard\/production/, { timeout: 5000 });

    // Click first Kanban card if any (opens Script Editor modal)
    const card = page.locator('main [role="button"]').filter({ hasText: /.+/ }).first();
    const cardCount = await card.count();
    if (cardCount > 0) {
      await card.click();
      await expect(
        page.getByRole('button', { name: /Generate Assets|Regenerate \(new version\)/ })
      ).toBeVisible({ timeout: 5000 });
    } else {
      // No cards - verify Production Board loaded (use heading to avoid strict mode)
      await expect(page.getByRole('heading', { name: 'Production Board' })).toBeVisible();
    }

    // ========== 6. Post Lab (/dashboard/post-lab)
    await page.getByRole('link', { name: 'Post Lab' }).click();
    await page.waitForURL(/\/dashboard\/post-lab/, { timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Post Lab' })).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe('Invariants', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForURL(/\/login/, { timeout: 5000 });
    await page.getByLabel('Email').fill('admin@octanenexus.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  test('A: Schedule without date does not hide post', async ({ page }) => {
    await page.goto('/dashboard/post-lab');
    await page.waitForURL(/\/dashboard\/post-lab/, { timeout: 5000 });

    const queueCards = page.getByTestId('post-lab-queue-card');
    const countBefore = await queueCards.count();
    const scheduleBtn = page.getByTestId('schedule-post-btn');

    if (countBefore === 0) {
      test.skip();
      return;
    }

    await queueCards.first().click();
    await expect(scheduleBtn).toBeVisible({ timeout: 3000 });

    let res: Awaited<ReturnType<typeof page.waitForResponse>> | null = null;
    try {
      [res] = await Promise.all([
        page.waitForResponse((r) => {
          const url = r.url();
          const isSchedule = url.includes('schedule');
          const isDashboardPost = r.request().postData() != null && url.includes('/dashboard');
          return Boolean(isSchedule || isDashboardPost);
        }, { timeout: 10000 }),
        scheduleBtn.click(),
      ]);
    } catch {
      res = null;
    }
    if (res != null && res.status() >= 500) {
      expect(res.status()).toBeLessThan(500);
    }

    await expect(page.getByText(/Please pick a date/i)).toBeVisible({ timeout: 5000 });

    await page.reload();
    await page.waitForLoadState('networkidle');
    const countAfter = await page.getByTestId('post-lab-queue-card').count();
    expect(countAfter).toBeGreaterThanOrEqual(countBefore);
  });

  test('B: Regenerate from READY creates new version', async ({ page }) => {
    await page.goto('/dashboard/production');
    await page.waitForURL(/\/dashboard\/production/, { timeout: 5000 });

    const readyColumn = page.getByTestId('production-column-ready');
    const readyCards = readyColumn.locator('[data-testid="production-card"]');
    const readyCountBefore = await readyCards.count();

    if (readyCountBefore === 0) {
      test.skip();
      return;
    }

    await readyCards.first().click();
    await expect(page.getByTestId('script-editor-modal')).toBeVisible({ timeout: 3000 });
    const regenerateBtn = page.getByTestId('regenerate-new-version-btn');
    if ((await regenerateBtn.count()) === 0) {
      test.skip();
      return;
    }

    let response: Awaited<ReturnType<typeof page.waitForResponse>> | null = null;
    try {
      [response] = await Promise.all([
        page.waitForResponse((r) => {
          const url = r.url();
          return Boolean(url.includes('generate-video-asset') || url.includes('create-version'));
        }, { timeout: 20000 }),
        regenerateBtn.click(),
      ]);
    } catch {
      response = null;
    }
    if (response != null && response.status() >= 500) {
      expect(response.status()).toBeLessThan(500);
    }

    await expect(
      page.getByText(/New version created|Generating/i)
    ).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);
    await expect(page.getByTestId('script-editor-modal')).not.toBeVisible();
    const readyCountAfter = await page.getByTestId('production-column-ready').locator('[data-testid="production-card"]').count();
    expect(readyCountAfter).toBeGreaterThanOrEqual(readyCountBefore);
  });
});
