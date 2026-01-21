export type PlaybookEntryType = 'hook' | 'script' | 'hashtag';

export type PlaybookEntry = {
  id: string;
  type: PlaybookEntryType;
  content: string;
  score: number;
  whyItWorks: string;
  createdAt: string;
};

const STORAGE_KEY = 'octane_playbook_entries';

function safeLoad(): PlaybookEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlaybookEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function safeSave(entries: PlaybookEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

export function getPlaybookEntries(): PlaybookEntry[] {
  return safeLoad();
}

export function addPlaybookEntry(entry: {
  type: PlaybookEntryType;
  content: string;
  score: number;
  whyItWorks: string;
}) {
  const existing = safeLoad();
  const newEntry: PlaybookEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...entry,
  };
  const updated = [newEntry, ...existing].slice(0, 100); // keep it bounded
  safeSave(updated);
}

export function getWinningHooks(threshold: number = 90): PlaybookEntry[] {
  return safeLoad().filter((e) => e.type === 'hook' && e.score >= threshold);
}

export function getValidatedScripts(threshold: number = 80): PlaybookEntry[] {
  return safeLoad().filter((e) => e.type === 'script' && e.score >= threshold);
}

export function getPlaybookInsights(): string[] {
  const entries = safeLoad();
  if (entries.length === 0) {
    return [
      'Once you add a few winners, I will start spotting patterns in what your audience responds to.',
    ];
  }

  const hooks = entries.filter((e) => e.type === 'hook');
  const scripts = entries.filter((e) => e.type === 'script');

  const insights: string[] = [];

  if (hooks.length > 0) {
    const withQuestions = hooks.filter((h) => /[?!]/.test(h.content)).length;
    const withNumbers = hooks.filter((h) => /\d/.test(h.content)).length;

    if (withQuestions / hooks.length > 0.4) {
      insights.push('Your audience leans toward curiosity hooks that ask questions or create tension.');
    }
    if (withNumbers / hooks.length > 0.4) {
      insights.push('Specific numbers and quantifiable claims perform unusually well for you.');
    }
  }

  if (scripts.length > 0) {
    insights.push('Scripts that clearly spell out the transformation or outcome are over‑represented in your winners.');
  }

  if (insights.length === 0) {
    insights.push('Your winners are diverse — keep experimenting, and I will surface clearer patterns as the Playbook grows.');
  }

  return insights;
}

