/**
 * Octane Nexus MVP – Shared constants
 */

/** Post pipeline statuses (creator daily loop) */
export const POST_STATUS = {
  IDEA: 'idea',
  SCRIPTING: 'scripting',
  FILMING: 'filming',
  READY: 'ready',
  SCHEDULED: 'scheduled',
  POSTED: 'posted',
} as const;

export type PostStatus = (typeof POST_STATUS)[keyof typeof POST_STATUS];

/** Demo user ID when NEXT_PUBLIC_DEMO_MODE=true and no auth session */
export const DEMO_USER_ID = 'demo_user_mvp_v1';
