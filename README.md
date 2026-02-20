# Octane Nexus

Creator daily loop MVP: discover ideas → production → post lab → clip studio → schedule → monitoring.

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
   ```
   To verify Sentry: with `npm run dev` and `SENTRY_DSN` set, open `/api/sentry-test` (dev-only; returns 404 in production).

3. **Database**
   - From the project root (no global Supabase install required):
     ```bash
     npm run db:push
     ```
   - Or with Supabase CLI: `npx supabase db push`.
   - Alternatively, paste the SQL from `supabase/migrations/*.sql` into the Supabase SQL editor **in filename order**.
   - **DB health (MVP):** All migrations in `supabase/migrations/` are required for the MVP; apply them in order (oldest first). Local: `npm run db:reset` resets DB and reapplies migrations; `npm run db:types` regenerates `lib/database.types.ts` from the local schema.

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

## Scripts

- `npm run dev` — development server  
- `npm run build` — production build  
- `npm run start` — start production server  
- `npm run lint` — ESLint  
- `npm run db:push` — apply migrations (no global Supabase; uses `npx supabase db push`)  
- `npm run db:reset` — reset DB and reapply migrations  
- `npm run db:types` — generate `lib/database.types.ts` from local schema  

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
