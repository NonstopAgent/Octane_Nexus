import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';

/**
 * POST /api/broll/select
 * Body: { postId, sceneIdx, videoUrl }
 * Updates the scene's selected_video_url in the latest broll_pack and sets content_posts.background_video_url = videoUrl.
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
    const sceneIdx = typeof body?.sceneIdx === 'number' ? body.sceneIdx : Number(body?.sceneIdx);
    const videoUrl = typeof body?.videoUrl === 'string' ? body.videoUrl.trim() : '';

    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }
    if (!Number.isInteger(sceneIdx) || sceneIdx < 0) {
      return NextResponse.json({ error: 'sceneIdx must be a non-negative integer' }, { status: 400 });
    }
    if (!videoUrl) {
      return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 });
    }

    const db = user?.id === userId ? supabase : createServiceRoleClient();

    const { data: pack, error: packErr } = await db
      .from('broll_packs')
      .select('id, scenes')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (packErr || !pack) {
      return NextResponse.json({ error: 'B-roll pack not found for this post' }, { status: 404 });
    }

    const scenes = Array.isArray(pack.scenes) ? [...(pack.scenes as Record<string, unknown>[])] : [];
    const scene = scenes[sceneIdx];
    if (!scene || typeof scene !== 'object') {
      return NextResponse.json({ error: 'Scene index out of range' }, { status: 400 });
    }

    scenes[sceneIdx] = { ...scene, selected_video_url: videoUrl };

    const { error: updatePackErr } = await db
      .from('broll_packs')
      .update({ scenes })
      .eq('id', pack.id)
      .eq('user_id', userId);

    if (updatePackErr) {
      console.error('broll/select pack update error:', updatePackErr);
      return NextResponse.json({ error: updatePackErr.message }, { status: 500 });
    }

    const { error: updatePostErr } = await db
      .from('content_posts')
      .update({
        background_video_url: videoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('user_id', userId);

    if (updatePostErr) {
      console.error('broll/select content_posts update error:', updatePostErr);
      return NextResponse.json({ error: updatePostErr.message }, { status: 500 });
    }

    const { data: updated } = await db
      .from('broll_packs')
      .select('id, user_id, post_id, title, scenes, created_at')
      .eq('id', pack.id)
      .single();

    return NextResponse.json(updated ?? pack);
  } catch (e) {
    console.error('broll/select error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
