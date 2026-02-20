## Notion (required)

**Notion Task URL:** <!-- Paste the link to the Notion backlog row for this work -->

**Area / Priority / Status** (must match SSOT): <!-- e.g. Area: Post Lab, Priority: P1, Status: In Progress -->

Every PR must include a Notion Task URL and update the Notion row status when the PR is opened/merged/closed. See [docs/NOTION.md](../docs/NOTION.md).

---

## Branch naming

Branch: **`lin-<issue-id>-<short-slug>`** (e.g. `lin-123-add-sentry`). See [CONTRIBUTING.md](../CONTRIBUTING.md).

---

## PR checklist

- [ ] **Build:** `npm run build` exits 0
- [ ] **Lint:** `npm run lint` passes (if the project has a lint script)
- [ ] **Demo seed/reset works** in demo mode (Settings → Demo Data → Seed / Reset)
- [ ] **10-minute click test** complete — [README: key flows](../README.md#contributing) (Trends → Production → Post Lab → Clip Studio → Schedule → Monitoring)
- [ ] **No hardcoded handles** — display only from `profiles.linked_accounts` via `getDisplayHandle`; otherwise “Not connected”
- [ ] **No merge conflict markers** left in code (`<<<<<<<`, `=======`, `>>>>>>>`)
- [ ] **Migrations:** If schema changed, migration added under `supabase/migrations/` and applied
- [ ] **Sentry test:** If `SENTRY_DSN` is set, verified via `/api/sentry-test?token=<SENTRY_TEST_TOKEN>` (dev only)

---

## Risk / impact

<!-- Briefly describe risk area and impact (e.g. auth, payments, demo data). -->

---

## Screenshots (optional)

<!-- Add screenshots for UI changes if helpful. -->
