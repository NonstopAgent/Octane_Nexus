/**
 * Autonomous Explorer test helpers.
 * Deterministic seeded RNG, clickable candidate collection, danger filter, error tracking.
 */

import type { Page, Locator } from '@playwright/test';

const EXPLORER_SEED = 1337;

/** Seeded LCG for deterministic randomness. Returns 0..1. */
export function seededRandom(seed: number): number {
  const a = 1664525;
  const c = 1013904223;
  const m = 2 ** 32;
  return ((seed * a + c) >>> 0) / m;
}

/** Seed value used by the explorer (for failure reports). */
export function getExplorerSeed(): number {
  return EXPLORER_SEED;
}

const DANGEROUS_PATTERNS = [
  /delete/i,
  /remove/i,
  /sign\s*out/i,
  /log\s*out/i,
  /reset/i,
  /drop\s*(table|column)?/i,
  /truncate/i,
  /clear\s*all/i,
  /destroy/i,
  /uninstall/i,
];

const SAFE_TEST_IDS = [
  'production-column-idea',
  'production-column-scripting',
  'production-column-filming',
  'production-column-ready',
  'production-column-posted',
  'production-column-generating',
  'production-card',
  'script-editor-modal',
  'generate-assets-btn',
  'regenerate-new-version-btn',
  'schedule-post-btn',
  'schedule-date-input',
  'post-lab-queue-card',
  'nav-identity',
  'nav-library',
  'nav-trends',
  'nav-chat',
  'nav-post-lab',
  'nav-production',
  'nav-schedule',
  'nav-monitoring',
  'nav-settings',
  'cta-run-simulation',
  'cta-generate-caption',
  'cta-schedule-post',
];

export type ClickableCandidate =
  | { kind: 'testid'; id: string; nth: number }
  | { kind: 'nth'; selector: string; nth: number }
  | { kind: 'role'; role: string; name: string }
  | { kind: 'selector'; selector: string; text?: string };

export function isDangerousCandidate(
  _el: unknown,
  text: string | null,
  testId: string | null
): boolean {
  const t = (text ?? '').trim().toLowerCase();
  const id = (testId ?? '').trim().toLowerCase();
  const combined = `${t} ${id}`;
  return DANGEROUS_PATTERNS.some((p) => p.test(combined));
}

/**
 * Collect clickable candidates: safe data-testid elements first, then buttons/links (filtered).
 */
export async function getClickableCandidates(page: Page): Promise<ClickableCandidate[]> {
  const candidates: ClickableCandidate[] = [];

  for (const testId of SAFE_TEST_IDS) {
    const loc = page.getByTestId(testId);
    const n = await loc.count();
    for (let i = 0; i < n; i++) {
      const visible = await loc.nth(i).isVisible().catch(() => false);
      if (visible) candidates.push({ kind: 'testid', id: testId, nth: i });
    }
  }

  const genericSelector = 'button, [role="button"], a[href]';
  const buttons = page.locator(genericSelector);
  const count = Math.min(await buttons.count(), 40);
  for (let i = 0; i < count; i++) {
    const loc = buttons.nth(i);
    const info = await loc
      .evaluate((el) => ({
        text: (el as HTMLElement).innerText?.slice(0, 150) ?? '',
        testId: el.getAttribute('data-testid'),
      }))
      .catch(() => null);
    if (!info) continue;
    if (isDangerousCandidate(null, info.text, info.testId)) continue;
    candidates.push({ kind: 'nth', selector: genericSelector, nth: i });
  }

  return candidates;
}

export async function safeClick(page: Page, candidate: ClickableCandidate): Promise<boolean> {
  try {
    if (candidate.kind === 'testid') {
      await page.getByTestId(candidate.id).nth(candidate.nth).click({ timeout: 3000 });
    } else if (candidate.kind === 'nth') {
      await page.locator(candidate.selector).nth(candidate.nth).click({ timeout: 3000 });
    } else if (candidate.kind === 'role') {
      await page.getByRole(candidate.role as 'button' | 'link', { name: candidate.name }).first().click({ timeout: 3000 });
    } else {
      await page.locator(candidate.selector).first().click({ timeout: 3000 });
    }
    return true;
  } catch {
    return false;
  }
}

export async function closeAnyModal(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(80);
  const closeBtn = page.getByRole('button', { name: /close/i }).first();
  if ((await closeBtn.count()) > 0) {
    await closeBtn.click({ timeout: 800 }).catch(() => {});
  }
  const xBtn = page.locator('button:has(svg), [aria-label="Close"]').first();
  if ((await xBtn.count()) > 0) {
    await xBtn.click({ timeout: 800 }).catch(() => {});
  }
}

export interface ErrorTracker {
  pageErrors: string[];
  consoleErrors: string[];
  server5xx: { url: string; status: number }[];
  lastClicked: string | null;
  assertNoErrors(): void;
}

const CONSOLE_ERROR_ALLOWLIST = [
  /download the React DevTools/i,
  /extension/i,
  /favicon/i,
  /hydration/i,
  /Stripe\(\)|apiKey should be a string/i,
  /Expected server HTML/i,
  /streak_count does not exist/i,
  /Failed to fetch/i,
  /Failed to load resource.*\b(400|403)\b/i,
  /Error loading profile/i,
  /authenticate the request|Authorization header/i,
  /Failed to brainstorm|generate video concepts|Please try again/i,
];

const PAGE_ERROR_ALLOWLIST = [
  /hydration/i,
  /Stripe\(\)|apiKey should be a string/i,
  /Suspense boundary/i,
];

function filterAllowlist(list: string[], patterns: RegExp[]): string[] {
  return list.filter((msg) => !patterns.some((p) => p.test(msg)));
}

export function createErrorTracker(): ErrorTracker {
  const tracker: ErrorTracker = {
    pageErrors: [],
    consoleErrors: [],
    server5xx: [],
    lastClicked: null,
    assertNoErrors() {
      const pageFail = filterAllowlist(tracker.pageErrors, PAGE_ERROR_ALLOWLIST);
      const consoleFail = filterAllowlist(tracker.consoleErrors, CONSOLE_ERROR_ALLOWLIST);
      const parts: string[] = [];
      if (pageFail.length) {
        parts.push(`Page errors: ${pageFail.join('; ')}`);
      }
      if (consoleFail.length) {
        parts.push(`Console errors: ${consoleFail.join('; ')}`);
      }
      if (tracker.server5xx.length) {
        parts.push(
          `5xx responses: ${tracker.server5xx.map((r) => `${r.url} ${r.status}`).join(', ')}`
        );
      }
      if (parts.length) {
        throw new Error(
          `Explorer invariants violated (seed=${getExplorerSeed()}, lastClicked=${tracker.lastClicked}): ${parts.join('. ')}`
        );
      }
    },
  };
  return tracker;
}

export function assertNoServerErrors(tracker: ErrorTracker): void {
  tracker.assertNoErrors();
}

export function attachErrorListeners(page: Page, tracker: ErrorTracker): void {
  page.on('pageerror', (err) => {
    tracker.pageErrors.push(err.message);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!CONSOLE_ERROR_ALLOWLIST.some((p) => p.test(text))) {
        tracker.consoleErrors.push(text);
      }
    }
  });

  page.on('response', (res) => {
    const status = res.status();
    if (status >= 500 && status < 600) {
      const url = res.url();
      if (!url.includes('google') && !url.includes('stripe.com') && !url.includes('facebook')) {
        tracker.server5xx.push({ url, status });
      }
    }
  });
}

export function formatCandidate(c: ClickableCandidate): string {
  if (c.kind === 'testid') return `[data-testid="${c.id}"]#${c.nth}`;
  if (c.kind === 'nth') return `${c.selector}#${c.nth}`;
  if (c.kind === 'role') return `${c.role}:${c.name}`;
  return c.selector;
}
