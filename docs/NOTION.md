# Notion as single source of truth (SSOT)

We use **Notion** (not Slack) as the SSOT for backlog, bugs, decisions, and test runs. This doc matches the database schema we use.

## Backlog database schema

**Properties:**

| Property   | Purpose                          |
|-----------|-----------------------------------|
| Name      | Short name of the work item       |
| Status    | Todo / In Progress / Blocked / Done |
| Priority  | P0 / P1 / P2 (or your scale)     |
| Area      | Area of the product (e.g. Post Lab, Clip Studio) |
| Tags      | Optional tags for filtering      |
| PR Link   | URL to GitHub PR when opened     |
| Notes     | Acceptance criteria, context     |

**Views:**

- **All Items** — full list
- **By Status** — grouped by Status
- **By Priority** — grouped by Priority
- **Active Work** — filter: **Status** is **In Progress** or **Blocked**

Use for: what we're building, in what order, and how it ties to code (PR Link).

## Optional: Bugs / Decisions / Test runs

You can add separate databases for Bugs (Steps, Expected/Actual, Severity, Status), Decisions (Date, Decision, Context, Consequences), and Test Runs (Date, Build SHA, Result, Notes). The **backlog** above is the one every PR must link to.

## When the Notion app is installed in Cursor

- **Pulling context into prompts:** Open the relevant Notion page and reference it: “Use the acceptance criteria from [Notion link].”
- **DoD / QA:** Keep [docs/QA.md](QA.md) in the repo; you can link it from Notion for visibility.
- **PRD:** [docs/PRD.md](PRD.md) is the MVP spec; keep Notion rows in sync when scope changes.

## Optional automation (BYOK)

If you enable the Notion sync workflow (see repo `.github/workflows/notion-sync.yml` and `scripts/notion-sync-pr.ts`), set these **secrets** in GitHub (never commit them):

- **NOTION_TOKEN** — Notion integration token (create in Notion → Settings → Connections)
- **NOTION_DATABASE_ID** — ID of the backlog database (from the database URL: `notion.so/...?v=...` or from the page URL when opened as full page)

The sync updates **PR Link** and **Status** from PR events (opened → In Progress, merged → Done, closed unmerged → Blocked). If secrets are missing or the PR is from a fork, the workflow skips cleanly and does not fail CI.
