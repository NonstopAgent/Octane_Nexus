# 🌙 NIGHT SHIFT: "GOD MODE" BUILD QUEUE
**INSTRUCTION:** You are the Lead Engineer. Execute these phases in order. DO NOT STOP.

## 🛑 Phase 1: The "Viral Brain" Upgrade (Social Intelligence)
**Context:** The user hates generic software suggestions (e.g., Notion). The AI must be a "Viral Coach."
- [ ] **Refactor `lib/social-intelligence.ts`:**
    - Rename `getRecommendedTools` to `getViralTactics`.
    - **HARD REQUIREMENT:** The AI prompt must explicitly FORBID software suggestions.
    - **NEW OUTPUT:** It must return "Filming Tactics" (e.g., "The Green Screen React", "The Loop", "The 3-Second Hook").
    - **DATA:** Add fields for `viral_potential` (High/Very High) and `difficulty` (Beginner/Expert).
- [ ] **UI Update:**
    - Create `components/dashboard/TacticsGrid.tsx`.
    - Render these tactics as "Playbooks" with a "Use This Format" button.

## 🛑 Phase 2: The "Competitor Spy" (New Trends Page)
**Context:** User wants to see what is working for *others* in their niche right now.
- [ ] **Create `app/dashboard/trends/page.tsx`:**
    - **Header:** "Niche Surveillance: [User Niche]".
    - **Content:** A grid of "Trending Videos" (Use realistic Mock Data for now).
    - **Fields:** Video Title, View Count (e.g., "1.2M"), and "Why it worked" (AI Analysis).
- [ ] **Navigation:** Add "Trends" to the Sidebar (`components/dashboard/Sidebar.tsx`).

## 🛑 Phase 3: The "Script Doctor" (Advanced Editor)
**Context:** The current script editor is just a text box. It needs to be a structured tool.
- [ ] **Update `components/dashboard/ScriptEditorModal.tsx`:**
    - **Split the UI:** Create 3 distinct tabs/inputs:
        1.  **The Hook (0-3s):** The visual/audio grabber.
        2.  **The Meat (Body):** The actual value/tip.
        3.  **The CTA (Exit):** The sales pitch.
    - **State Management:** Ensure `script_content` saves as a JSON object with these 3 keys.
    - **"AI Rewrite" Button:** Add a button next to "Hook" that (visually) triggers a rewrite.

## 🛑 Phase 4: Gamification (The "Addiction" Layer)
**Context:** The app feels "dead." We need to reward the user for using it.
- [ ] **Update `components/dashboard/CommandCenter.tsx`:**
    - Add a **"Creator Level"** progress bar (e.g., "Level 3: Rookie Creator").
    - Add **"XP"** logic: Visual indicator that shows "+50 XP" when a task is done.
    - Add a **"Streak"** counter (flame icon) that checks the last post date.

## 🛑 Phase 5: The "Smart" Identity & Navigation
**Context:** User feels trapped in pages and hates re-entering data.
- [ ] **Fix Library:** Remove `<CommandCenter />` from `app/dashboard/library/page.tsx`. Replace with the new `<TacticsGrid />` from Phase 1.
- [ ] **Fix Identity:** Add a "← Back to Dashboard" button. Pre-fill existing niche/logo data if user is logged in (don't treat them like a stranger).

## 🛑 Phase 6: Self-Correction & Verification
- [ ] Run `npm run build`.
- [ ] If build fails, READ THE LOGS, fix the specific error, and retry.
- [ ] Run `npx playwright test` (if available) to ensure navigation works.
