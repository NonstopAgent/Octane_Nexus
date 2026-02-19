import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';

const CLIP_OUTPUTS_BUCKET = 'clip-outputs';

/**
 * POST: Get signed upload URL for one clip. Creates clips row with output_path = 'pending'.
 * Body: { jobId: string, start_seconds: number, end_seconds: number, index: number }
 * Returns: { clipId, path, token } only (no public URL).
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
    const jobId = typeof body?.jobId === 'string' ? body.jobId.trim() : '';
    const start = Number(body?.start_seconds);
    const end = Number(body?.end_seconds);
    const index = Number(body?.index);

    if (!jobId || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return NextResponse.json({ error: 'jobId, start_seconds, end_seconds (valid range) required' }, { status: 400 });
    }

    const db = user?.id === userId ? supabase : createServiceRoleClient();
    const { data: job } = await db
      .from('clip_jobs')
      .select('id')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single();

    if (!job) {
      return NextResponse.json({ error: 'Job not found or not owned' }, { status: 404 });
    }

    let caption = `Clip ${index + 1} — created with Clip Studio.`;
    const { data: settings } = await db.from('user_settings').select('default_style_token_id').eq('user_id', userId).maybeSingle();
    const defaultTokenId = settings?.default_style_token_id as string | null;
    if (defaultTokenId) {
      const { data: tokenRow } = await db.from('style_tokens').select('tokens').eq('id', defaultTokenId).eq('user_id', userId).maybeSingle();
      const tokens = tokenRow?.tokens as { cta_pattern?: { template?: string }; intro_pattern?: { textTemplate?: string } } | null;
      if (tokens?.cta_pattern?.template) {
        caption = tokens.cta_pattern.template.replace(/\{\{cta\}\}/g, `Clip ${index + 1}`).trim() || caption;
      } else if (tokens?.intro_pattern?.textTemplate) {
        caption = tokens.intro_pattern.textTemplate.replace(/\{\{title\}\}/g, `Clip ${index + 1}`).trim() || caption;
      }
    }

    const title = `Clip ${index + 1}`;
    const hashtags = ['#clip', '#content', '#creators'];

    const { data: clip, error: insertErr } = await db
      .from('clips')
      .insert({
        user_id: userId,
        clip_job_id: jobId,
        start_seconds: Math.round(start),
        end_seconds: Math.round(end),
        title,
        caption,
        hashtags,
        output_path: 'pending',
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('clips/init-upload insert error:', insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    const clipId = clip?.id;
    if (!clipId) {
      return NextResponse.json({ error: 'Failed to create clip' }, { status: 500 });
    }

    const storagePath = `clips/${userId}/${jobId}/${clipId}.mp4`;
    const client = user?.id === userId ? supabase : createServiceRoleClient();
    const { data: signData, error: signErr } = await client.storage
      .from(CLIP_OUTPUTS_BUCKET)
      .createSignedUploadUrl(storagePath);

    if (signErr) {
      console.error('clips/init-upload signedUrl error:', signErr);
      return NextResponse.json({ error: signErr.message }, { status: 500 });
    }

    const token = (signData as { token?: string })?.token ?? (signData as { signedUrl?: string; token?: string })?.token;

    return NextResponse.json({
      clipId,
      path: storagePath,
      token,
    });
  } catch (e) {
    console.error('clips/init-upload error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
