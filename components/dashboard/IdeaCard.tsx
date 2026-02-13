'use client';

import { FileText, Bookmark } from 'lucide-react';

type IdeaCardProps = {
  idea: string;
  onScript: () => void;
  onSave: () => void;
};

export default function IdeaCard({ idea, onScript, onSave }: IdeaCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-800/80 p-5 flex flex-col h-full min-h-[140px] hover:border-slate-700 transition">
      <p className="text-sm text-slate-200 leading-relaxed flex-1 mb-4 line-clamp-4">
        {idea}
      </p>
      <div className="flex items-center gap-2 pt-3 border-t border-slate-700/80">
        <button
          type="button"
          onClick={onScript}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border-2 border-amber-500 bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 hover:border-amber-400 transition"
        >
          <FileText className="h-4 w-4" />
          Draft Script
        </button>
        <button
          type="button"
          onClick={onSave}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-700/80 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-600 transition"
        >
          <Bookmark className="h-4 w-4" />
          Save Idea
        </button>
      </div>
    </div>
  );
}
