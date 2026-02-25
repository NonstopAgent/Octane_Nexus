'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Loader2,
  Sparkles,
  Send,
  Video,
  Heart,
  MessageCircle,
  Share2,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { getEffectiveUserId, DEMO_USER_ID } from '@/lib/auth';
import { generateMetadata } from '@/actions/generate-metadata';
import { schedulePost } from '@/actions/schedule-post';
import { renderPostAction } from '@/actions/render-post';
import { POST_STATUS, POST_LAB_STATUSES } from '@/lib/status';
import {
  getPostLabPrefill,
  clearPostLabPrefill,
  type PostLabPrefill,
} from '@/lib/post-lab-prefill';
import {
  addRealityCheckEntry,
  type RealityCheckOutcome,
} from '@/lib/reality-check-storage';
import { FileText, ClipboardCheck } from 'lucide-react';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import DemoNudge from '@/components/ui/DemoNudge';
import { getPlayableVideoUrl } from '@/lib/playableUrl';
import BRollPanel from '@/components/dashboard/BRollPanel';
import FinanceDisclaimerModal from '@/components/dashboard/FinanceDisclaimerModal';
import { shouldShowFinanceReminder } from '@/lib/financeDisclaimer';

type PlatformKey = 'TikTok' | 'Shorts' | 'Reels';
type ContentPost = {
  id: string;
  user_id: string;
  title: string;
  script_content: { hook?: string; meat?: string[] } | null;
  status: string;
  audio_url?: string | null;
  background_video_url?: string | null;
  background_reason?: string | null;
  overlay_image_url?: string | null;
  final_video_url?: string | null;
  caption?: string | null;
  hashtags?: string[] | null;
  scheduled_date?: string | null;
  platform?: string | null;
  style_token_id?: string | null;
  created_at: string;
  updated_at: string;
};

type StyleTokenOption = { id: string; name: string; is_default: boolean };

const PLATFORM_OPTIONS: { key: PlatformKey; label: string; dbValue: string }[] = [
  { key: 'TikTok', label: 'TikTok', dbValue: 'TikTok' },
  { key: 'Shorts', label: 'Shorts', dbValue: 'YouTube' },
  { key: 'Reels', label: 'Reels', dbValue: 'Instagram' },
];

const FALLBACK_VIDEO_URL =
  'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

function getPreviewVideoUrl(post: ContentPost | null): string {
  if (!post) return FALLBACK_VIDEO_URL;
  const finalUrl = post.status === POST_STATUS.READY && post.final_video_url?.trim()
    ? getPlayableVideoUrl(post.final_video_url)
    : '';
  if (finalUrl) return finalUrl;
  const bgUrl = getPlayableVideoUrl(post.background_video_url);
  if (bgUrl) return bgUrl;
  return FALLBACK_VIDEO_URL;
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-[280px] rounded-[2.5rem] border-[8px] border-slate-700 bg-slate-900 p-3 shadow-2xl">
      <div className="absolute -top-1 left-1/2 z-10 h-5 w-24 -translate-x-1/2 rounded-b-xl bg-slate-800" />
      <div className="relative overflow-hidden rounded-2xl bg-black">
        {children}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-6 bg-gradient-to-t from-black/90 to-transparent py-4 px-3 text-white">
          <span className="flex items-center gap-1.5 text-xs opacity-90">
            <Heart className="h-4 w-4" />
            Like
          </span>
          <span className="flex items-center gap-1.5 text-xs opacity-90">
            <MessageCircle className="h-4 w-4" />
            Comment
          </span>
          <span className="flex items-center gap-1.5 text-xs opacity-90">
            <Share2 className="h-4 w-4" />
            Share
          </span>
        </div>
      </div>
    </div>
  );
}

const AUTH_RESOLVE_MS = 2000;

export default function PostLabPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePost, setActivePost] = useState<ContentPost | null>(null);
  const [platform, setPlatform] = useState<PlatformKey>('TikTok');
  const [caption, setCaption] = useState('');
  const [hashtagsInput, setHashtagsInput] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [generating, setGenerating] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRenderError, setLastRenderError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState(false);
  const [lastUploadBucket, setLastUploadBucket] = useState<string | null>(null);
  const [financeReminderOpen, setFinanceReminderOpen] = useState(false);
  const [financeReminderAck, setFinanceReminderAck] = useState<(() => void) | null>(null);
  const [profileSlice, setProfileSlice] = useState<{ niche: string | null; finance_disclaimer_enabled: boolean }>({ niche: null, finance_disclaimer_enabled: true });
  const [systemHealth, setSystemHealth] = useState<{
    serviceRolePresent?: boolean;
    videosBucketExists?: boolean;
  } | null>(null);
  const [libraryPrefill, setLibraryPrefill] = useState<PostLabPrefill | null>(null);
  const [creatingFromPrefill, setCreatingFromPrefill] = useState(false);
  const [creatingSample, setCreatingSample] = useState(false);
  const [showLogOutcome, setShowLogOutcome] = useState(false);
  const [styleTokens, setStyleTokens] = useState<StyleTokenOption[]>([]);
  const [defaultStyleName, setDefaultStyleName] = useState<string | null>(null);
  const [styleSwitchLoading, setStyleSwitchLoading] = useState(false);

  useEffect(() => {
    setLibraryPrefill(getPostLabPrefill());
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [settingsRes, tokensRes] = await Promise.all([
        fetch('/api/user-settings', { credentials: 'include' }),
        fetch('/api/style-tokens', { credentials: 'include' }),
      ]);
      const settings = settingsRes.ok ? await settingsRes.json().catch(() => null) : null;
      const tokens = tokensRes.ok ? await tokensRes.json().catch(() => []) : [];
      setDefaultStyleName(settings?.default_style_token?.name ?? null);
      setStyleTokens(Array.isArray(tokens) ? tokens.map((t: { id: string; name: string; is_default: boolean }) => ({ id: t.id, name: t.name, is_default: t.is_default })) : []);
    })();
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const effectiveId = await getEffectiveUserId(user?.id ?? null);
      if (!cancelled) {
        setUserId(effectiveId);
        setAuthResolved(true);
      }
    })();
    const t = setTimeout(() => {
      if (!cancelled) setAuthResolved(true);
    }, AUTH_RESOLVE_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  async function createFromLibraryFormat() {
    if (!userId || !libraryPrefill) return;
    setCreatingFromPrefill(true);
    setError(null);
    try {
      const title =
        libraryPrefill.hookTemplate.slice(0, 50).trim() ||
        'From playbook';
      const scriptContent = {
        hook: libraryPrefill.hookTemplate || undefined,
        meat:
          libraryPrefill.scriptScaffold?.trim() ?
            [libraryPrefill.scriptScaffold.trim()] :
            undefined,
      };
      if (userId === DEMO_USER_ID) {
        const res = await fetch('/api/post-lab/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ title, script_content: scriptContent }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || res.statusText);
        }
      } else {
        const { error: insertErr } = await supabase.from('content_posts').insert({
          user_id: userId,
          title,
          script_content: scriptContent,
          status: POST_STATUS.SCRIPTING,
        });
        if (insertErr) throw insertErr;
      }
      clearPostLabPrefill();
      setLibraryPrefill(null);
      await fetchPosts();
      toast.success('Idea created from Library format. Move it to Filming in Production when ready.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create idea';
      setError(msg);
      toast.error(msg);
    } finally {
      setCreatingFromPrefill(false);
    }
  }

  async function fetchPosts() {
    if (!userId) return;
    if (userId === DEMO_USER_ID) {
      try {
        const res = await fetch('/api/post-lab/queue', { credentials: 'include' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error(data?.error || 'Failed to load queue');
          setPosts([]);
          return;
        }
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setPosts(list as ContentPost[]);
        if (activePost) {
          const updated = list.find((p: ContentPost) => p.id === activePost.id);
          if (updated) setActivePost(updated);
        }
      } catch (e) {
        console.error(e);
        toast.error('Failed to load queue');
        setPosts([]);
      }
      return;
    }
    const { data, error: fetchErr } = await supabase
      .from('content_posts')
      .select('*')
      .eq('user_id', userId)
      .in('status', [...POST_LAB_STATUSES])
      .order('updated_at', { ascending: false });

    if (fetchErr) {
      console.error(fetchErr);
      setPosts([]);
      return;
    }
    setPosts((data as ContentPost[]) || []);
    if (activePost) {
      const updated = (data as ContentPost[])?.find((p) => p.id === activePost.id);
      if (updated) setActivePost(updated);
    }
  }

  useEffect(() => {
    if (!authResolved) return;
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    void (async () => {
      try {
        if (userId === DEMO_USER_ID) {
          const res = await fetch('/api/post-lab/queue', { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            setPosts(Array.isArray(data) ? (data as ContentPost[]) : []);
          } else {
            setPosts([]);
          }
        } else {
          const { data, error: fetchErr } = await supabase
            .from('content_posts')
            .select('*')
            .eq('user_id', userId)
            .in('status', [...POST_LAB_STATUSES])
            .order('updated_at', { ascending: false });
          if (fetchErr) console.error(fetchErr);
          setPosts((data as ContentPost[]) || []);
        }
      } catch {
        setPosts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, authResolved]);

  useEffect(() => {
    setVideoError(false);
  }, [activePost?.id]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      fetch('/api/system-health')
        .then((r) => r.ok ? r.json() : null)
        .then((data) => data && setSystemHealth(data))
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetch('/api/profile/effective', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) setProfileSlice({ niche: d.niche ?? null, finance_disclaimer_enabled: d.finance_disclaimer_enabled !== false });
      })
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (activePost) {
      setCaption(activePost.caption || '');
      setHashtagsInput(
        Array.isArray(activePost.hashtags)
          ? activePost.hashtags.join(' ')
          : ''
      );
      setScheduledDate(
        activePost.scheduled_date
          ? new Date(activePost.scheduled_date).toISOString().slice(0, 16)
          : ''
      );
    } else {
      setCaption('');
      setHashtagsInput('');
      setScheduledDate('');
    }
  }, [activePost]);

  async function handleGenerateMetadata() {
    if (!activePost) return;
    setError(null);
    setGenerating(true);
    try {
      if (userId === DEMO_USER_ID) {
        const res = await fetch('/api/post-lab/generate-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ postId: activePost.id }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.error || 'Failed to generate');
          toast.error(data?.error || 'Failed to generate caption & tags');
          return;
        }
        const newCaption = data.caption || '';
        setCaption(newCaption);
        setHashtagsInput(Array.isArray(data.hashtags) ? data.hashtags.join(' ') : '');
        await fetchPosts();
        toast.success('Caption & tags generated');
        if (shouldShowFinanceReminder(profileSlice.finance_disclaimer_enabled, profileSlice.niche, newCaption)) {
          setFinanceReminderOpen(true);
        }
      } else {
        const result = await generateMetadata(activePost.id);
        if ('error' in result) {
          setError(result.error);
          toast.error(result.error);
          return;
        }
        const newCaption = result.caption;
        setCaption(newCaption);
        setHashtagsInput(result.hashtags.join(' '));
        await fetchPosts();
        if (shouldShowFinanceReminder(profileSlice.finance_disclaimer_enabled, profileSlice.niche, newCaption)) {
          setFinanceReminderOpen(true);
        }
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleSchedulePost(skipFinanceReminder?: boolean) {
    if (!activePost) return;
    const tags = hashtagsInput
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith('#') ? t : '#' + t));

    if (!scheduledDate || !scheduledDate.trim()) {
      setError('Please pick a date');
      toast.error('Please pick a date');
      return;
    }

    if (!skipFinanceReminder && shouldShowFinanceReminder(profileSlice.finance_disclaimer_enabled, profileSlice.niche, caption)) {
      setFinanceReminderOpen(true);
      setFinanceReminderAck(() => () => {
        void handleSchedulePost(true);
      });
      return;
    }

    setError(null);
    setScheduling(true);
    try {
      if (userId === DEMO_USER_ID) {
        const res = await fetch(`/api/post-lab/posts/${activePost.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            caption: caption || null,
            hashtags: tags,
            scheduled_date: new Date(scheduledDate).toISOString(),
            platform: PLATFORM_OPTIONS.find((p) => p.key === platform)?.dbValue || 'TikTok',
            status: POST_STATUS.SCHEDULED,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.error || 'Failed to schedule');
          toast.error(data?.error || res.status === 404 ? 'Post not found' : 'Failed to schedule');
          return;
        }
        setPosts((prev) => prev.filter((p) => p.id !== activePost.id));
        setActivePost(null);
        toast.success('Post scheduled');
      } else {
        const { error: sErr } = await schedulePost({
          postId: activePost.id,
          caption,
          hashtags: tags,
          scheduledDate: scheduledDate || null,
          platform: PLATFORM_OPTIONS.find((p) => p.key === platform)?.dbValue || 'TikTok',
        });
        if (sErr) {
          setError(sErr);
          toast.error(sErr);
          return;
        }
        setPosts((prev) => prev.filter((p) => p.id !== activePost.id));
        setActivePost(null);
        toast.success('Post scheduled');
      }
    } finally {
      setScheduling(false);
    }
  }

  const isReady = activePost?.status === POST_STATUS.READY;
  const isFilming = activePost?.status === POST_STATUS.FILMING;
  const videoUrl = getPreviewVideoUrl(activePost);
  const effectiveVideoUrl = videoError ? FALLBACK_VIDEO_URL : videoUrl;

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[PostLab] Preview video URL:', effectiveVideoUrl, videoError ? '(fallback after error)' : '');
    }
  }, [effectiveVideoUrl, videoError]);

  if (!authResolved) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-slate-800 bg-slate-950/50">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" aria-hidden />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="space-y-6">
        <DashboardPageHeader
          title="Post Lab"
          subtitle="The Shipping Department — finalize your generated videos before posting."
          icon={<Sparkles className="h-5 w-5" />}
        />
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/80 px-8 py-16 text-center min-h-[320px]">
          <Video className="h-14 w-14 text-slate-600 mb-4" />
          <h2 className="text-xl font-semibold text-slate-100">Sign in to continue</h2>
          <p className="mt-2 max-w-sm text-sm text-slate-400">
            Post Lab needs an account so your drafts and videos are saved. Sign in or create an account to continue.
          </p>
          <Link
            href="/login?returnTo=/dashboard/post-lab"
            className="mt-6 inline-flex items-center gap-2 rounded-lg border-2 border-amber-500 bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition"
          >
            Sign in
          </Link>
          <DemoNudge className="mt-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FinanceDisclaimerModal
        open={financeReminderOpen}
        onClose={() => {
          setFinanceReminderOpen(false);
          setFinanceReminderAck(null);
        }}
        onAcknowledge={() => {
          financeReminderAck?.();
          setFinanceReminderOpen(false);
          setFinanceReminderAck(null);
        }}
      />
      <DashboardPageHeader
        title="Post Lab"
        subtitle="The Shipping Department — finalize your generated videos before posting."
        icon={<Sparkles className="h-5 w-5" />}
      />

      {libraryPrefill && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 flex flex-wrap items-center gap-3">
          <FileText className="h-5 w-5 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-200">Format from Library</p>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
              {libraryPrefill.hookTemplate || libraryPrefill.scriptScaffold || 'Hook + script template'}
            </p>
          </div>
          <button
            type="button"
            onClick={createFromLibraryFormat}
            disabled={creatingFromPrefill}
            className="shrink-0 inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500 bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition"
          >
            {creatingFromPrefill ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            Create idea from this format
          </button>
          <button
            type="button"
            onClick={() => {
              clearPostLabPrefill();
              setLibraryPrefill(null);
            }}
            className="shrink-0 text-xs text-slate-400 hover:text-slate-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        </div>
      ) : posts.length === 0 ? (
        <div className="space-y-4">
          <DemoNudge />
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/80 px-8 py-16 text-center">
            <Video className="h-16 w-16 text-slate-600 mb-4" />
            <h2 className="text-xl font-semibold text-slate-100">No Posts in Pipeline</h2>
            <p className="mt-2 max-w-sm text-sm text-slate-400">
              Move videos to Filming or Ready in Production, then they&apos;ll show up here.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/dashboard/production"
                className="inline-flex items-center gap-2 rounded-lg border border-amber-500 bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition"
              >
                <ArrowRight className="h-4 w-4" />
                Go to Production
              </Link>
              {userId === DEMO_USER_ID && (
                <button
                  type="button"
                  disabled={creatingSample}
                  onClick={async () => {
                    setCreatingSample(true);
                    setError(null);
                    try {
                      const res = await fetch('/api/post-lab/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                          title: 'Demo draft',
                          script_content: { hook: 'Sample for Production' },
                          status: POST_STATUS.FILMING,
                        }),
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        toast.error(data?.error || 'Failed to create draft');
                        return;
                      }
                      await fetchPosts();
                      toast.success('Demo draft created. It appears here and on Production.');
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Failed to create draft');
                    } finally {
                      setCreatingSample(false);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50 transition"
                >
                  {creatingSample ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Create sample draft
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Queue (Left) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
              Queue
            </p>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {posts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  data-testid="post-lab-queue-card"
                  onClick={() => setActivePost(post)}
                  className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                    activePost?.id === post.id
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-600'
                  }`}
                >
                  <div className="flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-800">
                    <video
                      src={getPreviewVideoUrl(post)}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  </div>
                  <span className="truncate text-sm font-medium text-slate-100">
                    {post.title || 'Untitled'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Workbench (Right) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 space-y-6">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Workbench
            </p>

            {!activePost ? (
              <div className="flex min-h-[320px] items-center justify-center text-slate-500">
                Select a video from the queue
              </div>
            ) : (
              <>
                {/* Style */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400">Using Style:</span>
                  <select
                    value={activePost.style_token_id ?? ''}
                    disabled={styleSwitchLoading}
                    onChange={async (e) => {
                      const val = e.target.value;
                      const tokenId = val === '' ? null : val;
                      if (!activePost) return;
                      setStyleSwitchLoading(true);
                      try {
                        const res = await fetch(`/api/post-lab/posts/${activePost.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ style_token_id: tokenId }),
                        });
                        if (!res.ok) {
                          const data = await res.json().catch(() => ({}));
                          toast.error(data?.error ?? 'Failed to update style');
                          return;
                        }
                        await fetchPosts();
                        setActivePost((p) => (p && p.id === activePost.id ? { ...p, style_token_id: tokenId } : p));
                      } finally {
                        setStyleSwitchLoading(false);
                      }
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">{defaultStyleName ?? 'Default'}</option>
                    {styleTokens.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}{t.is_default ? ' (default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* B-Roll */}
                <BRollPanel
                  postId={activePost.id}
                  onBackgroundSet={() => fetchPosts()}
                />

                {/* Preview + Platform Toggle */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-400">Platform Preview</p>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${
                        isFilming
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {isFilming ? 'Filming' : 'Ready'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {PLATFORM_OPTIONS.map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPlatform(key)}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                          platform === key
                            ? 'border border-amber-500 bg-amber-500/20 text-amber-300'
                            : 'border border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 mb-2">
                    {isReady && activePost.overlay_image_url && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showOverlay}
                          onChange={(e) => setShowOverlay(e.target.checked)}
                          className="rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="text-xs text-slate-400">Show Overlay</span>
                      </label>
                    )}
                  </div>
                  <PhoneFrame>
                    <div className="relative aspect-[9/16] w-full bg-black overflow-hidden rounded-2xl">
                      <video
                        key={effectiveVideoUrl}
                        src={effectiveVideoUrl}
                        className="absolute inset-0 h-full w-full object-cover"
                        muted
                        playsInline
                        autoPlay
                        loop
                        preload="metadata"
                        controls={false}
                        onError={() => setVideoError(true)}
                      />
                      {isReady && showOverlay && activePost.overlay_image_url && (
                        <img
                          src={activePost.overlay_image_url}
                          alt="Quote overlay"
                          className="absolute inset-0 h-full w-full object-contain pointer-events-none rounded-2xl shadow-xl"
                        />
                      )}
                      {isReady && showOverlay && !activePost.overlay_image_url && (
                        <div className="absolute inset-0 flex items-end justify-center p-4 pointer-events-none">
                          <p className="text-center text-sm font-medium text-white drop-shadow-lg line-clamp-2">
                            {activePost.script_content?.hook || activePost.title}
                          </p>
                        </div>
                      )}
                      {isFilming && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none">
                          <p className="rounded-lg bg-slate-900/90 px-4 py-2 text-sm font-medium text-amber-300">
                            Rendering captions…
                          </p>
                        </div>
                      )}
                      {videoError && (
                        <div className="absolute top-2 left-2 right-2 rounded-lg bg-amber-900/90 px-2 py-1.5 text-[10px] text-amber-200 pointer-events-none">
                          Video preview failed to load. Using fallback clip.
                        </div>
                      )}
                    </div>
                  </PhoneFrame>

                  {isFilming && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!activePost) return;
                          setError(null);
                          setLastRenderError(null);
                          setRendering(true);
                          try {
                            const result = await renderPostAction(activePost.id);
                            if (result.ok) {
                              if (result.bucket) setLastUploadBucket(result.bucket);
                              await fetchPosts();
                            } else {
                              const err = result.error ?? 'Render failed';
                              setError(err);
                              setLastRenderError(err);
                              toast.error(err);
                            }
                          } finally {
                            setRendering(false);
                          }
                        }}
                        disabled={rendering}
                        className="inline-flex items-center gap-2 rounded-lg border-2 border-amber-500 bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed transition"
                      >
                        {rendering ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Rendering…
                          </>
                        ) : (
                          <>
                            🎬 Render Now
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {isReady && activePost.background_reason && (
                    <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                      <p className="text-xs font-semibold text-amber-300 uppercase tracking-wide">
                        Why this clip?
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        {activePost.background_reason}
                      </p>
                    </div>
                  )}
                </div>

                {/* AI Writer - only for ready posts */}
                <div>
<button
                  type="button"
                  onClick={handleGenerateMetadata}
                  disabled={generating || isFilming}
                  data-testid="cta-generate-caption"
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-500 bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  {generating ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate Caption & Tags
                      </>
                    )}
                  </button>
                </div>

                {/* Caption & Hashtags */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">
                      Caption
                    </label>
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      rows={4}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      placeholder="Write or generate a caption…"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">
                      Hashtags
                    </label>
                    <input
                      type="text"
                      value={hashtagsInput}
                      onChange={(e) => setHashtagsInput(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      placeholder="#viral #trending #shorts"
                    />
                  </div>
                </div>

                {/* Schedule */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">
                    Schedule
                  </label>
                  <input
                    type="datetime-local"
                    data-testid="schedule-date-input"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                {error && <p className="text-sm text-rose-400">{error}</p>}

                {/* System Health - dev only */}
                {process.env.NODE_ENV !== 'production' && (
                  <details className="rounded-lg border border-slate-700 bg-slate-900/60">
                    <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-300">
                      <ChevronRight className="h-3.5 w-3" />
                      System Health
                    </summary>
                    <div className="border-t border-slate-700 px-3 py-2 font-mono text-[11px] text-slate-400 space-y-1">
                      <div>service_role: {systemHealth?.serviceRolePresent ? '✓' : '✗'}</div>
                      <div>videos_bucket: {systemHealth?.videosBucketExists ? '✓' : '✗'}</div>
                      <div>last_upload_bucket: {lastUploadBucket ?? '—'}</div>
                      {lastRenderError && <div>last_render_error: {lastRenderError}</div>}
                    </div>
                  </details>
                )}

                {/* Ship It - only for ready posts */}
                <button
                  type="button"
                  onClick={() => void handleSchedulePost()}
                  disabled={scheduling || !isReady}
                  data-testid="schedule-post-btn"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-amber-500 bg-amber-500 px-6 py-3.5 text-base font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  {scheduling ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Scheduling…
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Schedule Post
                    </>
                  )}
                </button>

                {/* Log outcome (Reality Check) - local only */}
                <div className="pt-2 border-t border-slate-800">
                  {!showLogOutcome ? (
                    <button
                      type="button"
                      onClick={() => setShowLogOutcome(true)}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800/60 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700/60 hover:text-slate-100 transition"
                    >
                      <ClipboardCheck className="h-4 w-4" />
                      Log outcome
                    </button>
                  ) : (
                    <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 space-y-2">
                      <p className="text-xs font-medium text-slate-400">
                        How did this perform? (saved locally)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(
                          [
                            { outcome: 'viral' as RealityCheckOutcome, label: '🔥 Viral', className: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20' },
                            { outcome: 'average' as RealityCheckOutcome, label: '😐 Average', className: 'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700' },
                            { outcome: 'flop' as RealityCheckOutcome, label: '📉 Flop', className: 'border-rose-500/60 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20' },
                          ] as const
                        ).map(({ outcome, label, className }) => (
                          <button
                            key={outcome}
                            type="button"
                            onClick={() => {
                              if (!activePost) return;
                              addRealityCheckEntry({
                                idea: activePost.title,
                                predictionSummary: activePost.script_content?.hook
                                  ? `Hook: ${activePost.script_content.hook.slice(0, 80)}…`
                                  : undefined,
                                outcome,
                              });
                              toast.success('Logged (local only). View in Monitoring → Reality Check.');
                              setShowLogOutcome(false);
                            }}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${className}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowLogOutcome(false)}
                        className="text-[11px] text-slate-500 hover:text-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
