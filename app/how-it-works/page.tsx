'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Eye,
  TrendingUp,
  Zap,
  ExternalLink,
  Youtube,
  Clock,
  Coffee,
  Sunrise,
  Check,
  X,
} from 'lucide-react';

/**
 * /how-it-works
 *
 * Purpose: show a hesitant visitor what they'd actually wake up to on day 2.
 * Not a re-pitch. A concrete walkthrough of the overnight flow + a realistic
 * sample brief + honest limitations. Everything here is illustrative; it uses
 * the real DailyBriefRow shape (competitor_insights, your_patterns,
 * todays_idea) so the sample matches what the product actually produces.
 *
 * Keep this page free of Gemini calls, DB reads, and auth. It's marketing,
 * not product — it must render fast, everywhere, without any backend.
 */

// Sample data — intentionally realistic but clearly labeled as an example.
// Fitness/home-gym niche because it has real competitive dynamics creators
// will recognize.
const SAMPLE_COMPETITORS = [
  {
    channel: 'Garage Gym Reviews',
    video_title: 'I Tested the 3 Cheapest Power Racks on Amazon (One Broke)',
    view_count: 184000,
    avg_views: 62000,
    hook_pattern: 'Number + high-stakes test + cliffhanger',
    why_it_worked:
      'The "(One Broke)" in parens is the whole play. It turns a review into a story. The number 3 keeps scope tight enough to believe.',
  },
  {
    channel: 'Basement Lifter',
    video_title: 'Why I Sold My $4,000 Rogue Rack After 6 Months',
    view_count: 97000,
    avg_views: 35000,
    hook_pattern: 'High-dollar reversal, first-person',
    why_it_worked:
      'Price anchor + timeframe + contrarian move. Viewers click to find out what went wrong with the "best" brand.',
  },
];

const SAMPLE_PATTERNS = [
  {
    insight: 'Your question-hook videos are averaging 2.1x your channel average.',
    evidence: [
      '"Why does my squat look like this?" — 28,400 views (avg: 12,100)',
      '"Is 300lb deadlift actually impressive?" — 19,800 views',
      '"What rack should I buy under $800?" — 24,600 views',
    ],
    confidence: 'high' as const,
  },
  {
    insight: 'Videos longer than 12 minutes drop off 40% harder than your 7-10 minute cuts.',
    evidence: [
      'Last 4 uploads over 12min averaged 38% AVD',
      'Last 4 uploads 7-10min averaged 64% AVD',
    ],
    confidence: 'medium' as const,
  },
];

const SAMPLE_IDEA = {
  title: 'The $500 Home Gym That Actually Works (One Mistake Cost Me $200)',
  hook:
    'Everyone says you can\'t build a real gym for $500. I did it, and then I wasted $200 on the wrong thing. Here\'s what I\'d buy instead.',
  format: '8-10 min review with B-roll of each piece of equipment',
  thumbnail_concepts: [
    '$500 bill torn in half with a barbell on it, red arrow pointing at "$200 WASTED"',
    'You holding two plates, one crossed out with a giant X',
    'Split-screen: cheap rack vs Rogue rack, "WHICH WOULD YOU BUY?" text',
  ],
  outline:
    'Open with the mistake up front — the $200 piece you regret. Then walk through the four items that actually matter. End with a one-line buying order for someone starting from zero.',
  why_now:
    'Budget home-gym content is peaking in your niche this week — two of your tracked channels just posted in this angle and both outperformed their averages.',
};

export default function HowItWorksPage() {
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-20 px-4 py-16 md:py-24">
      {/* Hero */}
      <section className="mx-auto max-w-3xl space-y-6 text-center">
        <div className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
          How It Works
        </div>
        <h1 className="text-4xl font-semibold leading-tight text-slate-50 md:text-5xl">
          Here&apos;s what you&apos;ll wake up to on{' '}
          <span className="text-amber-500">day 2.</span>
        </h1>
        <p className="mx-auto max-w-2xl text-base text-slate-300 md:text-lg leading-relaxed">
          No fluff. This is the actual shape of the brief our system generates every
          morning, filled in with a realistic example so you can decide if it&apos;s worth
          connecting your channel.
        </p>
      </section>

      {/* Overnight Timeline */}
      <section className="mx-auto w-full max-w-5xl space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-semibold text-slate-50 md:text-3xl">
            The overnight flow
          </h2>
          <p className="text-sm text-slate-400 md:text-base max-w-xl mx-auto">
            You connect YouTube once and pick up to 3 competitor channels.
            Then this happens every night, whether you remember or not.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-4">
          <TimelineStep
            time="11:47 PM"
            icon={<Coffee className="h-5 w-5" />}
            title="You close the laptop"
            body="Your channel data is already imported. Your 3 tracked competitors are in the system. Nothing to do."
            tint="slate"
          />
          <TimelineStep
            time="12:00 AM UTC"
            icon={<Eye className="h-5 w-5" />}
            title="We pull new uploads"
            body="Fresh videos from your tracked channels get fetched with real view counts, titles, and timestamps."
            tint="red"
          />
          <TimelineStep
            time="12:04 AM UTC"
            icon={<TrendingUp className="h-5 w-5" />}
            title="We find the outliers"
            body="We compare each new upload against that channel's 90-day average. The ones beating their baseline get analyzed."
            tint="amber"
          />
          <TimelineStep
            time="7:00 AM local"
            icon={<Sunrise className="h-5 w-5" />}
            title="You open the app"
            body="One screen is waiting. Niche signals, your own patterns, and one specific idea to film today."
            tint="emerald"
          />
        </div>
      </section>

      {/* Sample Brief */}
      <section className="mx-auto w-full max-w-4xl space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-semibold text-slate-50 md:text-3xl">
            Your morning brief — example
          </h2>
          <p className="text-sm text-slate-400 md:text-base max-w-xl mx-auto">
            What a home-gym creator tracking two competitor channels might see.
            The shape is real. The data here is illustrative.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 md:p-8">
          {/* Mock browser chrome */}
          <div className="mb-6 flex items-center gap-2 border-b border-slate-800 pb-4">
            <div className="h-3 w-3 rounded-full bg-slate-700" />
            <div className="h-3 w-3 rounded-full bg-slate-700" />
            <div className="h-3 w-3 rounded-full bg-slate-700" />
            <p className="ml-3 text-xs text-slate-500">
              octane-nexus.app / dashboard / brief
            </p>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
              <Clock className="h-3 w-3" />
              Example
            </span>
          </div>

          <p className="mb-6 text-xs text-slate-500">
            Generated Tuesday at 6:58 AM · Synthesizing 2 competitor channels and 12 of
            your recent uploads
          </p>

          <SampleSection
            label="What's working in your niche"
            accent="emerald"
          >
            <div className="space-y-4">
              {SAMPLE_COMPETITORS.map((c) => (
                <div
                  key={c.video_title}
                  className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                >
                  <p className="font-medium text-slate-100">{c.video_title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {c.channel} · {c.view_count.toLocaleString()} views ·{' '}
                    <span className="text-amber-400/90">
                      {Math.round((c.view_count / c.avg_views) * 10) / 10}×
                      their average
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-slate-300">{c.why_it_worked}</p>
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500">
                    Hook pattern:{' '}
                    <span className="text-slate-300">{c.hook_pattern}</span>
                  </p>
                </div>
              ))}
            </div>
          </SampleSection>

          <div className="mt-6">
            <SampleSection label="Your patterns" accent="amber">
              <div className="space-y-3">
                {SAMPLE_PATTERNS.map((p) => (
                  <div
                    key={p.insight}
                    className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                  >
                    <p className="text-slate-100">{p.insight}</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-400">
                      {p.evidence.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-600">
                      confidence: {p.confidence}
                    </p>
                  </div>
                ))}
              </div>
            </SampleSection>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">
              Today&apos;s idea
            </p>
            <p className="mt-3 text-lg font-semibold text-slate-50 md:text-xl">
              {SAMPLE_IDEA.title}
            </p>
            <p className="mt-3 text-sm italic text-slate-300">
              &ldquo;{SAMPLE_IDEA.hook}&rdquo;
            </p>
            <p className="mt-3 text-xs text-slate-500">Format: {SAMPLE_IDEA.format}</p>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Outline
              </p>
              <p className="mt-1 text-sm text-slate-300">{SAMPLE_IDEA.outline}</p>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Thumbnail concepts
              </p>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-300">
                {SAMPLE_IDEA.thumbnail_concepts.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
            </div>

            <p className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300/90">
              Why now: {SAMPLE_IDEA.why_now}
            </p>
          </div>
        </div>
      </section>

      {/* Honest Limitations */}
      <section className="mx-auto w-full max-w-4xl space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-semibold text-slate-50 md:text-3xl">
            Things we don&apos;t do (on purpose)
          </h2>
          <p className="text-sm text-slate-400 md:text-base max-w-xl mx-auto">
            Clarity up front is better than surprise later.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <LimitCard
            title="We don't work for channels under about 1,000 subs"
            body="You need enough uploads for pattern detection to mean something. Under a few dozen videos, our signal is just noise. Come back when you're further in."
          />
          <LimitCard
            title="We don't make thumbnails or edit videos"
            body="We tell you what to film and give you three thumbnail concepts in words. You still have to actually make the thing."
          />
          <LimitCard
            title="We don't track Instagram, TikTok, or X"
            body="YouTube only, deliberately. Trying to cover every platform is how these tools become shallow everywhere. We'd rather be deep somewhere."
          />
          <LimitCard
            title="We don't promise your video will go viral"
            body="We tell you what's working right now and why. The filming, the editing, and luck are still on you. Nobody can promise the rest."
          />
        </div>
      </section>

      {/* What You Need */}
      <section className="mx-auto w-full max-w-3xl space-y-6">
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-semibold text-slate-50 md:text-3xl">
            What you need to get started
          </h2>
        </div>
        <ul className="space-y-3">
          <ChecklistItem
            title="A YouTube channel with at least a handful of videos"
            detail="We import your real uploads to detect patterns. The more you have, the sharper day 2 gets."
          />
          <ChecklistItem
            title="Three competitors you respect in your niche"
            detail="Channels you'd watch to study craft. You can swap them any time."
          />
          <ChecklistItem
            title="A Google account (one click sign-in)"
            detail="Continue with Google, confirm your niche, connect YouTube. Takes about 90 seconds."
          />
        </ul>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-3xl space-y-6 text-center">
        <h2 className="text-2xl font-semibold text-slate-50 md:text-3xl">
          Ready to try it on your actual channel?
        </h2>
        <p className="text-sm text-slate-400 md:text-base max-w-lg mx-auto">
          Free during beta. No credit card. You can connect YouTube now and get your
          first real brief tomorrow morning.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/login?view=signup"
            className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-8 text-base font-semibold text-slate-950 shadow-lg transition-all hover:border-amber-400 hover:bg-amber-400 hover:shadow-xl hover:shadow-amber-500/60 hover:scale-[1.02]"
          >
            Start free
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-8 text-base font-semibold text-slate-200 transition-all hover:border-amber-500/50 hover:bg-slate-800 hover:text-amber-400"
          >
            Back to home
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto w-full max-w-7xl border-t border-slate-800 px-4 pt-8 pb-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} Octane Nexus. All rights reserved.
          </p>
          <div className="flex gap-5 text-sm text-slate-400">
            <Link href="/" className="hover:text-amber-400">
              Home
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

// ==================== Helper components ====================

type TintKey = 'slate' | 'red' | 'amber' | 'emerald';

// Tailwind needs literal classnames at build time — Tailwind's JIT can't
// infer dynamic strings like `bg-${tint}-500/20`, so we spell out each tint
// explicitly. This keeps the utility classes visible to the purger.
const TINT_STYLES: Record<TintKey, { bg: string; text: string; border: string }> = {
  slate: { bg: 'bg-slate-800/60', text: 'text-slate-300', border: 'border-slate-700' },
  red: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
  amber: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  emerald: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
};

function TimelineStep({
  time,
  icon,
  title,
  body,
  tint,
}: {
  time: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  tint: TintKey;
}) {
  const styles = TINT_STYLES[tint];
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${styles.bg} ${styles.text}`}
        >
          {icon}
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {time}
        </span>
      </div>
      <h3 className="text-base font-semibold text-slate-50">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
    </div>
  );
}

type AccentKey = 'emerald' | 'amber';
const ACCENT_STYLES: Record<AccentKey, string> = {
  emerald: 'text-emerald-400/90',
  amber: 'text-amber-400/90',
};

function SampleSection({
  label,
  accent,
  children,
}: {
  label: string;
  accent: AccentKey;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3
        className={`text-xs font-semibold uppercase tracking-wide ${ACCENT_STYLES[accent]}`}
      >
        {label}
      </h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function LimitCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-400">
          <X className="h-3.5 w-3.5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          <p className="text-xs text-slate-400 leading-relaxed">{body}</p>
        </div>
      </div>
    </div>
  );
}

function ChecklistItem({ title, detail }: { title: string; detail: string }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
        <Check className="h-3.5 w-3.5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-100">{title}</p>
        <p className="text-xs text-slate-400 leading-relaxed">{detail}</p>
      </div>
    </li>
  );
}
