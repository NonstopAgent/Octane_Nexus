/**
 * Brief Memory Layer
 * ==================
 * Manages the persistent memory that makes the daily brief smarter over time.
 *
 * This module handles two things:
 *
 * 1. READING memory: Before generating a brief, pull the creator's profile
 *    (what hook types they respond to, what formats they ignore, what ideas
 *    we've already suggested) and inject it into the prompt so the AI doesn't
 *    repeat itself or suggest formats the creator never films.
 *
 * 2. WRITING memory: After a brief is generated, log the suggested idea to
 *    brief_suggestions so the feedback loop can check later whether the
 *    creator filmed it.
 *
 * The feedback loop (briefFeedback.ts) updates creator_brief_profile
 * asynchronously — this module only reads from it.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type CreatorBriefProfile = {
  winning_hook_types: string[];
  winning_formats: string[];
  ignored_hook_types: string[];
  ignored_formats: string[];
  used_idea_titles: string[];
  ai_memory_summary: string;
  total_suggestions: number;
  total_filmed: number;
  accuracy_score: number;
};

/**
 * Fetch the creator's brief profile from the database.
 * Returns null if no profile exists yet (first-time user).
 */
export async function getCreatorBriefProfile(
  admin: SupabaseClient,
  userId: string
): Promise<CreatorBriefProfile | null> {
  const { data, error } = await admin
    .from('creator_brief_profile')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('briefMemory.getCreatorBriefProfile: db error', error.message);
    return null;
  }

  return data as CreatorBriefProfile | null;
}

/**
 * Build the memory context block that gets injected into the brief prompt.
 *
 * This is the key function that makes the AI feel like it "knows" the creator.
 * Instead of starting from zero every day, the AI sees:
 *   - What hook types this creator has responded to before
 *   - What formats they never film (so we stop suggesting them)
 *   - What ideas we've already suggested (so we don't repeat)
 *   - A plain-English summary of their patterns
 */
export function buildBriefMemoryBlock(profile: CreatorBriefProfile | null): string {
  if (!profile || profile.total_suggestions === 0) {
    return ''; // No history yet — first brief, no memory to inject
  }

  const lines: string[] = ['=== CREATOR BRIEF MEMORY (from past briefs) ==='];

  if (profile.ai_memory_summary) {
    lines.push(`Summary: ${profile.ai_memory_summary}`);
  }

  if (profile.winning_hook_types.length > 0) {
    lines.push(`Hook types that work for them: ${profile.winning_hook_types.join(', ')}`);
  }

  if (profile.winning_formats.length > 0) {
    lines.push(`Video formats they actually film: ${profile.winning_formats.join(', ')}`);
  }

  if (profile.ignored_hook_types.length > 0) {
    lines.push(`Hook types they IGNORE (do NOT suggest): ${profile.ignored_hook_types.join(', ')}`);
  }

  if (profile.ignored_formats.length > 0) {
    lines.push(`Formats they NEVER film (do NOT suggest): ${profile.ignored_formats.join(', ')}`);
  }

  if (profile.used_idea_titles.length > 0) {
    const recent = profile.used_idea_titles.slice(-5); // last 5 ideas
    lines.push(`Recent ideas already suggested (do NOT repeat): ${recent.map((t) => `"${t}"`).join(', ')}`);
  }

  if (profile.total_suggestions > 0) {
    const pct = Math.round(profile.accuracy_score * 100);
    lines.push(`AI accuracy so far: ${pct}% of suggestions were filmed (${profile.total_filmed}/${profile.total_suggestions})`);
  }

  lines.push('=== END CREATOR BRIEF MEMORY ===');

  return lines.join('\n');
}

/**
 * Log a suggested idea to brief_suggestions immediately after a brief is generated.
 * The feedback loop will later check if the creator filmed it.
 *
 * @param admin - Supabase service role client
 * @param userId - The creator's user ID
 * @param briefId - The ID of the daily_briefs row
 * @param briefDate - YYYY-MM-DD
 * @param idea - The todays_idea from the generated brief
 * @param sourceInfo - Optional info about the outlier that inspired the idea
 */
export async function logBriefSuggestion(
  admin: SupabaseClient,
  userId: string,
  briefId: string,
  briefDate: string,
  idea: {
    title: string;
    hook: string;
    format: string;
  },
  sourceInfo?: {
    hookType?: string;
    sourceChannel?: string;
    sourceVideoId?: string;
  }
): Promise<void> {
  const { error } = await admin.from('brief_suggestions').insert({
    user_id: userId,
    brief_id: briefId,
    brief_date: briefDate,
    suggested_title: idea.title,
    suggested_hook: idea.hook,
    suggested_format: idea.format,
    hook_type: sourceInfo?.hookType ?? null,
    source_channel: sourceInfo?.sourceChannel ?? null,
    source_video_id: sourceInfo?.sourceVideoId ?? null,
  });

  if (error) {
    console.warn('briefMemory.logBriefSuggestion: failed to log suggestion', error.message);
  }
}

/**
 * Ensure a creator_brief_profile row exists for this user.
 * Called once when a user first generates a brief.
 * Safe to call multiple times (uses upsert with no-op on conflict).
 */
export async function ensureBriefProfile(
  admin: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await admin
    .from('creator_brief_profile')
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });

  if (error) {
    console.warn('briefMemory.ensureBriefProfile: upsert failed', error.message);
  }
}
