# Notion as single source of truth (SSOT)

We use **Notion** (not Slack) as the SSOT for backlog, bugs, decisions, and test runs. This doc is guidance only; no Notion API integration is required in the repo.

## Proposed Notion structure

Keep it simple and practical:

### 1. Backlog database

| Property   | Purpose                          |
|-----------|-----------------------------------|
| Title     | Short name of the work item       |
| Type      | Feature / Chore / Fix / Doc       |
| Priority  | P0 / P1 / P2                     |
| Status    | Todo / In progress / Done        |
| Owner     | Who’s responsible                |
| Link to PR| URL to GitHub PR when opened     |

Use for: what we’re building, in what order, and how it ties to code (PR link).

### 2. Bugs database

| Property     | Purpose                    |
|-------------|----------------------------|
| Title       | One-line summary           |
| Steps       | How to reproduce           |
| Expected    | What should happen         |
| Actual      | What happens instead       |
| Severity    | Blocker / High / Medium / Low |
| Status      | Open / In progress / Fixed |

Use for: triage and reproduction without digging through chat.

### 3. Decisions log

| Property     | Purpose                    |
|-------------|----------------------------|
| Date        | When the decision was made |
| Decision    | One-line summary           |
| Context     | Why we decided this        |
| Consequences| What we accept or follow up |

Use for: “why we did it this way” without scrolling through history.

### 4. Test runs

| Property  | Purpose                |
|----------|-------------------------|
| Date     | When the run happened   |
| Build SHA| Git commit (or link)    |
| Result   | Pass / Fail             |
| Notes    | Branch, env, flakiness  |

Use for: quick view of recent CI/local run outcomes.

---

## When the Notion app is installed in Cursor

- **Pulling context into prompts:** Open the relevant Notion page (e.g. Backlog or a bug) and reference it in the chat: “Use the acceptance criteria from [Notion link]” or “Reproduce using the steps in [bug link].”
- **DoD / QA:** Keep the [Definition of Done and 10-min script](QA.md) in the repo (`docs/QA.md`) so Cursor and humans both use the same checklist; you can paste or link that doc in Notion for visibility.
- **PRD and decisions:** Keep `docs/PRD.md` and this Notion structure in sync by hand: when we lock a decision or scope change, update Notion and optionally a line in `docs/PRD.md` or `docs/NOTION.md`.

No API or automation is required; the Notion app in Cursor is for **manual** copy/link of context into prompts.
