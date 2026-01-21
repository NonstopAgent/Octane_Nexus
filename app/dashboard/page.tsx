'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Flame, Loader2, Link2, X, Instagram, MessageCircle, Shield, Zap, CheckCircle2, Crown, Share2, Sparkles, Trophy, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getMockUser, isLocalhost, hasMockSession } from '@/lib/mockAuth';
import type { VideoBlueprint, PlatformSpecificBlueprints } from '@/lib/gemini';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Helper function to extract topic from content history
function extractTopicFromHistory(history: string): string {
  // Extract first few words from first line as topic
  const firstLine = history.split('\n')[0]?.trim() || history.trim();
  const words = firstLine.split(/\s+/).slice(0, 3).join(' ');
  return words.length > 30 ? words.substring(0, 27) + '...' : words;
}

// Helper function to extract vibe/tone from content history
function extractVibeFromHistory(history: string): string {
  // Simple heuristic: look for common vibe words or default to confident
  const lowerHistory = history.toLowerCase();
  if (lowerHistory.includes('playful') || lowerHistory.includes('fun')) return 'playful';
  if (lowerHistory.includes('calm') || lowerHistory.includes('peaceful')) return 'calm';
  if (lowerHistory.includes('bold') || lowerHistory.includes('daring')) return 'bold';
  if (lowerHistory.includes('honest') || lowerHistory.includes('real')) return 'authentic';
  return 'confident';
}

type SavedBlueprint = {
  id: string | number;
  idea: string;
  created_at: string | null;
  blueprint: VideoBlueprint | PlatformSpecificBlueprints | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [streak, setStreak] = useState<number>(0);
  const [streakLoading, setStreakLoading] = useState<boolean>(true);
  const [streakUpdating, setStreakUpdating] = useState<boolean>(false);
  const [blueprints, setBlueprints] = useState<SavedBlueprint[]>([]);
  const [blueprintsLoading, setBlueprintsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [hasContentHistory, setHasContentHistory] = useState<boolean>(false);
  const [contentHistoryText, setContentHistoryText] = useState<string>('');
  const [referralCopied, setReferralCopied] = useState<boolean>(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [active, setActive] = useState<SavedBlueprint | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<'tiktok' | 'instagram' | 'x' | null>(null);
  const [connectAccountOpen, setConnectAccountOpen] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState({
    instagram: '',
    tiktok: '',
    x: '',
  });
  const [savingAccounts, setSavingAccounts] = useState(false);
  const [hasFounderLicense, setHasFounderLicense] = useState<boolean>(false);
  const [founderLicenseLoading, setFounderLicenseLoading] = useState<boolean>(false);
  const [showAlphaCodeInput, setShowAlphaCodeInput] = useState<boolean>(false);
  const [alphaCode, setAlphaCode] = useState<string>('');
  const [alphaCodeLoading, setAlphaCodeLoading] = useState<boolean>(false);
  const [alphaCodeError, setAlphaCodeError] = useState<string | null>(null);
  const [alphaSuccess, setAlphaSuccess] = useState<boolean>(false);
  const [communityWins, setCommunityWins] = useState<Array<{ idea: string; niche: string }>>([]);
  const [communityWinsLoading, setCommunityWinsLoading] = useState<boolean>(true);
  const [communityInsights, setCommunityInsights] = useState<{ dominantVibe: string | null; viralPotential: number | null } | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        // Check for mock user first (localhost only)
        if (isLocalhost()) {
          const mockUser = getMockUser();
          if (mockUser) {
            if (!isMounted) return;
            // Set mock user data
            setHasFounderLicense(mockUser.founder_license || mockUser.purchased_package_type === 'vault');
            setFullName(mockUser.email.split('@')[0]);
            setStreak(0);
            setStreakLoading(false);
            setBlueprintsLoading(false);
            setCommunityWinsLoading(false);
            setBlueprints([]);
            // Clear any error since mock user is authenticated
            setError(null);
            return;
          }
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (!isMounted) return;
          setError('Please sign in to see your dashboard.');
          setStreakLoading(false);
          setBlueprintsLoading(false);
          return;
        }

        // Fetch streak, last_post_date, linked_accounts, founder_license, and full_name from profiles
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('streak_count, last_post_date, linked_accounts, founder_license, full_name')
          .eq('id', user.id)
          .maybeSingle();

        if (isMounted) {
          if (profileError) {
            console.error('Error loading streak from profiles.', profileError);
          }

          let currentStreak =
            typeof profile?.streak_count === 'number'
              ? profile.streak_count
              : profile?.streak_count != null
              ? Number(profile.streak_count) || 0
              : 0;

          // Streak Guard: Check if last_post_date is more than 48 hours ago
          const lastPostDate = profile?.last_post_date
            ? new Date(profile.last_post_date)
            : null;

          if (lastPostDate && !Number.isNaN(lastPostDate.getTime())) {
            const now = new Date();
            const hoursSinceLastPost =
              (now.getTime() - lastPostDate.getTime()) / (1000 * 60 * 60);

            if (hoursSinceLastPost > 48) {
              // Reset streak to 0 if more than 48 hours have passed
              currentStreak = 0;
              const { error: resetError } = await supabase
                .from('profiles')
                .update({ streak_count: 0 })
                .eq('id', user.id);

              if (resetError) {
                console.error('Error resetting streak in Supabase.', resetError);
              }
            }
          }

          setStreak(currentStreak);
          setStreakLoading(false);

          // Load linked accounts if they exist
          if (profile?.linked_accounts && typeof profile.linked_accounts === 'object') {
            const accounts = profile.linked_accounts as any;
            setLinkedAccounts({
              instagram: accounts.instagram || accounts.Instagram || '',
              tiktok: accounts.tiktok || accounts.TikTok || '',
              x: accounts.x || accounts.X || accounts.twitter || accounts.Twitter || '',
            });
          }

          // Load founder license status and full name
          if (profile?.founder_license) {
            setHasFounderLicense(
              typeof profile.founder_license === 'boolean'
                ? profile.founder_license
                : Boolean(profile.founder_license)
            );
          }

          if (profile?.full_name) {
            setFullName(profile.full_name);
          }

          // Check for content history
          const { data: contentHistory } = await supabase
            .from('user_content_history')
            .select('content_text')
            .eq('user_id', user.id)
            .maybeSingle();

          if (contentHistory?.content_text) {
            setHasContentHistory(true);
            setContentHistoryText(contentHistory.content_text);
          }

          // Fetch Community Wins (recent viral blueprints)
          const { data: viralPerformances } = await supabase
            .from('blueprint_performance')
            .select('blueprint_id, marked_at')
            .eq('status', 'viral')
            .order('marked_at', { ascending: false })
            .limit(10);

          if (viralPerformances && viralPerformances.length > 0) {
            const blueprintIds = viralPerformances.map((p) => p.blueprint_id);
            
            // Fetch the blueprint data and user niches
            const { data: viralBlueprints } = await supabase
              .from('saved_blueprints')
              .select('id, idea, user_id')
              .in('id', blueprintIds);

            if (viralBlueprints && viralBlueprints.length > 0) {
              // Get user niches for anonymization
              const userIds = [...new Set(viralBlueprints.map((bp) => bp.user_id))];
              const { data: userProfiles } = await supabase
                .from('profiles')
                .select('id, niche')
                .in('id', userIds);

              const nicheMap = new Map(userProfiles?.map((p) => [p.id, p.niche]) || []);

              const wins = viralBlueprints
                .slice(0, 5)
                .map((bp) => {
                  const niche = nicheMap.get(bp.user_id) || 'Creator';
                  // Extract first few words as "hook" identifier
                  const words = bp.idea?.split(/\s+/).slice(0, 4).join(' ') || '';
                  const hook = words.length > 30 ? words.substring(0, 27) + '...' : words;
                  return {
                    idea: hook,
                    niche: niche || 'A Creator',
                  };
                });

              if (isMounted) {
                setCommunityWins(wins);
              }
            }
          }

          // Fetch community insights for strategy notes
          const { data: allPerformances } = await supabase
            .from('blueprint_performance')
            .select('blueprint_id, status')
            .in('status', ['viral', 'success'])
            .limit(50);

          if (allPerformances && allPerformances.length > 0) {
            const viralCount = allPerformances.filter((p) => p.status === 'viral').length;
            const total = allPerformances.length;
            const viralPotential = total > 0 ? Math.round((viralCount / total) * 100) : null;

            // Fetch blueprint hooks to determine dominant vibe
            const allBlueprintIds = allPerformances.map((p) => p.blueprint_id);
            const viralBlueprintIds = allPerformances
              .filter((p) => p.status === 'viral')
              .map((p) => p.blueprint_id);
            
            const { data: allBlueprints } = await supabase
              .from('saved_blueprints')
              .select('id, blueprint')
              .in('id', viralBlueprintIds.slice(0, 20));

            if (allBlueprints && allBlueprints.length > 0) {
              const vibeWords: Record<string, number> = {};
              allBlueprints.forEach((bp) => {
                if (bp.blueprint && typeof bp.blueprint === 'object') {
                  const hook = ('tiktok' in bp.blueprint 
                    ? bp.blueprint.tiktok?.hook 
                    : 'hook' in bp.blueprint 
                    ? bp.blueprint.hook 
                    : '') || '';
                  const lower = hook.toLowerCase();
                  if (lower.includes('quick') || lower.includes('fast')) vibeWords['urgent'] = (vibeWords['urgent'] || 0) + 1;
                  if (lower.includes('secret') || lower.includes('hidden')) vibeWords['mysterious'] = (vibeWords['mysterious'] || 0) + 1;
                  if (lower.includes('never') || lower.includes('stop')) vibeWords['bold'] = (vibeWords['bold'] || 0) + 1;
                  if (lower.includes('simple') || lower.includes('easy')) vibeWords['accessible'] = (vibeWords['accessible'] || 0) + 1;
                  if (lower.includes('proven') || lower.includes('tested')) vibeWords['confident'] = (vibeWords['confident'] || 0) + 1;
                }
              });

              const dominantVibe = Object.entries(vibeWords).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

              if (isMounted) {
                setCommunityInsights({
                  dominantVibe,
                  viralPotential,
                });
              }
            } else if (isMounted) {
              setCommunityInsights({
                dominantVibe: null,
                viralPotential,
              });
            }
          }

          if (isMounted) {
            setCommunityWinsLoading(false);
          }
        }

        // Fetch saved blueprints for this user
        const { data: rows, error: blueprintsError } = await supabase
          .from('saved_blueprints')
          .select('id, idea, created_at, blueprint')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!isMounted) return;

        if (blueprintsError) {
          console.error('Error loading saved blueprints.', blueprintsError);
          setError('Could not load your scripts. Try again in a moment.');
        } else if (rows) {
          setBlueprints(
            rows.map((row: any) => ({
              id: row.id,
              idea: row.idea,
              created_at: row.created_at ?? null,
              blueprint: row.blueprint ?? null,
            }))
          );
        }

        setBlueprintsLoading(false);
      } catch (err: any) {
        console.error('Unexpected error loading dashboard data.', err);
        if (!isMounted) return;
        setError(
          err?.message || 'Something went wrong loading your dashboard data.'
        );
        setStreakLoading(false);
        setBlueprintsLoading(false);
      }
    }

    loadData();

    // Check for success parameter from Stripe redirect
    if (searchParams?.get('success') === 'true') {
      // Refresh founder license status
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  async function handlePostedToday() {
    setStreakUpdating(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('Unable to load Supabase user for streak update.', userError);
        return;
      }

      const nextStreak = (streak || 0) + 1;
      const now = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          streak_count: nextStreak,
          last_post_date: now,
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating streak in Supabase.', updateError);
        return;
      }

      setStreak(nextStreak);
    } finally {
      setStreakUpdating(false);
    }
  }

  function isPlatformSpecific(
    blueprint: VideoBlueprint | PlatformSpecificBlueprints | null
  ): blueprint is PlatformSpecificBlueprints {
    return (
      blueprint !== null &&
      typeof blueprint === 'object' &&
      'tiktok' in blueprint &&
      'instagram' in blueprint &&
      'x' in blueprint
    );
  }

  function openBlueprintModal(item: SavedBlueprint) {
    setActive(item);
    setModalOpen(true);
    
    // Determine if this is a platform-specific blueprint
    if (isPlatformSpecific(item.blueprint)) {
      setSelectedPlatform('tiktok');
    } else {
      setSelectedPlatform(null);
    }
  }

  async function handleSaveLinkedAccounts() {
    setSavingAccounts(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('Unable to load Supabase user for linked accounts save.', userError);
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          linked_accounts: {
            instagram: linkedAccounts.instagram.trim() || null,
            tiktok: linkedAccounts.tiktok.trim() || null,
            x: linkedAccounts.x.trim() || null,
          },
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error saving linked accounts to Supabase.', updateError);
        return;
      }

      setConnectAccountOpen(false);
      // Reload data to show updated accounts
      window.location.reload();
    } catch (err) {
      console.error('Unexpected error while saving linked accounts.', err);
    } finally {
      setSavingAccounts(false);
    }
  }

  async function handlePurchaseFounderLicense() {
    setFounderLicenseLoading(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      const { error: redirectError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (redirectError) {
        throw redirectError;
      }
    } catch (err: any) {
      console.error('Error initiating Founder License purchase:', err);
      alert(
        err?.message || 'Could not initiate payment. Please try again in a moment.'
      );
      setFounderLicenseLoading(false);
    }
  }

  async function unlockAlphaAccess() {
    if (!alphaCode.trim()) {
      setAlphaCodeError('Please enter an alpha code.');
      return;
    }

    if (alphaCode.trim() !== 'OCTANE100') {
      setAlphaCodeError('Invalid alpha code. Please try again.');
      return;
    }

    setAlphaCodeLoading(true);
    setAlphaCodeError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('Please sign in to unlock alpha access.');
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ founder_license: true })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      setAlphaSuccess(true);
      setHasFounderLicense(true);
      
      // Refresh the page after 1.5 seconds to show Founder Batch badge
      setTimeout(() => {
        window.location.href = '/dashboard?success=true';
      }, 1500);
    } catch (err: any) {
      console.error('Error unlocking alpha access:', err);
      setAlphaCodeError(
        err?.message || 'Failed to unlock alpha access. Please try again.'
      );
      setAlphaCodeLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-10 text-slate-50">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <p className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
            Octane Dashboard
          </p>
          {hasFounderLicense && (
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
              <Crown className="h-3 w-3" />
              Founder Batch
            </div>
          )}
        </div>
        <h1 className="text-3xl font-semibold leading-tight text-slate-50 md:text-4xl">
          {fullName ? `${fullName}'s` : 'Your'} Scripts and Streaks
        </h1>
        <p className="max-w-2xl text-sm text-slate-300">
          Keep an eye on your posting streak and the scripts you&apos;ve already
          shaped. Pick one and film it today.
        </p>
      </header>

      {/* Community Wins Ticker */}
      {communityWins.length > 0 && (
        <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300 mb-2">
                Community Wins
              </p>
              <div className="flex items-center gap-4 animate-scroll">
                {communityWins.map((win, idx) => (
                  <div
                    key={idx}
                    className="flex-shrink-0 flex items-center gap-2 text-sm text-slate-200"
                  >
                    <TrendingUp className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span>
                      <span className="font-semibold text-emerald-300">
                        {win.niche}
                      </span>{' '}
                      just went viral with{' '}
                      <span className="font-medium text-slate-50">
                        {win.idea}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Linked Status Bar */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
              Linked Accounts
            </p>
            <p className="mt-1 text-sm text-slate-300">
              Connect your accounts so the Librarian can study your style.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Instagram Status */}
            <div className="flex items-center gap-2">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${
                  linkedAccounts.instagram
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                <Instagram className="h-6 w-6" />
              </div>
              {!linkedAccounts.instagram && (
                <span className="text-xs text-slate-400">Not linked</span>
              )}
            </div>

            {/* TikTok Status */}
            <div className="flex items-center gap-2">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${
                  linkedAccounts.tiktok
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                <MessageCircle className="h-6 w-6" />
              </div>
              {!linkedAccounts.tiktok && (
                <span className="text-xs text-slate-400">Not linked</span>
              )}
            </div>

            {/* X Status */}
            <div className="flex items-center gap-2">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${
                  linkedAccounts.x
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
              {!linkedAccounts.x && (
                <span className="text-xs text-slate-400">Not linked</span>
              )}
            </div>

            {/* Connect Now / Secure Handle Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {(!linkedAccounts.instagram ||
                !linkedAccounts.tiktok ||
                !linkedAccounts.x) && (
                <>
                  <Link
                    href="/identity"
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-4 text-sm font-semibold text-slate-950 shadow-md transition-all hover:bg-amber-400 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/50"
                  >
                    <Shield className="h-4 w-4" />
                    Secure Handle
                  </Link>
                  <button
                    type="button"
                    onClick={() => setConnectAccountOpen(true)}
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border-2 border-slate-700 bg-slate-800/60 px-4 text-sm font-semibold text-slate-200 transition-all hover:border-amber-500 hover:bg-slate-800 hover:text-amber-400"
                  >
                    <Link2 className="h-4 w-4" />
                    Connect Existing
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Founder License Upgrade or Referral */}
      {!hasFounderLicense ? (
        <section className="rounded-3xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-slate-900/80 to-slate-900/80 p-6 shadow-xl md:p-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
                <Zap className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                  Founder License
                </p>
                <h3 className="text-xl font-semibold text-slate-50 md:text-2xl">
                  Unlock Unlimited Multi-Platform Blueprints
                </h3>
                <p className="text-sm text-slate-300">
                  Upgrade to get unlimited access to all platform-specific
                  scripts (TikTok, Instagram, X) in every generation. One-time
                  payment of $49.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    Unlimited Blueprints
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    All Platforms
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    One-Time Payment
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              <button
                type="button"
                onClick={handlePurchaseFounderLicense}
                disabled={founderLicenseLoading}
                className="inline-flex min-h-[60px] items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-8 text-base font-semibold text-slate-950 shadow-lg transition-all hover:border-amber-400 hover:bg-amber-400 hover:shadow-xl hover:shadow-amber-500/60 hover:scale-[1.02] disabled:cursor-not-allowed disabled:border-amber-500/60 disabled:bg-amber-500/60 disabled:hover:scale-100"
              >
                {founderLicenseLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    Upgrade Now - $49
                  </>
                )}
              </button>
              {!showAlphaCodeInput && (
                <button
                  type="button"
                  onClick={() => setShowAlphaCodeInput(true)}
                  className="text-xs font-medium text-amber-400 hover:text-amber-300 underline transition-colors"
                >
                  I have an Alpha Code
                </button>
              )}
              {showAlphaCodeInput && (
                <div className="w-full space-y-2 rounded-2xl border border-amber-500/30 bg-slate-950/80 p-4 md:w-auto">
                  {alphaSuccess ? (
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                      Alpha access unlocked!
                    </div>
                  ) : (
                    <>
                      <label className="block text-xs font-medium text-slate-200">
                        Alpha Code
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={alphaCode}
                          onChange={(e) => {
                            setAlphaCode(e.target.value);
                            setAlphaCodeError(null);
                          }}
                          placeholder="Enter code"
                          className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              unlockAlphaAccess();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={unlockAlphaAccess}
                          disabled={alphaCodeLoading || !alphaCode.trim()}
                          className="inline-flex min-h-[48px] items-center justify-center rounded-xl border-2 border-amber-500 bg-amber-500 px-4 text-sm font-semibold text-slate-950 shadow-md transition-all hover:border-amber-400 hover:bg-amber-400 disabled:cursor-not-allowed disabled:border-amber-500/60 disabled:bg-amber-500/60"
                        >
                          {alphaCodeLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Unlock'
                          )}
                        </button>
                      </div>
                      {alphaCodeError && (
                        <p className="text-xs text-rose-300">{alphaCodeError}</p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setShowAlphaCodeInput(false);
                          setAlphaCode('');
                          setAlphaCodeError(null);
                        }}
                        className="text-xs text-slate-400 hover:text-slate-300"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="relative rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-slate-900/80 to-slate-900/80 p-6 shadow-xl md:p-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                <Crown className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                  Founder Batch Member
                </p>
                <h3 className="text-xl font-semibold text-slate-50 md:text-2xl">
                  Help Us Find the Other 99 Founders
                </h3>
                <p className="text-sm text-slate-300">
                  Share your referral link with other creators who need speed,
                  aesthetic, and multi-platform dominance. The first 100 founders
                  shape the future of Octane Nexus.
                </p>
              </div>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={async () => {
                  try {
                    // Check for mock user first
                    let userId: string | undefined;
                    if (isLocalhost()) {
                      const mockUser = getMockUser();
                      if (mockUser) {
                        userId = mockUser.id;
                      }
                    }
                    
                    // Fall back to Supabase user if no mock user
                    if (!userId) {
                      const {
                        data: { user },
                      } = await supabase.auth.getUser();
                      userId = user?.id;
                    }
                    
                    if (!userId) {
                      throw new Error('No user found');
                    }
                    
                    const referralLink = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}?ref=${userId}`;
                    await navigator.clipboard.writeText(referralLink);
                    setReferralCopied(true);
                    setTimeout(() => setReferralCopied(false), 3000);
                  } catch (err) {
                    console.error('Failed to copy referral link:', err);
                    alert('Failed to copy referral link. Please try again.');
                  }
                }}
                className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-full border-2 border-emerald-500 bg-emerald-500 px-6 text-base font-semibold text-slate-950 shadow-lg transition-all hover:border-emerald-400 hover:bg-emerald-400 hover:shadow-xl hover:shadow-emerald-500/60 hover:scale-[1.02]"
              >
                <Share2 className="h-5 w-5" />
                {referralCopied ? 'Copied!' : 'Share Referral Link'}
              </button>
              {referralCopied && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 shadow-lg whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 duration-300">
                  Referral Link Copied!
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Streak / consistency tracker */}
      <section
        className={`space-y-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl md:p-8 ${
          hasFounderLicense ? 'border-emerald-500/30 bg-emerald-500/5' : ''
        }`}
      >
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/15 text-amber-400 md:h-20 md:w-20">
              <Flame className="h-10 w-10 md:h-12 md:w-12" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                Consistency streak
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="text-3xl font-semibold text-slate-50 md:text-4xl">
                  {streakLoading ? '—' : streak}
                </p>
                <p className="text-xs text-slate-400">days in a row</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <button
              type="button"
              onClick={() => setConnectAccountOpen(true)}
              className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-full border-2 border-slate-700 bg-slate-800/60 px-6 text-base font-semibold text-slate-200 shadow-md hover:border-amber-500 hover:bg-slate-800 hover:text-amber-400 transition-colors"
            >
              <Link2 className="h-5 w-5" />
              Connect Existing Account
            </button>
            <button
              type="button"
              onClick={handlePostedToday}
              disabled={streakUpdating}
              className="inline-flex min-h-[56px] items-center justify-center rounded-full border-2 border-amber-500 bg-amber-500 px-6 text-base font-semibold text-slate-950 shadow-md hover:bg-amber-400 hover:border-amber-400 disabled:cursor-not-allowed disabled:border-amber-500/60 disabled:bg-amber-500/60"
            >
              {streakUpdating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Logging today...
                </>
              ) : (
                "I Posted Today!"
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Saved blueprints list */}
      <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl md:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
              Ready-to-film scripts
            </p>
            <p className="mt-1 text-sm text-slate-300">
              Tap a card to see the full hook, beats, and call to action.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasFounderLicense && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300">
                <Zap className="h-3 w-3" />
                Unlimited
              </span>
            )}
            <span className="text-xs text-slate-400">
              {blueprintsLoading ? 'Loading…' : `${blueprints.length} saved`}
            </span>
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
            {error}
          </p>
        )}

        {!blueprintsLoading && blueprints.length === 0 && !error && (
          <p className="text-sm text-slate-300">
            No scripts saved yet. Visit the Lab, spin up ideas, and save a few
            blueprints to see them here.
          </p>
        )}

        {blueprints.length > 0 && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {blueprints.map((item) => {
              const created =
                item.created_at && !Number.isNaN(Date.parse(item.created_at))
                  ? new Date(item.created_at)
                  : null;
              const formatted = created
                ? created.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Unknown date';

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openBlueprintModal(item)}
                  className="flex min-h-[120px] flex-col justify-between gap-3 rounded-3xl border-2 border-slate-700 bg-slate-900/80 p-5 text-left shadow-md hover:border-amber-500 hover:bg-slate-900"
                >
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                      Saved script
                    </p>
                    <p className="text-lg font-medium leading-relaxed text-slate-50">
                      {item.idea}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400">Saved on {formatted}</p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Blueprint modal reuse */}
      {modalOpen && active && active.blueprint && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 px-4 py-8">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-amber-500 bg-slate-950 p-6 shadow-2xl md:p-8">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                    {isPlatformSpecific(active.blueprint)
                      ? 'Multi-Platform Blueprint'
                      : 'Video Blueprint'}
                  </p>
                  {hasContentHistory && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300">
                      <Sparkles className="h-3 w-3" />
                      Voice-Matched
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Based on:{' '}
                  <span className="font-medium text-slate-200">
                    {active.idea}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-slate-700 px-4 text-xs font-semibold text-slate-200 hover:border-amber-400 hover:text-amber-300"
              >
                Close
              </button>
            </div>

            {isPlatformSpecific(active.blueprint) ? (
              <div className="space-y-6">
                {/* Platform Selector */}
                <div className="flex gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPlatform('tiktok')}
                    className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                      selectedPlatform === 'tiktok'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-transparent text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    TikTok
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPlatform('instagram')}
                    className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                      selectedPlatform === 'instagram'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-transparent text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Instagram
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPlatform('x')}
                    className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                      selectedPlatform === 'x'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-transparent text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    X
                  </button>
                </div>

                {selectedPlatform && (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                        {selectedPlatform === 'tiktok'
                          ? 'TikTok: Focus on Visual Hooks'
                          : selectedPlatform === 'instagram'
                          ? 'Instagram: Focus on Engagement'
                          : 'X: Focus on Viral Text'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                        Hook
                      </p>
                      <p className="mt-2 text-2xl font-semibold leading-snug text-slate-50 md:text-3xl">
                        {active.blueprint[selectedPlatform].hook}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                        Middle beats
                      </p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-slate-100 md:text-lg">
                        {active.blueprint[selectedPlatform].meat.map(
                          (point, idx) => (
                            <li key={idx}>{point}</li>
                          )
                        )}
                      </ul>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                        Call to action
                      </p>
                      <p className="mt-2 text-lg font-medium text-slate-50 md:text-xl">
                        {active.blueprint[selectedPlatform].cta}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                        Setup tip
                      </p>
                      <p className="mt-2 text-sm text-slate-200 md:text-base">
                        {active.blueprint[selectedPlatform].setup_tip}
                      </p>
                    </div>

                    {/* Librarian's Strategy Note */}
                    {(hasContentHistory && contentHistoryText) || communityInsights ? (
                      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                          Librarian&apos;s Strategy Note
                        </p>
                        <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-200">
                          {hasContentHistory && contentHistoryText && (
                            <p>
                              Based on your successful post{contentHistoryText.split('\n').length > 1 ? 's' : ''} about{' '}
                              <span className="font-medium text-emerald-300">
                                {extractTopicFromHistory(contentHistoryText)}
                              </span>
                              , I&apos;ve adjusted this script to be more{' '}
                              <span className="font-medium text-emerald-300">
                                {extractVibeFromHistory(contentHistoryText)}
                              </span>{' '}
                              to match your proven style.
                            </p>
                          )}
                          {communityInsights?.dominantVibe && communityInsights?.viralPotential && (
                            <p>
                              I&apos;ve biased this script toward a{' '}
                              <span className="font-medium text-emerald-300">
                                {communityInsights.dominantVibe}
                              </span>{' '}
                              hook because our community data shows it has a{' '}
                              <span className="font-medium text-emerald-300">
                                {communityInsights.viralPotential}%
                              </span>{' '}
                              higher viral potential this week.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                    Hook
                  </p>
                  <p className="mt-2 text-2xl font-semibold leading-snug text-slate-50 md:text-3xl">
                    {active.blueprint.hook}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                    Middle beats
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-slate-100 md:text-lg">
                    {active.blueprint.meat.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                    Call to action
                  </p>
                  <p className="mt-2 text-lg font-medium text-slate-50 md:text-xl">
                    {active.blueprint.cta}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                    Setup tip
                  </p>
                  <p className="mt-2 text-sm text-slate-200 md:text-base">
                    {active.blueprint.setup_tip}
                  </p>
                </div>

                {/* Librarian's Strategy Note */}
                {(hasContentHistory && contentHistoryText) || communityInsights ? (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                      Librarian&apos;s Strategy Note
                    </p>
                    <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-200">
                      {hasContentHistory && contentHistoryText && (
                        <p>
                          Based on your successful post{contentHistoryText.split('\n').length > 1 ? 's' : ''} about{' '}
                          <span className="font-medium text-emerald-300">
                            {extractTopicFromHistory(contentHistoryText)}
                          </span>
                          , I&apos;ve adjusted this script to be more{' '}
                          <span className="font-medium text-emerald-300">
                            {extractVibeFromHistory(contentHistoryText)}
                          </span>{' '}
                          to match your proven style.
                        </p>
                      )}
                      {communityInsights?.dominantVibe && communityInsights?.viralPotential && (
                        <p>
                          I&apos;ve biased this script toward a{' '}
                          <span className="font-medium text-emerald-300">
                            {communityInsights.dominantVibe}
                          </span>{' '}
                          hook because our community data shows it has a{' '}
                          <span className="font-medium text-emerald-300">
                            {communityInsights.viralPotential}%
                          </span>{' '}
                          higher viral potential this week.
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Connect Existing Account Modal */}
      {connectAccountOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 px-4 py-8">
          <div className="w-full max-w-lg rounded-3xl border-2 border-amber-500 bg-slate-950 p-6 shadow-2xl md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                  Connect Existing Account
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Share your existing handles so the Librarian can study your
                  current style and provide better insights.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConnectAccountOpen(false)}
                className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-slate-700 px-4 text-xs font-semibold text-slate-200 hover:border-amber-400 hover:text-amber-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-200">
                  Instagram Handle
                </label>
                <input
                  type="text"
                  value={linkedAccounts.instagram}
                  onChange={(e) =>
                    setLinkedAccounts({
                      ...linkedAccounts,
                      instagram: e.target.value,
                    })
                  }
                  placeholder="@yourname"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-200">
                  TikTok Handle
                </label>
                <input
                  type="text"
                  value={linkedAccounts.tiktok}
                  onChange={(e) =>
                    setLinkedAccounts({
                      ...linkedAccounts,
                      tiktok: e.target.value,
                    })
                  }
                  placeholder="@yourname"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-200">
                  X (Twitter) Handle
                </label>
                <input
                  type="text"
                  value={linkedAccounts.x}
                  onChange={(e) =>
                    setLinkedAccounts({
                      ...linkedAccounts,
                      x: e.target.value,
                    })
                  }
                  placeholder="@yourname"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConnectAccountOpen(false)}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-slate-700 px-6 text-sm font-medium text-slate-200 hover:border-slate-500 hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveLinkedAccounts}
                  disabled={savingAccounts}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-full border-2 border-amber-500 bg-amber-500 px-6 text-sm font-semibold text-slate-950 shadow-md hover:bg-amber-400 hover:border-amber-400 disabled:cursor-not-allowed disabled:border-amber-500/60 disabled:bg-amber-500/60"
                >
                  {savingAccounts ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Accounts'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

