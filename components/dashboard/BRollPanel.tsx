'use client';

import { useState, useEffect, useCallback } from 'react';
import { Film, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

type SceneCandidate = {
  video_url: string;
  thumbnail_url: string;
  width?: number;
  height?: number;
};

type Scene = {
  idx: number;
  line: string;
  keywords: string[];
  pexels_query: string;
  selected_video_url?: string | null;
  candidates?: SceneCandidate[];
};

type BrollPack = {
  id: string;
  post_id: string;
  title: string;
  scenes: Scene[];
  created_at: string;
};

type BRollPanelProps = {
  postId: string;
  onBackgroundSet?: () => void;
};

export default function BRollPanel({ postId, onBackgroundSet }: BRollPanelProps) {
  const [pack, setPack] = useState<BrollPack | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);

  const fetchPack = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/broll/by-post?postId=${encodeURIComponent(postId)}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setPack(data ?? null);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPack();
  }, [fetchPack]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch('/api/broll/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ postId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? 'Generate failed');
        return;
      }
      setPack(data);
      toast.success('B-roll shot list generated');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSelect(sceneIdx: number, videoUrl: string) {
    const key = `${sceneIdx}-${videoUrl.slice(0, 40)}`;
    setSelecting(key);
    try {
      const res = await fetch('/api/broll/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ postId, sceneIdx, videoUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? 'Select failed');
        return;
      }
      setPack(data);
      toast.success('Set as background video');
      onBackgroundSet?.();
    } finally {
      setSelecting(null);
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wide flex items-center gap-2">
          <Film className="h-4 w-4" />
          B-Roll
        </h3>
        {!pack && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-500 bg-amber-500/20 px-3 py-1.5 text-sm font-medium text-amber-300 hover:bg-amber-500/30 disabled:opacity-50"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Generate B-Roll
          </button>
        )}
      </div>

      {loading && !pack && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      )}

      {pack && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            {pack.scenes.length} scenes. Select a clip to set as background video.
          </p>
          {pack.scenes.map((scene) => (
            <div
              key={scene.idx}
              className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 space-y-2"
            >
              <p className="text-sm font-medium text-slate-200 line-clamp-2">
                {scene.line}
              </p>
              {scene.keywords.length > 0 && (
                <p className="text-xs text-slate-500">
                  Keywords: {scene.keywords.join(', ')}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {(scene.candidates ?? []).map((c, i) => {
                  const isSelected = scene.selected_video_url === c.video_url;
                  const key = `${scene.idx}-${c.video_url.slice(0, 40)}`;
                  const busy = selecting === key;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelect(scene.idx, c.video_url)}
                      disabled={busy}
                      className={`relative rounded-lg overflow-hidden w-24 h-14 border-2 transition ${
                        isSelected
                          ? 'border-amber-500 ring-2 ring-amber-500/40'
                          : 'border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      {c.thumbnail_url ? (
                        <img
                          src={c.thumbnail_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                          <Film className="h-5 w-5 text-slate-500" />
                        </div>
                      )}
                      {isSelected && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Check className="h-6 w-6 text-amber-400" />
                        </span>
                      )}
                      {busy && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/60">
                          <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
                        </span>
                      )}
                      {!isSelected && !busy && (
                        <span className="absolute bottom-0 left-0 right-0 bg-black/70 py-0.5 text-[10px] text-center text-slate-200">
                          Select
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !pack && !generating && (
        <p className="text-xs text-slate-500">
          Generate a shot list from your script and pick stock B-roll per scene.
        </p>
      )}
    </div>
  );
}
