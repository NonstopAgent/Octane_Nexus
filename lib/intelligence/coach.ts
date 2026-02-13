import type {
  TimingPatternSummary,
  FormatPatternSummary,
  CrossPlatformSummary,
} from './patterns';

function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}

// TODO: Future: AI-enhanced personalized advice, niche-aware strategy shifts, automated posting schedule adjustments.
export function generateTimingAdvice(summary: TimingPatternSummary): string {
  const parts: string[] = [];
  if (summary.topHours.length > 0) {
    const times = summary.topHours.map(formatHour).join(' and ');
    parts.push(`Your audience tends to engage most when you post around ${times}. Try scheduling more content in that window.`);
  } else {
    parts.push('Post at consistent times so we can learn when your audience is most active.');
  }
  if (summary.topHours.length > 0) {
    parts.push(`Posting around ${formatHour(summary.lowestHour)} has been your weakest slot—consider avoiding that time or testing a different type of content there.`);
  }
  return parts.join(' ');
}

export function generateFormatAdvice(summary: FormatPatternSummary): string {
  const parts: string[] = [];
  if (summary.bestFormat) {
    const label = summary.bestFormat === 'unknown' ? 'your top-performing format' : summary.bestFormat;
    parts.push(`${label} is working well for you. Lean into it and create more of that.`);
  }
  if (summary.weakestFormat && summary.weakestFormat !== summary.bestFormat) {
    const label = summary.weakestFormat === 'unknown' ? 'your lowest-performing format' : summary.weakestFormat;
    parts.push(`Consider posting less ${label} or refining how you use it.`);
  }
  return parts.length > 0 ? parts.join(' ') : 'Keep posting consistently so we can spot which formats resonate.';
}

export function generatePlatformAdvice(summary: CrossPlatformSummary): string {
  const parts: string[] = [];
  const strong = summary.strongestPlatform;
  const weak = summary.weakestPlatform;
  parts.push(`${strong} is your strongest platform right now. Prioritize it while you build momentum.`);
  if (strong !== weak) {
    parts.push(`Review your strategy on ${weak}—either double down with a new approach or shift more energy to where you're already winning.`);
  }
  return parts.join(' ');
}
