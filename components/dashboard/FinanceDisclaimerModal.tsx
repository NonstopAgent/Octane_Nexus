'use client';

import { useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onAcknowledge?: () => void;
};

export default function FinanceDisclaimerModal({ open, onClose, onAcknowledge }: Props) {
  const [understood, setUnderstood] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" role="dialog" aria-labelledby="finance-disclaimer-title">
      <div className="rounded-xl border border-amber-500/30 bg-slate-900 p-6 max-w-sm shadow-xl">
        <h2 id="finance-disclaimer-title" className="text-lg font-semibold text-slate-50 mb-2">
          Finance content reminder
        </h2>
        <p className="text-sm text-slate-300 mb-4">
          Consider adding &quot;Not financial advice&quot; to reduce platform risk.
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
            }}
            className="w-full rounded-lg border border-amber-500 bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition"
          >
            I&apos;ll add it
          </button>
          <div className="flex items-center gap-2">
            <input
              id="finance-ignore-understood"
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              className="rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500"
            />
            <label htmlFor="finance-ignore-understood" className="text-xs text-slate-400">
              I understand
            </label>
          </div>
          <button
            type="button"
            onClick={() => {
              if (understood) {
                onAcknowledge?.();
                onClose();
              }
            }}
            disabled={!understood}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Ignore
          </button>
        </div>
      </div>
    </div>
  );
}
