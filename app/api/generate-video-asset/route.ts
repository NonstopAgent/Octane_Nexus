import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { POST_STATUS } from '@/lib/status';
import { createClient as createPexelsClient } from 'pexels';

export const dynamic = 'force-dynamic';

const CREDITS_COST = 10;

export async function POST(req: NextRequest) {
  // Authenticated session — this route spends OpenAI credits and mutates the
  // caller's credit balance, so the identity must come from the session and
  // never from the request body or the row being edited.
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const userId = user.id;

  try {
    const { postId } = (await req.json()) as { postId: string };
    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    const pexelsKey = process.env.PEXELS_API_KEY;

    if (!openaiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });
    if (!pexelsKey) return NextResponse.json({ error: 'PEXELS_API_KEY not set' }, { status: 500 });

    // 1. Fetch post — scoped to the caller, so another user's post is a 404
    //    rather than something we act on.
    const { data: post, error: postErr } = await supabase
      .from('content_posts')
      .select('*')
      .eq('id', postId)
      .eq('user_id', userId)
      .single();

    if (postErr || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.status === POST_STATUS.READY) {
      return NextResponse.json(
        { error: 'READY posts are immutable. Create a new version first (Regenerate).' },
        { status: 400 }
      );
    }

    // 2 & 3. Check and deduct credits in a single atomic statement. The RPC
    //    derives the user from auth.uid(), so it can only ever touch the
    //    caller's own balance, and it returns null when the balance is too low
    //    (or the row is missing) rather than racing a read against a write.
    const { data: remainingCredits, error: debitErr } = await supabase.rpc(
      'deduct_own_credits',
      { p_amount: CREDITS_COST }
    );

    if (debitErr) {
      console.error('generate-video-asset: credit deduction failed', debitErr);
      return NextResponse.json({ error: 'Could not reserve credits.' }, { status: 500 });
    }

    if (remainingCredits === null) {
      return NextResponse.json(
        { error: `Insufficient credits. This costs ${CREDITS_COST}.` },
        { status: 402 }
      );
    }

    // 4. Set status generating
    await supabase
      .from('content_posts')
      .update({ status: 'generating', updated_at: new Date().toISOString() })
      .eq('id', postId)
      .eq('user_id', userId);

    const sc = (post.script_content || {}) as { hook?: string; meat?: string[] };
    const textForTts = [sc.hook, ...(sc.meat || [])].filter(Boolean).join('\n\n') || post.title;

    // 5. OpenAI TTS
    const openai = new OpenAI({ apiKey: openaiKey });
    const audioResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: textForTts.slice(0, 4096),
    });

    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    const audioPath = `${userId}/${postId}/audio.mp3`;

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('assets')
      .upload(audioPath, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (uploadErr) {
      // Refund atomically too, so a concurrent change isn't clobbered.
      await supabase.rpc('refund_own_credits', { p_amount: CREDITS_COST });
      return NextResponse.json({ error: 'Failed to upload audio: ' + uploadErr.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('assets').getPublicUrl(uploadData.path);
    const audioUrl = urlData.publicUrl;

    // 6. Pexels stock footage (vertical 9:16)
    const pexels = createPexelsClient(pexelsKey);
    const pexelsResult = await pexels.videos.search({
      query: post.title,
      orientation: 'portrait',
      per_page: 1,
    });

    let backgroundVideoUrl = '';
    if (!('error' in pexelsResult) && pexelsResult.videos?.length) {
      const video = pexelsResult.videos[0];
      const portraitFile = video.video_files?.find((f) => f.height && f.width && f.height > f.width)
        || video.video_files?.find((f) => f.quality === 'hd')
        || video.video_files?.[0];
      backgroundVideoUrl = portraitFile?.link || '';
    }

    // 7. Update post
    await supabase
      .from('content_posts')
      .update({
        audio_url: audioUrl,
        background_video_url: backgroundVideoUrl || null,
        status: POST_STATUS.READY,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('user_id', userId);

    return NextResponse.json({ success: true, audioUrl, backgroundVideoUrl });
  } catch (error: unknown) {
    console.error('generate-video-asset error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
