'use client';

import { useState, useEffect } from 'react';
import { Zap, Sparkles, Loader2, Award } from 'lucide-react';
import type { IdeaAnalysis } from '@/lib/gemini';
import { supabase } from '@/lib/supabaseClient';
import IdeaCard from './IdeaCard';
import ScriptWizard from './ScriptWizard';

function scoreToGrade(score: number): 'S' | 'A' | 'B' | 'C' {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  return 'C';
}

type IdeaLabProps = {
  niche: string;
};

export default function IdeaLab({ niche }: IdeaLabProps) {
  const [ideas, setIdeas] = useState<string[]>([]);
  const [ideaToAnalyze, setIdeaToAnalyze] = useState<string>('');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [analysis, setAnalysis] = useState<IdeaAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [scriptWizardOpen, setScriptWizardOpen] = useState(false);
  // setScriptTopic reserved for ScriptWizard when opening with a topic
  const [scriptTopic, setScriptTopic] = useState('');
  void setScriptTopic;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  function handleSaveToLibrary(idea: string) {
    if (typeof window !== 'undefined') {
      const saved = JSON.parse(localStorage.getItem('saved_ideas') || '[]');
      saved.push({ text: idea, timestamp: new Date().toISOString() });
      localStorage.setItem('saved_ideas', JSON.stringify(saved));
    }
    setToast('Saved to Vault!');
  }

  async function handleAnalyze() {
    if (!ideaToAnalyze.trim()) return;

    setAnalyzing(true);
    setAnalysis(null);

    try {
      const res = await fetch('/api/analyze-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: ideaToAnalyze.trim(), niche }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setAnalysis(data as IdeaAnalysis);
    } catch (error) {
      console.error('Failed to analyze idea:', error);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setIdeas([]);
    try {
      const res = await fetch('/api/generate-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche,
          topic: customTopic.trim() || undefined,
          userId: userId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');
      const arr = Array.isArray(data) ? data : [];
      setIdeas(arr);
    } catch (error) {
      console.error('Failed to generate ideas:', error);
    } finally {
      setGenerating(false);
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

      <input
        type="text"
        value={customTopic}
        onChange={(e) => setCustomTopic(e.target.value)}
        placeholder="Topic (e.g., SpaceX, Cooking, Morning Routines)"
        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition"
      />

      <input
        type="text"
        value={ideaToAnalyze}
        onChange={(e) => setIdeaToAnalyze(e.target.value)}
        placeholder="Paste an idea to grade its viral potential..."
        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition"
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border-2 border-amber-500 bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 hover:border-amber-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {customTopic.trim() ? `Generate for ${customTopic.trim()}` : 'Generate Ideas'}
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={!ideaToAnalyze.trim() || analyzing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
      </div>

      {/* Idea Card Grid */}
      {ideas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ideas.map((idea, idx) => (
            <IdeaCard
              key={idx}
              idea={idea}
              onScript={() => console.log('Scripting [Idea]:', idea)}
              onSave={() => handleSaveToLibrary(idea)}
            />
          ))}
        </div>
      )}

      {/* Script Wizard */}
      <ScriptWizard
        isOpen={scriptWizardOpen}
        onClose={() => setScriptWizardOpen(false)}
        topic={scriptTopic}
        userId={userId}
        onSavedToBoard={() => setToast('Saved to Board!')}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-200 shadow-lg">
          {toast}
        </div>
      )}

      {/* Report Card */}
      {analysis && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-50">Report Card</h3>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${getGradeColor(scoreToGrade(analysis.viralScore))}`}>
              <Award className="h-5 w-5" />
              <span className="text-2xl font-bold">{scoreToGrade(analysis.viralScore)}</span>
              <span className="text-sm font-medium">{analysis.viralScore}/100</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Feedback</p>
              <p className="text-sm text-slate-200 leading-relaxed">{analysis.prediction}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-amber-400 uppercase tracking-wide mb-1">Next Steps</p>
              <ul className="text-sm text-amber-300 leading-relaxed list-disc list-inside space-y-1">
                {analysis.tasks?.map((task, i) => (
                  <li key={i}>{task}</li>
                ))}
              </ul>
              {analysis.confidenceLevel && (
                <p className="text-xs text-slate-500 mt-2">{analysis.confidenceLevel}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
