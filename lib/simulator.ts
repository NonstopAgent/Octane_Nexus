/**
 * Synthetic User / Ghost Employee simulator.
 * Simulates a "Ghost Employee" working on the Production Board.
 */

import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { pickBackgroundForPost } from '@/lib/video-engine';
import { uploadVideoFromUrl, uploadVideoBuffer } from '@/lib/storage/upload-video';
import { uploadImageBuffer } from '@/lib/storage/upload-image';
import { renderQuoteCardImage } from '@/lib/render/quote-card';
import { POST_STATUS } from '@/lib/status';
import { burnOverlayIntoVideo, isFfmpegRenderEnabled } from '@/lib/render/burn-overlay';

// Fitness Dad topics for createIdea()
const FITNESS_DAD_TOPICS = [
  'Dad Bod Myth #4',
  '5-Minute Dad Workout',
  'Why Dads Skip the Gym (And How to Fix It)',
  'The One Exercise Every Busy Dad Needs',
  'Dad Strength vs Gym Bro Strength',
  'How I Stay Fit With 3 Kids',
  'The 10-Minute Dad Routine',
  'Dad Bod Is a Choice (Here\'s Why)',
  'Fitness Over 40: What Actually Works',
  'Dad Life Hacks for Staying in Shape',
];

type ScriptContent = {
  hook: string;
  meat: string[];
  cta: string;
  name?: string;
  setup_tip?: string;
};

/** Generate mock 3-part script for an idea (no API call). */
function generateMockScript(title: string): ScriptContent {
  return {
    name: 'The Hook-Master',
    hook: `Stop scrolling. This one change will fix your ${title.toLowerCase()}.`,
    meat: [
      'Point 1: The real problem most dads face',
      'Point 2: What the experts never tell you',
      'Point 3: The 3-step system that actually works',
      'Point 4: How to start today',
    ],
    cta: 'Save this. Share it with a dad who needs it. Let\'s go.',
    setup_tip: 'Face the window for soft light. Keep energy high.',
  };
}

/**
 * Create a new "Fitness Dad" idea and insert into content_posts with status 'idea'.
 */
export async function createIdea(userId: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient();

  const topic =
    FITNESS_DAD_TOPICS[Math.floor(Math.random() * FITNESS_DAD_TOPICS.length)];

  const { data, error } = await supabase
    .from('content_posts')
    .insert({
      user_id: userId,
      title: topic,
      status: POST_STATUS.IDEA,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Simulator createIdea error:', error);
    return null;
  }
  return data?.id ?? null;
}

/**
 * Take an 'idea' post, generate a 3-part script, and move status to 'scripting'.
 */
export async function draftScript(
  postId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createServerSupabaseClient();

  const { data: post, error: fetchError } = await supabase
    .from('content_posts')
    .select('id, title')
    .eq('id', postId)
    .eq('user_id', userId)
    .eq('status', POST_STATUS.IDEA)
    .single();

  if (fetchError || !post) {
    console.error('Simulator draftScript: post not found or not idea', fetchError);
    return false;
  }

  const scriptContent = generateMockScript(post.title);

  const { error: updateError } = await supabase
    .from('content_posts')
    .update({
      script_content: scriptContent,
      status: POST_STATUS.SCRIPTING,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .eq('user_id', userId);

  if (updateError) {
    console.error('Simulator draftScript error:', updateError);
    return false;
  }
  return true;
}

/** Build deterministic caption from script. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- category can drive hashtags later
function buildCaption(script: ScriptContent | null, _category: string): string {
  const hook = script?.hook || 'This one change will transform your routine.';
  const cta = script?.cta || 'Save this and try it today.';
  return `${hook} ${cta} What's your biggest fitness challenge right now?`;
}

/** Build deterministic hashtags from category. */
function buildHashtags(category: string): string[] {
  const base = ['fitness', 'dadlife', 'health', 'motivation', 'workout', 'dadbod'];
  const byCategory: Record<string, string[]> = {
    strength: ['strength', 'gym', 'weights', 'gainz'],
    cardio: ['cardio', 'running', 'hiit', 'endurance'],
    diet: ['mealprep', 'nutrition', 'healthy', 'protein'],
    recovery: ['recovery', 'stretch', 'restday', 'yoga'],
    mindset: ['mindset', 'discipline', 'habits'],
    general: ['fitdad', 'fitnessdad'],
  };
  const extra = byCategory[category] || byCategory.general;
  return [...base, ...extra].slice(0, 10).map((t) => t.toLowerCase());
}

/**
 * Move status from 'scripting' -> 'filming'. Set background_video_url and background_reason.
 * Does NOT set final_video_url, caption, or hashtags (handled by finalizeVideo).
 */
export async function simulateFilming(
  postId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createServerSupabaseClient();

  const { data: post, error: fetchError } = await supabase
    .from('content_posts')
    .select('id, title, script_content')
    .eq('id', postId)
    .eq('user_id', userId)
    .eq('status', POST_STATUS.SCRIPTING)
    .single();

  if (fetchError || !post) {
    console.error('Simulator simulateFilming: post not found or not scripting', fetchError);
    return false;
  }

  const script = post.script_content as ScriptContent | null;
  const hook = script?.hook ?? '';
  const meat = script?.meat ?? [];
  const cta = script?.cta ?? '';

  const background = await pickBackgroundForPost({
    title: post.title,
    hook,
    meat,
    cta,
  });

  const { error: updateError } = await supabase
    .from('content_posts')
    .update({
      status: POST_STATUS.FILMING,
      background_video_url: background.background_video_url,
      background_reason: background.background_reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .eq('user_id', userId);

  if (updateError) {
    console.error('Simulator simulateFilming error:', updateError);
    return false;
  }
  return true;
}

/**
 * Move a filming post to ready. Finds oldest filming post for user.
 * Downloads background MP4, uploads to Supabase Storage, sets final_video_url.
 * Keeps background_video_url, background_reason, sets caption/hashtags.
 */
export async function finalizeVideo(userId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();

  const { data: post, error: fetchError } = await supabase
    .from('content_posts')
    .select('id, title, script_content, background_video_url, caption, hashtags')
    .eq('user_id', userId)
    .eq('status', POST_STATUS.FILMING)
    .order('updated_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchError || !post) {
    return false;
  }

  const script = post.script_content as ScriptContent | null;
  const hook = script?.hook ?? '';
  const meat = script?.meat ?? [];
  const cta = script?.cta ?? '';

  const backgroundUrl =
    post.background_video_url ||
    (
      await pickBackgroundForPost({
        title: post.title,
        hook,
        meat,
        cta,
      })
    ).background_video_url;

  const path = `renders/${userId}/${post.id}-${Date.now()}.mp4`;

  const doUpload = async () => {
    return uploadVideoFromUrl({ sourceUrl: backgroundUrl, path });
  };

  let uploadResult: Awaited<ReturnType<typeof uploadVideoFromUrl>>;
  try {
    uploadResult = await doUpload();
  } catch (err) {
    console.error(
      '[finalizeVideo] Upload failed, keeping status filming:',
      err instanceof Error ? err.message : err
    );
    try {
      uploadResult = await doUpload();
    } catch (retryErr) {
      console.error('[finalizeVideo] Retry also failed:', retryErr);
      return false;
    }
  }

  const { classifyTopic } = await import('@/lib/video-engine');
  const classified = classifyTopic({
    title: post.title,
    hook,
    meat,
    cta,
  });

  const caption =
    post.caption?.trim() || buildCaption(script, classified.category);
  const hashtags =
    Array.isArray(post.hashtags) && post.hashtags.length > 0
      ? post.hashtags
      : buildHashtags(classified.category);

  let overlayImageUrl: string | null = null;
  try {
    const { pngBuffer } = await renderQuoteCardImage({
      title: post.title,
      hook: hook || post.title,
      category: classified.category,
    });
    const overlayPath = `overlays/${userId}/${post.id}-${Date.now()}.png`;
    const uploaded = await uploadImageBuffer({
      buffer: pngBuffer,
      path: overlayPath,
      contentType: 'image/png',
    });
    overlayImageUrl = uploaded.publicUrl;
  } catch (overlayErr) {
    console.error('[finalizeVideo] Overlay generation failed (non-blocking):', overlayErr);
  }

  const basePayload = {
    status: POST_STATUS.READY,
    final_video_url: uploadResult.publicUrl,
    caption: caption || null,
    hashtags: hashtags.length ? hashtags : null,
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from('content_posts')
    .update({ ...basePayload, overlay_image_url: overlayImageUrl })
    .eq('id', post.id)
    .eq('user_id', userId);

  if (updateError) {
    const msg = updateError.message?.toLowerCase() ?? '';
    if (
      (msg.includes('overlay_image_url') || msg.includes('column')) &&
      (msg.includes('not found') || msg.includes('does not exist') || msg.includes('undefined'))
    ) {
      const { error: retryError } = await supabase
        .from('content_posts')
        .update(basePayload)
        .eq('id', post.id)
        .eq('user_id', userId);
      if (retryError) {
        console.error('Simulator finalizeVideo error:', retryError);
        return false;
      }
    } else {
      console.error('Simulator finalizeVideo error:', updateError);
      return false;
    }
  }
  return true;
}

/**
 * Finalize a specific filming post by ID (for Render Now button).
 * Throws with clear error messages on failure.
 * Returns bucket used for upload (for dev/system health).
 */
export async function finalizeVideoById(
  postId: string,
  userId: string
): Promise<{ bucket: string }> {
  const supabase = await createServerSupabaseClient();

  const { data: post, error: fetchError } = await supabase
    .from('content_posts')
    .select('id, title, script_content, background_video_url, caption, hashtags, status')
    .eq('id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(
      `Supabase fetch error: ${fetchError.message}${fetchError.code ? ` (${fetchError.code})` : ''}`
    );
  }

  if (!post) {
    throw new Error(`Post not found or you don't own it. Post ID: ${postId}`);
  }

  const status = String(post.status || '').trim();
  if (status !== POST_STATUS.FILMING) {
    throw new Error(`Expected status filming, got ${status || '(empty)'}`);
  }

  const script = post.script_content as ScriptContent | null;
  const hook = script?.hook ?? '';
  const meat = script?.meat ?? [];
  const cta = script?.cta ?? '';

  let backgroundUrl = post.background_video_url?.trim() || null;
  if (!backgroundUrl) {
    try {
      const picked = await pickBackgroundForPost({
        title: post.title,
        hook,
        meat,
        cta,
      });
      backgroundUrl = picked.background_video_url;
    } catch {
      throw new Error(
        'background_video_url is missing and could not be generated. Run simulateFilming first.'
      );
    }
  }
  if (!backgroundUrl) {
    throw new Error('background_video_url is required. Move post to Filming first.');
  }

  const timestamp = Date.now();
  const { classifyTopic } = await import('@/lib/video-engine');
  const classified = classifyTopic({
    title: post.title,
    hook,
    meat,
    cta,
  });

  const caption =
    post.caption?.trim() || buildCaption(script, classified.category);
  const hashtags =
    Array.isArray(post.hashtags) && post.hashtags.length > 0
      ? post.hashtags
      : buildHashtags(classified.category);

  let overlayImageUrl: string | null = null;
  try {
    const { pngBuffer } = await renderQuoteCardImage({
      title: post.title,
      hook: hook || post.title,
      category: classified.category,
    });
    const overlayPath = `overlays/${userId}/${postId}-${timestamp}.png`;
    const uploaded = await uploadImageBuffer({
      buffer: pngBuffer,
      path: overlayPath,
      contentType: 'image/png',
    });
    overlayImageUrl = uploaded.publicUrl;
  } catch (overlayErr) {
    console.error('[finalizeVideoById] Overlay generation failed (non-blocking):', overlayErr);
  }

  let uploadResult: { publicUrl: string; objectPath: string; bucket: string };

  const ffmpegEnabled = isFfmpegRenderEnabled();
  if (ffmpegEnabled && overlayImageUrl) {
    try {
      const burnedBuffer = await burnOverlayIntoVideo({
        videoUrl: backgroundUrl,
        overlayUrl: overlayImageUrl,
      });
      const burnedPath = `renders-burned/${userId}/${postId}-${timestamp}.mp4`;
      uploadResult = await uploadVideoBuffer({ buffer: burnedBuffer, path: burnedPath });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`FFmpeg burn failed: ${msg}`);
    }
  } else {
    if (!ffmpegEnabled) {
      console.log('[finalizeVideoById] FFmpeg render disabled, using raw background upload.');
    }
    const path = `renders/${userId}/${post.id}-${timestamp}.mp4`;
    const doUpload = async () =>
      uploadVideoFromUrl({ sourceUrl: backgroundUrl, path });
    try {
      uploadResult = await doUpload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      try {
        uploadResult = await doUpload();
      } catch (retryErr) {
        const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
        throw new Error(`Video upload failed (retry too): ${msg}. Retry: ${retryMsg}`);
      }
    }
  }

  const basePayload = {
    status: POST_STATUS.READY,
    final_video_url: uploadResult.publicUrl,
    caption: caption || null,
    hashtags: hashtags.length ? hashtags : null,
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from('content_posts')
    .update({ ...basePayload, overlay_image_url: overlayImageUrl })
    .eq('id', postId)
    .eq('user_id', userId);

  if (updateError) {
    const msg = updateError.message?.toLowerCase() ?? '';
    if (
      (msg.includes('overlay_image_url') || msg.includes('column')) &&
      (msg.includes('not found') || msg.includes('does not exist') || msg.includes('undefined'))
    ) {
      const { error: retryError } = await supabase
        .from('content_posts')
        .update(basePayload)
        .eq('id', postId)
        .eq('user_id', userId);
      if (retryError) {
        throw new Error(
          `Supabase update failed: ${retryError.message}${retryError.code ? ` (${retryError.code})` : ''}`
        );
      }
    } else {
      throw new Error(
        `Supabase update failed: ${updateError.message}${updateError.code ? ` (${updateError.code})` : ''}`
      );
    }
  }
  return { bucket: uploadResult.bucket };
}

/**
 * Perform one random action: createIdea, draftScript, or simulateFilming.
 * Returns a summary of what was done.
 */
export async function runSimulationLoop(
  userId: string
): Promise<{ action: string; success: boolean }> {
  const supabase = await createServerSupabaseClient();

  const { data: posts } = await supabase
    .from('content_posts')
    .select('id, status')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  const ideas = (posts ?? []).filter((p) => p.status === POST_STATUS.IDEA);
  const scripting = (posts ?? []).filter((p) => p.status === POST_STATUS.SCRIPTING);
  const filming = (posts ?? []).filter((p) => p.status === POST_STATUS.FILMING);
  const actions: Array<() => Promise<{ action: string; success: boolean }>> = [
    async () => {
      const id = await createIdea(userId);
      return { action: 'createIdea', success: !!id };
    },
    ...ideas.slice(0, 3).map((p) => async () => {
      const ok = await draftScript(p.id, userId);
      return { action: 'draftScript', success: ok };
    }),
    ...scripting.slice(0, 3).map((p) => async () => {
      const ok = await simulateFilming(p.id, userId);
      return { action: 'simulateFilming', success: ok };
    }),
    ...filming.slice(0, 1).map(() => async () => {
      const ok = await finalizeVideo(userId);
      return { action: 'finalizeVideo', success: ok };
    }),
  ].filter(Boolean);

  if (actions.length === 0) {
    const id = await createIdea(userId);
    return { action: 'createIdea', success: !!id };
  }

  const chosen = actions[Math.floor(Math.random() * actions.length)];
  return chosen();
}
