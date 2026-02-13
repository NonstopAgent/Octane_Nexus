/**
 * Post versioning: READY posts are immutable.
 * Regenerate / Generate Assets on a READY post creates a new version row (FILMING).
 */

import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { POST_STATUS } from '@/lib/status';

export type PostWithVersion = {
  id: string;
  user_id: string;
  parent_post_id?: string | null;
  version?: number;
  is_current?: boolean;
  [key: string]: unknown;
};

/**
 * Root post id for version chain: if post has parent_post_id, root is that; else root is post.id.
 */
export function getRootPostId(post: PostWithVersion): string {
  if (post.parent_post_id) return post.parent_post_id;
  return post.id;
}

/**
 * Create a new version row from an existing post (for Regenerate from READY).
 * - Loads post (must belong to userId).
 * - Root = post.parent_post_id ?? post.id. Next version = max(version) for root chain + 1.
 * - Inserts new row: copy title, script_content, background_video_url, background_reason, caption, hashtags, platform.
 * - Resets: status=FILMING, final_video_url=null, overlay_image_url=null, scheduled_date=null, audio_url=null.
 * - Sets: parent_post_id=root, version=nextVersion, is_current=true, created_from_action.
 * - Marks all other versions for that root is_current=false.
 */
export async function createNewVersionFromPost(args: {
  postId: string;
  userId: string;
  createdFromAction: string;
}): Promise<{ newPostId: string } | { error: string }> {
  const supabase = await createServerSupabaseClient();
  const { postId, userId, createdFromAction } = args;

  const { data: post, error: fetchErr } = await supabase
    .from('content_posts')
    .select('*')
    .eq('id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchErr) {
    return { error: fetchErr.message };
  }
  if (!post) {
    return { error: 'Post not found or you do not own it.' };
  }

  const rootId = getRootPostId(post as PostWithVersion);

  const { data: versions } = await supabase
    .from('content_posts')
    .select('version')
    .or(`id.eq.${rootId},parent_post_id.eq.${rootId}`);

  const nextVersion =
    (versions?.length
      ? Math.max(...versions.map((v) => Number(v.version) || 1))
      : 0) + 1;

  const copy: Record<string, unknown> = {
    user_id: userId,
    title: post.title ?? '',
    script_content: post.script_content ?? null,
    background_video_url: post.background_video_url ?? null,
    background_reason: post.background_reason ?? null,
    caption: post.caption ?? null,
    hashtags: post.hashtags ?? null,
    platform: post.platform ?? null,
    status: POST_STATUS.FILMING,
    final_video_url: null,
    overlay_image_url: null,
    scheduled_date: null,
    audio_url: null,
    parent_post_id: rootId,
    version: nextVersion,
    is_current: true,
    created_from_action: createdFromAction,
    updated_at: new Date().toISOString(),
  };

  const { data: inserted, error: insertErr } = await supabase
    .from('content_posts')
    .insert(copy)
    .select('id')
    .single();

  if (insertErr) {
    return { error: insertErr.message };
  }
  if (!inserted?.id) {
    return { error: 'Failed to create new version.' };
  }

  await supabase
    .from('content_posts')
    .update({ is_current: false, updated_at: new Date().toISOString() })
    .or(`id.eq.${rootId},parent_post_id.eq.${rootId}`)
    .neq('id', inserted.id);

  return { newPostId: inserted.id };
}
