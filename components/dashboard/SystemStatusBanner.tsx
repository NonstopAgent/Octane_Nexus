'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { hasKey, KEYS_CHANGED_EVENT } from '@/lib/apiKeys';

export default function SystemStatusBanner() {
  const [demoMode, setDemoMode] = useState(false);
  const [openaiMissing, setOpenaiMissing] = useState(false);
  const [pexelsMissing, setPexelsMissing] = useState(false);

  const refreshKeyStatus = useCallback(() => {
    setOpenaiMissing(!hasKey('openai'));
    setPexelsMissing(!hasKey('pexels'));
  }, []);

  useEffect(() => {
    setDemoMode(process.env.NEXT_PUBLIC_DEMO_MODE === 'true');
    refreshKeyStatus();
    window.addEventListener(KEYS_CHANGED_EVENT, refreshKeyStatus);
    return () => window.removeEventListener(KEYS_CHANGED_EVENT, refreshKeyStatus);
  }, [refreshKeyStatus]);

  if (!demoMode && !openaiMissing && !pexelsMissing) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm">
      {demoMode && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-amber-300">
          <Info className="h-3.5 w-3.5" />
          Demo mode ON
        </span>
      )}
      {openaiMissing && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5" />
          OpenAI key missing — add in Settings → Developer
        </span>
      )}
      {pexelsMissing && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5" />
          Pexels key missing — add in Settings → Developer
        </span>
      )}
    </div>
  );
}
