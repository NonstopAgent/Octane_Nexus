'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import {
  Sunrise,
  ArrowRight,
  TrendingUp,
  MessageCircle,
  Brain,
  Youtube,
  Eye,
  Zap,
} from 'lucide-react';

function HomePageContent() {
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-16 px-4 py-12 md:gap-24 md:px-6 md:py-24">
      {/* Hero */}
      <section className="mx-auto max-w-4xl space-y-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
          For YouTube creators · 1k–50k subs
        </div>
        <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-slate-50 md:text-6xl">
          Your morning brief.{' '}
          <span className="text-amber-500">90 minutes of research, done overnight.</span>
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg">
          Octane Nexus watches your channel and your competitors while you sleep.
          Every morning you get one screen: what blew up in your niche, what&apos;s
          working in your own content, and one specific video idea ready to film.
        </p>
        <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href="/login?view=signup"
            className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-8 text-base font-semibold text-slate-950 shadow-lg transition-all hover:border-amber-400 hover:bg-amber-400 hover:shadow-xl hover:shadow-amber-500/60 sm:w-auto"
          >
            Start free
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/how-it-works"
            className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-8 text-base font-semibold text-slate-200 transition-all hover:border-amber-500/50 hover:bg-slate-800 hover:text-amber-400 sm:w-auto"
          >
            See a sample brief
          </Link>
        </div>
        <p className="text-xs text-slate-500">
          Free during beta. No credit card required.
        </p>
      </section>

      {/* What Happens While You Sleep */}
      <section className="mx-auto w-full max-w-5xl space-y-10">
        <div className="space-y-3 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-50 md:text-3xl">
            What happens while you sleep
          </h2>
          <p className="mx-auto max-w-xl text-sm text-slate-400 md:text-base">
            Connect YouTube once. Pick 3 competitors. Wake up to intelligence, not guesswork.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3 md:gap-6">
          <FeatureCard
            iconBg="bg-red-500/15"
            iconFg="text-red-400"
            icon={<Eye className="h-6 w-6" />}
            title="1. What blew up"
            body="We pull recent uploads from your tracked competitor channels, find the ones outperforming their average, and break down the hook, format, and angle."
          />
          <FeatureCard
            iconBg="bg-amber-500/15"
            iconFg="text-amber-400"
            icon={<TrendingUp className="h-6 w-6" />}
            title="2. Your patterns"
            body="Your last 4 question-hook videos averaged 2.3× your normal views. We surface patterns from your actual data that you'd never spot scrolling Studio."
          />
          <FeatureCard
            iconBg="bg-emerald-500/15"
            iconFg="text-emerald-400"
            icon={<Zap className="h-6 w-6" />}
            title="3. Today's idea"
            body="Not 5 generic suggestions. One specific video idea with a hook, title, 3 thumbnail concepts, and an outline. Based on what's working right now."
          />
        </div>
      </section>

      {/* Why Not ChatGPT */}
      <section className="mx-auto w-full max-w-5xl space-y-10">
        <div className="space-y-3 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-50 md:text-3xl">
            You used to screenshot insights into ChatGPT.
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-slate-400 md:text-base">
            That worked until you stopped doing it. Octane Nexus is the version that shows up
            every morning whether you remember or not. It watches your channel, remembers every
            video you&apos;ve made, and gets sharper the longer you use it.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Sunrise,
              title: 'Daily brief',
              desc: 'Every morning: competitor intel, your performance patterns, and one ready-to-film idea.',
            },
            {
              icon: Brain,
              title: 'Creator memory',
              desc: 'Every script, hook, and video you make stays in context. The AI learns your voice, not generic advice.',
            },
            {
              icon: Youtube,
              title: 'YouTube-native',
              desc: 'Connects to your channel via OAuth. Imports your videos with real view counts, likes, and performance data.',
            },
            {
              icon: Eye,
              title: 'Competitor tracking',
              desc: 'Track up to 3 channels in your niche. See what they post, what performs, and why.',
            },
            {
              icon: MessageCircle,
              title: 'Nexus chat',
              desc: 'Ask "what hooks work for me?" and get answers grounded in your actual data, not vibes.',
            },
            {
              icon: TrendingUp,
              title: 'Pattern detection',
              desc: "Surfaces what's actually working in your content — formats, hooks, topics — backed by numbers.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
                <feature.icon className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-100">{feature.title}</h3>
                <p className="text-xs leading-relaxed text-slate-400">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto w-full max-w-3xl space-y-6 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-50 md:text-3xl">
          Stop deciding what to film. Start knowing.
        </h2>
        <p className="mx-auto max-w-lg text-sm text-slate-400 md:text-base">
          The hardest part of YouTube isn&apos;t editing or writing. It&apos;s deciding what
          to make next. Let us do that research for you, every single morning.
        </p>
        <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href="/login?view=signup"
            className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-8 text-base font-semibold text-slate-950 shadow-lg transition-all hover:border-amber-400 hover:bg-amber-400 hover:shadow-xl hover:shadow-amber-500/60 sm:w-auto"
          >
            Get your first brief
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/how-it-works"
            className="text-sm font-medium text-slate-400 underline underline-offset-4 hover:text-amber-400"
          >
            Or see what&apos;s in one
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto w-full max-w-7xl border-t border-slate-800 px-4 pb-8 pt-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} Octane Nexus. All rights reserved.
          </p>
          <div className="flex gap-5 text-sm text-slate-400">
            <Link href="/how-it-works" className="hover:text-amber-400">
              How it works
            </Link>
            <Link href="/pricing" className="hover:text-amber-400">
              Pricing
            </Link>
            <Link href="/login" className="hover:text-amber-400">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

// ==================== Helper ====================

function FeatureCard({
  iconBg,
  iconFg,
  icon,
  title,
  body,
}: {
  iconBg: string;
  iconFg: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg} ${iconFg}`}
      >
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-50">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-300">{body}</p>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </main>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}
