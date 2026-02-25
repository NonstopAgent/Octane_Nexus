type HandoffParams = {
  sourceUrl?: string;
  title?: string;
  channel?: string;
  platformTarget?: string;
  returnTo?: string;
  postId?: string;
};

type ClipStudioHandoff = {
  mode: 'clipit' | 'default';
  sourceUrl: string | null;
  title: string | null;
  channel: string | null;
  platformTarget: string | null;
  returnTo: string | null;
  postId: string | null;
};

export function buildClipStudioHandoffUrl(params: HandoffParams): string {
  const qs = new URLSearchParams();
  qs.set('mode', 'clipit');
  if (params.sourceUrl) qs.set('sourceUrl', params.sourceUrl);
  if (params.title) qs.set('title', params.title);
  if (params.channel) qs.set('channel', params.channel);
  if (params.platformTarget) qs.set('platformTarget', params.platformTarget);
  if (params.returnTo) qs.set('returnTo', params.returnTo);
  if (params.postId) qs.set('postId', params.postId);
  return `/dashboard/clip-studio?${qs.toString()}`;
}

export function parseClipStudioParams(
  searchParams: URLSearchParams | { get(key: string): string | null }
): ClipStudioHandoff {
  const mode = searchParams.get('mode') === 'clipit' ? 'clipit' : 'default';
  return {
    mode,
    sourceUrl: searchParams.get('sourceUrl'),
    title: searchParams.get('title'),
    channel: searchParams.get('channel'),
    platformTarget: searchParams.get('platformTarget'),
    returnTo: searchParams.get('returnTo'),
    postId: searchParams.get('postId'),
  };
}
