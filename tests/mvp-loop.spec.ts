import { test, expect } from '@playwright/test';

/**
 * MVP Loop E2E: Demo seed → READY → Scheduled → Posted → Intelligence context
 *
 * This test uses the demo seed/reset API to populate data, then walks the full
 * content pipeline: schedule a READY post, mark it posted, verify intelligence.
 */

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.waitForURL(/\/login/, { timeout: 8000 });
  await page.waitForLoadState('domcontentloaded');

  // Try mock login first (localhost dev)
  await page.getByRole('button', { name: /^Password$/ }).click().catch(() => {});
  await page.waitForTimeout(400);
  const mockBtn = page.getByRole('button', { name: /Mock Login/i });
  await mockBtn.scrollIntoViewIfNeeded().catch(() => {});
  if (await mockBtn.isVisible().catch(() => false)) {
    await mockBtn.click();
    await expect(page).toHaveURL(/\/(dashboard|identity)/, { timeout: 15000 });
    if (page.url().includes('/identity')) await page.goto('/dashboard');
    return;
  }

  // Fallback: real login
  await page.getByLabel('Email').fill('admin@octanenexus.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: /Sign In/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
}

test('MVP Loop: seed → schedule → post → context', async ({ page, request }) => {
  test.setTimeout(120000);

  // 1) Login
  await login(page);
  await page.waitForLoadState('networkidle').catch(() => {});

  // 2) Get cookies for authenticated API calls
  const cookies = await page.context().cookies();
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

  // 3) Reset + Seed demo data via API
  const resetRes = await request.post('/api/demo/reset', {
    headers: { Cookie: cookieHeader },
  });
  expect(resetRes.status()).toBeLessThan(500);

  const seedRes = await request.post('/api/demo/seed', {
    headers: { Cookie: cookieHeader },
  });
  expect(seedRes.ok()).toBeTruthy();
  const seedData = await seedRes.json();
  expect(seedData.count).toBeGreaterThan(0);

  // 4) Go to Production — find READY cards
  await page.goto('/dashboard/production', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1000);

  const readyColumn = page.getByTestId('production-column-ready');
  await expect(readyColumn).toBeVisible({ timeout: 10000 });

  const readyCards = readyColumn.locator('[data-testid="production-card"]');
  const readyCount = await readyCards.count();

  // We expect at least 1 READY card from demo seed (it seeds 3 ready + 2 filming)
  if (readyCount === 0) {
    // Filming column might also have schedule buttons
    const filmingColumn = page.getByTestId('production-column-filming');
    const filmingCards = filmingColumn.locator('[data-testid="production-card"]');
    const filmingCount = await filmingCards.count();
    expect(filmingCount).toBeGreaterThan(0);
  }

  // 5) Click the Schedule button on the first READY/FILMING card
  const scheduleBtn = page.getByTestId('schedule-post-btn').first();
  await expect(scheduleBtn).toBeVisible({ timeout: 5000 });
  await scheduleBtn.click();

  // 6) ScheduleModal should open
  const modal = page.getByTestId('schedule-modal');
  await expect(modal).toBeVisible({ timeout: 5000 });

  // 6a) Try submitting without date — expect validation error
  await page.getByTestId('schedule-confirm-btn').click();
  await expect(page.getByTestId('schedule-validation-error')).toBeVisible({ timeout: 3000 });
  await expect(page.getByTestId('schedule-validation-error')).toHaveText(/Please pick a date/i);

  // 6b) Now set a date and submit
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);

  await page.getByTestId('schedule-date-input').fill(dateStr);
  await page.getByTestId('schedule-confirm-btn').click();

  // Modal should close and toast should appear
  await expect(modal).not.toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(1000);

  // 7) Go to Schedule page — find the scheduled item
  await page.goto('/dashboard/schedule', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1000);

  // Navigate to the correct month if needed
  const tomorrowMonth = tomorrow.getMonth();
  const currentViewMonth = new Date().getMonth();
  if (tomorrowMonth !== currentViewMonth) {
    // Click next month button
    await page.locator('button:has(svg)').filter({ hasText: '' }).last().click();
    await page.waitForTimeout(500);
  }

  // 8) Click on a scheduled item in the calendar
  // Look for any item that opens the detail modal
  const scheduledItems = page.locator('button').filter({ hasText: /DEMO/i });
  const scheduledCount = await scheduledItems.count();

  if (scheduledCount > 0) {
    await scheduledItems.first().click();
    await page.waitForTimeout(500);

    // 9) Detail modal should show
    const detailModal = page.getByTestId('schedule-detail-modal');

    if (await detailModal.isVisible().catch(() => false)) {
      // 10) Click "Mark as Posted"
      const markPostedBtn = page.getByTestId('mark-posted-btn');
      if (await markPostedBtn.isVisible().catch(() => false)) {
        await markPostedBtn.click();
        await page.waitForTimeout(2000);
      }
    }
  }

  // 11) Verify intelligence context returns 200
  const contextRes = await request.get('/api/intelligence/context', {
    headers: { Cookie: cookieHeader },
  });
  expect(contextRes.status()).toBe(200);
  const contextData = await contextRes.json();
  expect(contextData).toHaveProperty('niche');

  // 12) Verify creator/today returns updated streak + hasPostedToday
  const todayRes = await request.get('/api/creator/today', {
    headers: { Cookie: cookieHeader },
  });
  expect(todayRes.status()).toBe(200);
  const todayData = await todayRes.json();
  expect(todayData).toHaveProperty('nextBestAction');
  expect(todayData).toHaveProperty('hasPostedToday');
  expect(todayData).toHaveProperty('xp');
  expect(todayData).toHaveProperty('streakCount');

  // If we successfully marked a post, streak should be >= 1 and hasPostedToday true
  if (scheduledCount > 0) {
    expect(todayData.hasPostedToday).toBe(true);
    expect(todayData.streakCount).toBeGreaterThanOrEqual(1);
    expect(todayData.xp).toBeGreaterThanOrEqual(25);
    expect(todayData.nextBestAction).toBe('review_performance');
  }
});
