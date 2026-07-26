'use client';

import { useRouter } from 'next/navigation';
import { Play, ExternalLink, Scissors } from 'lucide-react';
import { buildClipStudioHandoffUrl } from '@/lib/clipStudioHandoff';

export type VideoInspirationItem = {
  id: string;
  title: string;
  thumbnail: string;
  channelName: string;
};

type VideoInspirationGridProps = {
  videos: VideoInspirationItem[];
  returnTo?: string;
};

export default function VideoInspirationGrid({ videos, returnTo = '/dashboard/library' }: VideoInspirationGridProps) {
  const router = useRouter();

  if (videos.length === 0) {
    // Never surface environment-variable names to a creator. This previously
    // read "Add YOUTUBE_API_KEY to your env to enable video recommendations",
    // which is an instruction only the operator can act on and reads as a
    // broken app to everyone else. The underlying cause (an expired shared
    // YouTube key) is an ops problem, not something the user can fix.
    return (
      <div className="text-center py-12 text-slate-400 text-sm">
        Video recommendations are temporarily unavailable. Everything else on
        this page still works.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {videos.map((video) => {
          const url = `https://www.youtube.com/watch?v=${video.id}`;
          return (
            <div
              key={video.id}
              className="group relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all hover:scale-[1.02]"
            >
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <div className="relative aspect-video bg-slate-800">
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-800" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
                    <div className="rounded-full bg-amber-500 p-3">
                      <Play className="h-6 w-6 text-slate-950 fill-slate-950" />
                    </div>
                  </div>
                </div>
              </a>
              <div className="p-3 space-y-2">
                <h3 className="text-sm font-semibold text-slate-100 line-clamp-2 group-hover:text-amber-400 transition">
                  {video.title}
                </h3>
                <p className="text-xs text-slate-400">{video.channelName}</p>
                <div className="flex items-center gap-2">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-amber-400 transition"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Watch
                  </a>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(buildClipStudioHandoffUrl({
                        sourceUrl: `https://www.youtube.com/watch?v=${video.id}`,
                        title: video.title,
                        channel: video.channelName,
                        platformTarget: 'youtube',
                        returnTo,
                      }));
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300 transition"
                  >
                    <Scissors className="h-3 w-3" />
                    Clip It
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
