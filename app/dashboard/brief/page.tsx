'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Loader2,
  Sunrise,
  Search,
  Plus,
  Trash2,
  Sparkles,
  ExternalLink,
  TrendingUp,
  Zap,
  Flame,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';

type TrackedChannel = {
  id: string;
  youtube_channel_id: string;
  channel_title: string;
  channel_handle: string | null;
  thumbnail_url: string | null;
  recent_videos: unknown;
};

type SearchChannel = {
  id: string;
  title: string;
  handle: string | null;
  thumbnailUrl: string;
  subscriberCount: number;
};

type CompetitorInsight = {
  channel: string;
  video_title: string;
  video_id: string;
  view_count: number;
  why_it_worked: string;
  hook_pattern: string;
  // New outlier detection fields (may be absent on older briefs)
  outlier_score?: number;
  outlier_tier?: 'standard' | 'strong' | 'super';
  baseline_views?: number;
};

type DailyBriefRow = {
  id: string;
  brief_date: string;
  competitor_insights: CompetitorInsight[];
  your_patterns: Array<{
    insight: string;
    evidence: string[];
    confidence: string;
  }>;
  todays_idea: {
    hook: string;
    title: string;
    thumbnail_concepts: string[];
    outline: string;
    format: string;
    why_now: string;
  };
  generated_at: string;
};

/** Renders the outlier tier badge next to a competitor insight */
function OutlierBadge({ tier, score }: { tier?: string; score?: number }) {
  if (!tier || !score) return null;

  const config = {
    super: {
      label: `${score.toFixed(1)}x · Super Outlier`,
      icon: <Flame className="h-3 w-3" />,
      className: 'border-rose-500/40 bg-rose-500/10 text-rose-400',
    },
    strong: {
      label: `${score.toFixed(1)}x · Strong Outlier`,
      icon: <Zap className="h-3 w-3" />,
      className: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
    },
    standard: {
      label: `${score.toFixed(1)}x · Outlier`,
      icon: <TrendingUp className="h-3 w-3" />,
      className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    },
  }[tier] ?? null;

  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${config.className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

export default function DailyBriefPage() {
  const [brief, setBrief] = useState<DailyBriefRow | null>(null);
  const [briefLoading, setBriefLoading] = useState(true);
  const [channels, setChannels] = useState<TrackedChannel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchChannel[]>([]);
  const [searching, setSearching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const loadBrief = useCallback(async () => {
    setBriefLoading(true);
    try {
      const res = await fetch('/api/brief/today', { credentials: 'include' });
      if (!res.ok) {
        setBrief(null);
        return;
      }
      const data = await res.json();
      setBrief(data.brief || null);
    } catch {
      setBrief(null);
    } finally {
      setBriefLoading(false);
    }
  }, []);

  const loadChannels = useCallback(async () => {
    setChannelsLoading(true);
    try {
      const res = await fetch('/api/tracked-channels', { credentials: 'include' });
      if (!res.ok) {
        setChannels([]);
        return;
      }
      const data = await res.json();
      setChannels(data.channels || []);
    } catch {
      setChannels([]);
    } finally {
      setChannelsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBrief();
    loadChannels();
  }, [loadBrief, loadChannels]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/youtube/search-channels?q=${encodeURIComponent(q)}`,
          { credentials: 'include' }
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.channels || []);
        } else {
          setSearchResults([]);
          if (res.status !== 401) {
            const err = await res.json().catch(() => ({}));
            toast.error((err as { error?: string }).error || 'Search failed');
          }
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  async function addChannel(c: SearchChannel) {
    setAddingId(c.id);
    try {
      const res = await fetch('/api/tracked-channels', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtube_channel_id: c.id,
          channel_title: c.title,
          channel_handle: c.handle,
          thumbnail_url: c.thumbnailUrl || null,
          subscriber_count: c.subscriberCount,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Could not add channel');
      }
      toast.success(`Tracking ${c.title}`);
      setQuery('');
      setSearchResults([]);
      loadChannels();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add');
    } finally {
      setAddingId(null);
    }
  }

  async function removeChannel(id: string) {
    try {
      const res = await fetch(`/api/tracked-channels?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || 'Remove failed');
      }
      toast.success('Channel removed');
      loadChannels();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove');
    }
  }

  async function generateBrief() {
    if (channels.length === 0) {
      toast.error('Add at least one competitor channel before generating a brief.');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/brief/generate', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 422) {
        toast.error(
          (data as { error?: string }).error ||
            'Connect YouTube and import videos, or add a competitor channel first.'
        );
        return;
      }
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Generation failed');
      }
      toast.success('Brief generated');
      await loadBrief();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <DashboardPageHeader
        title="Daily Brief"
        subtitle="Morning intelligence: your niche, your channel, one idea to film."
        icon={<Sunrise className="h-5 w-5" />}
        actions={
          <button
            type="button"
            onClick={() => generateBrief()}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate today&apos;s brief
          </button>
        }
      />

      {/* Competitor channels section */}
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
        <h2 className="text-lg font-semibold text-slate-100">Competitor channels</h2>
        <p className="mt-1 text-sm text-slate-400">
          Track up to 3 channels. We cache recent uploads nightly and run outlier analysis on them.{' '}
          <Link href="/dashboard/memory" className="text-amber-400 hover:underline">
            Connect YouTube
          </Link>{' '}
          to import your own performance data.
        </p>

        {/* Channel search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search YouTube channels…"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-500" />
          )}
        </div>

        {searchResults.length > 0 && (
          <ul className="mt-3 space-y-2 rounded-xl border border-slate-800 bg-slate-950/80 p-2">
            {searchResults.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-slate-800/50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {c.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.thumbnailUrl}
                      alt=""
                      className="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-slate-800" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-200">{c.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      {c.handle ? `@${c.handle.replace(/^@/, '')}` : c.id}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={channels.length >= 3 || addingId === c.id}
                  onClick={() => addChannel(c)}
                  className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40"
                >
                  {addingId === c.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Track
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Tracked channels list */}
        <div className="mt-4 space-y-2">
          {channelsLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : channels.length === 0 ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-medium text-amber-300">No channels tracked yet</p>
              <p className="mt-1 text-xs text-slate-400">
                Search above and add at least one competitor channel. The brief uses their recent
                uploads to find what&apos;s outperforming their baseline — so you know what to
                model.
              </p>
            </div>
          ) : (
            channels.map((ch) => (
              <div
                key={ch.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {ch.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ch.thumbnail_url}
                      alt=""
                      className="h-9 w-9 flex-shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-9 w-9 flex-shrink-0 rounded-lg bg-slate-800" />
                  )}
                  <span className="truncate font-medium text-slate-200">{ch.channel_title}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeChannel(ch.id)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-rose-400"
                  aria-label="Remove channel"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Brief content section */}
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
        <h2 className="text-lg font-semibold text-slate-100">Today&apos;s brief</h2>
        {briefLoading ? (
          <div className="mt-4 flex items-center gap-2 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : !brief ? (
          <div className="mt-4 space-y-3 text-sm text-slate-400">
            <p>No brief for today yet.</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                <Link href="/dashboard/memory" className="text-amber-400 hover:underline">
                  Connect YouTube
                </Link>{' '}
                and import your videos (for your performance patterns).
              </li>
              <li>Add at least one competitor channel above (for niche signals).</li>
              <li>Click &quot;Generate today&apos;s brief&quot;.</li>
            </ol>
            {channels.length === 0 && (
              <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-amber-200/80">
                Start by adding a competitor channel above — the brief needs at least one channel to
                run outlier analysis against.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            <p className="text-xs text-slate-500">
              Generated {new Date(brief.generated_at).toLocaleString()}
            </p>

            {/* Competitor insights with outlier scores */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-400/90">
                What&apos;s working in your niche
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Videos that outperformed their channel&apos;s own baseline — not just popular
                videos, but ones that broke out relative to what that channel normally gets.
              </p>
              {brief.competitor_insights?.length ? (
                <ul className="mt-3 space-y-4">
                  {brief.competitor_insights.map((item, i) => (
                    <li
                      key={`${item.video_id}-${i}`}
                      className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-medium text-slate-100">{item.video_title}</p>
                        <OutlierBadge tier={item.outlier_tier} score={item.outlier_score} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.channel} · {item.view_count.toLocaleString()} views
                        {item.baseline_views ? (
                          <span className="text-slate-600">
                            {' '}(channel avg: {item.baseline_views.toLocaleString()})
                          </span>
                        ) : null}
                        {' · '}
                        <span className="text-amber-400/90">{item.hook_pattern}</span>
                      </p>
                      <p className="mt-2 text-sm text-slate-300">{item.why_it_worked}</p>
                      <a
                        href={`https://www.youtube.com/watch?v=${encodeURIComponent(item.video_id)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-amber-400 hover:underline"
                      >
                        Open on YouTube <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-500">No competitor signals in this brief.</p>
              )}
            </div>

            {/* Your patterns */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-400/90">
                Your patterns
              </h3>
              <ul className="mt-3 space-y-3">
                {(brief.your_patterns || []).map((p, i) => (
                  <li key={i} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                    <p className="text-slate-100">{p.insight}</p>
                    {p.evidence?.length ? (
                      <ul className="mt-2 list-disc pl-5 text-xs text-slate-400">
                        {p.evidence.map((e, j) => (
                          <li key={j}>{e}</li>
                        ))}
                      </ul>
                    ) : null}
                    <p className="mt-1 text-xs uppercase text-slate-600">
                      confidence: {p.confidence}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Today's idea */}
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-400">
                Today&apos;s idea
              </h3>
              <p className="mt-2 text-lg font-semibold text-slate-50">{brief.todays_idea?.title}</p>
              <p className="mt-2 text-sm italic text-slate-300">
                &ldquo;{brief.todays_idea?.hook}&rdquo;
              </p>
              <p className="mt-2 text-xs text-slate-500">Format: {brief.todays_idea?.format}</p>
              <p className="mt-3 text-sm text-slate-300">{brief.todays_idea?.outline}</p>
              <p className="mt-2 text-sm text-emerald-300/90">{brief.todays_idea?.why_now}</p>
              {(brief.todays_idea?.thumbnail_concepts || []).length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Thumbnail concepts
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-400">
                    {brief.todays_idea.thumbnail_concepts.map((t, i) => (
                      <li key={i}>
                        <span className="text-slate-600">{i + 1}.</span> {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
