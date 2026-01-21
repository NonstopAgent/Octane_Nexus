'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Instagram, Youtube, Twitter, Music2, CheckSquare, Square } from 'lucide-react';

type Platform = 'instagram' | 'youtube' | 'x' | 'tiktok';

type ScheduledPost = {
  id: string;
  title: string;
  platform: Platform;
  date: string; // ISO string
};

type TaskItem = {
  id: string;
  label: string;
  completed: boolean;
};

const MOCK_POSTS: ScheduledPost[] = [
  {
    id: '1',
    title: 'IG: Fast Cars Reel',
    platform: 'instagram',
    date: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'YT: Market Analysis Deep Dive',
    platform: 'youtube',
    date: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(),
  },
  {
    id: '3',
    title: 'X: Spicy Hook Thread',
    platform: 'x',
    date: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(),
  },
  {
    id: '4',
    title: 'TikTok: Before/After Transformation',
    platform: 'tiktok',
    date: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString(),
  },
];

const INITIAL_TASKS: TaskItem[] = [
  { id: 't1', label: 'Film B-roll for Fast Cars', completed: false },
  { id: 't2', label: 'Edit Market Analysis thumbnail', completed: false },
  { id: 't3', label: 'Approve captions for TikTok transformation', completed: false },
  { id: 't4', label: 'Schedule X thread in Post Lab', completed: false },
];

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
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [unscheduledIdeas, setUnscheduledIdeas] = useState<string[]>([]);

  // Load unscheduled ideas from Library (mock: saved_ideas)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem('saved_ideas');
        if (raw) {
          const parsed = JSON.parse(raw) as { text: string }[];
          setUnscheduledIdeas(parsed.slice(-5).map((i) => i.text));
        } else {
          setUnscheduledIdeas([
            'IG: Behind the Scenes of Recording Day',
            'YT: 3 Mistakes New Creators Make',
            'X: Thread on Algorithm Myths',
          ]);
        }
      } catch {
        setUnscheduledIdeas([
          'IG: Behind the Scenes of Recording Day',
          'YT: 3 Mistakes New Creators Make',
          'X: Thread on Algorithm Myths',
        ]);
      }
    }
  }, []);

  const completedCount = tasks.filter((t) => t.completed).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  function toggleTask(id: string) {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  }

  // Calendar calculations (current month)
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed

  const firstOfMonth = new Date(currentYear, currentMonth, 1);
  const startDay = firstOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const calendarCells = useMemo(() => {
    const cells: { date: Date | null }[] = [];
    for (let i = 0; i < startDay; i++) {
      cells.push({ date: null });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ date: new Date(currentYear, currentMonth, day) });
    }
    return cells;
  }, [startDay, daysInMonth, currentMonth, currentYear]);

  function postsForDate(date: Date | null) {
    if (!date) return [] as ScheduledPost[];
    const dayKey = date.toDateString();
    return MOCK_POSTS.filter(
      (post) => new Date(post.date).toDateString() === dayKey
    );
  }

  const monthLabel = today.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-amber-400" />
          <div>
            <h1 className="text-3xl font-bold text-slate-50">Schedule</h1>
            <p className="text-sm text-slate-400 mt-1">
              Visualize your content calendar and ship today&apos;s tasks.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT: Calendar View (2/3) */}
        <div className="xl:col-span-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Content Calendar
              </p>
              <h2 className="text-lg font-semibold text-slate-50 mt-1">{monthLabel}</h2>
            </div>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-2 text-[11px] font-medium text-slate-400 mt-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="mt-2 grid grid-cols-7 gap-2 text-xs">
            {calendarCells.map((cell, idx) => {
              const cellPosts = postsForDate(cell.date);
              const isToday =
                cell.date &&
                cell.date.toDateString() === today.toDateString();

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
                    {cellPosts.map((post) => {
                      const styles = getPlatformStyles(post.platform);
                      const Icon = getPlatformIcon(post.platform);
                      return (
                        <div
                          key={post.id}
                          className={`flex items-center gap-1.5 rounded-md border px-1.5 py-1 ${styles.bg} ${styles.border}`}
                        >
                          <Icon className={`h-3 w-3 ${styles.text}`} />
                          <span className="text-[11px] font-medium text-slate-100 truncate">
                            {post.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: AI Taskmaster Sidebar (1/3) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 flex flex-col gap-4">
          {/* Production Queue Header + Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Production Queue
                </p>
                <h2 className="text-lg font-semibold text-slate-50 mt-1">
                  AI Taskmaster
                </h2>
              </div>
              <span className="text-xs text-slate-400">
                {completedCount}/{tasks.length} done
              </span>
            </div>
            {/* Daily Progress bar */}
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Task list */}
          <div className="flex-1 space-y-2 overflow-y-auto">
            {tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => toggleTask(task.id)}
                className={`w-full flex items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                  task.completed
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 line-through'
                    : 'border-slate-800 bg-slate-900/60 text-slate-100 hover:border-amber-500/50'
                }`}
              >
                {task.completed ? (
                  <CheckSquare className="h-4 w-4 flex-shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <Square className="h-4 w-4 flex-shrink-0 text-slate-500 mt-0.5" />
                )}
                <span className="flex-1">{task.label}</span>
              </button>
            ))}
          </div>

          {/* Drafts bin (mock drag UI) */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide flex items-center gap-1">
              Drafts Bin
            </p>
            <p className="text-[11px] text-slate-500">
              Unscheduled ideas from your Library. Drag these into the calendar (visual only for now).
            </p>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {unscheduledIdeas.map((idea, idx) => (
                <div
                  key={`${idea}-${idx}`}
                  draggable
                  className="cursor-grab rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 hover:border-amber-500/60 hover:bg-slate-900 transition"
                >
                  {idea}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

