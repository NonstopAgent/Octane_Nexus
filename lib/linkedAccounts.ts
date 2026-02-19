/**
 * Helpers for displaying linked social account handles.
 * Rule: show @username ONLY when truly connected (non-empty handle; optional connected flag).
 * Otherwise show "Not connected".
 */

export type PlatformKey = 'instagram' | 'tiktok' | 'x' | 'youtube';

export type LinkedAccountsShape =
  | Record<string, string | null | undefined>
  | { connected?: boolean; username?: string; [key: string]: unknown }
  | null
  | undefined;

/**
 * Returns display string for a platform from linked_accounts.
 * - If platform has a non-empty handle/username and (if present) connected is true, returns "@{handle}".
 * - Otherwise returns "Not connected".
 */
export function getDisplayHandle(
  linkedAccounts: LinkedAccountsShape,
  platform: PlatformKey
): string {
  if (!linkedAccounts || typeof linkedAccounts !== 'object') return 'Not connected';
  const raw = linkedAccounts[platform];
  if (typeof raw === 'string' && raw.trim()) {
    const handle = raw.trim();
    return handle.startsWith('@') ? handle : `@${handle}`;
  }
  const obj = linkedAccounts[platform] as { connected?: boolean; username?: string } | undefined;
  if (obj && typeof obj === 'object') {
    const connected = obj.connected !== false;
    const username = obj.username ?? (obj as Record<string, string>)['handle'];
    if (connected && typeof username === 'string' && username.trim())
      return username.trim().startsWith('@') ? username.trim() : `@${username.trim()}`;
  }
  return 'Not connected';
}

/**
 * Returns whether the platform is considered connected (non-empty handle).
 */
export function isPlatformConnected(
  linkedAccounts: LinkedAccountsShape,
  platform: PlatformKey
): boolean {
  return getDisplayHandle(linkedAccounts, platform) !== 'Not connected';
}
