import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';
import { applyCtaTemplate, applyIntroTemplate, truncateToMaxLines } from '@/lib/style-tokens';

/**
 * POST: Create a new content_versions row with improved hook/CTA/caption from latest eval fixes, then update content_posts.
 * Body: { postId: string }
 * Ownership: post must belong to effective user.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const postId = typeof body?.postId === 'string' ? body.postId.trim() : '';
    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    const db = user?.id === userId ? supabase : createServiceRoleClient();

    const { data: post, error: postErr } = await db
      .from('content_posts')
      .select('id, title, script_content, caption, hashtags, final_video_url')
      .eq('id', postId)
      .eq('user_id', userId)
      .single();

    if (postErr || !post) {
      return NextResponse.json({ error: 'Post not found or not owned' }, { status: 404 });
    }

    const { data: latestEval } = await db
      .from('brain_evals')
      .select('fixes, issues')
      .eq('user_id', userId)
      .eq('entity_type', 'post')
      .eq('entity_id', postId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const script = (post.script_content as { hook?: string; meat?: string[]; cta?: string } | null) ?? {};
    let hook = script.hook ?? '';
    let cta = script.cta ?? '';
    let caption = (post.caption as string) ?? '';
    const fixes = (latestEval?.fixes as Array<{ id: string; message: string }>) ?? [];

    type StyleTokenShape = {
      caption_style?: { maxLines?: number };
      intro_pattern?: { enabled?: boolean; textTemplate?: string };
      cta_pattern?: { enabled?: boolean; template?: string };
      pacing?: { maxSentenceLength?: number };
    };
    const { data: settings } = await db.from('user_settings').select('default_style_token_id').eq('user_id', userId).maybeSingle();
    const defaultTokenId = settings?.default_style_token_id as string | null;
    let styleToken: StyleTokenShape | null = null;
    if (defaultTokenId) {
      const { data: tokenRow } = await db.from('style_tokens').select('tokens').eq('id', defaultTokenId).eq('user_id', userId).maybeSingle();
      styleToken = (tokenRow?.tokens as StyleTokenShape) ?? null;
    }

    for (const f of fixes) {
      if (f.id === 'hook_missing' || f.id === 'hook_short') {
        hook = hook || applyIntroTemplate(styleToken?.intro_pattern?.textTemplate, post.title ?? null);
      }
      if (f.id === 'cta_missing' || f.id === 'cta_weak') {
        cta = cta || applyCtaTemplate(styleToken?.cta_pattern?.template, script.cta ?? null);
      }
      if (f.id === 'caption_short') {
        caption = caption || (hook ? `${hook.slice(0, 80)}…` : (post.title ?? '') + ' — full video.');
      }
    }

    cta = applyCtaTemplate(styleToken?.cta_pattern?.template, cta || (script.cta ?? null)) || cta;
    if (styleToken?.caption_style?.maxLines && caption) {
      caption = truncateToMaxLines(caption, styleToken.caption_style.maxLines, 40);
    }

    const nextScript = {
      ...script,
      hook: hook || script.hook,
      cta: cta || script.cta,
    };

    const { data: maxVersion } = await db
      .from('content_versions')
      .select('version')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (maxVersion?.version ?? 0) + 1;

    const { error: versionErr } = await db.from('content_versions').insert({
      user_id: userId,
      post_id: postId,
      version: nextVersion,
      script_content: nextScript,
      caption: caption || null,
      hashtags: post.hashtags ?? [],
      final_video_url: post.final_video_url ?? null,
    });

    if (versionErr) {
      console.error('brain/generate-v2 content_versions insert error:', versionErr);
      return NextResponse.json({ error: versionErr.message }, { status: 500 });
    }

    const { error: updateErr } = await db
      .from('content_posts')
      .update({
        script_content: nextScript,
        caption: caption || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('user_id', userId);

    if (updateErr) {
      console.error('brain/generate-v2 content_posts update error:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      postId,
      version: nextVersion,
      script_content: nextScript,
      caption: caption || null,
    });
  } catch (e) {
    console.error('brain/generate-v2 error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
