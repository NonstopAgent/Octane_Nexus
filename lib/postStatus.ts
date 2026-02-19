/**
 * Canonical post status values for content_posts (and DB enum/casing).
 * Use these everywhere instead of hardcoded 'ready', 'scheduled', etc.
 */
export const POST_STATUS = {
  IDEA: 'idea',
  SCRIPTING: 'scripting',
  FILMING: 'filming',
  READY: 'ready',
  POSTED: 'posted',
  SCHEDULED: 'scheduled',
  GENERATING: 'generating',
} as const;

export type PostStatus = (typeof POST_STATUS)[keyof typeof POST_STATUS];

/** Statuses that appear in Post Lab queue */
export const POST_LAB_STATUSES = [POST_STATUS.FILMING, POST_STATUS.READY] as const;
