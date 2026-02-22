'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { hasStoredKey, KEYS_CHANGED_EVENT, type ApiKeyKind } from '@/lib/apiKeys';

type KeyLabel = { kind: ApiKeyKind; label: string };

const KEY_LABELS: KeyLabel[] = [
  { kind: 'openai', label: 'OpenAI key missing' },
  { kind: 'pexels', label: 'Pexels key missing' },
  { kind: 'rapidapi', label: 'RapidAPI key missing' },
];

/**
 * Renders API key warning banners only when the user has an active session.
 * Unauthenticated users never see these messages.
 */
export function SystemStatusBanner() {
  const session = useSession();
  const [missing, setMissing] = useState<KeyLabel[]>([]);

  useEffect(() => {
    async function updateMissing() {
      const results = await Promise.all(
        KEY_LABELS.map(async ({ kind, label }) => ({ kind, label, has: await hasStoredKey(kind) }))
      );
      setMissing(results.filter((r) => !r.has).map(({ kind, label }) => ({ kind, label })));
    }
    updateMissing();
    const handler = () => { updateMissing(); };
    window.addEventListener(KEYS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(KEYS_CHANGED_EVENT, handler);
  }, []);

  if (session === null || missing.length === 0) return null;

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 text-sm text-amber-200">
        {missing.map(({ kind, label }) => (
          <span key={kind}>{label}</span>
        ))}
      </div>
    </div>
  );
}
