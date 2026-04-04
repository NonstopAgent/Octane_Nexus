'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, TrendingUp, MessageCircle, LayoutGrid, CalendarDays, Zap, UserCircle } from 'lucide-react';

function HomePageContent() {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-20 px-4 py-16 md:py-24">
      {/* Hero Section */}
      <section className="mx-auto max-w-4xl space-y-8 text-center">
        <div className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
          Your Daily Creator Hub
        </div>
        <h1 className="text-4xl font-semibold leading-tight text-slate-50 md:text-6xl">
          Stop Hopping Between{' '}
          <span className="text-amber-500">10 Different Tools.</span>
        </h1>
        <p className="mx-auto max-w-2xl text-base text-slate-300 md:text-lg leading-relaxed">
          Octane Nexus is one place to discover what&apos;s trending, generate scripts with AI, 
          manage your content pipeline, and schedule posts. Built for creators who are tired of 
          tab-switching their way through every upload.
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
        <p className="text-xs text-slate-500">No credit card required. Free to explore.</p>
      </section>

      {/* How It Works */}
      <section className="mx-auto w-full max-w-5xl space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-semibold text-slate-50 md:text-3xl">
            Your Daily Creator Loop
          </h2>
          <p className="text-sm text-slate-400 md:text-base max-w-xl mx-auto">
            Every day, the same workflow. Octane Nexus makes each step faster.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-50">1. Discover</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              See what&apos;s working right now. Trending hashtags, viral formats, and niche surveillance 
              across TikTok, Instagram, and X — updated daily.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-50">2. Create</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Generate scripts, captions, and content ideas with AI that knows your brand voice. 
              Send trending ideas straight to your production board.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <CalendarDays className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-50">3. Ship</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Move posts through your pipeline — from idea to script to ready. 
              Schedule everything on one calendar. Track your streak.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto w-full max-w-5xl space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-semibold text-slate-50 md:text-3xl">
            Everything You Need. Nothing You Don&apos;t.
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: TrendingUp, title: 'Niche Surveillance', desc: 'See what\'s going viral in your niche with view counts and breakdowns of why it worked.' },
            { icon: MessageCircle, title: 'AI Content Advisor', desc: 'Chat with an AI that knows your brand and helps you brainstorm, write, and optimize.' },
            { icon: LayoutGrid, title: 'Production Board', desc: 'Kanban-style pipeline. Move content from idea → scripting → filming → ready → posted.' },
            { icon: CalendarDays, title: 'Content Calendar', desc: 'Visual schedule for all your posts. See your week at a glance.' },
            { icon: UserCircle, title: 'Identity Builder', desc: 'AI-powered bios, handle checking, and brand asset generation across all platforms.' },
            { icon: Zap, title: 'Posting Streaks', desc: 'Track consistency with daily streaks and XP. Gamified accountability that works.' },
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
          Your content deserves a real workflow.
        </h2>
        <p className="text-sm text-slate-400 md:text-base max-w-lg mx-auto">
          Stop winging it. Build your creator identity, find what&apos;s trending, 
          and ship content consistently — all from one dashboard.
        </p>
        <Link
          href="/login?view=signup"
          className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-8 text-base font-semibold text-slate-950 shadow-lg transition-all hover:border-amber-400 hover:bg-amber-400 hover:shadow-xl hover:shadow-amber-500/60 hover:scale-[1.02]"
        >
          Get Started — It&apos;s Free
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
