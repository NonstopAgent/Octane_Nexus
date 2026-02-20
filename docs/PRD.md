# Octane Nexus MVP v1

## What it is

Creator Daily Loop MVP: discover ideas → production → post lab → clip studio → schedule → monitoring. A calm engine for social growth.

## Demo identity

**Tradeview AI** is the demo identity. Demo mode is enabled with `NEXT_PUBLIC_DEMO_MODE=true`. Users can “Try Demo” on login or seed demo data from **Settings → Demo Data**. The effective demo user is an internal ID (e.g. `demo_user_mvp_v1`); no fake connected social accounts are shown as connected.

## Success for MVP

- **End-to-end clickthrough without dead ends:** A user can go Trends → Send to Production → Production board → Post Lab → Clip Studio → Schedule → Monitoring and complete each step without hitting a blank or broken flow.
- **Demo seed works:** After seeding, “Go to Production” and the main dashboard routes load and show data.
- **Social account connections:** Real connections will be implemented later. For MVP, the UI must **display a handle only when that account is actually connected** (i.e. when `profiles.linked_accounts` has a value for that platform). Do not hardcode handles; use “Not connected” or equivalent when there is no linked account.

## Out of scope for v1

- Real OAuth / connected accounts (UI is ready; data comes from `linked_accounts` when available).
- No Slack-related work; Notion is the SSOT for backlog and decisions (see [NOTION.md](NOTION.md)).
