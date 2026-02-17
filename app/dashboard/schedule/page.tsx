'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Instagram,
  Youtube,
  Twitter,
  Music2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Image as ImageIcon,
  CheckCircle,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { SkeletonCardGrid } from '@/components/ui/SkeletonCard';
import StatusChip from '@/components/ui/StatusChip';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';

type Platform = 'instagram' | 'youtube' | 'x' | 'tiktok';

type ContentItem = {
  id: string;
  title?: string;
  media_url: string;
  caption: string;
  hashtags: string[];
  platform: Platform;
  scheduled_date: string | null;
  status: 'draft' | 'scheduled' | 'posted';
  created_at: string;
  source?: 'content_calendar' | 'content_posts';
};

function getPlatformStyles(platform: Platform) {
  switch (platform) {
    case 'youtube':
      return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/40' };
    case 'instagram':
      return { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/40' };
    case 'x':
      return { bg: 'bg-slate-900', text: 'text-slate-100', border: 'border-slate-600' };
    case 'tiktok':
      return { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/40' };
    default:
      return { bg: 'bg-slate-800/60', text: 'text-slate-100', border: 'border-slate-700' };
  }
}

function getPlatformIcon(platform: Platform) {
  switch (platform) {
    case 'youtube':
      return Youtube;
    case 'instagram':
      return Instagram;
    case 'x':
      return Twitter;
    case 'tiktok':
      return Music2;
    default:
      return CalendarDays;
  }
}

export default function SchedulePage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [scheduling, setScheduling] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [markingPosted, setMarkingPosted] = useState(false);
  const today = new Date();
  const [scheduleDate, setScheduleDate] = useState<string>(() => today.toISOString().slice(0, 10));

  function mapPlatform(p: string | null): Platform {
    if (!p) return 'tiktok';
    const lower = p.toLowerCase();
    if (lower === 'tiktok') return 'tiktok';
    if (lower === 'youtube' || lower === 'shorts') return 'youtube';
    if (lower === 'instagram' || lower === 'reels') return 'instagram';
    if (lower === 'x' || lower === 'twitter') return 'x';
    return 'tiktok';
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const [calendarRes, postsRes] = await Promise.all([
        supabase
          .from('content_calendar')
          .select('id, media_url, caption, hashtags, platform, scheduled_date, status, created_at')
          .eq('user_id', user.id)
          .order('scheduled_date', { ascending: true, nullsFirst: false }),
        supabase
          .from('content_posts')
          .select('id, title, final_video_url, background_video_url, caption, hashtags, platform, scheduled_date, status, created_at')
          .eq('user_id', user.id)
          .eq('status', 'scheduled')
          .order('scheduled_date', { ascending: true, nullsFirst: false }),
      ]);

      const calendarItems: ContentItem[] = ((calendarRes.data || []) as ContentItem[]).map((i) => ({
        ...i,
        source: 'content_calendar' as const,
      }));

      const postItems: ContentItem[] = ((postsRes.data || []) as Record<string, unknown>[]).map((p) => ({
        id: p.id as string,
        title: (p.title as string) || undefined,
        media_url: (p.final_video_url || p.background_video_url || '') as string,
        caption: (p.caption || '') as string,
        hashtags: (Array.isArray(p.hashtags) ? p.hashtags : []) as string[],
        platform: mapPlatform((p.platform as string) || null),
        scheduled_date: p.scheduled_date
          ? new Date(p.scheduled_date as string).toISOString().slice(0, 10)
          : null,
        status: 'scheduled' as const,
        created_at: (p.created_at as string) || new Date().toISOString(),
        source: 'content_posts' as const,
      }));

      if (calendarRes.error) setError(calendarRes.error.message);
      else if (postsRes.error) setError(postsRes.error.message);

      const merged = [...calendarItems, ...postItems].sort((a, b) => {
        const da = a.scheduled_date || '';
        const db = b.scheduled_date || '';
        return da.localeCompare(db);
      });
      setItems(merged);
      setLoading(false);
    }
    load();
  }, []);

  const drafts = useMemo(() => items.filter((i) => i.status === 'draft'), [items]);
  const scheduledItems = useMemo(
    () => items.filter((i) => i.status === 'scheduled' && i.scheduled_date),
    [items]
  );

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startDay = firstOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const calendarCells = useMemo(() => {
    const cells: { date: Date | null }[] = [];
    for (let i = 0; i < startDay; i++) cells.push({ date: null });
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ date: new Date(viewYear, viewMonth, day) });
    }
    return cells;
  }, [startDay, daysInMonth, viewMonth, viewYear]);

  function itemsForDate(date: Date | null): ContentItem[] {
    if (!date) return [];
    const key = date.toISOString().slice(0, 10);
    return scheduledItems.filter((i) => {
      if (!i.scheduled_date) return false;
      const itemDate = i.scheduled_date.slice(0, 10);
      return itemDate === key;
    });
  }

  const monthLabel = firstOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  function goPrev() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goNext() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  async function scheduleDraft(item: ContentItem, dateStr: string) {
    setScheduling(item.id);

    const { error } = await supabase
      .from('content_calendar')
      .update({ scheduled_date: dateStr, status: 'scheduled' })
      .eq('id', item.id);

    if (error) {
      setError(error.message);
    } else {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, scheduled_date: dateStr, status: 'scheduled' as const } : i
        )
      );
    }
    setScheduling(null);
  }

  async function markAsPosted(item: ContentItem) {
    setMarkingPosted(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date().toISOString();
      const todayDate = new Date().toDateString();

      // 1) Move content_posts → posted
      if (item.source === 'content_posts') {
        const { error: updateErr } = await supabase
          .from('content_posts')
          .update({ status: 'posted', updated_at: now })
          .eq('id', item.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: updateErr } = await supabase
          .from('content_calendar')
          .update({ status: 'posted' })
          .eq('id', item.id);
        if (updateErr) throw updateErr;
      }

      // 2) Insert into instagram_posts with posted_at for intelligence context
      const { error: igErr } = await supabase.from('instagram_posts').insert({
        user_id: user.id,
        media_type: 'reel',
        media_urls: item.media_url ? [item.media_url] : [],
        caption: item.caption || item.title || null,
        hashtags: item.hashtags || [],
        quality_score: null,
        status: 'posted',
        posted_at: now,
        created_at: now,
        updated_at: now,
      });
      if (igErr) {
        console.warn('instagram_posts insert failed (non-blocking):', igErr.message);
      }

      // 3) Update streak + XP on profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('streak_count, last_post_date, xp')
        .eq('id', user.id)
        .maybeSingle();

      const prevStreak = typeof profile?.streak_count === 'number' ? profile.streak_count : 0;
      const prevXp = typeof profile?.xp === 'number' ? profile.xp : 0;
      const lastPostDate = profile?.last_post_date ? new Date(profile.last_post_date as string) : null;

      let newStreak: number;
      if (lastPostDate && lastPostDate.toDateString() === todayDate) {
        // Already posted today — don't change streak
        newStreak = prevStreak;
      } else if (lastPostDate) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastPostDate.toDateString() === yesterday.toDateString()) {
          // Last post was yesterday — extend streak
          newStreak = prevStreak + 1;
        } else {
          // Gap — reset streak to 1
          newStreak = 1;
        }
      } else {
        // First post ever
        newStreak = 1;
      }

      await supabase
        .from('profiles')
        .update({
          streak_count: newStreak,
          last_post_date: now,
          xp: prevXp + 25,
        })
        .eq('id', user.id);

      // 4) Update local state
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'posted' as const } : i))
      );
      setSelectedItem(null);
      toast.success(`Posted! Streak: ${newStreak}d 🔥 +25 XP`);

      // Trigger CreatorDailyBar refresh
      window.dispatchEvent(new Event('creator-daily-refresh'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to mark as posted');
    } finally {
      setMarkingPosted(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-9 w-40 rounded bg-slate-800 animate-pulse" />
            <div className="mt-2 h-4 w-56 rounded bg-slate-800/80 animate-pulse" />
          </div>
        </div>
        <SkeletonCardGrid count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Schedule"
        subtitle="Content calendar — schedule drafts and view posts by date."
        icon={<CalendarDays className="h-5 w-5" />}
        actions={<StatusChip variant="live" pulse />}
      />

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar (2/3) */}
        <div className="xl:col-span-2 section-frame p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-50">{monthLabel}</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrev}
                className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-[11px] font-medium text-slate-400 mt-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center">
                {d}
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2 text-xs">
            {calendarCells.map((cell, idx) => {
              const cellItems = itemsForDate(cell.date);
              const isToday =
                cell.date && cell.date.toDateString() === today.toDateString();

              return (
                <div
                  key={idx}
                  className={`min-h-[90px] rounded-xl border border-slate-800 bg-slate-950/60 p-2 flex flex-col gap-1 ${
                    isToday ? 'ring-1 ring-amber-400' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-500">
                      {cell.date ? cell.date.getDate() : ''}
                    </span>
                    {isToday && (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-[10px] text-amber-400">
                        Today
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {cellItems.map((item) => {
                      const styles = getPlatformStyles(item.platform);
                      const Icon = getPlatformIcon(item.platform);
                      const label =
                        (item.title ?? item.caption)?.slice(0, 20) +
                        ((item.title ?? item.caption)?.length > 20 ? '…' : '') ||
                        'Post';
                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className={`w-full flex items-center gap-1.5 rounded-md border px-1.5 py-1 text-left transition hover:brightness-125 ${styles.bg} ${styles.border}`}
                          title={item.title ?? item.caption}
                        >
                          <div className="flex-shrink-0 w-6 h-6 rounded overflow-hidden bg-slate-800">
                            {item.media_url.match(/\.(jpg|jpeg|png|gif|webp)/i) ? (
                              <img
                                src={item.media_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="h-3 w-3 text-slate-500" />
                              </div>
                            )}
                          </div>
                          <Icon className={`h-3 w-3 flex-shrink-0 ${styles.text}`} />
                          <span className="text-[11px] font-medium text-slate-100 truncate">
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Production Queue Sidebar */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 flex flex-col gap-4">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Production Queue
            </p>
            <h2 className="text-lg font-semibold text-slate-50 mt-1">Drafts</h2>
            <p className="text-xs text-slate-500 mt-1">
              Items from Post Lab. Pick a date and click Schedule.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <label className="text-xs text-slate-400">Schedule for:</label>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
              />
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px]">
            {drafts.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No drafts. Add content in Post Lab.
              </div>
            ) : (
              drafts.map((item) => {
                const styles = getPlatformStyles(item.platform);
                const Icon = getPlatformIcon(item.platform);
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3"
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-slate-800">
                        {item.media_url.match(/\.(jpg|jpeg|png|gif|webp)/i) ? (
                          <img
                            src={item.media_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-slate-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Icon className={`h-3.5 w-3.5 ${styles.text}`} />
                          <span className="text-xs text-slate-400">
                            {item.platform}
                          </span>
                        </div>
                        <p className="text-sm text-slate-200 truncate mt-0.5">
                          {item.caption?.slice(0, 40) || 'No caption'}…
                        </p>
                      </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => scheduleDraft(item, scheduleDate)}
                        disabled={scheduling === item.id}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/20 disabled:opacity-50 transition"
                      >
                        {scheduling === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <CalendarDays className="h-3.5 w-3.5" />
                            Schedule
                          </>
                        )}
                      </button>
                  </div>
                );
              })
            )}
          </div>

          <a
            href="/dashboard/post-lab"
            className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-amber-500 bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition"
          >
            Create in Post Lab
          </a>
        </div>
      </div>

      {/* Scheduled Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl" data-testid="schedule-detail-modal">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-100">Scheduled Post</h3>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {selectedItem.title && (
                <p className="text-base font-semibold text-slate-100">{selectedItem.title}</p>
              )}
              {selectedItem.caption && (
                <p className="text-sm text-slate-300 leading-relaxed">{selectedItem.caption}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const styles = getPlatformStyles(selectedItem.platform);
                  const Icon = getPlatformIcon(selectedItem.platform);
                  return (
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles.bg} ${styles.border} ${styles.text}`}>
                      <Icon className="h-3 w-3" />
                      {selectedItem.platform}
                    </span>
                  );
                })()}
                {selectedItem.scheduled_date && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                    <CalendarDays className="h-3 w-3" />
                    {selectedItem.scheduled_date}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  selectedItem.status === 'posted'
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                    : 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                }`}>
                  {selectedItem.status === 'posted' ? 'Posted' : 'Scheduled'}
                </span>
              </div>
              {selectedItem.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedItem.hashtags.map((tag, i) => (
                    <span key={i} className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">
                      {tag.startsWith('#') ? tag : `#${tag}`}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition"
              >
                Close
              </button>
              {selectedItem.status === 'scheduled' && (
                <button
                  type="button"
                  data-testid="mark-posted-btn"
                  onClick={() => markAsPosted(selectedItem)}
                  disabled={markingPosted}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-500 bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60 transition"
                >
                  {markingPosted ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Mark as Posted
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
