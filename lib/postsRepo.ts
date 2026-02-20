/**
 * Unified posts repository. Works with Supabase in real mode, localStorage in demo/fallback.
 * Used by API routes and can be imported by server actions.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PostStatus } from '@/lib/postStatus';
import { POST_STATUS } from '@/lib/postStatus';

export type ContentPost = {
  id: string;
  user_id: string;
  title: string;
  status: PostStatus | string;
  script_content?: Record<string, unknown> | null;
  caption?: string | null;
  hashtags?: string[] | null;
  final_video_url?: string | null;
  background_video_url?: string | null;
  style_token_id?: string | null;
  source_url?: string | null;
  rights_attested?: boolean;
  scheduled_date?: string | null;
  posted_url?: string | null;
  posted_at?: string | null;
  platform?: string | null;
  trim_start_ms?: number | null;
  trim_end_ms?: number | null;
  created_at: string;
  updated_at: string;
};

export type CreatePostInput = {
  title?: string;
  status?: string;
  script_content?: Record<string, unknown> | null;
  caption?: string | null;
  hashtags?: string[] | null;
  final_video_url?: string | null;
  background_video_url?: string | null;
  style_token_id?: string | null;
  source_url?: string | null;
  rights_attested?: boolean;
  scheduled_date?: string | null;
  platform?: string | null;
};

export type UpdatePostInput = Partial<Omit<ContentPost, 'id' | 'user_id' | 'created_at'>>;

export async function listPosts(
  db: SupabaseClient,
  userId: string,
  opts?: { status?: string }
): Promise<ContentPost[]> {
  let query = db.from('content_posts').select('*').eq('user_id', userId);
  if (opts?.status) query = query.eq('status', opts.status);
  const { data, error } = await query.order('updated_at', { ascending: false });
  if (error) {
    console.error('listPosts error:', error.message);
    return [];
  }
  return (data ?? []) as ContentPost[];
}

export async function getPost(
  db: SupabaseClient,
  userId: string,
  postId: string
): Promise<ContentPost | null> {
  const { data, error } = await db
    .from('content_posts')
    .select('*')
    .eq('id', postId)
    .eq('user_id', userId)
    .single();
  if (error || !data) return null;
  return data as ContentPost;
}

export async function createPost(
  db: SupabaseClient,
  userId: string,
  input: CreatePostInput
): Promise<ContentPost | null> {
  const row = {
    user_id: userId,
    title: input.title || 'Untitled idea',
    status: input.status || POST_STATUS.IDEA,
    script_content: input.script_content ?? null,
    caption: input.caption ?? null,
    hashtags: input.hashtags ?? null,
    final_video_url: input.final_video_url ?? null,
    background_video_url: input.background_video_url ?? null,
    style_token_id: input.style_token_id ?? null,
    source_url: input.source_url ?? null,
    rights_attested: input.rights_attested ?? false,
    scheduled_date: input.scheduled_date ?? null,
    platform: input.platform ?? null,
  };
  const { data, error } = await db.from('content_posts').insert(row).select().single();
  if (error) {
    console.error('createPost error:', error.message);
    return null;
  }
  return data as ContentPost;
}

export async function updatePost(
  db: SupabaseClient,
  userId: string,
  postId: string,
  patch: UpdatePostInput
): Promise<ContentPost | null> {
  const updates = { ...patch, updated_at: new Date().toISOString() };
  const { data, error } = await db
    .from('content_posts')
    .update(updates)
    .eq('id', postId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) {
    console.error('updatePost error:', error.message);
    return null;
  }
  return data as ContentPost;
}

export async function moveStatus(
  db: SupabaseClient,
  userId: string,
  postId: string,
  newStatus: PostStatus | string
): Promise<ContentPost | null> {
  return updatePost(db, userId, postId, { status: newStatus });
}
