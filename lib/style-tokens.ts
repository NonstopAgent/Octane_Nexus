/**
 * Style token types: caption_style, intro_pattern, cta_pattern, pacing.
 * Used in style_tokens.tokens JSONB and when applying to generation/eval.
 */

export type CaptionStyle = {
  fontFamily?: string;
  fontWeight?: string;
  fontSize?: number;
  position?: 'bottom' | 'center' | 'top';
  maxLines?: number;
  outline?: boolean;
  shadow?: boolean;
};

export type IntroPattern = {
  enabled?: boolean;
  textTemplate?: string;
};

export type CtaPattern = {
  enabled?: boolean;
  template?: string;
};

export type Pacing = {
  maxSentenceLength?: number;
  cutEverySeconds?: number;
  patternInterruptEverySeconds?: number;
};

export type StyleTokensPayload = {
  caption_style?: CaptionStyle;
  intro_pattern?: IntroPattern;
  cta_pattern?: CtaPattern;
  pacing?: Pacing;
};

export type StyleTokenRow = {
  id: string;
  user_id: string;
  name: string;
  tokens: StyleTokensPayload;
  is_default: boolean;
  created_at: string;
};

export const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  fontFamily: 'Inter',
  fontWeight: '600',
  fontSize: 18,
  position: 'bottom',
  maxLines: 2,
  outline: true,
  shadow: true,
};

export const DEFAULT_INTRO_PATTERN: IntroPattern = {
  enabled: false,
  textTemplate: '{{title}} — watch this.',
};

export const DEFAULT_CTA_PATTERN: CtaPattern = {
  enabled: true,
  template: 'Follow for more. Like & save if this helped.',
};

export const DEFAULT_PACING: Pacing = {
  maxSentenceLength: 120,
  cutEverySeconds: 8,
  patternInterruptEverySeconds: 30,
};

export const DEFAULT_STYLE_TOKENS: StyleTokensPayload = {
  caption_style: DEFAULT_CAPTION_STYLE,
  intro_pattern: DEFAULT_INTRO_PATTERN,
  cta_pattern: DEFAULT_CTA_PATTERN,
  pacing: DEFAULT_PACING,
};

/** Apply CTA template: replace {{cta}} with script CTA or use template as fallback. */
export function applyCtaTemplate(template: string | undefined, scriptCta: string | null): string {
  const t = (template ?? DEFAULT_CTA_PATTERN.template) ?? '';
  if (!t) return scriptCta ?? '';
  if (t.includes('{{cta}}')) return t.replace(/\{\{cta\}\}/g, scriptCta?.trim() || 'Follow for more.');
  return scriptCta?.trim() || t;
}

/** Apply intro template: replace {{title}} with title. */
export function applyIntroTemplate(textTemplate: string | undefined, title: string | null): string {
  const t = (textTemplate ?? DEFAULT_INTRO_PATTERN.textTemplate) ?? '';
  if (!t) return title ?? '';
  return t.replace(/\{\{title\}\}/g, title?.trim() || 'Untitled');
}

/** Truncate to max lines (approx by newlines and line length). */
export function truncateToMaxLines(text: string, maxLines: number, charsPerLine = 40): string {
  if (maxLines < 1) return text;
  const lines = text.split(/\n/).slice(0, maxLines);
  return lines
    .map((l) => (l.length <= charsPerLine ? l : l.slice(0, charsPerLine - 1) + '…'))
    .join('\n');
}
