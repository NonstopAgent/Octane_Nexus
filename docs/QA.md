# QA — Definition of Done & test script

## Definition of Done checklist

Before merging, confirm:

- [ ] **Build:** `npm run build` exits 0
- [ ] **Lint:** `npm run lint` passes (if the project has a lint script)
- [ ] **Smoke:** Playwright smoke passes (`npm run test:e2e -- tests/smoke.spec.ts` after `npm run test:e2e:install` once)
- [ ] **Demo seed/reset works** in demo mode (Settings → Demo Data)
- [ ] **No hardcoded handles:** Handles are shown only when `profiles.linked_accounts` has a value (use `getDisplayHandle` from `lib/linkedAccounts.ts`)
- [ ] **No merge conflict markers** left in code (`<<<<<<<`, `=======`, `>>>>>>>`)
- [ ] **Sentry test** (if using Sentry): Verified via `/api/sentry-test?token=<SENTRY_TEST_TOKEN>` in dev only

## 10-minute click-test script

1. **Start:** `npm run dev`; open http://localhost:3000
2. **Demo mode:** Set `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local` if needed
3. **Login:** Go to `/login` → “Try Demo” (or sign in)
4. **Seed:** **Settings → Demo Data** → **Seed Demo Data**
5. **Production:** From hub or nav, open **Production**; confirm cards/ideas
6. **Post Lab:** Open **Post Lab**; open a post; confirm script/editor loads
7. **Clip Studio:** From Production or handoff, open **Clip Studio**; confirm attestation/flow
8. **Schedule:** Open **Schedule**; confirm calendar/queue
9. **Monitoring:** Open **Monitoring**; confirm dashboard
10. **Banners:** In **Settings → Developer**, add/remove an API key; confirm SystemStatus banners update

No step should result in a blank page or dead end.

## Playwright smoke (local)

```bash
npm run test:e2e:install   # once
npm run test:e2e -- tests/smoke.spec.ts
```

Or run the full QA script: `npm run qa` (lint → build → smoke).

## CI expectations

- **On push/PR to main:** Install deps → Lint (if script exists) → Build → Install Playwright browsers → E2E smoke (`tests/smoke.spec.ts`) with `NEXT_PUBLIC_DEMO_MODE=true`
- **Artifacts on failure:** Playwright HTML report and test-results are uploaded so failures are easier to diagnose.
