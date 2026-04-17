import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's niche
    const { data: profile } = await supabase
      .from('profiles')
      .select('niche, vibe')
      .eq('id', user.id)
      .maybeSingle();

    const niche = profile?.niche || 'content creation';
    const vibe = profile?.vibe || '';

    // Use Gemini to generate niche-specific trending content
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const prompt = `You are a social media trend analyst. Generate 6 realistic trending video/post ideas for the niche: "${niche}"${vibe ? ` with a ${vibe} style` : ''}.

For each idea, provide:
- title: A compelling, viral-worthy title (the kind that gets clicks)
- viewCount: A realistic view count string like "1.2M" or "450K"  
- whyItWorked: A 1-2 sentence analysis of WHY this format/hook works algorithmically

Make the titles feel like real viral content - use proven hooks like contrarian takes, specific numbers, POV formats, "I tried X for Y days" formats, listicles, etc.

Respond ONLY with a JSON array, no markdown, no explanation:
[{"id":"1","title":"...","viewCount":"...","whyItWorked":"..."},...]`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 1500 },
        }),
      }
    );

    if (!response.ok) {
      console.error('Gemini API error:', response.status);
      return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    try {
      const videos = JSON.parse(cleaned);
      return NextResponse.json({ videos, niche });
    } catch {
      console.error('Failed to parse Gemini response:', cleaned.substring(0, 200));
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }
  } catch (err) {
    console.error('trends/generate error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
