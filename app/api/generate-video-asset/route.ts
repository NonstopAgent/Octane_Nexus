import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { POST_STATUS } from '@/lib/status';
import { createClient as createPexelsClient } from 'pexels';

const CREDITS_COST = 10;

export async function POST(req: NextRequest) {
  try {
    const { postId } = (await req.json()) as { postId: string };
    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const openaiKey = process.env.OPENAI_API_KEY;
    const pexelsKey = process.env.PEXELS_API_KEY;

    if (!openaiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });
    if (!pexelsKey) return NextResponse.json({ error: 'PEXELS_API_KEY not set' }, { status: 500 });

    // 1. Fetch post
    const { data: post, error: postErr } = await supabase
      .from('content_posts')
      .select('*')
      .eq('id', postId)
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

    const userId = post.user_id;

    // 2. Credit check
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();

    const credits = (profile?.credits ?? 50) as number;
    if (credits < CREDITS_COST) {
      return NextResponse.json(
        { error: `Insufficient credits. Need ${CREDITS_COST}, have ${credits}.` },
        { status: 402 }
      );
    }

    // 3. Deduct credits
    await supabase
      .from('profiles')
      .update({ credits: Math.max(0, credits - CREDITS_COST) })
      .eq('id', userId);

    // 4. Set status generating
    await supabase
      .from('content_posts')
      .update({ status: 'generating', updated_at: new Date().toISOString() })
      .eq('id', postId);

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
      await supabase.from('profiles').update({ credits }).eq('id', userId);
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
      .eq('id', postId);

    return NextResponse.json({ success: true, audioUrl, backgroundVideoUrl });
  } catch (error: unknown) {
    console.error('generate-video-asset error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
