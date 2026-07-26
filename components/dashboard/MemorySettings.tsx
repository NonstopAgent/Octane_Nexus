'use client';

import { useEffect, useState, useCallback } from 'react';
import { Brain, Trash2, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Memory, as a settings panel rather than a destination.
 *
 * Memory used to be a top-level sidebar tab with a paste-a-script form and
 * a "Save to memory" button on chat replies. That put the burden on the
 * creator to notice the feature, decide something was worth keeping, and
 * file it by hand — so in practice nothing ever got saved and Nexus stayed
 * generic.
 *
 * Now capture is automatic (see app/api/nexus-chat) and this panel is the
 * control surface: see what was remembered, delete anything that shouldn't
 * have been. That is the only honest way to do implicit memory — if a user
 * can't inspect and remove it, it isn't memory, it's surveillance.
 */

type Artifact = {
  id: string;
  artifact_type: string;
  title: string | null;
  content: string;
  source: string;
  created_at: string;
};

export default function MemorySettings() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/memory/artifacts?limit=25', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setArtifacts(Array.isArray(data.artifacts) ? data.artifacts : []);
    } catch {
      setArtifacts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/memory/artifacts?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Delete failed');
      setArtifacts((prev) => prev.filter((a) => a.id !== id));
      toast.success('Removed from memory');
    } catch {
      toast.error('Could not remove that memory');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
          <Brain className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-50">Memory</h2>
          <p className="text-xs text-slate-500">
            Nexus remembers your conversations automatically. Anything here shapes
            future briefs and answers.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading memory…
        </div>
      ) : artifacts.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/40 px-4 py-6 text-center">
          <Sparkles className="mx-auto mb-2 h-5 w-5 text-slate-600" aria-hidden />
          <p className="text-sm text-slate-400">Nothing remembered yet.</p>
          <p className="mt-1 text-xs text-slate-500">
            Chat with Nexus and it will start building context on its own — no
            saving required.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {artifacts.map((a) => (
            <li
              key={a.id}
              className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-slate-200">
                    {a.title || a.content.slice(0, 60)}
                  </p>
                  {a.source === 'auto_capture' ? (
                    <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                      auto
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                  {a.content}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(a.id)}
                disabled={deletingId === a.id}
                aria-label="Remove from memory"
                className="shrink-0 rounded-lg border border-slate-700 p-2 text-slate-500 transition hover:border-red-500/50 hover:text-red-400 disabled:opacity-50"
              >
                {deletingId === a.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
