'use client';

import { useState } from 'react';
import { CalendarDays, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { POST_STATUS } from '@/lib/status';

type ScheduleModalProps = {
  postId: string;
  postTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onScheduled: () => void;
};

const PLATFORM_OPTIONS = [
  { value: 'TikTok', label: 'TikTok' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'YouTube', label: 'YouTube' },
  { value: 'X', label: 'X' },
];

export default function ScheduleModal({
  postId,
  postTitle,
  isOpen,
  onClose,
  onScheduled,
}: ScheduleModalProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('14:00');
  const [platform, setPlatform] = useState('TikTok');
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit() {
    setValidationError(null);

    if (!date) {
      setValidationError('Please pick a date');
      return;
    }

    setSaving(true);
    try {
      const scheduledDate = new Date(`${date}T${time || '14:00'}:00`);

      const { error } = await supabase
        .from('content_posts')
        .update({
          status: POST_STATUS.SCHEDULED,
          scheduled_date: scheduledDate.toISOString(),
          platform,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId);

      if (error) {
        toast.error('Failed to schedule: ' + error.message);
        return;
      }

      toast.success('Post scheduled!');
      onScheduled();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to schedule');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl"
        data-testid="schedule-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-100">Schedule Post</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          <p className="text-sm text-slate-300 line-clamp-2">{postTitle}</p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Date
              </label>
              <input
                data-testid="schedule-date-input"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setValidationError(null);
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Time
              </label>
              <input
                data-testid="schedule-time-input"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Platform
              </label>
              <select
                data-testid="schedule-platform-input"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-amber-500 focus:outline-none"
              >
                {PLATFORM_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {validationError && (
            <p
              data-testid="schedule-validation-error"
              className="text-sm font-medium text-rose-400"
            >
              {validationError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="schedule-confirm-btn"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-500 bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60 transition"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scheduling…
              </>
            ) : (
              <>
                <CalendarDays className="h-4 w-4" />
                Schedule
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
