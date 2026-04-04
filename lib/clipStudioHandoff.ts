import type { ReadonlyURLSearchParams } from 'next/navigation';

export type ClipStudioHandoffParams = {
  mode: 'clipit' | null;
  sourceUrl: string | null;
  postId: string | null;
  title: string | null;
  channel: string | null;
  platformTarget: string | null;
  returnTo: string | null;
};

/**
 * Parse URL search params into Clip Studio handoff state.
 * Used by /dashboard/clip-studio to prefill from links (e.g. Trends, Video Inspiration).
 */
export function parseClipStudioParams(
  searchParams: ReadonlyURLSearchParams
): ClipStudioHandoffParams {
  const sourceUrl = searchParams.get('sourceUrl') ?? searchParams.get('source_url');
  const mode = sourceUrl ? 'clipit' : null;
  return {
    mode,
    sourceUrl: sourceUrl ?? null,
    postId: searchParams.get('postId') ?? null,
    title: searchParams.get('title') ?? null,
    channel: searchParams.get('channel') ?? null,
    platformTarget: searchParams.get('platformTarget') ?? null,
    returnTo: searchParams.get('returnTo') ?? null,
  };
}

export type BuildClipStudioHandoffUrlOptions = {
  sourceUrl: string;
  title?: string;
  channel?: string;
  platformTarget?: string;
  postId?: string;
  returnTo?: string;
};

/**
 * Build URL to /dashboard/clip-studio with query params for handoff.
 */
export function buildClipStudioHandoffUrl(options: BuildClipStudioHandoffUrlOptions): string {
  const params = new URLSearchParams();
  params.set('sourceUrl', options.sourceUrl);
  if (options.title) params.set('title', options.title);
  if (options.channel) params.set('channel', options.channel);
  if (options.platformTarget) params.set('platformTarget', options.platformTarget);
  if (options.postId) params.set('postId', options.postId);
  if (options.returnTo) params.set('returnTo', options.returnTo);
  return `/dashboard/clip-studio?${params.toString()}`;
}
