'use client';

import { useState } from 'react';
import { Zap, TrendingUp, Loader2, Award } from 'lucide-react';
import { analyzeIdea, getTrendingTopic } from '@/lib/gemini';

type IdeaAnalysis = {
  score: number;
  grade: 'S' | 'A' | 'B' | 'C';
  feedback: string;
  viral_tweak: string;
};

type IdeaLabProps = {
  niche: string;
};

export default function IdeaLab({ niche }: IdeaLabProps) {
  const [idea, setIdea] = useState<string>('');
  const [analysis, setAnalysis] = useState<IdeaAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [loadingTrend, setLoadingTrend] = useState<boolean>(false);

  async function handleAnalyze() {
    if (!idea.trim()) return;

    setAnalyzing(true);
    setAnalysis(null);

    try {
      const result = await analyzeIdea(idea, niche);
      setAnalysis(result);
    } catch (error) {
      console.error('Failed to analyze idea:', error);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleInspire() {
    setLoadingTrend(true);
    try {
      const trend = await getTrendingTopic(niche);
      setIdea(trend);
    } catch (error) {
      console.error('Failed to get trending topic:', error);
    } finally {
      setLoadingTrend(false);
    }
  }

  function getGradeColor(grade: string) {
    switch (grade) {
      case 'S':
        return 'text-purple-400 border-purple-500 bg-purple-500/10';
      case 'A':
        return 'text-green-400 border-green-500 bg-green-500/10';
      case 'B':
        return 'text-amber-400 border-amber-500 bg-amber-500/10';
      case 'C':
        return 'text-orange-400 border-orange-500 bg-orange-500/10';
      default:
        return 'text-slate-400 border-slate-500 bg-slate-500/10';
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-50">Idea Lab</h2>
        <span className="text-xs text-slate-500">Grade your viral potential</span>
      </div>

      <textarea
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        placeholder="Dump your raw idea here... (e.g., 'What if I made a video about how busy dads can get fit in 15 minutes?')"
        className="w-full min-h-[120px] rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition resize-none"
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={!idea.trim() || analyzing}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-400 hover:bg-amber-500/20 hover:border-amber-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {analyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Analyze Viral Potential
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleInspire}
          disabled={loadingTrend}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingTrend ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <TrendingUp className="h-4 w-4" />
              Inspire with Trends
            </>
          )}
        </button>
      </div>

      {/* Report Card */}
      {analysis && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-50">Report Card</h3>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${getGradeColor(analysis.grade)}`}>
              <Award className="h-5 w-5" />
              <span className="text-2xl font-bold">{analysis.grade}</span>
              <span className="text-sm font-medium">{analysis.score}/100</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Feedback</p>
              <p className="text-sm text-slate-200 leading-relaxed">{analysis.feedback}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-amber-400 uppercase tracking-wide mb-1">Viral Tweak</p>
              <p className="text-sm text-amber-300 leading-relaxed">{analysis.viral_tweak}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
