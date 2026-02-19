/**
 * Minimal finance disclaimer scaffold: heuristics and reminder logic.
 * Used by Post Lab to show "consider adding not financial advice" when niche suggests finance.
 */

const FINANCE_NICHE_KEYWORDS = ['trading', 'stocks', 'crypto', 'invest', 'market', 'finance', 'financial'];
const DISCLAIMER_PHRASES = ['not financial advice', 'not financial advise', 'nfa', 'not investment advice'];

export function isFinanceNiche(niche: string | null | undefined): boolean {
  if (!niche || typeof niche !== 'string') return false;
  const lower = niche.toLowerCase();
  return FINANCE_NICHE_KEYWORDS.some((k) => lower.includes(k));
}

export function captionHasDisclaimer(caption: string | null | undefined): boolean {
  if (!caption || typeof caption !== 'string') return false;
  const lower = caption.toLowerCase();
  return DISCLAIMER_PHRASES.some((p) => lower.includes(p));
}

export function shouldShowFinanceReminder(
  enabled: boolean,
  niche: string | null | undefined,
  caption: string | null | undefined
): boolean {
  return Boolean(enabled && isFinanceNiche(niche) && !captionHasDisclaimer(caption));
}
