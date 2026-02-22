# Contributing

## Notion SSOT

Every PR must include a **Notion Task URL** (link to the backlog row for this work) and update the Notion row status when the PR is opened or merged. See [docs/NOTION.md](docs/NOTION.md) for the database schema (Name, Status, Priority, Area, Tags, PR Link, Notes).

## Branch naming

Use: **`lin-<issue-id>-<short-slug>`** (e.g. `lin-123-add-sentry`).

## PR checklist

Copy the following into your PR description and confirm each item:

- [ ] `npm run build` exits 0
- [ ] Demo seed works (Settings → Demo Data → Seed; then use "Go to Production")
- [ ] Key flows smoke-tested: Trends → Production → Post Lab → Clip Studio → Schedule → Monitoring (no dead ends)
- [ ] No secrets committed
- [ ] If schema changed: migration added under `supabase/migrations/` and applied
