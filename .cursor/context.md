# Octane Nexus — Cursor context

**What it is:** Creator Daily Loop MVP: discover ideas → production → post lab → clip studio → schedule → monitoring. Next.js 14 App Router, Supabase, serverless-safe (Vercel).

**Demo mode:** Tradeview AI is the demo identity. Set `NEXT_PUBLIC_DEMO_MODE=true`. Use “Try Demo” on `/login` or **Settings → Demo Data** → Seed Demo Data. Effective user ID for demo is `demo_user_mvp_v1` (internal constant); no fake connected accounts.

**Key flows:** Trends → Send to Production → Production board → Post Lab → Clip Studio → Schedule → Monitoring. Creator hub: `/dashboard/creator`. No dead ends = success.

**Key DB tables:** `content_posts`, `clips`, `clip_jobs`, `uploads`, `style_tokens`, `brain_evals`, `content_versions`, `broll_packs`, `rights_ledger`, `saved_blueprints`, `profiles` (includes `linked_accounts`), `user_settings`, `uploads`.

**API keys & banners:** Stored in **browser localStorage** via `lib/apiKeys.ts` (openai, pexels, rapidapi). Changes dispatch `KEYS_CHANGED_EVENT`; `SystemStatusBanner` and UI react instantly. Do not hardcode keys.

**Handles:** Do not hardcode social handles. Display handle only when `profiles.linked_accounts` has a value for that platform; use `lib/linkedAccounts.ts` `getDisplayHandle()`. Otherwise show “Not connected”.
