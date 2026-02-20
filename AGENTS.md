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
