/**
 * Client-safe: never use a storage path (e.g. clips/...) as video or image src.
 * Use this for any UI that sets video src from API data.
 */

function isStoragePath(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  const t = value.trim();
  return (
    t.startsWith('clips/') ||
    (t.length > 0 &&
      !t.startsWith('http://') &&
      !t.startsWith('https://') &&
      !t.startsWith('blob:'))
  );
}

/**
 * Returns the URL only if it is a playable URL (http/https/blob). Returns empty string for storage paths.
 */
export function getPlayableVideoUrl(url: string | null | undefined): string {
  const v = (url ?? '').trim();
  if (!v || isStoragePath(v)) return '';
  return v;
}
