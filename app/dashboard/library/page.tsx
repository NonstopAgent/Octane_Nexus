'use client';

import { useState, useEffect } from 'react';
import { Plus, Zap, Loader2, FileText, X, Copy, Check, Save, User, ExternalLink, ArrowRight } from 'lucide-react';
import { generateVideoConcepts, generateScript, generateTopCreators, generateToolRecommendations, type VideoConcept, type VideoScript } from '@/lib/gemini';
import YouTubeRecommender from '@/components/dashboard/YouTubeRecommender';
import ScrollableRow from '@/components/ui/ScrollableRow';
import Playbook from '@/components/dashboard/Playbook';

type TopCreator = {
  name: string;
  handle: string;
  whyFollow: string;
};

type ToolRecommendation = {
  name: string;
  category: string;
  whyUse: string;
};

export default function LibraryPage() {
  const [ideas, setIdeas] = useState<VideoConcept[]>([]);
  const [brainstorming, setBrainstorming] = useState<boolean>(false);
  const [brainstormError, setBrainstormError] = useState<string | null>(null);
  const [selectedScript, setSelectedScript] = useState<VideoScript | null>(null);
  const [loadingScriptIndex, setLoadingScriptIndex] = useState<number | null>(null);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [niche, setNiche] = useState<string>('content creator');
  const [topCreators, setTopCreators] = useState<TopCreator[]>([]);
  const [tools, setTools] = useState<ToolRecommendation[]>([]);
  const [loadingCreators, setLoadingCreators] = useState<boolean>(false);
  const [loadingTools, setLoadingTools] = useState<boolean>(false);

  // Load niche and fetch growth hub data on mount
  useEffect(() => {
    let currentNiche = 'content creator';
    if (typeof window !== 'undefined') {
      const storedVision = localStorage.getItem('brand_vision');
      if (storedVision) {
        const words = storedVision.split(/\s+/).slice(0, 3).join(' ');
        currentNiche = words || 'content creator';
      }
    }
    setNiche(currentNiche);

    // Fetch top creators and tools
    async function loadGrowthHub() {
      setLoadingCreators(true);
      setLoadingTools(true);
      
      try {
        const [creators, toolRecs] = await Promise.all([
          generateTopCreators(currentNiche),
          generateToolRecommendations(currentNiche)
        ]);
        setTopCreators(creators);
        setTools(toolRecs);
      } catch (error) {
        console.error('Failed to load growth hub data:', error);
      } finally {
        setLoadingCreators(false);
        setLoadingTools(false);
      }
    }

    loadGrowthHub();
  }, []);

  async function handleBrainstorm() {
    setBrainstorming(true);
    setBrainstormError(null);

    try {
      // Get niche from localStorage (from Identity flow)
      let niche = '';
      if (typeof window !== 'undefined') {
        const storedVision = localStorage.getItem('brand_vision');
        if (storedVision) {
          // Extract niche from vision (simple heuristic: first few words)
          const words = storedVision.split(/\s+/).slice(0, 3).join(' ');
          niche = words || 'content creator';
        } else {
          // Fallback: try to get from Supabase profile or use default
          niche = 'content creator';
        }
      }

      // Generate concepts
      const concepts = await generateVideoConcepts(niche);
      setIdeas(concepts);
    } catch (error: any) {
      console.error('Failed to brainstorm ideas:', error);
      setBrainstormError(error?.message || 'Failed to generate ideas. Please try again.');
    } finally {
      setBrainstorming(false);
    }
  }

  async function handleScriptIt(idea: VideoConcept, index: number) {
    setLoadingScriptIndex(index);
    setScriptError(null);
    setSelectedScript(null);

    try {
      const script = await generateScript(idea.title, idea.angle, idea.visual);
      setSelectedScript(script);
    } catch (error: any) {
      console.error('Failed to generate script:', error);
      setScriptError(error?.message || 'Failed to generate script. Please try again.');
    } finally {
      setLoadingScriptIndex(null);
    }
  }

  function handleCopyScript() {
    if (!selectedScript) return;

    const fullScript = `${selectedScript.hook}\n\n${selectedScript.body}\n\n${selectedScript.cta}`;
    navigator.clipboard.writeText(fullScript).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleCloseModal() {
    setSelectedScript(null);
    setScriptError(null);
    setCopied(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-50">Content Library</h1>
          <p className="text-sm text-slate-400 mt-1">Capture and organize your content ideas</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBrainstorm}
            disabled={brainstorming}
            className="inline-flex items-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {brainstorming ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Brainstorming...
              </>
            ) : (
              <>
                <Zap className="h-5 w-5" />
                Brainstorm Ideas
              </>
            )}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border-2 border-slate-700 bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            <Plus className="h-5 w-5" />
            New Idea
          </button>
        </div>
      </div>

      {/* Error Message */}
      {brainstormError && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {brainstormError}
        </div>
      )}

      {/* MIDDLE SECTION: Ready-to-Film Scripts */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 min-h-[400px] p-8">
        {ideas.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">No content yet</h3>
            <p className="text-sm text-slate-400 mb-6">Capture your first idea</p>
            <button
              type="button"
              onClick={handleBrainstorm}
              disabled={brainstorming}
              className="inline-flex items-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {brainstorming ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Brainstorming...
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5" />
                  Brainstorm Ideas
                </>
              )}
            </button>
          </div>
        ) : (
          /* Ready-to-Film Scripts Section */
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-50 mb-1">Ready-to-Film Scripts</h2>
              <p className="text-sm text-slate-400">{ideas.length} ideas generated</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ideas.map((idea, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4 hover:border-amber-500/50 transition"
                >
                  {/* Hook Title */}
                  <h3 className="text-base font-semibold text-amber-400 leading-tight">
                    {idea.title}
                  </h3>

                  {/* Visual Badge */}
                  <div className="flex items-start gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-xs font-medium text-slate-300">
                      <FileText className="h-3 w-3" />
                      {idea.angle}
                    </span>
                  </div>

                  {/* Visual Description */}
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {idea.visual}
                  </p>

                  {/* Script It Button */}
                  <button
                    type="button"
                    onClick={() => handleScriptIt(idea, index)}
                    disabled={loadingScriptIndex === index}
                    className="w-full rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20 hover:border-amber-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loadingScriptIndex === index ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Script It'
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RESEARCH ZONE: Scrollable Sections */}
      
      {/* SECTION 2: Niche Giants (Horizontal Scroll) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-50">Niche Giants</h2>
            <button
              type="button"
              onClick={() => console.log('View all creators')}
              className="inline-flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300 transition"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {loadingCreators ? (
            <ScrollableRow>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex-shrink-0 w-80 rounded-xl border border-slate-800 bg-slate-900/50 p-5 animate-pulse">
                  <div className="h-12 w-12 rounded-full bg-slate-700 mb-3" />
                  <div className="h-4 bg-slate-700 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-700 rounded w-1/2 mb-3" />
                  <div className="h-3 bg-slate-700 rounded w-full" />
                </div>
              ))}
            </ScrollableRow>
          ) : topCreators.length > 0 ? (
            <ScrollableRow>
              {topCreators.map((creator, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 w-80 rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3 hover:border-amber-500/50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-amber-500 p-3 flex-shrink-0">
                      <User className="h-6 w-6 text-slate-950" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-slate-100 truncate">{creator.name}</h3>
                      <p className="text-sm text-amber-400 truncate">{creator.handle}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{creator.whyFollow}</p>
                  <button
                    type="button"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition"
                  >
                    View Profile
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </ScrollableRow>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">No creators loaded</div>
          )}
        </div>
      </div>

      {/* PLAYBOOK: The Winner's Circle */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-50">Playbook</h2>
            <p className="text-sm text-slate-400">
              Your unified learning center for hooks, scripts, and patterns that actually work.
            </p>
          </div>
        </div>
        <Playbook />
      </div>

      {/* SECTION 3: Creator Toolkit (Horizontal Scroll) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-50">Creator Toolkit</h2>
            <button
              type="button"
              onClick={() => console.log('View all tools')}
              className="inline-flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300 transition"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {loadingTools ? (
            <ScrollableRow>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex-shrink-0 w-80 rounded-xl border border-slate-800 bg-slate-900/50 p-5 animate-pulse">
                  <div className="h-4 bg-slate-700 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-700 rounded w-1/2 mb-3" />
                  <div className="h-3 bg-slate-700 rounded w-full" />
                </div>
              ))}
            </ScrollableRow>
          ) : tools.length > 0 ? (
            <ScrollableRow>
              {tools.map((tool, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 w-80 rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3 hover:border-amber-500/50 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-slate-100">{tool.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{tool.category}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{tool.whyUse}</p>
                  <button
                    type="button"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20 hover:border-amber-500 transition"
                  >
                    Learn More
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </ScrollableRow>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">No tools loaded</div>
          )}
        </div>
      </div>

      {/* SECTION 4: Video Inspiration (Horizontal Scroll) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
        <YouTubeRecommender niche={niche} />
      </div>

      {/* Script Modal */}
      {selectedScript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-50">Video Script</h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Script Content */}
            <div className="space-y-6">
              {/* Hook */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Hook</span>
                  <span className="text-xs text-slate-500">(0-15s)</span>
                </div>
                <p className="text-base text-slate-200 leading-relaxed whitespace-pre-line">
                  {selectedScript.hook}
                </p>
              </div>

              {/* Body */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Body</span>
                  <span className="text-xs text-slate-500">(15-55s)</span>
                </div>
                <p className="text-base text-slate-200 leading-relaxed whitespace-pre-line">
                  {selectedScript.body}
                </p>
              </div>

              {/* CTA */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Call to Action</span>
                  <span className="text-xs text-slate-500">(55-60s)</span>
                </div>
                <p className="text-base text-slate-200 leading-relaxed whitespace-pre-line">
                  {selectedScript.cta}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleCopyScript}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20 hover:border-amber-500 transition"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Script
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Script Error Toast */}
      {scriptError && (
        <div className="fixed bottom-4 right-4 z-50 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 shadow-lg">
          {scriptError}
        </div>
      )}
    </div>
  );
}
