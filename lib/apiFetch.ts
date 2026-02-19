/**
 * Fetch helper that adds x-demo-mode header when demo cookie is set.
 */

export function getDemoHeaders(): Record<string, string> {
  if (typeof document === 'undefined') return {};
  if (document.cookie.includes('octane_demo_mode=true')) {
    return { 'x-demo-mode': 'true' };
  }
  return {};
}

export function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const demo = getDemoHeaders();
  for (const [k, v] of Object.entries(demo)) {
    headers.set(k, v);
  }
  return fetch(url, { ...init, credentials: 'include', headers });
}
