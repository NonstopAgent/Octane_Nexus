import { test, expect } from '@playwright/test';
import {
  getExplorerSeed,
  seededRandom,
  getClickableCandidates,
  safeClick,
  closeAnyModal,
  createErrorTracker,
  attachErrorListeners,
  assertNoServerErrors,
  formatCandidate,
} from './utils/explorer';

const EXPLORER_SEED = getExplorerSeed();
const EXPLORE_STEPS_PER_ROUTE = 5;
const CORE_ROUTES = [
  '/dashboard/production',
  '/dashboard/post-lab',
  '/dashboard/library',
  '/dashboard/schedule',
  '/dashboard/chat',
  '/identity',
];

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.waitForURL(/\/login/, { timeout: 8000 });
  await page.waitForLoadState('domcontentloaded');
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
  await page.getByLabel('Email').fill('admin@octanenexus.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: /Sign In/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
}

test('Autonomous Explorer - Smoke', async ({ page }) => {
  test.setTimeout(90000);
  const tracker = createErrorTracker();
  attachErrorListeners(page, tracker);

  await login(page);

  let stepGlobal = 0;
  for (const route of CORE_ROUTES) {
    await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(200);

    const main = page.locator('main').first();
    await expect(main).toBeVisible({ timeout: 5000 }).catch(() => {});

    for (let s = 0; s < EXPLORE_STEPS_PER_ROUTE; s++) {
      stepGlobal++;
      const candidates = await getClickableCandidates(page);
      if (candidates.length === 0) continue;

      const idx = Math.floor(seededRandom(EXPLORER_SEED + stepGlobal) * candidates.length) % candidates.length;
      const candidate = candidates[idx];
      tracker.lastClicked = `${route} step=${stepGlobal} ${formatCandidate(candidate)}`;

      const clicked = await safeClick(page, candidate);
      if (clicked) {
        await page.waitForTimeout(150);
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        await closeAnyModal(page);
      }
    }
  }

  assertNoServerErrors(tracker);

  await page.goto('/dashboard/post-lab', { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForLoadState('networkidle').catch(() => {});

  const queueCards = page.getByTestId('post-lab-queue-card');
  const countBeforeSchedule = await queueCards.count();
  const scheduleBtn = page.getByTestId('schedule-post-btn');

  if (countBeforeSchedule > 0 && (await scheduleBtn.isVisible().catch(() => false))) {
    await queueCards.first().click();
    await page.waitForTimeout(400);
    await scheduleBtn.click();
    await expect(page.getByText(/Please pick a date/i)).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);
    const countAfter = await page.getByTestId('post-lab-queue-card').count();
    expect(countAfter).toBeGreaterThanOrEqual(countBeforeSchedule);
  }

  await page.goto('/dashboard/production', { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForLoadState('networkidle').catch(() => {});

  const readyColumn = page.getByTestId('production-column-ready');
  const readyCards = readyColumn.locator('[data-testid="production-card"]');
  const readyCountBefore = await readyCards.count();

  if (readyCountBefore > 0) {
    await readyCards.first().click();
    await page.waitForTimeout(500);
    const regenBtn = page.getByTestId('regenerate-new-version-btn');
    if ((await regenBtn.count()) > 0) {
      await regenBtn.click();
      await expect(page.getByText(/New version created|Generating/i)).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(2000);
      const readyCountAfter = await page.getByTestId('production-column-ready').locator('[data-testid="production-card"]').count();
      expect(readyCountAfter).toBeGreaterThanOrEqual(readyCountBefore);
    }
  }
});
