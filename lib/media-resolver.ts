/**
 * Resolve storage paths to short-lived signed URLs.
 * Used by APIs and by GET /api/media/signed-url.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const CLIP_OUTPUTS_BUCKET = 'clip-outputs';
const CLIP_UPLOADS_BUCKET = 'clip-uploads';
const EXPIRE_SEC = 3600;

/**
 * Returns true if the value looks like a private storage path (not a full URL).
 */
export function isStoragePath(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  const t = value.trim();
  return t.startsWith('clips/') || (t.length > 0 && !t.startsWith('http://') && !t.startsWith('https://') && !t.startsWith('blob:'));
}

/**
 * Get bucket for a storage path.
 * - clips/* → clip-outputs
 * - else (e.g. userId/uuid.mp4) → clip-uploads
 */
export function bucketForPath(path: string): string {
  return path.startsWith('clips/') ? CLIP_OUTPUTS_BUCKET : CLIP_UPLOADS_BUCKET;
}

/**
 * Create a short-lived signed URL for playback (inline).
 */
export async function createSignedPlaybackUrl(
  storagePath: string,
  client: SupabaseClient
): Promise<string | null> {
  const bucket = bucketForPath(storagePath);
  const { data, error } = await client.storage.from(bucket).createSignedUrl(storagePath, EXPIRE_SEC);
  if (error || !data) return null;
  return (data as { signedUrl?: string })?.signedUrl ?? (data as { url?: string })?.url ?? null;
}

/**
 * Create a short-lived signed URL with download disposition.
 */
export async function createSignedDownloadUrl(
  storagePath: string,
  client: SupabaseClient,
  filename?: string
): Promise<string | null> {
  const bucket = bucketForPath(storagePath);
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(storagePath, EXPIRE_SEC, { download: filename || true });
  if (error || !data) return null;
  return (data as { signedUrl?: string })?.signedUrl ?? (data as { url?: string })?.url ?? null;
}

/**
 * Resolve final_video_url or background_video_url: if it's a storage path, return signed URL; else return as-is.
 */
export async function resolveVideoUrl(
  urlOrPath: string | null | undefined,
  client: SupabaseClient
): Promise<string> {
  const v = (urlOrPath ?? '').trim();
  if (!v) return '';
  if (!isStoragePath(v)) return v;
  const signed = await createSignedPlaybackUrl(v, client);
  return signed ?? v;
}

export type ResolvedVideoFields = {
  final_video_path?: string | null;
  final_video_url: string;
  background_video_path?: string | null;
  background_video_url: string;
};

/**
 * Resolve post video fields for API responses: raw path when stored as path, signed URL for playback.
 */
export async function resolvePostVideoFields(
  finalVideoUrl: string | null | undefined,
  backgroundVideoUrl: string | null | undefined,
  client: SupabaseClient
): Promise<ResolvedVideoFields> {
  const finalRaw = (finalVideoUrl ?? '').trim();
  const bgRaw = (backgroundVideoUrl ?? '').trim();
  const [finalPlayable, bgPlayable] = await Promise.all([
    finalRaw ? resolveVideoUrl(finalRaw, client) : Promise.resolve(''),
    bgRaw ? resolveVideoUrl(bgRaw, client) : Promise.resolve(''),
  ]);
  return {
    final_video_path: finalRaw && isStoragePath(finalRaw) ? finalRaw : undefined,
    final_video_url: finalPlayable || finalRaw,
    background_video_path: bgRaw && isStoragePath(bgRaw) ? bgRaw : undefined,
    background_video_url: bgPlayable || bgRaw,
  };
}
