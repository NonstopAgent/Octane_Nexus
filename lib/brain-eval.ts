/**
 * Nexus Brain: deterministic retention linter for posts and clips.
 * Produces consistent output for demo mode; can be extended with AI when key is set.
 */

import type { StyleTokensPayload } from './style-tokens';

export type EvalPayload = {
  score: number;
  labels: Record<string, number | string | boolean>;
  issues: Array<{ id: string; message: string; severity: 'low' | 'medium' | 'high' }>;
  fixes: Array<{ id: string; message: string; apply?: string }>;
};

/** Apply style-token compliance checks to an existing eval payload. */
export function applyStyleCompliance(
  payload: EvalPayload,
  post: { caption?: string | null; script_content?: { cta?: string } | null },
  styleToken: StyleTokensPayload | null | undefined
): EvalPayload {
  if (!styleToken) return payload;
  const issues = [...payload.issues];
  const fixes = [...payload.fixes];
  let score = payload.score;

  const maxLines = styleToken.caption_style?.maxLines ?? 2;
  const caption = (post.caption ?? '').trim();
  if (caption && maxLines > 0) {
    const lines = caption.split(/\n/).filter(Boolean);
    if (lines.length > maxLines) {
      issues.push({
        id: 'caption_too_many_lines',
        message: `Caption has ${lines.length} lines; style allows ${maxLines}.`,
        severity: 'low',
      });
      fixes.push({
        id: 'caption_too_many_lines',
        message: `Shorten caption to ${maxLines} lines or fewer.`,
      });
      score -= 5;
    }
  }

  const ctaTemplate = styleToken.cta_pattern?.template;
  const ctaEnabled = styleToken.cta_pattern?.enabled !== false;
  const scriptCta = post.script_content?.cta?.trim() ?? '';
  if (ctaEnabled && ctaTemplate && !scriptCta) {
    const alreadyHasCtaFix = fixes.some((f) => f.id === 'cta_missing' || f.id === 'cta_weak');
    if (!alreadyHasCtaFix) {
      issues.push({
        id: 'cta_missing_template',
        message: 'CTA is empty; style template suggests a CTA.',
        severity: 'medium',
      });
      fixes.push({
        id: 'cta_missing_template',
        message: `Add a CTA (e.g. "${ctaTemplate.slice(0, 40)}…").`,
        apply: 'cta',
      });
      score -= 5;
    }
  }

  return {
    ...payload,
    score: Math.max(0, Math.min(100, score)),
    issues: issues.slice(0, 10),
    fixes: fixes.slice(0, 10),
  };
}

const HOOK_MIN_LEN = 15;
const HOOK_MAX_LEN = 120;
const CTA_MIN_LEN = 10;
const CAPTION_MIN_LEN = 20;
const HASHTAGS_MIN = 3;
const HASHTAGS_MAX = 15;
const CLIP_DURATION_MIN = 5;
const CLIP_DURATION_MAX = 180;

export function runPostEval(post: {
  script_content?: { hook?: string; meat?: string[]; cta?: string } | null;
  caption?: string | null;
  hashtags?: string[] | null;
  background_video_url?: string | null;
}): EvalPayload {
  const labels: Record<string, number | string | boolean> = {};
  const issues: EvalPayload['issues'] = [];
  const fixes: EvalPayload['fixes'] = [];

  const hook = post.script_content?.hook?.trim() ?? '';
  const cta = post.script_content?.cta?.trim() ?? '';
  const meat = post.script_content?.meat ?? [];
  const caption = (post.caption ?? '').trim();
  const hashtags = Array.isArray(post.hashtags) ? post.hashtags.filter(Boolean) : [];

  let score = 100;

  if (!hook) {
    issues.push({ id: 'hook_missing', message: 'No hook in script.', severity: 'high' });
    fixes.push({ id: 'hook_missing', message: 'Add a strong opening hook (first 3 seconds).', apply: 'hook' });
    score -= 25;
  } else {
    labels.hook_length = hook.length;
    if (hook.length < HOOK_MIN_LEN) {
      issues.push({ id: 'hook_short', message: `Hook is very short (${hook.length} chars). Aim for 15+ to grab attention.`, severity: 'medium' });
      fixes.push({ id: 'hook_short', message: 'Expand the hook with a clear promise or question.' });
      score -= 10;
    }
    if (hook.length > HOOK_MAX_LEN) {
      issues.push({ id: 'hook_long', message: `Hook may be too long (${hook.length} chars). Keep under ~120.`, severity: 'low' });
      score -= 5;
    }
  }

  if (meat.length === 0 && !hook && !cta) {
    issues.push({ id: 'script_empty', message: 'Script has no beats or structure.', severity: 'high' });
    fixes.push({ id: 'script_empty', message: 'Add 2–4 main beats in the script.' });
    score -= 20;
  }
  labels.beats_count = meat.length;

  if (!cta) {
    issues.push({ id: 'cta_missing', message: 'No clear call-to-action.', severity: 'high' });
    fixes.push({ id: 'cta_missing', message: 'Add a CTA (e.g. follow, comment, link in bio).', apply: 'cta' });
    score -= 20;
  } else {
    labels.cta_length = cta.length;
    if (cta.length < CTA_MIN_LEN) {
      issues.push({ id: 'cta_weak', message: 'CTA is very short. Make it specific.', severity: 'medium' });
      fixes.push({ id: 'cta_weak', message: 'Strengthen the CTA with a clear next step.' });
      score -= 5;
    }
  }

  if (!caption || caption.length < CAPTION_MIN_LEN) {
    issues.push({ id: 'caption_short', message: `Caption is short or empty (${caption.length} chars).`, severity: 'medium' });
    fixes.push({ id: 'caption_short', message: 'Add a caption (20+ chars) to improve reach.' });
    score -= 10;
  }
  labels.caption_length = caption.length;

  if (hashtags.length < HASHTAGS_MIN) {
    issues.push({ id: 'hashtags_few', message: `Only ${hashtags.length} hashtags. Add 3–15 for discoverability.`, severity: 'low' });
    fixes.push({ id: 'hashtags_few', message: 'Add 3–15 relevant hashtags.' });
    score -= 5;
  }
  if (hashtags.length > HASHTAGS_MAX) {
    issues.push({ id: 'hashtags_many', message: `Too many hashtags (${hashtags.length}). 3–15 is optimal.`, severity: 'low' });
    score -= 5;
  }
  labels.hashtags_count = hashtags.length;

  const backgroundUrl = (post.background_video_url ?? '').trim();
  if (!backgroundUrl) {
    issues.push({ id: 'no_broll', message: 'No B-roll attached; consider adding visuals.', severity: 'low' });
    fixes.push({ id: 'no_broll', message: 'Add B-roll in Post Lab or Library to improve engagement.' });
    score -= 5;
  }

  score = Math.max(0, Math.min(100, score));
  labels.score = score;

  return {
    score,
    labels,
    issues: issues.slice(0, 10),
    fixes: fixes.slice(0, 10),
  };
}

export function runClipEval(clip: {
  caption?: string | null;
  hashtags?: string[] | null;
  start_seconds?: number;
  end_seconds?: number;
}): EvalPayload {
  const labels: Record<string, number | string | boolean> = {};
  const issues: EvalPayload['issues'] = [];
  const fixes: EvalPayload['fixes'] = [];

  const caption = (clip.caption ?? '').trim();
  const hashtags = Array.isArray(clip.hashtags) ? clip.hashtags.filter(Boolean) : [];
  const duration = clip.end_seconds != null && clip.start_seconds != null
    ? clip.end_seconds - clip.start_seconds
    : 0;

  let score = 100;

  labels.duration_seconds = duration;
  if (duration > 0) {
    if (duration < CLIP_DURATION_MIN) {
      issues.push({ id: 'duration_short', message: `Clip is very short (${duration}s). Consider 5–60s for most platforms.`, severity: 'medium' });
      score -= 10;
    }
    if (duration > CLIP_DURATION_MAX) {
      issues.push({ id: 'duration_long', message: `Clip is long (${duration}s). Short clips often perform better.`, severity: 'low' });
      score -= 5;
    }
  }

  if (!caption || caption.length < CAPTION_MIN_LEN) {
    issues.push({ id: 'caption_short', message: 'Caption is short or empty.', severity: 'medium' });
    fixes.push({ id: 'caption_short', message: 'Add a clear caption (20+ chars).' });
    score -= 15;
  }
  labels.caption_length = caption.length;

  if (hashtags.length < HASHTAGS_MIN) {
    issues.push({ id: 'hashtags_few', message: `Only ${hashtags.length} hashtags. Add 3–15.`, severity: 'low' });
    fixes.push({ id: 'hashtags_few', message: 'Add 3–15 relevant hashtags.' });
    score -= 10;
  }
  if (hashtags.length > HASHTAGS_MAX) {
    issues.push({ id: 'hashtags_many', message: `Too many hashtags (${hashtags.length}).`, severity: 'low' });
    score -= 5;
  }
  labels.hashtags_count = hashtags.length;

  score = Math.max(0, Math.min(100, score));
  labels.score = score;

  return {
    score,
    labels,
    issues: issues.slice(0, 10),
    fixes: fixes.slice(0, 10),
  };
}
