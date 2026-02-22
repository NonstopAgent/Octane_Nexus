/**
 * API keys stored server-side in Supabase (user_api_keys).
 * Uses createClientComponentClient for cookie-based auth. All functions are async.
 * UI can listen for KEYS_CHANGED_EVENT to react when keys change.
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const KEYS_CHANGED_EVENT = 'KEYS_CHANGED_EVENT';

export type ApiKeyKind = 'openai' | 'pexels' | 'rapidapi';

function dispatchKeysChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(KEYS_CHANGED_EVENT));
  }
}

/**
 * Get the current user's stored key for the given kind, or null if not set or not authenticated.
 */
export async function getStoredKey(kind: ApiKeyKind): Promise<string | null> {
  const supabase = createClientComponentClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('user_api_keys')
    .select('key_value')
    .eq('user_id', user.id)
    .eq('key_kind', kind)
    .maybeSingle();
  if (error || !data?.key_value) return null;
  return data.key_value as string;
}

/**
 * Set (upsert) the current user's key for the given kind. Dispatches KEYS_CHANGED_EVENT.
 */
export async function setStoredKey(kind: ApiKeyKind, value: string | null): Promise<void> {
  const supabase = createClientComponentClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const trimmed = value != null ? value.trim() : '';
  if (trimmed === '') {
    await supabase
      .from('user_api_keys')
      .delete()
      .eq('user_id', user.id)
      .eq('key_kind', kind);
  } else {
    await supabase
      .from('user_api_keys')
      .upsert(
        { user_id: user.id, key_kind: kind, key_value: trimmed, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,key_kind' }
      );
  }
  dispatchKeysChanged();
}

/**
 * Delete the current user's key for the given kind. Dispatches KEYS_CHANGED_EVENT.
 */
export async function deleteStoredKey(kind: ApiKeyKind): Promise<void> {
  const supabase = createClientComponentClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('user_api_keys')
    .delete()
    .eq('user_id', user.id)
    .eq('key_kind', kind);
  dispatchKeysChanged();
}

/**
 * Return true if the current user has a stored key for the given kind.
 */
export async function hasStoredKey(kind: ApiKeyKind): Promise<boolean> {
  const value = await getStoredKey(kind);
  return typeof value === 'string' && value.trim().length > 0;
}
