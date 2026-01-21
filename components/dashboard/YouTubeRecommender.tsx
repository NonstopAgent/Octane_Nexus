'use client';

import { useState, useEffect } from 'react';
import { Play, ExternalLink, Loader2, ArrowRight } from 'lucide-react';
import { generateVideoInspiration } from '@/lib/gemini';
import ScrollableRow from '@/components/ui/ScrollableRow';

type VideoInspiration = {
  title: string;
  channelName: string;
  views: string;
  thumbnailColor: string;
};

type YouTubeVideo = {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  duration: string;
  views?: string;
};

type YouTubeRecommenderProps = {
  niche?: string;
};

export default function YouTubeRecommender({ niche }: YouTubeRecommenderProps) {
  // Use provided niche or get from localStorage
  const [currentNiche] = useState<string>(() => {
    if (niche) return niche;
    if (typeof window !== 'undefined') {
      const storedVision = localStorage.getItem('brand_vision');
      if (storedVision) {
        const words = storedVision.split(/\s+/).slice(0, 3).join(' ');
        return words || 'content creator';
      }
    }
    return 'content creator';
  });

  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch video inspiration from Gemini
  useEffect(() => {
    async function loadVideoInspiration() {
      setLoading(true);
      setError(null);

      try {
        const inspiration = await generateVideoInspiration(currentNiche);
        
        // Convert Gemini response to component format
        const formattedVideos: YouTubeVideo[] = inspiration.map((item, index) => {
          // Generate thumbnail URL based on color
          const encodedTitle = encodeURIComponent(item.title.substring(0, 30));
          const thumbnail = `https://via.placeholder.com/320x180/${item.thumbnailColor}/ffffff?text=${encodedTitle}`;
          
          // Generate mock duration (in production, this would come from YouTube API)
          const durations = ['8:42', '12:15', '6:30', '9:22', '7:18'];
          const duration = durations[index] || '10:00';

          return {
            id: `gemini-${index}-${Date.now()}`,
            title: item.title,
            thumbnail,
            channel: item.channelName,
            duration,
            views: item.views
          };
        });

        setVideos(formattedVideos);
      } catch (err: any) {
        console.error('Failed to load video inspiration:', err);
        setError('Failed to load video recommendations');
      } finally {
        setLoading(false);
      }
    }

    loadVideoInspiration();
  }, [currentNiche]);

  function handleVideoClick(video: YouTubeVideo) {
    // Open YouTube link (mock - in production, use actual YouTube URLs)
    const youtubeUrl = `https://www.youtube.com/watch?v=${video.id}`;
    window.open(youtubeUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-50">Video Inspiration</h2>
        <button
          type="button"
          onClick={() => window.open('https://www.youtube.com', '_blank')}
          className="inline-flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300 transition"
        >
          View All
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <ScrollableRow>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-72 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 animate-pulse"
            >
              <div className="aspect-video bg-slate-800" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-slate-700 rounded w-3/4" />
                <div className="h-3 bg-slate-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </ScrollableRow>
      ) : error ? (
        <div className="text-center py-8 text-rose-400 text-sm">{error}</div>
      ) : videos.length > 0 ? (
        <ScrollableRow>
          {videos.map((video) => (
            <button
              key={video.id}
              type="button"
              onClick={() => handleVideoClick(video)}
              className="group relative flex-shrink-0 w-72 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all hover:scale-105"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-slate-800">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback if image fails to load
                    e.currentTarget.src = 'https://via.placeholder.com/320x180/1e293b/64748b?text=Video';
                  }}
                />
                
                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
                  <div className="rounded-full bg-amber-500 p-3">
                    <Play className="h-6 w-6 text-slate-950 fill-slate-950" />
                  </div>
                </div>

                {/* Duration Badge */}
                <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/80 text-xs text-white">
                  {video.duration}
                </div>
              </div>

              {/* Video Info */}
              <div className="p-3 space-y-1">
                <h3 className="text-sm font-semibold text-slate-100 line-clamp-2 text-left group-hover:text-amber-400 transition">
                  {video.title}
                </h3>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400 text-left">{video.channel}</p>
                  {video.views && (
                    <p className="text-xs text-slate-500 text-right">{video.views}</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </ScrollableRow>
      ) : (
        <div className="text-center py-8 text-slate-400 text-sm">No videos found</div>
      )}
    </div>
  );
}
