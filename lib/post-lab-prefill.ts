/** SessionStorage key for passing playbook format from Library to Post Lab */
export const POST_LAB_PREFILL_KEY = 'octane_post_lab_prefill';

export type PostLabPrefill = {
  hookTemplate: string;
  scriptScaffold: string;
};

export function getPostLabPrefill(): PostLabPrefill | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(POST_LAB_PREFILL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PostLabPrefill;
    if (!parsed || typeof parsed.hookTemplate !== 'string') return null;
    return {
      hookTemplate: parsed.hookTemplate ?? '',
      scriptScaffold: typeof parsed.scriptScaffold === 'string' ? parsed.scriptScaffold : '',
    };
  } catch {
    return null;
  }
}

export function clearPostLabPrefill(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(POST_LAB_PREFILL_KEY);
  } catch {
    // ignore
  }
}
