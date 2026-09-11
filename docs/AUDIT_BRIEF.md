# Octane Nexus — Codebase Audit Brief

**For:** an AI agent (Cursor, Codex, etc.) doing a full read-only audit of this repo.
**Written:** 2026-09-10, against commit `93e3244d`.
**Read this file completely before touching anything else in the repo.**

This repo will actively mislead you. Several orientation files describe a product
that no longer exists, and the `supabase/migrations/` folder does not match the
production database. Sections 1–4 exist to stop you from auditing against the
wrong definition of "correct."

---

## STOP — confirm which repository you are in

There are **two similarly-named repos** on the NonstopAgent account, and they are
not forks of each other — they share no commits at all.

| | |
|---|---|
| ✅ **`NonstopAgent/Octane_Nexus`** (**underscore**) | The live product. Deploys to Vercel `octane-nexus-6em9`. Has `docs/`, `lib/briefQueue.ts`, `lib/briefPipeline.ts`, `app/api/cron/brief-worker/`. |
| ❌ `NonstopAgent/Octane-Nexus` (**hyphen**) | The abandoned pre-pivot codebase. Has `/lab`, `/library`, `/identity`, `/nexus` routes. No `docs/` directory, ever. |

Run this first:

```bash
git remote -v      # must show Octane_Nexus.git — underscore, not hyphen
ls docs/AUDIT_BRIEF.md
```

If `docs/` does not exist, **you are in the hyphen repo — stop and say so.** Do
not audit it, do not open a PR against it, and do not reconstruct this brief
from memory. An agent already burned 37 minutes standing up a dev environment
there before anyone noticed (2026-09-10).

The hyphen repo is, fittingly, the very product that §1a's stale files describe.

---

## 0. Rules of engagement

- **This is a read-only audit.** Produce a findings list. Do not change code, do
  not "fix while you're in there," do not reformat.
- Every finding needs: severity, `file:line` evidence, and a **concrete failure
  scenario** — the specific input or state that produces the specific wrong
  result. "This could be unsafe" is not a finding. "An authenticated user POSTs
  `{amount: 999999}` to X and gets unlimited credits" is a finding.
- If you cannot state the failure scenario, it goes in a separate
  "Suspicions, unproven" list. Do not pad the main list.
- Respect `.cursor/rules/octane-nexus.mdc` (the existing house rules): no
  refactors unless requested, ≤300 lines per task, show `git diff --stat`.
- Rank by severity. A stylistic nit above a data-loss bug makes the whole list
  less useful.

---

## 1. What this product actually is

**Octane Nexus generates a daily brief for small YouTube creators.**

The loop, end to end:

1. A creator signs up and connects their YouTube channel (OAuth).
2. They add **tracked channels** — competitors they want watched.
3. A scheduled job enqueues one brief job per eligible user per day.
4. A worker claims jobs in batches, refreshes each tracked channel's recent
   videos, finds outlier videos (performance vs. that channel's median), and
   asks an LLM for today's idea grounded in those outliers.
5. The creator reads the brief on the dashboard and gives feedback, which feeds
   the next day's brief.

That is the product. Tracked channels → competitor outliers → today's idea.

### 1a. What this product is NOT (and the files that lie about it)

Before the pivot, this codebase was a different product. These files still
describe it and are **seven months stale**:

| File | What it wrongly claims |
|---|---|
| `AGENTS.md` | "Identity Sniper, Algorithm Lab, Active Librarian"; references `app/lab/page.tsx`, which **does not exist** |
| `.cursor/context.md` | dated 2026-02-21; "Creator Daily Loop (Trends → Production → Post Lab → Clip Studio → Schedule → Monitoring)" |
| `docs/PRD.md` | dated 2026-02-21; pre-pivot product spec |
| `docs/QA.md` | dated 2026-02-21; QA plan for features that no longer exist |
| `docs/NOTION.md` | dated 2026-02-21; lists a DB table set containing **none** of the daily-brief tables |

Two of these also assert **"Tradeview AI is the demo identity."** It is not.

> **Audit item #1, highest priority:** reconcile or delete these five files.
> While they exist, every future agent — and every human reading the repo cold —
> starts from the wrong product. Recommend deletion over rewriting for the three
> dated `docs/` files; they are historical artifacts, not specs.

---

## 2. Trap: the migrations folder is not the schema

`supabase/migrations/` has 32 files. Production (`zdvedfnpipgygvikoooa`) has 33
applied migrations. **They are not the same 32.**

**In the repo but never applied to production (8):**

```
20250228000000_mvp_schema_alignment.sql
20250229000000_finance_disclaimer.sql
20250230000000_clip_it_handoff.sql          <- note: February 30th
20250318120000_create_user_api_keys.sql
20250318130000_create_user_predictions.sql
20250318140000_add_bio_tune_options.sql
20260408120000_daily_brief_tracked_channels.sql
20260409100000_tracked_channels_last_synced.sql
```

**Applied in production with no file in the repo (8):**

```
20260403184808 auto_create_profile_on_signup
20260404200412 add_missing_content_posts_columns
20260406201346 create_creator_memory_layer
20260406205552 create_creator_connections
20260408233039 create_daily_brief_tables
20260629172816 create_velocity_tracking
20260713133018 enable_pg_net
20260725004239 revoke_security_definer_execute_from_public
```

(Two more were in this list until 2026-09-10; I backfilled repo files for
`grant_claim_brief_jobs_to_service_role` and the new
`refunds_are_service_role_only` rather than widen a gap I was documenting.)

Plus four more where the repo file and the applied migration share a name but
have **different version timestamps** (`brief_memory_feedback`,
`enable_rls_on_exposed_tables`, `close_remaining_security_gaps`,
`brief_job_queue`) — so `supabase db push` would try to re-apply them.

**Consequences you must account for:**

- `lib/apiKeys.ts` queries `public.user_api_keys`. **That table does not exist in
  production.** The migration that creates it was never applied. Nothing
  currently imports `lib/apiKeys.ts`, so it is dead code pointing at a dead
  table — but confirm the dead-code claim yourself before recommending deletion.
- Do **not** derive the schema by reading migration files. Introspect the live
  database, or ask for a fresh dump.
- Do **not** run `supabase db push` / `db reset` as part of this audit.

> **Audit item #2:** propose a reconciliation plan for this drift. Do not execute
> it. Squash-to-baseline is probably the right answer; say so if you agree.

---

## 3. DO NOT UNDO — deliberate decisions that look like bugs

Each of these will look wrong to a fresh reader. Each is load-bearing. If you
flag one, flag it as "revisit later," never as "remove."

### 3a. The weak User-Agent cron fallback — `lib/security.ts`, `checkCronAuth`

`checkCronAuth` accepts a request when `CRON_SECRET` is unset **and** the
`user-agent` matches `/vercel-cron/i`. A User-Agent header is trivially spoofed,
so this reads as a straightforward auth bypass.

**It is a deliberate stopgap.** `CRON_SECRET` is not yet set in Vercel. Live
brief generation authorizes on exactly this path today. Removing it stops the
product from producing briefs at all, silently, on the next deploy.

The correct fix is operational, not code: set `CRON_SECRET` in Vercel, redeploy,
then delete the branch. That is tracked. Do not do it in this audit.

### 3b. `cache: 'no-store'` on the service-role Supabase client — `lib/supabaseServer.ts`

Looks like a stray perf pessimization. It is not. Next.js patches global `fetch`
and its Data Cache was serving **stale PostgREST reads** to the worker: one
queued job was reported as `processed: 7, generated: 7` with `attempts` stuck at
1 — seven Gemini calls, 36 seconds, for one job's worth of work. With
`no-store`: 6.9s and one call; a re-run reuses in 1.5s and zero calls.

Do not remove it. Do not "optimize" it back.

### 3c. `isDemoIdentityAllowed` production guard — `lib/effectiveUser.ts`

Demo mode grants a fixed `DEMO_USER_ID` when there is no session. The guard
refuses to do that whenever `VERCEL_ENV` is set or `NODE_ENV === 'production'`.
Without it, `NEXT_PUBLIC_DEMO_MODE=true` in production is an unauthenticated
identity grant. Keep the guard.

### 3d. `brief_jobs` has only a SELECT policy

Intentional. The worker writes with the service-role key, which bypasses RLS.
Users need read-only visibility into their own jobs. Not a gap.

---

## 4. Already found, already fixed, already verified — do not re-report

All of these were fixed and verified in the last session. Re-reporting them
costs you credibility on the findings that are real.

| Issue | Resolution |
|---|---|
| Build broken — `Record<string, any>` at `lib/octane-auth.ts:7` | fixed; typecheck clean |
| No test layer at all | 4 unit suites, 50 tests, hermetic (`node:test` + `tsx`) |
| Fail-open cron/webhook auth | `checkCronAuth` now fails closed in production (see 3a for the one exception) |
| SSRF via `startsWith` prefix match on the proxy allowlist | now parsed-origin comparison + HTTPS required, `isAllowedProxyUrl` |
| `generate-image` / `generate-video-asset` unauthenticated | auth added |
| Credit deduction race (read-then-write) | atomic Postgres RPC |
| 25-user ceiling: one 60s cron doing all work inline | split into enqueue + worker with `FOR UPDATE SKIP LOCKED`, time budget, retries |
| Next.js fetch-cache serving stale rows | `cache: 'no-store'` (see 3b) |
| Demo mode granting identity in production | `isDemoIdentityAllowed` (see 3c) |
| **Any signed-in user could mint unlimited credits** | see below |

**The credit-minting hole (fixed 2026-09-10).** `refund_own_credits(p_amount)`
was `SECURITY DEFINER`, derived its target from `auth.uid()`, and was
EXECUTE-able by `authenticated`. Any signed-in tester could POST
`/rest/v1/rpc/refund_own_credits {"p_amount": 999999}` with their own anon-key
session and grant themselves unlimited credits — no server code involved. It was
introduced by the queue work in the previous session.

Resolution (`20260910210011_refunds_are_service_role_only`): the function is
dropped and replaced by `refund_credits(p_user_id uuid, p_amount integer)`,
granted to `service_role` only, so a refund can only ever originate from trusted
server code. `app/api/generate-video-asset/route.ts` now refunds through a
service-role client, and — separately — refunds in its `catch` block too, which
it previously did not: a throw after the debit but before delivery used to burn
the caller's credits silently. `deduct_own_credits` keeps its `authenticated`
grant (it only ever subtracts from the caller's own balance and floors there, so
it is not exploitable for gain) but was revoked from `PUBLIC`.

Verified: `refund_credits` and `claim_brief_jobs` ACLs are `service_role` only;
`deduct_own_credits` is `authenticated` + `service_role` with no PUBLIC entry.

Verified empirically against the production DB: claim marks `running`/`attempts=1`;
an immediate second claim returns 0; a stale + attempt-exhausted job returns 0; a
stale job with attempts remaining is reclaimed. Full loop produced one real brief
from one job with three competitor insights.

---

## 5. Confirmed open findings — start by verifying these, then go wider

These are real, evidenced, and unfixed. Confirm each, then expand the search for
the same *class* of problem elsewhere.

### 5a. ~~HIGH — `refund_own_credits` lets any signed-in user mint credits~~ FIXED

Found and fixed while writing this brief; recorded here so you can verify the
fix rather than rediscover the hole. See §4 for the resolution. Worth **one
check on your part**: confirm no other `SECURITY DEFINER` function in the
`public` schema does a privileged write while deriving its target from
`auth.uid()` and being EXECUTE-able by `authenticated`. That is the class of bug;
one instance is fixed, and I did not sweep for others.

### 5b. MEDIUM — `daily_briefs` has no INSERT policy

RLS is on. Policies present: SELECT, UPDATE. **No INSERT, no DELETE.**

**Failure scenario:** any client-side or user-context write path to `daily_briefs`
fails with an RLS violation. It works today only because the worker uses the
service-role key. The moment a brief is created in a user context — a "regenerate"
button, a manual trigger — it silently fails. Check whether such a path already
exists.

### 5c. LOW — duplicate RLS policy sets

- `content_posts` has **8** policies: exact duplicate pairs for SELECT, INSERT,
  UPDATE, DELETE ("Users can X own posts" and "Users can X own content_posts").
- `creator_tools` has **2** duplicate public-read policies ("Allow public read
  access", "Anyone can read creator_tools"), both granting `public`.

Policies are OR'd, so behavior is currently correct. The risk is maintenance: a
future tightening that edits one policy of a pair does nothing, because the
looser twin still grants access. **Verify `creator_tools` public read is
intentional** — if it holds anything user-specific, it is a data leak.

### 5d. MEDIUM — ffmpeg is imported into the Vercel server bundle

`lib/render/burn-overlay.ts:10` imports `fluent-ffmpeg`;
`lib/simulator.ts:12` imports `burn-overlay`;
`app/dashboard/production/actions.ts:12` imports `lib/simulator`.

**Failure scenario:** `fluent-ffmpeg` shells out to an `ffmpeg` binary. Vercel's
serverless runtime has no `ffmpeg` binary. Any code path reaching this fails at
runtime, not build time. Trace whether the production server action actually
invokes it, or only imports it — and report which.

### 5e. LOW — `playwright` is a production dependency

`package.json` lists `playwright ^1.59.1` under `dependencies` (`@playwright/test`
is correctly in `devDependencies`). It ships browser-automation code in the
production install. Confirm nothing at runtime imports it, then move it.

---

## 6. Suspect areas — investigate, confirm or clear

I flagged these and did not chase them. Treat each as a question, not a claim.

1. **Scope sprawl.** 77 API routes, 21 pages, 32 migrations — for a product whose
   job is "one brief per creator per day." Produce a **reachability map**: which
   routes and pages are reachable from the live navigation, and which are
   orphaned pre-pivot surface area? This is the single most valuable thing you
   can produce. Do not delete anything; just tell us what is dead.
2. **"Dynamic server usage" build warnings.** Roughly 13 routes log this. Confirm
   the count and list them. Determine which genuinely need
   `dynamic = 'force-dynamic'` and which are accidentally opting out of static
   rendering.
3. **`lib/apiKeys.ts`.** Queries a table that does not exist (§2). Confirm it is
   unimported. If a UI path does reach it, that is a high-severity break, not
   dead code.
4. **localStorage as a data store.** `lib/creatorStore.ts`, `lib/playbook.ts`,
   `lib/postsRepo.ts`, `lib/reality-check-storage.ts` persist feature state to
   `localStorage`. Which of these hold data a tester would expect to survive a
   device change or a browser clear? Each one is a "my data vanished" support
   ticket waiting to happen. Rank by that.
5. **Onboarding dead end.** Nothing routes a new signup into adding a tracked
   channel. A fresh signup therefore produces **zero** briefs — the enqueuer
   correctly finds them ineligible. Confirm this by tracing the post-signup
   redirect. This is the last functional gap before testers get value.
6. **Error handling on the LLM path.** What happens on a Gemini timeout, a
   safety-filter refusal, or malformed JSON? Does the job retry, fail, or write a
   corrupt brief? Trace `lib/briefPipeline.ts` → `runBriefForUser`.
7. **YouTube OAuth token refresh.** What happens when a tester's refresh token
   expires or is revoked? Does the worker fail the job loudly, or silently
   produce an empty brief?
8. **`GOOGLE_OAUTH_CLIENT_SECRET`** shows a "Needs Attention" badge in Vercel.
   Cause unknown. Cannot be diagnosed from the repo alone — note it and move on.
9. **Leaked-password protection is disabled** in Supabase Auth (HaveIBeenPwned
   check). One-click dashboard setting; include it in the list for completeness.
10. **Posts can get stuck in `generating` forever.**
    `app/api/generate-video-asset/route.ts` sets `status: 'generating'` before
    the OpenAI and Pexels calls and never resets it on failure. Credits are now
    refunded on that path (§4), but the row's status is not. A tester whose TTS
    call times out sees a post spinning permanently with no way to retry. Sweep
    for the same pattern on every other route that sets a transient status
    before an external call — this is a class, not an instance.

---

## 7. How to verify your findings

The gate is green on `main` as of 2026-09-10: typecheck 0 errors, lint 0 errors
(warnings only — `<img>` and one exhaustive-deps), 50/50 tests pass, and
`npm run build` exits 0. If you see anything different, **your environment is
broken, not the code** — work through all four traps below before you conclude
otherwise.

```bash
npm run typecheck
npm run lint
npm test          # node:test + tsx, hermetic: no server, no DB, no network
npm run build
```

### Environment trap #1 — `NODE_ENV` cuts both ways. Read this carefully.

`NODE_ENV` is set to `production` machine-wide on this Windows box. It has to be
overridden for **install** and left alone for **build**. Getting this backwards
produces two completely different sets of phantom failures.

**For `npm install` — override it.** Otherwise npm skips every devDependency,
and typecheck, lint, and tests then fail in confusing, misleading ways:

```powershell
$env:NODE_ENV = "development"
npm install --include=dev --ignore-scripts
```

**For `npm run build` — do NOT override it.** `next build` under
`NODE_ENV=development` loads the dev React runtime and then fails export on
**every single page**:

```
> Export encountered errors on following paths:
	/_error: /404
	/dashboard/brief/page: /dashboard/brief
	... 21 more
Error: <Html> should not be imported outside of pages/_document.
```

None of that is real. Run the build in a shell where `NODE_ENV` is untouched
(or explicitly `production`) and it exits 0. I hit this while writing this brief
and briefly believed the app was broken. Verify `$env:NODE_ENV` before you
conclude anything from a build.

### Environment trap #2 — build-log noise that is not failure

A **passing** build still prints these. They do not affect the exit code:

- `Dynamic server usage: Route /api/... couldn't be rendered statically because
  it used 'cookies'` — roughly 13 routes. Worth investigating (§6.2), but it is
  a warning, not a build failure.
- `<Html> should not be imported outside of pages/_document` — only appears
  under the `NODE_ENV` mistake above. In a correct build it does not appear.

Confirm `npm run build` exits 0 before reporting any build finding.

### Environment trap #3 — PowerShell adds a BOM

Do not write `package.json` with `Set-Content -Encoding UTF8`. It prepends a
BOM, and `tsx` then fails with `Error parsing: package.json` on every single
`.ts` test. If you must write it from PowerShell:

```powershell
[System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding $false))
```

### Environment trap #4 — PowerShell's .NET methods ignore the shell's cwd

`[System.IO.File]::ReadAllText("app\foo.ts")` resolves against
`C:\Windows\system32\`, not the repo. Always pass absolute paths.

---

## 8. Output format

One severity-ranked list. For each finding:

```
[SEVERITY] Short title
  Evidence:  path/to/file.ts:42
  Scenario:  <the specific input or state that produces the specific wrong result>
  Blast:     <who is affected, and how they'd notice>
  Fix:       <one sentence — the approach, not the diff>
```

Then two short appendices:

- **Suspicions, unproven** — things that smell wrong but where you could not
  construct a failure scenario.
- **Reachability map** — the §6.1 dead-surface inventory.

**Severity anchors, so we agree on the scale:**

- **CRITICAL** — data loss, auth bypass, or briefs stop generating for everyone.
- **HIGH** — a tester hits it and the product is visibly broken or exploitable.
- **MEDIUM** — wrong behavior on a real path, with a workaround.
- **LOW** — maintenance risk, dead code, or a correctness issue no user reaches.

Do not open with a summary of how much you read. Lead with the worst finding.
