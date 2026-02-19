import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';

type ScriptContent = { hook?: string; meat?: string[] };

/**
 * POST: Generate caption + hashtags for a post and save to content_posts.
 * Body: { postId: string }. Effective user + service role for demo.
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
    const postId = typeof body?.postId === 'string' ? body.postId.trim() : '';
    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    const db = user?.id === userId ? supabase : createServiceRoleClient();
    const { data: post, error: postErr } = await db
      .from('content_posts')
      .select('id, user_id, script_content, title')
      .eq('id', postId)
      .eq('user_id', userId)
      .single();

    if (postErr || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const sc = (post.script_content || {}) as ScriptContent;
    const hook = sc.hook || '';
    const meat = (sc.meat || []).join('\n');
    const scriptText = [hook, meat].filter(Boolean).join('\n\n').trim() || (post.title as string) || 'Untitled video';

    const openaiKey = process.env.OPENAI_API_KEY;
    let caption: string;
    let hashtags: string[];

    if (openaiKey) {
      const openai = new OpenAI({ apiKey: openaiKey });
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: `Write a viral, engagement-bait caption (under 100 words) and 5-10 trending hashtags for this video script. Return strictly JSON: { "caption": string, "hashtags": string[] }. No markdown, no explanation.\n\nScript:\n${scriptText}`,
          },
        ],
        temperature: 0.7,
      });
      const rawContent = completion.choices[0]?.message?.content?.trim();
      if (!rawContent) {
        return NextResponse.json({ error: 'AI did not return any content.' }, { status: 500 });
      }
      try {
        const parsed = JSON.parse(rawContent.replace(/```json?\s*/g, '').replace(/```\s*/g, '')) as { caption?: string; hashtags?: string[] };
        if (!parsed.caption || !Array.isArray(parsed.hashtags)) throw new Error('Invalid structure');
        caption = parsed.caption;
        hashtags = parsed.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`));
      } catch {
        return NextResponse.json({ error: 'Failed to parse AI response.' }, { status: 500 });
      }
    } else {
      caption = `Check out this video — ${scriptText.slice(0, 80)}…`;
      hashtags = ['#viral', '#trending', '#shorts', '#content', '#creator'];
    }

    const { error: updateErr } = await db
      .from('content_posts')
      .update({
        caption,
        hashtags,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('user_id', userId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ caption, hashtags });
  } catch (e) {
    console.error('post-lab/generate-metadata error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
