'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { Sunrise, ArrowRight, TrendingUp, MessageCircle, Brain, Youtube, Eye, Zap } from 'lucide-react';

function HomePageContent() {
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-20 px-4 py-16 md:py-24">
      {/* Hero Section */}
      <section className="mx-auto max-w-4xl space-y-8 text-center">
        <div className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
          Built for YouTube Creators
        </div>
        <h1 className="text-4xl font-semibold leading-tight text-slate-50 md:text-6xl">
          Your Morning Brief.{' '}
          <span className="text-amber-500">90 Minutes of Research, Done Overnight.</span>
        </h1>
        <p className="mx-auto max-w-2xl text-base text-slate-300 md:text-lg leading-relaxed">
          Octane Nexus watches your YouTube channel and your competitors while you sleep.
          Every morning you get one screen: what blew up in your niche, what&apos;s working
          in your own content, and one specific video idea ready to film.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/login?view=signup"
            className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-8 text-base font-semibold text-slate-950 shadow-lg transition-all hover:border-amber-400 hover:bg-amber-400 hover:shadow-xl hover:shadow-amber-500/60 hover:scale-[1.02]"
          >
            Start Free
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-8 text-base font-semibold text-slate-200 transition-all hover:border-amber-500/50 hover:bg-slate-800 hover:text-amber-400"
          >
            Sign In
          </Link>
        </div>
        <p className="text-xs text-slate-500">Free during beta. No credit card required.</p>
      </section>

      {/* How It Works */}
      <section className="mx-auto w-full max-w-5xl space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-semibold text-slate-50 md:text-3xl">
            What Happens While You Sleep
          </h2>
          <p className="text-sm text-slate-400 md:text-base max-w-xl mx-auto">
            Connect YouTube once. Pick 3 competitors. Wake up to intelligence, not guesswork.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/20 text-red-400">
              <Eye className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-50">1. What Blew Up</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              We pull recent uploads from your tracked competitor channels, find the ones
              outperforming their average, and break down the hook, format, and angle.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-50">2. Your Patterns</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Your last 4 question-hook videos averaged 2.3x your normal views. We surface
              patterns from your actual data that you&apos;d never spot scrolling YouTube Studio.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-50">3. Today&apos;s Idea</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Not 5 generic suggestions. ONE specific video idea with a hook, title,
              3 thumbnail concepts, and an outline. Based on what&apos;s working right now.
            </p>
          </div>
        </div>
      </section>

      {/* Why Not ChatGPT */}
      <section className="mx-auto w-full max-w-5xl space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-semibold text-slate-50 md:text-3xl">
            You Used to Screenshot Insights Into ChatGPT.
          </h2>
          <p className="text-sm text-slate-400 md:text-base max-w-2xl mx-auto">
            That worked until you stopped doing it. Octane Nexus is the version that shows up
            every morning whether you remember or not. It watches your channel, remembers every
            video you&apos;ve made, and gets sharper the longer you use it.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Sunrise, title: 'Daily Brief', desc: 'Every morning: competitor intelligence, your performance patterns, and one ready-to-film video idea.' },
            { icon: Brain, title: 'Creator Memory', desc: 'Every script, hook, and video you make stays in context. The AI learns YOUR voice, not generic advice.' },
            { icon: Youtube, title: 'YouTube-Native', desc: 'Connects to your channel via OAuth. Imports your videos with real view counts, likes, and performance data.' },
            { icon: Eye, title: 'Competitor Tracking', desc: 'Track up to 3 channels in your niche. See what they post, what performs, and why.' },
            { icon: MessageCircle, title: 'Nexus Chat', desc: 'Ask "what hooks work for me?" and get answers grounded in your actual data, not vibes.' },
            { icon: TrendingUp, title: 'Pattern Detection', desc: 'Surfaces what\'s actually working in YOUR content — formats, hooks, topics — backed by numbers.' },
          ].map((feature) => (
            <div key={feature.title} className="flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
                <feature.icon className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-100">{feature.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto w-full max-w-3xl space-y-6 text-center">
        <h2 className="text-2xl font-semibold text-slate-50 md:text-3xl">
          Stop Deciding What to Film. Start Knowing.
        </h2>
        <p className="text-sm text-slate-400 md:text-base max-w-lg mx-auto">
          The hardest part of YouTube isn&apos;t editing or writing. It&apos;s deciding what to make next.
          Let Octane Nexus do that research for you, every single morning.
        </p>
        <Link
          href="/login?view=signup"
          className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-8 text-base font-semibold text-slate-950 shadow-lg transition-all hover:border-amber-400 hover:bg-amber-400 hover:shadow-xl hover:shadow-amber-500/60 hover:scale-[1.02]"
        >
          Get Your First Brief — Free
          <ArrowRight className="h-5 w-5" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="mx-auto w-full max-w-7xl border-t border-slate-800 px-4 pt-8 pb-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} Octane Nexus. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-slate-950"><div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" /></main>}>
      <HomePageContent />
    </Suspense>
  );
}
