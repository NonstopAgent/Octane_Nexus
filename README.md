# Octane Nexus

Creator daily loop MVP: discover ideas → production → post lab → clip studio → schedule → monitoring.

**Docs:** [PRD (MVP spec)](docs/PRD.md) · [QA (DoD + 10-min test)](docs/QA.md) · [Notion SSOT guide](docs/NOTION.md)

## 5-minute setup (local)

1. **Install and run**
   ```bash
   npm install
   npm run dev
   ```

2. **Environment**
   Create `.env.local` with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
   Optional for demo mode:
   ```env
   NEXT_PUBLIC_DEMO_MODE=true
   ```
   Optional for Sentry (client + server):
   ```env
   SENTRY_DSN=your_sentry_dsn
   NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
   SENTRY_AUTH_TOKEN=optional_for_ci_source_maps
   SENTRY_TEST_TOKEN=optional_dev_only_token_to_allow_sentry_test_route
   ```
   **Sentry test route:** In production `/api/sentry-test` always returns 404. In dev, to verify capture: set `SENTRY_TEST_TOKEN` to a secret value (e.g. a random string), then open `/api/sentry-test?token=<that_value>`. Without the query param or with a wrong token you get 404/400. Do not commit `SENTRY_TEST_TOKEN`.

3. **Database**
   - **Canonical (no global install):** From the project root run `npm run db:push` (uses `npx supabase db push`). Same for `npm run db:reset` and `npm run db:types`. All scripts use `npx supabase` so no global Supabase CLI is required.
   - Alternatively, paste the SQL from `supabase/migrations/*.sql` into the Supabase SQL editor **in filename order**.
   - **DB health (MVP):** All migrations in `supabase/migrations/` are required for the MVP; apply them in order (oldest first).
   - **Windows (PowerShell):** `db:types` uses shell redirect `> lib/database.types.ts`; ensure `lib` exists. If redirect fails, run `npx supabase gen types typescript --local` and save output to `lib/database.types.ts` manually.

4. Open [http://localhost:3000](http://localhost:3000).

## Demo mode

- **Enable:** Set `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local`.
- **Try demo:** Go to `/login` and use “Try Demo”, or go to **Settings → Demo Data** and click **Seed Demo Data**.
- **Loop to test:** Trends → Send to Production → Production board → Post Lab → Clip Studio → Schedule → Monitoring.  
  Creator hub: `/dashboard/creator`. After seeding, use “Go to Production” or open Production from the hub.

## API keys (browser)

- **Settings → Developer:** OpenAI, Pexels, and RapidAPI keys are stored in **browser localStorage** (not server env).  
- UI banners (e.g. “OpenAI key missing”) reflect these local keys.  
- For server-only calls (e.g. some API routes), CI/Vercel may use env vars; the app is designed so MVP features work with keys in the browser.

## Deploy on Vercel

- Use **standard Next.js** deployment (Vercel detects the framework). Do **not** use static export: the app uses dynamic API routes and cookies.
- Set the same env vars in the Vercel project (Supabase URL/keys, optional `NEXT_PUBLIC_DEMO_MODE=true`).
- No long-running server jobs; safe for serverless.

## Vercel Preview QA

- **Required env vars** on Preview (and Production): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Optional: `NEXT_PUBLIC_DEMO_MODE=true`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` (for source maps in CI).
- **Demo mode on Preview:** Same as local: set `NEXT_PUBLIC_DEMO_MODE=true` on the Preview environment. Use **Settings → Demo Data** → Seed Demo Data, then run through: Trends → Production → Post Lab → Clip Studio → Schedule → Monitoring. No static export; route handlers may be dynamic.

## Local QA in one command

Run **`npm run qa`** to run lint → build → Playwright smoke (`tests/smoke.spec.ts`). Install browsers once with `npm run test:e2e:install`. After a run, open **`playwright-report/index.html`** for the HTML report (traces/screenshots on failure).

## Scripts

- `npm run dev` — development server  
- `npm run build` — production build  
- `npm run start` — start production server  
- `npm run lint` — ESLint  
- `npm run db:push` — apply migrations (no global Supabase; uses `npx supabase db push`)  
- `npm run db:reset` — reset DB and reapply migrations  
- `npm run db:types` — generate `lib/database.types.ts` from local schema  
- `npm run qa` — lint → build → Playwright smoke (full local QA)  
- `npm run test:e2e` — Playwright E2E (run after `npm run test:e2e:install` once)  
- `npm run test:e2e:install` — install Playwright browsers (for CI or first-time local run)  

**CI:** Use `npx supabase db push` (or `npm run db:push`) in CI when the project is linked; same env as local for Supabase.

---

## Contributing

- **Branch naming:** `lin-<issue-id>-<short-slug>` (e.g. `lin-123-add-sentry`).
- **PR checklist** (paste into your PR description and confirm each item):
  - [ ] `npm run build` exits 0
  - [ ] Demo seed works (Settings → Demo Data → Seed; then use “Go to Production”)
  - [ ] Key flows smoke-tested: Trends → Production → Post Lab → Clip Studio → Schedule → Monitoring (no dead ends)
  - [ ] No secrets committed
  - [ ] If schema changed: migration added under `supabase/migrations/` and applied
