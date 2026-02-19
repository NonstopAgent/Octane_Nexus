import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';
import { buildSceneList, fetchPexelsCandidates } from '@/lib/broll';
import type { BrollScene } from '@/lib/broll';

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
      .select('id, title, script_content')
      .eq('id', postId)
      .eq('user_id', userId)
      .single();

    if (postErr || !post) {
      return NextResponse.json({ error: 'Post not found or not owned' }, { status: 404 });
    }

    const script = post.script_content as { hook?: string; meat?: string[]; cta?: string } | null;
    const title = (post.title as string) ?? 'Untitled';
    const scenes = buildSceneList(script, title);

    const apiKey = process.env.PEXELS_API_KEY;
    for (let i = 0; i < scenes.length; i++) {
      const candidates = await fetchPexelsCandidates(scenes[i].pexels_query, apiKey, 3);
      scenes[i] = { ...scenes[i], candidates } as BrollScene;
    }

    const { data: pack, error: insertErr } = await db
      .from('broll_packs')
      .insert({
        user_id: userId,
        post_id: postId,
        title,
        scenes: scenes as unknown as Record<string, unknown>[],
      })
      .select('id, user_id, post_id, title, scenes, created_at')
      .single();

    if (insertErr) {
      console.error('broll/generate insert error:', insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json(pack);
  } catch (e) {
    console.error('broll/generate error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
