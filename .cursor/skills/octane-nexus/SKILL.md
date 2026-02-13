---
name: octane-nexus
description: Domain knowledge for Octane Nexus identity and dashboard flows. Use when building, extending, or debugging the Identity (Authority Architect) or Dashboard sections, or when working with profiles, blueprints, or creator workflows.
---

# Octane Nexus – Identity & Dashboard

## Identity (Authority Architect) – `app/identity/page.tsx`

### Purpose
Multi-step wizard to shape a creator's online identity: platform choice, brand vision, handles, bios, and brand assets. **Gated by `has_purchased_package`** (Identity Sniper or Authority Vault).

### Platform Flows
Step sequence varies by primary platform (`PLATFORM_FLOWS`):

| Platform | Steps |
|----------|-------|
| Instagram | Platform → Purpose → Setup Guide → Handle Sniper → Bio Architect → Brand Identity |
| TikTok | Same as Instagram |
| X | Platform → Purpose → Setup Guide → Handle Sniper → Pro Bio → Header Image → Brand Identity |
| YouTube | Platform → Purpose → Setup Guide → Handle Sniper → Channel Description → Channel Banner → Brand Identity |

### Key State & Persistence
- **Shared state**: `primaryPlatform`, `vision`, `niche`, `vibe`, `selectedHandle`, `selectedBioType`, `hasAccount`
- **Profile updates**: `updateProfileProgress(partial)` upserts to `profiles` (brand_vision, niche, vibe, linked_accounts)
- **Access check**: `profiles.has_purchased_package` must be true; otherwise shows package purchase UI (Identity Sniper $149, Authority Vault $299)

### Step Behaviors
1. **Platform**: User selects platform → `handlePlatformSelect()` → updates `steps` and advances to Purpose
2. **Purpose**: User enters brand vision → saved via `updateProfileProgress({ brand_vision })`
3. **Setup Guide**: Platform-specific setup instructions. "I already have an account" skips to Handle Sniper
4. **Handle Sniper**: AI-suggested handles (`generateVisionHandles`), manual check (`simulateHandleAvailability`). Results saved to `profiles.linked_accounts`
5. **Bio Architect** / **Pro Bio**: `generateVisionBios` → authority/relatability/mystery; `SmartDescriptionGenerator` for YouTube/X long descriptions
6. **Channel Banner** / **Header Image**: `BannerGenerator` → `generateBannerConcepts` + `generateBrandAsset(prompt, 'banner')`
7. **Brand Identity**: `BrandLogoGenerator` → `generateLogoConcepts` + `generateBrandAsset(prompt, 'logo')` → saves `profile_image_url` and redirects to `/dashboard/library`

### Lib Dependencies
- `@/lib/gemini`: `generateVisionBios`, `generateVisionHandles`, `generateDescriptionOptions`, `generateLogoConcepts`, `generateBannerConcepts`
- `@/lib/image-gen`: `generateBrandAsset(prompt, type)` – type is `'logo'` or `'banner'`
- `@/lib/supabaseClient`: auth, profiles table

---

## Dashboard – `app/dashboard/`

### Layout – `app/dashboard/layout.tsx`
- Sidebar nav: Identity, Library, Nexus Chat, Post Lab, Schedule, Monitoring, Settings
- Header shows `brand_vision` snippet from `profiles` or `localStorage.brand_vision`
- "AI Accuracy: Level N" from `getCalibrationLevel()` (mock)
- Active route: `/dashboard` or `/dashboard/library` → Library active

### Main Dashboard – `app/dashboard/page.tsx`
Core hub: streaks, linked accounts, founder license, saved blueprints.

**Data loaded on mount:**
- `profiles`: streak_count, last_post_date, linked_accounts, founder_license, full_name
- Streak reset: if `last_post_date` > 48h ago, streak → 0
- `saved_blueprints`: user's saved scripts
- `user_content_history`: for "Voice-Matched" badge and Librarian Strategy Note
- `blueprint_performance`: viral/success → Community Wins ticker and insights

**Key Sections:**
1. **Community Wins**: Recent viral blueprints from `blueprint_performance` + `saved_blueprints` + `profiles.niche`
2. **Linked Accounts**: Instagram, TikTok, X – edit via modal, saved to `profiles.linked_accounts`
3. **Founder License**: $49 upgrade or alpha code (`OCTANE100`). Sets `profiles.founder_license = true`
4. **Streak**: "I Posted Today!" increments `streak_count`, sets `last_post_date`
5. **Saved Blueprints**: Cards open modal with hook, meat, cta, setup_tip. Platform-specific blueprints show TikTok/Instagram/X tabs.
6. **Connect Existing**: Modal to manually enter handles → same as Identity `linked_accounts`

**Blueprint types:**
- `VideoBlueprint`: `hook`, `meat`, `cta`, `setup_tip`
- `PlatformSpecificBlueprints`: `{ tiktok, instagram, x }` each with `hook`, `meat`, `cta`, `setup_tip`

### Other Dashboard Pages
- **Library** (`/dashboard/library`): Brainstorm ideas, scripts, top creators, tools. Uses `generateVideoConcepts`, `generateScript`, `generateTopCreators`, `generateToolRecommendations`
- **Nexus Chat** (`/dashboard/chat`): Chat UI (component: NexusChat)
- **Post Lab** (`/dashboard/post-lab`): Post optimization (component: PostOptimizer, IdeaLab, etc.)
- **Schedule**, **Monitoring**, **Settings**: Placeholder or minimal pages

---

## Building Out Octane Nexus (YOLO Mode)

When extending the project autonomously:

1. **Follow existing patterns**: Same card styles, button styles, amber/emerald accents, `rounded-2xl`/`rounded-3xl`
2. **Profile-first**: Store user data in `profiles` or dedicated tables; use `supabase.from('profiles').update().eq('id', user.id)`
3. **Access control**: Check `has_purchased_package`, `founder_license`, `purchased_package_type` before gated features
4. **AI calls**: Use `@/lib/gemini` functions; add new generators there if needed
5. **Images**: Use `generateBrandAsset` from `@/lib/image-gen` for logos/banners
6. **Navigation**: Add new routes to `navItems` in `app/dashboard/layout.tsx` if under dashboard
7. **Consistency**: Use `Loader2` for loading, `CheckCircle2` for success, `Zap` for AI actions
8. **Referral**: Homepage tracks `?ref=<userId>` in cookie; dashboard has referral link share for founders
