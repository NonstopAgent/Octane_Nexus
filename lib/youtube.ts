/**
 * YouTube API helper for fetching creator videos.
 * Requires YOUTUBE_API_KEY in env.
 */

export type YouTubeVideo = {
  id: string;
  title: string;
  thumbnail: string;
  channelName: string;
};

export async function fetchCreatorVideos(query: string): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn('YOUTUBE_API_KEY not set, returning empty videos');
    return [];
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('q', query);
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', '4');
  url.searchParams.set('key', apiKey);

  try {
    const res = await fetch(url.toString());
    const data = await res.json();

    if (!res.ok) {
      console.error('YouTube API error:', data);
      return [];
    }

    const items = data.items || [];
    return items.map((item: { id: { videoId: string }; snippet: { title: string; thumbnails: { high?: { url: string }; medium?: { url: string }; default?: { url: string } }; channelTitle: string } }) => ({
      id: item.id?.videoId || '',
      title: item.snippet?.title || '',
      thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
      channelName: item.snippet?.channelTitle || '',
    })).filter((v: YouTubeVideo) => v.id);
  } catch (err) {
    console.error('fetchCreatorVideos error:', err);
    return [];
  }
}
