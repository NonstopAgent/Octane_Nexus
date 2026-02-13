/**
 * Canonical post status values for the pipeline: Idea -> Scripting -> Filming -> Ready -> Scheduled/Posted
 * Use these everywhere to avoid drift (Kanban, simulator, server actions, Post Lab).
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
