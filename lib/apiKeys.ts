/**
 * Centralized browser-side API key storage.
 * Keys are persisted in localStorage; changes dispatch a window event
 * so any component (e.g. SystemStatusBanner) can react instantly.
 * Legacy keys are migrated once per page load (client-side only).
 */

export type ApiKeyKind = 'openai' | 'pexels' | 'rapidapi';

const STORAGE_KEYS: Record<ApiKeyKind, string> = {
  openai: 'octane:key:openai',
  pexels: 'octane:key:pexels',
  rapidapi: 'octane:key:rapidapi',
};

const LEGACY_KEYS: Record<ApiKeyKind, string[]> = {
  openai: ['octane_openai_key'],
  pexels: ['octane_pexels_key', 'octane_pexels_api_key'],
  rapidapi: ['octane_rapidapi_key'],
};

export const KEYS_CHANGED_EVENT = 'octane:keys_changed';

let migrationDone = false;

function migrateLegacyKeys(): void {
  if (typeof window === 'undefined' || migrationDone) return;
  migrationDone = true;
  let changed = false;
  for (const kind of Object.keys(STORAGE_KEYS) as ApiKeyKind[]) {
    const canonical = STORAGE_KEYS[kind];
    if (localStorage.getItem(canonical)) continue;
    const legacyNames = LEGACY_KEYS[kind];
    for (const legacy of legacyNames) {
      const value = localStorage.getItem(legacy);
      if (value && value.trim()) {
        localStorage.setItem(canonical, value.trim());
        changed = true;
        break;
      }
    }
  }
  if (changed) {
    window.dispatchEvent(new Event(KEYS_CHANGED_EVENT));
  }
}

export function getKey(kind: ApiKeyKind): string {
  if (typeof window === 'undefined') return '';
  migrateLegacyKeys();
  return localStorage.getItem(STORAGE_KEYS[kind]) ?? '';
}

export function setKey(kind: ApiKeyKind, value: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = value.trim();
  if (trimmed) {
    localStorage.setItem(STORAGE_KEYS[kind], trimmed);
  } else {
    localStorage.removeItem(STORAGE_KEYS[kind]);
  }
  window.dispatchEvent(new Event(KEYS_CHANGED_EVENT));
}

export function hasKey(kind: ApiKeyKind): boolean {
  return getKey(kind).length > 0;
}
