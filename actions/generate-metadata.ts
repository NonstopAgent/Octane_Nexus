'use server';

import OpenAI from 'openai';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

type ScriptContent = {
  hook?: string;
  meat?: string[];
  cta?: string;
  setup_tip?: string;
  name?: string;
};

type MetadataResult = {
  caption: string;
  hashtags: string[];
};

export async function generateMetadata(postId: string): Promise<{ caption: string; hashtags: string[] } | { error: string }> {
  const supabase = await createServerSupabaseClient();
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    return { error: 'OPENAI_API_KEY is not configured.' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Please sign in to generate metadata.' };
  }

  const { data: post, error: postErr } = await supabase
    .from('content_posts')
    .select('id, user_id, script_content, title')
    .eq('id', postId)
    .eq('user_id', user.id)
    .single();

  if (postErr || !post) {
    return { error: 'Post not found.' };
  }

  const sc = (post.script_content || {}) as ScriptContent;
  const hook = sc.hook || '';
  const meat = (sc.meat || []).join('\n');
  const scriptText = [hook, meat].filter(Boolean).join('\n\n').trim() || post.title || 'Untitled video';

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
    return { error: 'AI did not return any content.' };
  }

  let parsed: MetadataResult;
  try {
    parsed = JSON.parse(rawContent.replace(/```json?\s*/g, '').replace(/```\s*/g, '')) as MetadataResult;
    if (!parsed.caption || !Array.isArray(parsed.hashtags)) {
      throw new Error('Invalid structure');
    }
  } catch {
    return { error: 'Failed to parse AI response as JSON.' };
  }

  const hashtags = parsed.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`));

  const { error: updateErr } = await supabase
    .from('content_posts')
    .update({
      caption: parsed.caption,
      hashtags,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .eq('user_id', user.id);

  if (updateErr) {
    return { error: 'Failed to save metadata: ' + updateErr.message };
  }

  revalidatePath('/dashboard/post-lab');
  revalidatePath('/dashboard/schedule');

  return { caption: parsed.caption, hashtags };
}
