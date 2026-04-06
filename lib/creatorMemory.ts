/**
 * Creator Memory Layer
 * ====================
 * The persistent context that makes Nexus Chat actually personal.
 * Every script, hook, idea, and piece of feedback the user creates
 * or imports lives in `creator_artifacts`. The more it accumulates,
 * the smarter the AI gets about THIS specific creator.
 *
 * Key functions:
 *  - storeArtifact()       Save anything to memory
 *  - getRecentArtifacts()  Pull recent items for context
 *  - getMemoryContext()    Build a formatted string of the user's
 *                          memory ready to inject into AI prompts
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type ArtifactType =
  | 'script'
  | 'hook'
  | 'caption'
  | 'idea'
  | 'post'
  | 'note'
  | 'feedback'
  | 'voice_sample';

export type ArtifactSource =
  | 'user_input'
  | 'ai_generated'
  | 'imported_youtube'
  | 'imported_tiktok'
  | 'imported_instagram'
  | 'chat_save'
  | 'production_board';

export type CreatorArtifact = {
  id: string;
  user_id: string;
  artifact_type: ArtifactType;
  title: string | null;
  content: string;
  platform: string | null;
  topic: string | null;
  performance: Record<string, unknown>;
  source: ArtifactSource;
  user_rating: number | null;
  starred: boolean;
  related_post_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CreateArtifactInput = {
  artifact_type: ArtifactType;
  content: string;
  title?: string;
  platform?: string;
  topic?: string;
  performance?: Record<string, unknown>;
  source?: ArtifactSource;
  user_rating?: number;
  starred?: boolean;
  related_post_id?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Store a new artifact in the user's memory.
 * Returns the inserted artifact, or null on failure.
 */
export async function storeArtifact(
  db: SupabaseClient,
  userId: string,
  input: CreateArtifactInput
): Promise<CreatorArtifact | null> {
  const row = {
    user_id: userId,
    artifact_type: input.artifact_type,
    content: input.content,
    title: input.title ?? null,
    platform: input.platform ?? null,
    topic: input.topic ?? null,
    performance: input.performance ?? {},
    source: input.source ?? 'user_input',
    user_rating: input.user_rating ?? null,
    starred: input.starred ?? false,
    related_post_id: input.related_post_id ?? null,
    metadata: input.metadata ?? {},
  };

  const { data, error } = await db
    .from('creator_artifacts')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('storeArtifact error:', error.message);
    return null;
  }
  return data as CreatorArtifact;
}

/**
 * Get the user's most recent artifacts (any type).
 */
export async function getRecentArtifacts(
  db: SupabaseClient,
  userId: string,
  limit = 20
): Promise<CreatorArtifact[]> {
  const { data, error } = await db
    .from('creator_artifacts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getRecentArtifacts error:', error.message);
    return [];
  }
  return (data ?? []) as CreatorArtifact[];
}

/**
 * Get artifacts of a specific type for a user.
 */
export async function getArtifactsByType(
  db: SupabaseClient,
  userId: string,
  type: ArtifactType,
  limit = 20
): Promise<CreatorArtifact[]> {
  const { data, error } = await db
    .from('creator_artifacts')
    .select('*')
    .eq('user_id', userId)
    .eq('artifact_type', type)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getArtifactsByType error:', error.message);
    return [];
  }
  return (data ?? []) as CreatorArtifact[];
}

/**
 * Get the user's starred (best-of) artifacts.
 * These are the items the user explicitly marked as good.
 */
export async function getStarredArtifacts(
  db: SupabaseClient,
  userId: string,
  limit = 10
): Promise<CreatorArtifact[]> {
  const { data, error } = await db
    .from('creator_artifacts')
    .select('*')
    .eq('user_id', userId)
    .eq('starred', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getStarredArtifacts error:', error.message);
    return [];
  }
  return (data ?? []) as CreatorArtifact[];
}

/**
 * Get the user's top-performing artifacts based on view count
 * stored in performance.views. Useful for "what's working for you"
 * style prompts.
 */
export async function getTopPerformingArtifacts(
  db: SupabaseClient,
  userId: string,
  limit = 5
): Promise<CreatorArtifact[]> {
  const { data, error } = await db
    .from('creator_artifacts')
    .select('*')
    .eq('user_id', userId)
    .not('performance->views', 'is', null)
    .order('performance->views', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getTopPerformingArtifacts error:', error.message);
    return [];
  }
  return (data ?? []) as CreatorArtifact[];
}

/**
 * Update the user_rating on an artifact (-1 / 0 / 1).
 */
export async function rateArtifact(
  db: SupabaseClient,
  userId: string,
  artifactId: string,
  rating: -1 | 0 | 1
): Promise<boolean> {
  const { error } = await db
    .from('creator_artifacts')
    .update({ user_rating: rating })
    .eq('id', artifactId)
    .eq('user_id', userId);
  if (error) {
    console.error('rateArtifact error:', error.message);
    return false;
  }
  return true;
}

/**
 * Toggle the starred flag on an artifact.
 */
export async function toggleStar(
  db: SupabaseClient,
  userId: string,
  artifactId: string,
  starred: boolean
): Promise<boolean> {
  const { error } = await db
    .from('creator_artifacts')
    .update({ starred })
    .eq('id', artifactId)
    .eq('user_id', userId);
  if (error) {
    console.error('toggleStar error:', error.message);
    return false;
  }
  return true;
}

/**
 * Build a compact memory context block for injection into AI prompts.
 *
 * This is THE function that makes Nexus Chat feel personal. It pulls
 * the user's starred artifacts, recent scripts/hooks, and top-performing
 * content, then formats it as a structured text block that goes into
 * the system prompt.
 *
 * The Gemini system prompt tells the model: "this is what you know
 * about THIS specific creator." From there, every reply can reference
 * their actual work.
 */
export async function getMemoryContext(
  db: SupabaseClient,
  userId: string
): Promise<string> {
  const [starred, recentScripts, recentHooks, topPerforming] = await Promise.all([
    getStarredArtifacts(db, userId, 5),
    getArtifactsByType(db, userId, 'script', 5),
    getArtifactsByType(db, userId, 'hook', 8),
    getTopPerformingArtifacts(db, userId, 3),
  ]);

  // If the user has nothing in memory yet, return an empty string
  // so the AI doesn't get a confusing "their memory is empty" preamble.
  const totalCount = starred.length + recentScripts.length + recentHooks.length + topPerforming.length;
  if (totalCount === 0) return '';

  const sections: string[] = [];
  sections.push('=== CREATOR MEMORY ===');
  sections.push("Below is what you know about this specific creator. Reference their actual work when giving advice. Don't repeat ideas they've already used unless they explicitly ask for variations.");

  if (topPerforming.length > 0) {
    sections.push('\n## Their Top-Performing Content');
    for (const a of topPerforming) {
      const views = (a.performance as { views?: number })?.views;
      const viewsLabel = views ? ` — ${formatViews(views)} views` : '';
      sections.push(`- [${a.artifact_type}${viewsLabel}] ${a.title || truncate(a.content, 80)}`);
    }
  }

  if (starred.length > 0) {
    sections.push('\n## Their Best Saved Work (starred)');
    for (const a of starred) {
      sections.push(`- [${a.artifact_type}] ${a.title || truncate(a.content, 100)}`);
    }
  }

  if (recentScripts.length > 0) {
    sections.push('\n## Recent Scripts They Wrote');
    for (const a of recentScripts) {
      sections.push(`- ${truncate(a.content, 200)}`);
    }
  }

  if (recentHooks.length > 0) {
    sections.push('\n## Recent Hooks They Tried');
    for (const a of recentHooks) {
      sections.push(`- "${truncate(a.content, 120)}"`);
    }
  }

  sections.push('\n=== END CREATOR MEMORY ===\n');
  return sections.join('\n');
}

// ============================================================
// Helpers
// ============================================================

function truncate(text: string, maxLen: number): string {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1).trimEnd() + '…';
}

function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`;
  return String(views);
}
