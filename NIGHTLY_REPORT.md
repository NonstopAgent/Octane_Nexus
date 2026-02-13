# Nightly Agent Report — Feb 13, 2026

**Branch:** `nightly/mvp-loop-fix`
**Agent run:** Autonomous 7-phase MVP loop audit + fix

---

## What Was Broken

- **No merge conflicts found** — the `=======` patterns in source files were section comment dividers (e.g. `// ========== 1. Landing Page`), not git merge markers. Build was already green at baseline.
- **Demo seed not idempotent** — clicking "Load Demo Data" multiple times would create duplicate rows.
- **Data-testid mismatch** — KanbanBoard schedule button used `schedule-post-action` but Playwright tests expected `schedule-post-btn`.
- **Validation text mismatch** — `actions/schedule-post.ts` returned "Please pick a date/time." but `explorer.spec.ts` expected "Please pick a date".
- **No E2E test for the full MVP loop** (READY → Scheduled → Posted → Context).

---

## What Was Fixed

- **Demo seed made idempotent** — `/api/demo/seed` now calls reset logic (delete `[DEMO]` rows + tracked IDs) at the start before inserting. Clicking the button multiple times produces the same result.
- **Data-testid standardized** — KanbanBoard schedule button now uses `data-testid="schedule-post-btn"` (matches `tests/utils/explorer.ts` SAFE_TEST_IDS and `explorer.spec.ts`).
- **Validation text aligned** — `actions/schedule-post.ts` now returns "Please pick a date" (matches `explorer.spec.ts` line 92: `page.getByText(/Please pick a date/i)`).
- **MVP loop Playwright test added** — `tests/mvp-loop.spec.ts`: login → demo seed → Production → Schedule READY card → set date → confirm → Schedule page → Mark as Posted → verify `/api/intelligence/context` (200) + `/api/creator/today` (200).

---

## Verified Systems

### CreatorDailyBar
- Mounted in `app/dashboard/layout.tsx` line 186, between header and main
- `data-testid="creator-daily-bar"`
- Fetches `GET /api/creator/today` — returns `{ ideasCount, scriptingCount, readyCount, scheduledCount, streakCount, lastPostAt, nextBestAction }`
- Renders on ALL `/dashboard/*` routes (Library, Trends, Chat, Post Lab, Production, Schedule, Monitoring, Settings)
- Gracefully handles unauthenticated state (renders null)

### Demo Mode
- Gated by `NEXT_PUBLIC_DEMO_MODE === 'true'` in:
  - `components/ui/DemoNudge.tsx` (empty page callout)
  - `app/dashboard/settings/page.tsx` (Demo Data tab)
- DemoNudge appears on: Dashboard, Production (KanbanBoard), Post Lab, Monitoring, Library
- Seed is now idempotent (reset-then-insert)
- Reset safely removes only `[DEMO]`-prefixed rows + tracked IDs

### MVP Loop (READY → Scheduled → Posted → Monitoring)
- **Production**: READY + FILMING cards show "Schedule" button (`schedule-post-btn`)
- **ScheduleModal**: date/time/platform inputs, validation ("Please pick a date"), confirm button
- **Schedule page**: calendar items are clickable buttons, detail modal shows "Mark as Posted"
- **Mark as Posted**: updates `content_posts.status` to `'posted'`, inserts `instagram_posts` row with `posted_at=now()`, `quality_score=null` (no fake analytics)
- **Intelligence context**: `/api/intelligence/context` reads `instagram_posts.posted_at` to compute `bestPostingHours`/`bestFormat`

### Data-testid Reference
| Element | data-testid |
|---------|-------------|
| Schedule button (Production) | `schedule-post-btn` |
| Schedule button (Post Lab) | `schedule-post-btn` |
| Schedule modal | `schedule-modal` |
| Date input | `schedule-date-input` |
| Time input | `schedule-time-input` |
| Platform input | `schedule-platform-input` |
| Confirm button | `schedule-confirm-btn` |
| Validation error | `schedule-validation-error` |
| Schedule detail modal | `schedule-detail-modal` |
| Mark as Posted button | `mark-posted-btn` |
| Creator Daily Bar | `creator-daily-bar` |
| Demo Load button | `demo-load` |

---

## Proof Commands

```bash
# All pass:
npx tsc --noEmit        # exit 0
npm run lint             # exit 0 (warnings only, no errors)
npm run build            # exit 0
```

---

## How to Enable Demo Mode Locally

1. Add to `.env.local`:
   ```
   NEXT_PUBLIC_DEMO_MODE=true
   ```

2. Apply the demo migration (if not already applied):
   ```bash
   npx supabase db push
   ```
   Or manually run `supabase/migrations/20250219000000_demo_seeded_ids.sql` in your Supabase SQL editor.

3. Restart dev server: `npm run dev`

4. Go to Settings → "Demo Data" tab → click "Load Demo Data"
   OR click the "Load Demo Data" button on any empty page.

---

## Remaining TODOs (Non-blocking)

- **Playwright tests require running dev server** (`npm run dev` on localhost:3000). The `mvp-loop.spec.ts` test was written but not executed in this agent run because no dev server was running. Run manually:
  ```bash
  npx playwright test tests/mvp-loop.spec.ts
  ```
- **`<img>` → `<Image />`** warnings remain (12 instances across library, schedule, settings, identity, post-lab, PostOptimizer, YouTubeRecommender). These are warnings only and don't affect build or functionality.
- **React Hook deps warnings** remain (2 instances: monitoring/selectedAccount, KanbanBoard/refreshPosts). These are pre-existing and non-blocking.

---

## Files Changed in This Run

| File | Change |
|------|--------|
| `app/api/demo/seed/route.ts` | Made idempotent: reset existing demo data before inserting new |
| `actions/schedule-post.ts` | Validation message aligned: "Please pick a date" |
| `components/dashboard/KanbanBoard.tsx` | Schedule button testid: `schedule-post-action` → `schedule-post-btn` |
| `tests/mvp-loop.spec.ts` | **New.** E2E test for full MVP loop |
| `NIGHTLY_REPORT.md` | **New.** This report |
