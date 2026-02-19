'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

export type RiskLevel = 'low' | 'medium' | 'high';
export type RecommendedAction = 'remake' | 'clip';

export type RiskScoreResult = {
  level: RiskLevel;
  reasons: string[];
  recommendedAction: RecommendedAction;
};

type ClipItSafetyModalProps = {
  open: boolean;
  onClose: () => void;
  sourceUrl: string;
  title?: string;
  channelName?: string;
  platformTarget?: string;
  onSuccess?: (actionTaken: 'clip' | 'remake') => void;
};

export default function ClipItSafetyModal({
  open,
  onClose,
  sourceUrl,
  title,
  channelName,
  platformTarget,
  onSuccess,
}: ClipItSafetyModalProps) {
  const [risk, setRisk] = useState<RiskScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [attestation, setAttestation] = useState(false);
  const [safetyMode, setSafetyMode] = useState(true);
  const [extraConfirm, setExtraConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isMediumOrHigh = risk?.level === 'medium' || risk?.level === 'high';
  const needExtraConfirm = safetyMode && isMediumOrHigh;
  const canProceed = attestation && (!needExtraConfirm || extraConfirm);

  useEffect(() => {
    if (!open || !sourceUrl) return;
    setRisk(null);
    setAttestation(false);
    setExtraConfirm(false);
    setLoading(true);
    fetch('/api/risk/score', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceUrl,
        platformTarget: platformTarget || undefined,
        title: title || undefined,
        channelName: channelName || undefined,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setRisk(data as RiskScoreResult))
      .catch(() => toast.error('Could not load risk score'))
      .finally(() => setLoading(false));
  }, [open, sourceUrl, platformTarget, title, channelName]);

  async function handleAction(actionTaken: 'clip' | 'remake') {
    if (!canProceed) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/blueprints/extract', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl,
          targetPlatform: platformTarget || undefined,
          riskLevel: risk?.level ?? 'low',
          riskReasons: risk?.reasons ?? [],
          actionTaken,
          attestationAccepted: true,
          title: title || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((data as { error?: string }).error || 'Failed to save');
        return;
      }
      toast.success(actionTaken === 'remake' ? 'Remake Pack saved. Create your own version from Library.' : 'Clip saved; Remake Pack created for a one-click original.');
      onSuccess?.(actionTaken);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="safety-check-title">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
          <h2 id="safety-check-title" className="text-lg font-semibold text-slate-100">Safety Check — Clip It</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto space-y-4">
          {title && <p className="text-sm text-slate-300 line-clamp-2">{title}</p>}
          {loading ? (
            <div className="py-8 text-center text-slate-400">Checking risk…</div>
          ) : risk ? (
            <>
              <div className={`rounded-xl border p-4 ${
                risk.level === 'high' ? 'border-rose-500/50 bg-rose-500/10' :
                risk.level === 'medium' ? 'border-amber-500/50 bg-amber-500/10' :
                'border-slate-700 bg-slate-800/50'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {risk.level === 'high' ? <AlertTriangle className="h-5 w-5 text-rose-400" /> : risk.level === 'medium' ? <AlertTriangle className="h-5 w-5 text-amber-400" /> : <CheckCircle className="h-5 w-5 text-emerald-400" />}
                  <span className="font-semibold capitalize text-slate-100">Risk: {risk.level}</span>
                </div>
                <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                  {risk.reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
              {isMediumOrHigh && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                  <p className="text-sm font-medium text-amber-200 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Recommended: Extract Blueprint (Remake)
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Create an original version from the structure without reusing the clip.</p>
                </div>
              )}

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={safetyMode} onChange={(e) => setSafetyMode(e.target.checked)} className="rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500" />
                <span className="text-sm text-slate-300">Account safety mode (recommended)</span>
              </label>
              {needExtraConfirm && (
                <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                  <input type="checkbox" checked={extraConfirm} onChange={(e) => setExtraConfirm(e.target.checked)} className="rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500" />
                  <span className="text-sm text-slate-300">I understand this may cause takedowns or account restrictions.</span>
                </label>
              )}

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={attestation} onChange={(e) => setAttestation(e.target.checked)} className="rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500" />
                <span className="text-sm text-slate-300">I attest that I have considered the risks and wish to proceed.</span>
              </label>
            </>
          ) : null}
        </div>
        <div className="p-4 border-t border-slate-800 flex flex-col sm:flex-row gap-2 justify-end shrink-0">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition">
            Cancel
          </button>
          {risk && (
            <>
              {(risk.recommendedAction === 'remake' || isMediumOrHigh) && (
                <button
                  type="button"
                  disabled={!canProceed || submitting}
                  onClick={() => handleAction('remake')}
                  className="rounded-lg border-2 border-amber-500 bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition"
                >
                  {submitting ? 'Saving…' : 'Extract Blueprint (Remake)'}
                </button>
              )}
              <button
                type="button"
                disabled={!canProceed || submitting}
                onClick={() => handleAction('clip')}
                className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50 transition"
              >
                {submitting ? 'Saving…' : 'Proceed anyway'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
