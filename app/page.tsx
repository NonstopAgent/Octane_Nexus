'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Target, Sparkles, CheckCircle2, ArrowRight, Zap } from 'lucide-react';

export default function HomePage() {
  const searchParams = useSearchParams();

  // ==================== REFERRAL TRACKING ====================
  useEffect(() => {
    const referralId = searchParams?.get('ref');
    if (referralId) {
      // Save referral source to cookie (expires in 30 days)
      const expiryDate = new Date();
      expiryDate.setTime(expiryDate.getTime() + (30 * 24 * 60 * 60 * 1000));
      document.cookie = `referral_source=${referralId}; path=/; expires=${expiryDate.toUTCString()}`;
      console.log('Referral tracked:', referralId);
    }
  }, [searchParams]);

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-16 px-4 py-16 md:py-24">
      {/* Hero Section */}
      <section className="mx-auto max-w-4xl space-y-6 text-center">
        <div className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
          High-Performance Creator Terminal
        </div>
        <h1 className="text-4xl font-semibold leading-tight text-slate-50 md:text-6xl lg:text-7xl">
          Build Your High-Authority{' '}
          <span className="text-amber-500">Creator Identity</span> in 5 Minutes.
        </h1>
        <p className="mx-auto max-w-2xl text-base text-slate-300 md:text-lg">
          Stop paying for tools. Invest in results. Get your cross-platform identity secured, 
          your voice trained, and your content pipeline built—one time.
        </p>
      </section>

      {/* Pricing Section */}
      <section className="mx-auto w-full max-w-5xl space-y-8">
        <div className="text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border-2 border-amber-500/40 bg-amber-500/10 px-4 py-2">
            <span className="text-sm font-semibold uppercase tracking-wide text-amber-300">
              Limited Packages
            </span>
            <span className="text-lg font-bold text-amber-500">88/100</span>
            <span className="text-sm font-semibold text-amber-300">
              Identity Packages Claimed
            </span>
          </div>
          <h2 className="text-2xl font-semibold text-slate-50 md:text-3xl">
            One-Time Investment. Lifetime Foundation.
          </h2>
          <p className="mt-2 text-sm text-slate-400 md:text-base">
            Choose your package. Secure your identity. Build your authority.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Identity Sniper Package */}
          <div className="relative flex flex-col gap-6 rounded-3xl border-2 border-slate-800 bg-slate-900/80 p-8 shadow-xl transition-all hover:border-amber-500/50 hover:shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
                  <Target className="h-7 w-7" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-slate-50">$149</div>
                  <div className="text-xs text-slate-400">One-Time</div>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-semibold text-slate-50">
                  The Identity Sniper
                </h3>
                <p className="text-sm text-slate-300">
                  Secure your handles and craft your professional presence across all platforms.
                </p>
              </div>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
                  <span>Cross-platform handle securing (IG, TikTok, X)</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
                  <span>3 professional bios tailored to your niche</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
                  <span>Custom niche analysis & positioning strategy</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
                  <span>Brand Voice Training module access</span>
                </li>
              </ul>
            </div>
            <Link
              href="/login?view=signup"
              className="mt-auto inline-flex min-h-[60px] w-full items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-8 text-base font-semibold text-slate-950 shadow-lg transition-all hover:border-amber-400 hover:bg-amber-400 hover:shadow-xl hover:shadow-amber-500/60 hover:scale-[1.02]"
            >
              Get Started
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>

          {/* Authority Vault Package */}
          <div className="relative flex flex-col gap-6 rounded-3xl border-2 border-amber-500 bg-amber-500/10 p-8 shadow-xl transition-all hover:border-amber-400 hover:bg-amber-500/15">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full border-2 border-amber-500 bg-slate-950 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-amber-400">
              Most Popular
            </div>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-slate-950">
                  <Sparkles className="h-7 w-7" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-slate-50">$299</div>
                  <div className="text-xs text-slate-400">One-Time</div>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-semibold text-slate-50">
                  The Authority Vault
                </h3>
                <p className="text-sm text-slate-300">
                  Everything in the Sniper package, plus 30 days of custom, voice-matched content blueprints.
                </p>
              </div>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
                  <span className="font-semibold">Everything in Identity Sniper</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
                  <span>30 days of custom platform blueprints (90 total scripts)</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
                  <span>Voice-matched content trained on your best posts</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
                  <span>TikTok, Instagram, and X specific scripts daily</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
                  <span>Librarian Strategy Notes on every blueprint</span>
                </li>
              </ul>
            </div>
            <Link
              href="/login?view=signup"
              className="mt-auto inline-flex min-h-[60px] w-full items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-8 text-base font-semibold text-slate-950 shadow-lg transition-all hover:border-amber-400 hover:bg-amber-400 hover:shadow-xl hover:shadow-amber-500/60 hover:scale-[1.02]"
            >
              Get Started
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section className="mx-auto w-full max-w-6xl space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-50 md:text-3xl">
            What You Get
          </h2>
          <p className="mt-2 text-sm text-slate-400 md:text-base">
            Three core tools that build your creator foundation.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Identity Sniper Feature */}
          <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
              <Target className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-slate-50">
                Identity Sniper
              </h3>
              <p className="text-sm text-slate-300">
                Secure your handle and bio across Instagram, TikTok, and X in
                minutes. Claim your digital identity before someone else does.
              </p>
            </div>
          </div>

          {/* Algorithm Lab Feature */}
          <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
              <Sparkles className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-slate-50">
                Algorithm Lab
              </h3>
              <p className="text-sm text-slate-300">
                Turn niche trends into filmable scripts with Gemini AI. Never
                run out of content ideas again—your personal idea generator,
                powered by advanced AI.
              </p>
            </div>
          </div>

          {/* Active Librarian Feature */}
          <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
              <Zap className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-slate-50">
                The Active Librarian
              </h3>
              <p className="text-sm text-slate-300">
                Your persistent AI Talent Manager that tracks your growth and
                consistency. Stay on track with automated insights and
                personalized guidance.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
