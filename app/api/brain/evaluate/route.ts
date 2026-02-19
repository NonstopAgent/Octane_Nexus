import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';
import { runPostEval, runClipEval, applyStyleCompliance } from '@/lib/brain-eval';

type EntityType = 'post' | 'clip';

/**
 * POST: Evaluate a post or clip. Saves to brain_evals and returns payload.
 * Body: { entityType: 'post' | 'clip', entityId: string }
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
    const entityType = body?.entityType as EntityType | undefined;
    const entityId = typeof body?.entityId === 'string' ? body.entityId.trim() : '';

    if (entityType !== 'post' && entityType !== 'clip') {
      return NextResponse.json({ error: 'entityType must be post or clip' }, { status: 400 });
    }
    if (!entityId) {
      return NextResponse.json({ error: 'entityId is required' }, { status: 400 });
    }

    const db = user?.id === userId ? supabase : createServiceRoleClient();

    if (entityType === 'post') {
      const { data: post, error: postErr } = await db
        .from('content_posts')
        .select('id, script_content, caption, hashtags, background_video_url')
        .eq('id', entityId)
        .eq('user_id', userId)
        .single();

      if (postErr || !post) {
        return NextResponse.json({ error: 'Post not found or not owned' }, { status: 404 });
      }

      let payload = runPostEval({
        script_content: post.script_content as { hook?: string; meat?: string[]; cta?: string } | null,
        caption: post.caption as string | null,
        hashtags: post.hashtags as string[] | null,
        background_video_url: post.background_video_url as string | null,
      });

      const { data: settings } = await db.from('user_settings').select('default_style_token_id').eq('user_id', userId).maybeSingle();
      const defaultTokenId = settings?.default_style_token_id as string | null;
      if (defaultTokenId) {
        const { data: tokenRow } = await db.from('style_tokens').select('tokens').eq('id', defaultTokenId).eq('user_id', userId).maybeSingle();
        const styleToken = (tokenRow?.tokens as Record<string, unknown> | null) ?? null;
        payload = applyStyleCompliance(payload, post as { caption?: string | null; script_content?: { cta?: string } | null }, styleToken);
      }

      const { error: insertErr } = await db.from('brain_evals').insert({
        user_id: userId,
        entity_type: 'post',
        entity_id: entityId,
        score: payload.score,
        labels: payload.labels,
        issues: payload.issues,
        fixes: payload.fixes,
      });

      if (insertErr) {
        console.error('brain/evaluate insert error:', insertErr);
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }

      return NextResponse.json({
        entityType: 'post',
        entityId,
        score: payload.score,
        labels: payload.labels,
        issues: payload.issues,
        fixes: payload.fixes,
      });
    }

    const { data: clip, error: clipErr } = await db
      .from('clips')
      .select('id, caption, hashtags, start_seconds, end_seconds')
      .eq('id', entityId)
      .eq('user_id', userId)
      .single();

    if (clipErr || !clip) {
      return NextResponse.json({ error: 'Clip not found or not owned' }, { status: 404 });
    }

    const payload = runClipEval({
      caption: clip.caption as string | null,
      hashtags: clip.hashtags as string[] | null,
      start_seconds: clip.start_seconds as number,
      end_seconds: clip.end_seconds as number,
    });

    const { error: insertErr } = await db.from('brain_evals').insert({
      user_id: userId,
      entity_type: 'clip',
      entity_id: entityId,
      score: payload.score,
      labels: payload.labels,
      issues: payload.issues,
      fixes: payload.fixes,
    });

    if (insertErr) {
      console.error('brain/evaluate insert error:', insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      entityType: 'clip',
      entityId,
      score: payload.score,
      labels: payload.labels,
      issues: payload.issues,
      fixes: payload.fixes,
    });
  } catch (e) {
    console.error('brain/evaluate error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
