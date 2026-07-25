import type { SupabaseClient } from '@supabase/supabase-js';
import { callGeminiModel, extractGeminiText } from '@/lib/geminiModels';

export type HookLine = {
  hook: string;
  pattern: string;
  inspired_by: string;
};

function getGeminiKey(): string | undefined {
  return process.env.GEMINI_API_KEY;
}

/** Shared context block: top YouTube imports + competitor recent videos. */
export async function buildCreatorPerformanceContext(
  admin: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: arts } = await admin
    .from('creator_artifacts')
    .select('title, performance')
    .eq('user_id', userId)
    .eq('source', 'imported_youtube')
    .not('performance->views', 'is', null)
    .order('performance->views', { ascending: false })
    .limit(8);

  const { data: tracked } = await admin
    .from('tracked_channels')
    .select('channel_title, recent_videos')
    .eq('user_id', userId);

  const lines: string[] = [];

  for (const a of arts || []) {
    const perf = (a.performance as { views?: number }) || {};
    const v = Number(perf.views) || 0;
    lines.push(`Creator video: "${a.title}" (${v.toLocaleString()} views)`);
  }

  for (const ch of tracked || []) {
    const vids = (ch.recent_videos as Array<{ title?: string; viewCount?: number }>) || [];
    for (const v of vids.slice(0, 4)) {
      if (v.title) {
        lines.push(
          `Competitor [${ch.channel_title}]: "${v.title}" (${Number(v.viewCount || 0).toLocaleString()} views)`
        );
      }
    }
  }

  return lines.join('\n');
}

export async function generateHookLabHooks(
  topic: string,
  contextBlock: string
): Promise<HookLine[] | null> {
  const key = getGeminiKey();
  if (!key) return null;

  const prompt = `You write YouTube hooks (shorts and long-form). Video topic: "${topic}"

REAL PERFORMING TITLES (your hooks must echo patterns that worked here; cite one in inspired_by when possible):
${contextBlock || '(No library yet — use proven YouTube hook archetypes.)'}

Return ONLY a JSON array of exactly 10 objects with keys hook, pattern, inspired_by:
[{"hook":"...","pattern":"question hook","inspired_by":"Creator video: ..."}]

pattern: short label like "question hook", "contrarian", "time-promise", "POV", "story beat", "list hook", "tutorial promise", "curiosity gap", "social proof".
hook: one opening line, max 180 characters.
inspired_by: "Creator video: [title]" or "Competitor [channel]: [title]" or "general best practice".
No markdown fences, no extra keys.`;

  const res = await callGeminiModel(key, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  if (!res.ok) return null;
  const text = extractGeminiText(res.data);
  if (!text) return null;

  try {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter(
        (row): row is HookLine =>
          typeof row === 'object' &&
          row !== null &&
          typeof (row as HookLine).hook === 'string' &&
          typeof (row as HookLine).pattern === 'string' &&
          typeof (row as HookLine).inspired_by === 'string'
      )
      .slice(0, 10);
  } catch {
    return null;
  }
}
