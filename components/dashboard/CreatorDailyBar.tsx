'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Zap,
  Lightbulb,
  FileText,
  Video,
  MessageCircle,
  Flame,
} from 'lucide-react';
import type { CreatorTodayPayload, NextBestAction } from '@/app/api/creator/today/route';

/* ------------------------------------------------------------------ */
/*  Action config: label, guidance, href, chat prompt                 */
/* ------------------------------------------------------------------ */

type ActionConfig = {
  label: string;
  guidance: string;
  href: string;
  chatPrompt: string;
  Icon: typeof Zap;
};

const ACTION_MAP: Record<NextBestAction, ActionConfig> = {
  film: {
    label: 'Film a video',
    guidance: 'You have posts ready to film. Head to Post Lab to finalize and ship.',
    href: '/dashboard/post-lab',
    chatPrompt: 'I have videos ready to film. What should I focus on to make them great?',
    Icon: Video,
  },
  finish_script: {
    label: 'Finish a script',
    guidance: 'Scripts are in progress. Jump to Production and polish one into a filmable blueprint.',
    href: '/dashboard/production',
    chatPrompt: 'I have scripts in progress. Help me tighten the hook and CTA.',
    Icon: FileText,
  },
  turn_idea_into_script: {
    label: 'Script an idea',
    guidance: 'You have raw ideas waiting. Pick one and turn it into a hook + beats + CTA.',
    href: '/dashboard/production',
    chatPrompt: 'I have content ideas but no scripts yet. Help me pick the best one and write a script.',
    Icon: Lightbulb,
  },
  grab_trend: {
    label: 'Grab a trend',
    guidance: 'Your pipeline is empty. Scout what\u2019s working in your niche and brainstorm.',
    href: '/dashboard/trends',
    chatPrompt: 'My content pipeline is empty. What trending formats should I try this week?',
    Icon: Zap,
  },
};

/* ------------------------------------------------------------------ */
/*  Chip                                                              */
/* ------------------------------------------------------------------ */

function CountChip({
  label,
  count,
  accent,
}: {
  label: string;
  count: number;
  accent?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-none ${
        accent
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
          : 'border-slate-700/80 bg-slate-800/60 text-slate-300'
      }`}
    >
      <span className="tabular-nums font-semibold">{count}</span>
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function CreatorDailyBar() {
  const [data, setData] = useState<CreatorTodayPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/creator/today')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d && !d.error) setData(d as CreatorTodayPayload);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null; // loading or unauthenticated — don't flash

  const action = ACTION_MAP[data.nextBestAction];
  const ActionIcon = action.Icon;

  const chatHref = `/dashboard/chat?prompt=${encodeURIComponent(action.chatPrompt)}`;

  return (
    <div
      data-testid="creator-daily-bar"
      className="relative z-10 border-b border-slate-800/70 bg-slate-950/60 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-6 py-2.5">
        {/* Left: mission */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
            <ActionIcon className="h-3.5 w-3.5" />
          </div>
          <p className="text-xs text-slate-300 leading-snug">
            <span className="font-semibold text-slate-100">Today:</span>{' '}
            {action.guidance}
          </p>
        </div>

        {/* Center: count chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <CountChip label="Ideas" count={data.ideasCount} />
          <CountChip label="Scripting" count={data.scriptingCount} />
          <CountChip
            label="Ready"
            count={data.readyCount}
            accent={data.readyCount > 0}
          />
          <CountChip label="Scheduled" count={data.scheduledCount} />
          {data.streakCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium leading-none text-emerald-300">
              <Flame className="h-3 w-3" />
              {data.streakCount}d streak
            </span>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={chatHref}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-[11px] font-medium text-slate-300 transition hover:border-slate-600 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:ring-offset-1 focus:ring-offset-slate-950"
          >
            <MessageCircle className="h-3 w-3" />
            Ask Nexus
          </Link>
          <Link
            href={action.href}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/60 bg-amber-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1 focus:ring-offset-slate-950 active:scale-[0.98]"
          >
            <ActionIcon className="h-3 w-3" />
            {action.label}
          </Link>
        </div>
      </div>
    </div>
  );
}
