'use client';

import { useState, useEffect, useCallback } from 'react';
import { Brain, Plus, Loader2, Star, Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import StatusChip from '@/components/ui/StatusChip';

type ArtifactType =
  | 'script' | 'hook' | 'caption' | 'idea'
  | 'post' | 'note' | 'feedback' | 'voice_sample';

type Artifact = {
  id: string;
  artifact_type: ArtifactType;
  title: string | null;
  content: string;
  platform: string | null;
  topic: string | null;
  source: string;
  starred: boolean;
  user_rating: number | null;
  created_at: string;
};

const FILTER_TYPES: { value: 'all' | ArtifactType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'script', label: 'Scripts' },
  { value: 'hook', label: 'Hooks' },
  { value: 'idea', label: 'Ideas' },
  { value: 'caption', label: 'Captions' },
  { value: 'note', label: 'Notes' },
];

export default function MemoryPage() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | ArtifactType>('all');
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState<ArtifactType>('script');
  const [newContent, setNewContent] = useState('');
  const [newTitle, setNewTitle] = useState('');

  const loadArtifacts = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === 'all'
        ? '/api/memory/artifacts?limit=100'
        : `/api/memory/artifacts?type=${filter}&limit=100`;
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setArtifacts(data.artifacts || []);
      } else if (res.status === 401) {
        toast.error('Please sign in to view your memory');
      } else {
        setArtifacts([]);
      }
    } catch {
      setArtifacts([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadArtifacts();
  }, [loadArtifacts]);

  async function handleAdd() {
    const content = newContent.trim();
    if (!content) {
      toast.error('Content is required');
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/memory/artifacts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artifact_type: newType,
          content,
          title: newTitle.trim() || undefined,
          source: 'user_input',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || 'Failed to add');
      }
      setNewContent('');
      setNewTitle('');
      toast.success('Added to memory');
      loadArtifacts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Memory"
        subtitle="Your AI's long-term context. The more you save, the smarter Nexus gets about your work."
        icon={<Brain className="h-5 w-5" />}
        actions={<StatusChip variant="beta" />}
      />

      {/* Add new artifact */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-slate-100">Add to memory</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as ArtifactType)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-amber-400 focus:outline-none"
          >
            <option value="script">Script</option>
            <option value="hook">Hook</option>
            <option value="idea">Idea</option>
            <option value="caption">Caption</option>
            <option value="note">Note</option>
            <option value="feedback">Feedback</option>
          </select>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title (optional)"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
          />
        </div>

        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Paste a script you've written, a hook that worked, an idea, or anything you want Nexus to remember..."
          rows={4}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none resize-none"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || !newContent.trim()}
            className="inline-flex items-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:border-amber-400 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {adding ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving</> : <><Plus className="h-4 w-4" /> Save to memory</>}
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TYPES.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              filter === f.value
                ? 'bg-amber-500 text-slate-950'
                : 'border border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Artifact list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
        </div>
      ) : artifacts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center">
          <Brain className="mx-auto mb-3 h-10 w-10 text-slate-700" />
          <h3 className="text-base font-semibold text-slate-200">Your memory is empty</h3>
          <p className="mt-1 text-sm text-slate-500">
            Add scripts, hooks, or ideas you&apos;ve written. Or chat with Nexus and tap the bookmark on responses you like.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {artifacts.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-semibold uppercase tracking-wide text-amber-300">
                    {a.artifact_type}
                  </span>
                  {a.source === 'chat_save' && (
                    <span className="flex items-center gap-1 text-slate-500">
                      <Bookmark className="h-3 w-3" /> from chat
                    </span>
                  )}
                  {a.starred && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
              </div>
              {a.title && <p className="mt-2 text-sm font-medium text-slate-100">{a.title}</p>}
              <p className="mt-1 text-sm text-slate-300 whitespace-pre-wrap break-words">
                {a.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
