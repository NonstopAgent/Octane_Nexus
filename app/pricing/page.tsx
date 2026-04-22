import Link from 'next/link';
import { Check, Zap, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing · Octane Nexus',
  description:
    'Simple, transparent pricing. One plan. Everything you need to wake up to your morning brief every day.',
};

const INCLUDED = [
  'Daily morning brief — every single day',
  'Competitor outlier detection (up to 3 channels)',
  'Your channel pattern analysis',
  'One ready-to-film video idea per day',
  'Nexus Chat — AI that knows your channel',
  'Hook Lab — 10 opening lines per topic',
  'Creator Memory — your scripts, hooks, and ideas',
  'Niche Surveillance — top-performing videos in your space',
  'YouTube OAuth connection (real data, not estimates)',
  'AI gets smarter the longer you use it',
];

const NOT_INCLUDED = [
  'Thumbnail creation or editing',
  'Video editing or production',
  'Instagram, TikTok, or X analytics',
  'Channels under 1,000 subscribers (signal is too thin)',
];

export default function PricingPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-16 px-4 py-16 md:gap-24 md:px-6 md:py-24">
      {/* Header */}
      <section className="mx-auto max-w-2xl space-y-5 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-400">
          Pricing
        </div>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-50 md:text-5xl">
          One plan.{' '}
          <span className="text-amber-400">No surprises.</span>
        </h1>
        <p className="mx-auto max-w-xl text-base leading-relaxed text-slate-300 md:text-lg">
          Octane Nexus is free during the current beta. When we launch paid
          tiers, early beta users will be grandfathered in at a lower rate.
          No credit card required to start.
        </p>
      </section>

      {/* Pricing card */}
      <section className="mx-auto w-full max-w-lg">
        <div className="relative rounded-3xl border-2 border-amber-500/40 bg-slate-900/60 p-8 shadow-2xl shadow-amber-500/5 md:p-10">
          {/* Beta badge */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/20 px-4 py-1 text-xs font-bold uppercase tracking-widest text-amber-400">
              <Zap className="h-3 w-3" />
              Free during beta
            </span>
          </div>

          {/* Price */}
          <div className="mt-4 space-y-1 text-center">
            <div className="flex items-end justify-center gap-2">
              <span className="text-6xl font-bold tracking-tight text-slate-50">$0</span>
              <span className="mb-2 text-sm text-slate-400">/ month</span>
            </div>
            <p className="text-sm text-slate-400">
              No credit card. Cancel anytime (there&apos;s nothing to cancel).
            </p>
          </div>

          {/* CTA */}
          <div className="mt-8">
            <Link
              href="/login?view=signup"
              className="inline-flex w-full min-h-[56px] items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-8 text-base font-semibold text-slate-950 shadow-lg transition-all hover:border-amber-400 hover:bg-amber-400 hover:shadow-xl hover:shadow-amber-500/60"
            >
              Get your first brief
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>

          {/* Divider */}
          <div className="my-8 border-t border-slate-800" />

          {/* What's included */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Everything included
            </p>
            <ul className="space-y-2.5">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                    <Check className="h-3 w-3 text-emerald-400" />
                  </span>
                  <span className="text-sm text-slate-200">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* What we don't do */}
      <section className="mx-auto w-full max-w-lg space-y-5">
        <h2 className="text-lg font-semibold text-slate-50">
          What&apos;s not included (on purpose)
        </h2>
        <p className="text-sm text-slate-400">
          We&apos;d rather be great at one thing than mediocre at ten. These are
          deliberate scope decisions, not missing features.
        </p>
        <ul className="space-y-2.5">
          {NOT_INCLUDED.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-800">
                <span className="h-2 w-2 rounded-full bg-slate-600" />
              </span>
              <span className="text-sm text-slate-400">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* FAQ */}
      <section className="mx-auto w-full max-w-2xl space-y-8">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-50">
          Common questions
        </h2>
        <div className="space-y-6 divide-y divide-slate-800">
          {[
            {
              q: 'What happens when the beta ends?',
              a: "We'll announce pricing at least 30 days in advance. Beta users will get a discounted rate locked in for as long as they stay subscribed. We won't just flip a switch and start charging.",
            },
            {
              q: 'Do I need to give you my YouTube password?',
              a: "No. You connect via Google OAuth — the same secure flow YouTube uses for all third-party apps. We only request read access to your channel data. We can't post, delete, or modify anything.",
            },
            {
              q: 'What if my channel is under 1,000 subscribers?',
              a: "The AI needs enough historical video data to detect real patterns. Under about 1,000 subscribers, most channels don't have enough uploads for the signal to be meaningful. Come back when you're further along.",
            },
            {
              q: 'How many competitor channels can I track?',
              a: 'Up to 3 during beta. We pull their recent uploads every night and run the outlier analysis against their own baseline — not a global average.',
            },
            {
              q: 'Does the AI improve over time?',
              a: "Yes. Every brief you receive is logged. The system watches whether you film the suggested idea, and if you do, whether it performed above your average. Over 2–4 weeks, the brief gets noticeably more tailored to what actually works for your specific channel.",
            },
          ].map(({ q, a }) => (
            <div key={q} className="space-y-2 pt-6 first:pt-0">
              <p className="font-semibold text-slate-100">{q}</p>
              <p className="text-sm leading-relaxed text-slate-400">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="mx-auto w-full max-w-2xl space-y-5 rounded-3xl border border-slate-800 bg-slate-900/40 p-8 text-center md:p-12">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-50 md:text-3xl">
          Ready to stop guessing what to film?
        </h2>
        <p className="mx-auto max-w-md text-sm text-slate-400 md:text-base">
          Connect YouTube once. Pick 3 competitors. Wake up to intelligence,
          not guesswork — starting tomorrow morning.
        </p>
        <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href="/login?view=signup"
            className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-8 text-sm font-semibold text-slate-950 shadow-lg transition-all hover:border-amber-400 hover:bg-amber-400 sm:w-auto"
          >
            Start free — no card needed
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/how-it-works"
            className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full border border-slate-700 bg-transparent px-8 text-sm font-semibold text-slate-300 transition-all hover:border-amber-500/50 hover:text-amber-400 sm:w-auto"
          >
            See what&apos;s in a brief
          </Link>
        </div>
      </section>
    </main>
  );
}
