# Octane Nexus – Agent Instructions

Use this file when working autonomously in Cursor (YOLO mode, Agent mode, or multi-agent workflows).

**MVP v1 scope:** Creator Daily Loop (Trends → Production → Post Lab → Clip Studio → Schedule → Monitoring). For current scope and DoD, **prioritize** [docs/PRD.md](docs/PRD.md), [docs/QA.md](docs/QA.md), [docs/NOTION.md](docs/NOTION.md), and [.cursor/context.md](.cursor/context.md). Identity/Lab features exist but are not the MVP v1 focus.

## Project Context
Octane Nexus is a creator terminal: Identity Sniper, Algorithm Lab, Active Librarian. Next.js 14, TypeScript, Supabase, Stripe, Gemini AI. **Current MVP v1:** Creator Daily Loop with Tradeview AI demo identity.

## Rules & Skills
- **Rules**: `.cursor/rules/octane-nexus.mdc` – conventions, tech stack, data model, UI patterns
- **Skill**: `.cursor/skills/octane-nexus/SKILL.md` – Identity and Dashboard domain knowledge, step flows, data persistence

## Autonomous Work Guidelines
1. **Read rules first** – Follow tech stack, file layout, Supabase schema, and UI patterns from the core rule
2. **Use the skill** – When touching Identity or Dashboard, consult the skill for flows, state, and lib usage
3. **Consistency** – Match existing styles (amber/emerald accents, rounded cards, dark theme), components (Loader2, CheckCircle2), and naming (handle, blueprint, vision)
4. **Data integrity** – Always update `profiles` via `supabase.from('profiles').update().eq('id', user.id)`; respect access flags (`has_purchased_package`, `founder_license`)
5. **Extend, don't break** – New features should integrate with existing nav, auth, and profile data

## Key Paths
- Identity wizard: `app/identity/page.tsx`
- Dashboard layout: `app/dashboard/layout.tsx`
- Dashboard home: `app/dashboard/page.tsx`
- Lab (blueprints): `app/lab/page.tsx`
- AI lib: `lib/gemini.ts`
- Image gen: `lib/image-gen.ts`

## Cursor Cloud specific instructions

### Services overview

| Service | How to run | Notes |
|---|---|---|
| Next.js dev server | `npm run dev` (port 3000) | Main app. Requires `.env.local` with Supabase credentials. |
| Local Supabase | `npx supabase start` (requires Docker) | PostgreSQL + Auth + Storage on port 54321. |

### Local Supabase setup (requires Docker)

The migrations in `supabase/migrations/` assume the `profiles` table already exists, but no migration creates it. A `20250207000000_create_profiles.sql` migration was added to fix this. Additionally, `supabase start` applies all migrations on a fresh DB; migration `20250228000000_mvp_schema_alignment.sql` changes `content_posts.user_id` from UUID to TEXT but fails because RLS policies depend on that column. **Workaround**: start Supabase without migrations (`mv` them temporarily), then apply them manually via `docker exec supabase_db_workspace psql`, dropping the RLS policies on `content_posts` before applying the `mvp_schema_alignment` migration, and recreating them afterward with `auth.uid()::text = user_id`.

After starting Supabase, export credentials with `npx supabase status -o env` and create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY from status>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY from status>
NEXT_PUBLIC_DEMO_MODE=true
```

### Known issues

- **`npm run build` fails** due to pre-existing ESLint errors in `lib/gemini.ts` and `app/page.tsx` (unused vars, `any` types). Webpack compilation itself succeeds. `npm run dev` works fine.
- **`npm run lint`** exits non-zero due to the same pre-existing errors. These are not blocking for development.
- **Demo seed API** (`POST /api/demo/seed`) may fail with "invalid input syntax for type uuid" when multiple `user_id` columns haven't been converted from UUID to TEXT. Seed demo data directly using the Supabase service role client via Node.js instead.
- **Dashboard routes** (`/dashboard/*`) are protected by middleware that checks for a real Supabase auth session. Mock login sets cookies but the middleware does not check them, so dashboard pages redirect to `/login`. The `/identity` and `/login` pages work in mock/demo mode.
- **Missing npm packages**: `@supabase/ssr`, `sonner`, `pexels`, `fluent-ffmpeg`, `sharp` are imported by the codebase but not in `package.json`. They were added during setup.
- **Missing module**: `lib/clipStudioHandoff.ts` was missing and was created during setup.

### Lint / Test / Build commands

See `README.md` for the full list. Key commands: `npm run dev`, `npm run lint`, `npm run build`, `npm run qa`.
