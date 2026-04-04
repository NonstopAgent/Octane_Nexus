'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, Bot, User, Loader2, Paperclip } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import type { IdeaAnalysis } from '@/lib/gemini';
import StatusChip from '@/components/ui/StatusChip';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  scorecard?: IdeaAnalysis;
};

function ChatPageContent() {
  const [messageList, setMessageList] = useState<Message[]>([
    {
      id: 'welcome',
      text: "Hey! I'm Nexus, your strategic content advisor. I know your brand and your Library. What can I help with?",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const searchParams = useSearchParams();
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [niche, setNiche] = useState('content creator');
  const [promptPrefilled, setPromptPrefilled] = useState(false);
  const [contextStrip, setContextStrip] = useState<{
    niche: string;
    bestFormat: string | null;
    bestPostingHours: string[] | null;
    strongestPlatform: string | null;
    strategicFlags: string[];
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageList, isTyping]);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // Prefill input from ?prompt= query param (e.g. from CreatorDailyBar "Ask Nexus")
  useEffect(() => {
    if (promptPrefilled) return;
    const prompt = searchParams?.get('prompt');
    if (prompt && prompt.trim()) {
      setInputText(prompt.trim());
      setPromptPrefilled(true);
      // Focus the input so user can just hit Enter
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [searchParams, promptPrefilled]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      const { getEffectiveUserId } = await import('@/lib/auth');
      const effectiveId = await getEffectiveUserId(user?.id ?? null);
      if (effectiveId) setUserId(effectiveId);
      if (typeof window !== 'undefined') {
        const vision = localStorage.getItem('brand_vision');
        if (vision) {
          const words = vision.split(/\s+/).slice(0, 3).join(' ');
          setNiche(words || 'content creator');
        }
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetch('/api/intelligence/context')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setContextStrip(data))
      .catch(() => {});
  }, [userId]);

  function detectRatePattern(text: string): string | null {
    const patterns = [
      /rate this:\s*(.+)/i,
      /^rate:\s*(.+)/i,
      /^analyze this:\s*(.+)/i,
      /^analyze:\s*(.+)/i,
      /^score this:\s*(.+)/i,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m?.[1]) return m[1].trim();
    }
    return null;
  }

  async function handleSendMessage() {
    if (!inputText.trim()) return;

    const userText = inputText.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      text: userText,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessageList((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    const ideaToRate = detectRatePattern(userText);

    if (ideaToRate) {
      try {
        const res = await fetch('/api/analyze-idea', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idea: ideaToRate, niche }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Analysis failed');
        const analysis = data as IdeaAnalysis;
        setMessageList((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            text: `Viral Score: ${analysis.viralScore}/100 — ${analysis.prediction}`,
            sender: 'bot',
            timestamp: new Date(),
            scorecard: analysis,
          },
        ]);
      } catch (err) {
        console.error(err);
        setMessageList((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            text: "Couldn't analyze that idea right now. Try again.",
            sender: 'bot',
            timestamp: new Date(),
          },
        ]);
      }
      setIsTyping(false);
      return;
    }

    if (!userId) {
      setMessageList((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: "Please sign in to chat with Nexus.",
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
      return;
    }

    try {
      const messages = messageList
        .filter((m) => !m.scorecard)
        .map((m) => ({
          role: m.sender === 'user' ? ('user' as const) : ('model' as const),
          parts: [{ text: m.text }],
        }));

      messages.push({ role: 'user' as const, parts: [{ text: userText }] });

      const res = await fetch('/api/nexus-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, userId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');

      setMessageList((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: data.reply,
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setMessageList((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: msg,
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-slate-950">
      <div className="flex-shrink-0 px-6 pt-4">
        <DashboardPageHeader
          title="Nexus Chat"
          subtitle="Context-aware content advisor"
          icon={<Bot className="h-5 w-5" />}
          actions={
            isTyping ? (
              <StatusChip variant="analyzing" pulse label="Thinking…" />
            ) : (
              <StatusChip variant="live" pulse />
            )
          }
        />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messageList.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex items-start gap-2 max-w-[85%] ${
                msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`flex-shrink-0 rounded-full p-1.5 ${
                  msg.sender === 'user'
                    ? 'bg-amber-500/20'
                    : 'bg-slate-800'
                }`}
              >
                {msg.sender === 'user' ? (
                  <User className="h-4 w-4 text-amber-400" />
                ) : (
                  <Bot className="h-4 w-4 text-slate-400" />
                )}
              </div>
              <div
                className={`rounded-2xl px-4 py-2.5 ${
                  msg.sender === 'user'
                    ? 'bg-amber-500/90 text-slate-950'
                    : 'bg-slate-800 text-slate-100 border border-slate-700/50'
                }`}
              >
                {msg.scorecard ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-amber-400">
                      {msg.scorecard.viralScore}/100
                    </p>
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    {msg.scorecard.tasks?.length ? (
                      <ul className="text-xs text-slate-400 mt-2 space-y-1">
                        {msg.scorecard.tasks.slice(0, 3).map((t, i) => (
                          <li key={i}>• {t}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {msg.text}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-start gap-2">
              <div className="rounded-full bg-slate-800 p-1.5">
                <Bot className="h-4 w-4 text-slate-400" />
              </div>
              <div className="bg-slate-800 rounded-2xl px-4 py-3 border border-slate-700/50">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 border-t border-slate-800 bg-slate-950 p-4">
        {contextStrip && (
          <div className="max-w-3xl mx-auto mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs">
            <span className="font-medium text-slate-400">Context:</span>
            <span className="text-slate-300">
              Niche: <span className="text-amber-300/90">{contextStrip.niche}</span>
            </span>
            {contextStrip.bestFormat && (
              <span className="text-slate-300">
                Best format: <span className="text-emerald-300/90">{contextStrip.bestFormat}</span>
              </span>
            )}
            {contextStrip.bestPostingHours && contextStrip.bestPostingHours.length > 0 && (
              <span className="text-slate-300">
                Best hours: <span className="text-sky-300/90">{contextStrip.bestPostingHours.join(', ')}</span>
              </span>
            )}
            {contextStrip.strongestPlatform && (
              <span className="text-slate-300">
                Strongest: <span className="text-violet-300/90">{contextStrip.strongestPlatform}</span>
              </span>
            )}
            {contextStrip.strategicFlags.length > 0 && (
              <span className="text-slate-300">
                Flags: <span className="text-amber-300/90">{contextStrip.strategicFlags.join(', ')}</span>
              </span>
            )}
          </div>
        )}
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <button
            type="button"
            className="flex-shrink-0 rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition"
            aria-label="Attach"
            title="Attach (coming soon)"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Nexus anything..."
            rows={1}
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none min-h-[48px] max-h-[160px]"
            disabled={isTyping}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 160) + 'px';
            }}
          />
          <button
            type="button"
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isTyping}
            className="flex-shrink-0 rounded-xl bg-amber-500 p-3 text-slate-950 hover:bg-amber-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send"
          >
            {isTyping ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">
          Enter to send • Shift+Enter for new line • Try &quot;rate this: [your idea]&quot; for viral scoring
        </p>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-950"><div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" /></div>}>
      <ChatPageContent />
    </Suspense>
  );
}
