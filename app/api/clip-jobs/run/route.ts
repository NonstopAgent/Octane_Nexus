import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';
import { isFfmpegAvailable, processRange, type ClipRange } from '@/lib/clip-render';

const SOURCE_SIGNED_URL_EXPIRE_SEC = 3600;
const UPLOAD_BUCKET = 'clip-uploads';

type RenderMode = 'auto' | 'client' | 'server';

/**
 * POST: Create clip_job and either run server-side ffmpeg or return client-flow (signedSourceUrl + ranges).
 * Body: { uploadId, ranges: [{ start, end }], targetPlatform?, sourceUrl?, renderMode?: 'auto'|'client'|'server' }
 * - auto: use client if VERCEL=1 or ffmpeg unavailable; else server.
 * - client/auto (client path): returns jobId, signedSourceUrl, ranges, ffmpegUnavailable?.
 * - server: runs ffmpeg on server (or stub) and returns jobId, status: 'done', clipsCount.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const uploadId = typeof body?.uploadId === 'string' ? body.uploadId.trim() : '';
    const rawRanges = Array.isArray(body?.ranges) ? body.ranges : [];
    const targetPlatform = typeof body?.targetPlatform === 'string' ? body.targetPlatform.trim() || null : null;
    const sourceUrl = typeof body?.sourceUrl === 'string' ? body.sourceUrl.trim() || null : null;
    const renderMode: RenderMode =
      body?.renderMode === 'client' || body?.renderMode === 'server' || body?.renderMode === 'auto'
        ? body.renderMode
        : 'auto';

    if (!uploadId) {
      return NextResponse.json({ error: 'uploadId is required' }, { status: 400 });
    }

    const ranges: ClipRange[] = rawRanges
      .filter((r: unknown) => r && typeof r === 'object' && typeof (r as { start?: number }).start === 'number' && typeof (r as { end?: number }).end === 'number')
      .map((r: { start: number; end: number }) => ({ start: Number(r.start), end: Number(r.end) }));

    if (ranges.length === 0) {
      return NextResponse.json({ error: 'At least one range { start, end } is required' }, { status: 400 });
    }

    const db = user?.id === userId ? supabase : createServiceRoleClient();

    const { data: upload, error: uploadErr } = await db
      .from('uploads')
      .select('id, storage_path, user_id')
      .eq('id', uploadId)
      .eq('user_id', userId)
      .single();

    if (uploadErr || !upload) {
      return NextResponse.json({ error: 'Upload not found or not owned' }, { status: 404 });
    }

    let rightsLedgerWarning: string | null = null;
    if (sourceUrl) {
      const { data: ledger } = await db
        .from('rights_ledger')
        .select('id')
        .eq('user_id', userId)
        .eq('source_url', sourceUrl)
        .limit(1)
        .maybeSingle();
      if (!ledger) {
        rightsLedgerWarning = 'No rights ledger entry for this source. Consider using Clip It safety flow first.';
      }
    }

    const { data: job, error: jobErr } = await db
      .from('clip_jobs')
      .insert({
        user_id: userId,
        upload_id: uploadId,
        source_url: sourceUrl,
        status: 'processing',
        target_platform: targetPlatform,
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (jobErr || !job) {
      console.error('clip_jobs insert error:', jobErr);
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    const jobId = job.id;
    const storagePath = upload.storage_path as string;
    const useFfmpeg = isFfmpegAvailable();
    const isVercel = process.env.VERCEL === '1';

    const useClientRender =
      renderMode === 'client' ||
      (renderMode === 'auto' && (isVercel || !useFfmpeg));

    if (useClientRender) {
      const service = createServiceRoleClient();
      const { data: signData, error: signErr } = await service.storage
        .from(UPLOAD_BUCKET)
        .createSignedUrl(storagePath, SOURCE_SIGNED_URL_EXPIRE_SEC);

      if (signErr) {
        await db
          .from('clip_jobs')
          .update({ status: 'error', error: signErr.message, updated_at: new Date().toISOString() })
          .eq('id', jobId)
          .eq('user_id', userId);
        return NextResponse.json({ error: signErr.message }, { status: 500 });
      }

      const signedSourceUrl = (signData as { signedUrl?: string })?.signedUrl ?? (signData as { url?: string })?.url;
      return NextResponse.json({
        jobId,
        signedSourceUrl: signedSourceUrl || undefined,
        ranges: ranges.map((r) => ({ start: r.start, end: r.end })),
        ...(useFfmpeg ? {} : { ffmpegUnavailable: true }),
        ...(rightsLedgerWarning ? { warning: rightsLedgerWarning } : {}),
      });
    }

    const clipsToInsert: Array<{
      id: string;
      user_id: string;
      clip_job_id: string;
      start_seconds: number;
      end_seconds: number;
      title: string | null;
      caption: string | null;
      hashtags: string[];
      output_path: string;
    }> = [];

    try {
      for (let i = 0; i < ranges.length; i++) {
        const clipId = crypto.randomUUID();
        const rendered = await processRange(
          storagePath,
          ranges[i],
          i,
          userId,
          jobId,
          clipId,
          useFfmpeg
        );
        clipsToInsert.push({
          id: clipId,
          user_id: userId,
          clip_job_id: jobId,
          start_seconds: rendered.start_seconds,
          end_seconds: rendered.end_seconds,
          title: rendered.title || null,
          caption: rendered.caption || null,
          hashtags: rendered.hashtags || [],
          output_path: rendered.output_path,
        });
      }

      const { error: clipsErr } = await db.from('clips').insert(clipsToInsert);
      if (clipsErr) {
        await db.from('clip_jobs').update({ status: 'error', error: clipsErr.message, updated_at: new Date().toISOString() }).eq('id', jobId).eq('user_id', userId);
        return NextResponse.json({ error: clipsErr.message }, { status: 500 });
      }

      await db.from('clip_jobs').update({ status: 'done', updated_at: new Date().toISOString() }).eq('id', jobId).eq('user_id', userId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Processing failed';
      await db.from('clip_jobs').update({ status: 'error', error: msg, updated_at: new Date().toISOString() }).eq('id', jobId).eq('user_id', userId);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({
      jobId,
      status: 'done',
      clipsCount: clipsToInsert.length,
      ...(rightsLedgerWarning ? { warning: rightsLedgerWarning } : {}),
    });
  } catch (e) {
    console.error('clip-jobs/run error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
