'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, MessageCircle, Clock, Plus, FolderOpen, CheckCircle2, Loader2, X } from 'lucide-react';
import IdeaLab from '@/components/dashboard/IdeaLab';
import { analyzeIdea, type IdeaAnalysis } from '@/lib/gemini';
import { addPlaybookEntry } from '@/lib/playbook';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  scorecard?: IdeaAnalysis; // Optional scorecard data for bot messages
};

function getMockResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return "Hey! Ready to optimize your content. What can I help you with today?";
  } else if (lowerMessage.includes('idea') || lowerMessage.includes('concept')) {
    return "Great! Ideas are the foundation. Try using the 'Brainstorm Ideas' button to generate AI-powered concepts, or dump your raw idea in the input box at the top.";
  } else if (lowerMessage.includes('hook') || lowerMessage.includes('viral')) {
    return `Hooks are everything! Start with curiosity gaps, controversial statements, or "before you knew this" patterns. Want me to help you craft one?`;
  } else if (lowerMessage.includes('bio') || lowerMessage.includes('profile')) {
    return "Your bio is your first impression. Focus on authority (credibility), relatability (connection), or mystery (intrigue). Which vibe fits your brand?";
  } else if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
    return "I'm here to help! I can guide you on content strategy, bio optimization, hook formulas, and more. Just ask!";
  } else if (lowerMessage.includes('script')) {
    return "Scripts need three parts: Hook (attention), Body (value), CTA (action). Want me to break down your idea into a script structure?";
  } else {
    return "That's interesting! Tell me more about what you're working on. I can help with content strategy, bio writing, hook formulas, and more.";
  }
}

// Mock chat sessions for sidebar
const mockSessions = [
  { id: '1', title: 'Content Strategy Session', timestamp: new Date() },
  { id: '2', title: 'Bio Optimization', timestamp: new Date(Date.now() - 86400000) },
  { id: '3', title: 'Hook Formulas', timestamp: new Date(Date.now() - 172800000) },
];

// Viral Scorecard Component
type ViralScorecardProps = {
  messageId: string;
  analysis: IdeaAnalysis;
  ideaText: string;
  isExpanded: boolean;
  onSave: () => void;
  onAddToPlaybook: () => void;
  onToggleTasks: () => void;
};

function ViralScorecard({ analysis, ideaText, isExpanded, onSave, onAddToPlaybook, onToggleTasks }: ViralScorecardProps) {
  const { viralScore, prediction, tasks, confidenceLevel } = analysis;
  
  // Color coding: Green > 80, Yellow > 50, Red <= 50
  const getScoreColor = () => {
    if (viralScore > 80) return 'text-emerald-400';
    if (viralScore > 50) return 'text-amber-400';
    return 'text-rose-400';
  };
  
  const getScoreBgColor = () => {
    if (viralScore > 80) return 'bg-emerald-500/20 border-emerald-500/40';
    if (viralScore > 50) return 'bg-amber-500/20 border-amber-500/40';
    return 'bg-rose-500/20 border-rose-500/40';
  };
  
  const getProgressColor = () => {
    if (viralScore > 80) return 'stroke-emerald-400';
    if (viralScore > 50) return 'stroke-amber-400';
    return 'stroke-rose-400';
  };
  
  // Calculate SVG circle progress (0-100 maps to 0-2π)
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (viralScore / 100) * circumference;
  
  return (
    <div className={`rounded-2xl border-2 px-6 py-5 bg-slate-800/90 backdrop-blur-sm ${getScoreBgColor()}`}>
      {/* Header with Circular Progress */}
      <div className="flex items-start gap-4 mb-4">
        {/* Circular Progress Bar */}
        <div className="relative flex-shrink-0">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-slate-700"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={getProgressColor()}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          {/* Score text inside circle */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor()}`}>
                {viralScore}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">/100</div>
            </div>
          </div>
        </div>
        
        {/* Prediction Text */}
        <div className="flex-1 pt-2 space-y-1">
          <h3 className="text-sm font-semibold text-slate-100 mb-1">Viral Score</h3>
          <p className="text-xs text-slate-400">Confidence: {confidenceLevel}</p>
          <p className="text-sm text-slate-300 leading-relaxed">{prediction}</p>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 mt-4">
        <button
          type="button"
          onClick={onSave}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-900 hover:border-amber-500/50 transition"
        >
          <FolderOpen className="h-4 w-4" />
          📂 Send to Library
        </button>

        <button
          type="button"
          onClick={onAddToPlaybook}
          className="inline-flex items-center gap-2 rounded-lg border border-amber-500/60 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/20 hover:border-amber-400 transition"
        >
          🔥 Add to Playbook
        </button>

        <button
          type="button"
          onClick={onToggleTasks}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-900 hover:border-amber-500/50 transition"
        >
          <CheckCircle2 className="h-4 w-4" />
          ✅ Create Plan
        </button>
      </div>
      
      {/* Expanded Tasks List */}
      {isExpanded && tasks && tasks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Action Plan</h4>
          <ul className="space-y-2">
            {tasks.map((task, index) => (
              <li key={index} className="flex items-start gap-3 text-sm text-slate-300">
                <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-amber-500/50 bg-slate-900/50 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-semibold text-amber-400">{index + 1}</span>
                </div>
                <span className="flex-1 leading-relaxed">{task}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const [messageList, setMessageList] = useState<Message[]>([
    {
      id: '1',
      text: "Hey! I'm your Librarian. Ready to help you create viral content. What can I assist with?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [niche, setNiche] = useState<string>('content creator');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageList, isTyping, expandedTasks]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Load niche for IdeaLab from brand vision
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedVision = localStorage.getItem('brand_vision');
      if (storedVision) {
        const words = storedVision.split(/\s+/).slice(0, 3).join(' ');
        setNiche(words || 'content creator');
      }
    }
  }, []);

  // Hide toast after 3 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Detect "Rate this:" pattern in user message
  function detectRatePattern(text: string): string | null {
    const lowerText = text.toLowerCase();
    const ratePattern = /rate this:\s*(.+)/i;
    const match = text.match(ratePattern);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // Also check for variations like "Rate:", "Analyze this:", etc.
    const patterns = [
      /^rate:\s*(.+)/i,
      /^analyze this:\s*(.+)/i,
      /^analyze:\s*(.+)/i,
      /^score this:\s*(.+)/i,
    ];
    
    for (const pattern of patterns) {
      const m = text.match(pattern);
      if (m && m[1]) {
        return m[1].trim();
      }
    }
    
    return null;
  }

  async function handleSendMessage() {
    if (!inputText.trim()) return;

    const userText = inputText.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      text: userText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessageList((prev) => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Check if user wants to rate an idea
    const ideaToRate = detectRatePattern(userText);
    
    if (ideaToRate) {
      // Analyze the idea
      try {
        const analysis = await analyzeIdea(ideaToRate, niche);
        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: `Here's my analysis for "${ideaToRate}":`,
          sender: 'bot',
          timestamp: new Date(),
          scorecard: analysis
        };
        setMessageList((prev) => [...prev, botResponse]);
      } catch (error) {
        console.error('Failed to analyze idea:', error);
        const errorResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: "I couldn't analyze that idea right now. Please try again.",
          sender: 'bot',
          timestamp: new Date()
        };
        setMessageList((prev) => [...prev, errorResponse]);
      }
      setIsTyping(false);
    } else {
      // Regular chat response
      setTimeout(() => {
        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: getMockResponse(userText),
          sender: 'bot',
          timestamp: new Date()
        };

        setMessageList((prev) => [...prev, botResponse]);
        setIsTyping(false);
      }, 1000);
    }
  }

  function handleSaveToLibrary(ideaText: string) {
    // Mock save logic
    if (typeof window !== 'undefined') {
      const savedIdeas = JSON.parse(localStorage.getItem('saved_ideas') || '[]');
      savedIdeas.push({ text: ideaText, timestamp: new Date().toISOString() });
      localStorage.setItem('saved_ideas', JSON.stringify(savedIdeas));
    }
    setToastMessage('Idea Saved to Vault');
  }

  function handleAddToPlaybook(ideaText: string, analysis: IdeaAnalysis) {
    addPlaybookEntry({
      type: 'hook',
      content: ideaText,
      score: analysis.viralScore,
      whyItWorks: analysis.prediction,
    });
    setToastMessage('AI has learned this pattern.');
  }

  function handleToggleTasks(messageId: string) {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }

  function handleKeyPress(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  return (
    <div className="flex h-full bg-slate-950">
      {/* Left Sidebar - Chat History */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-400 hover:bg-amber-500/20 transition"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-2 mb-2">Recent Sessions</h3>
          {mockSessions.map((session) => (
            <button
              key={session.id}
              type="button"
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition text-sm text-slate-300"
            >
              <div className="font-medium truncate">{session.title}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {session.timestamp.toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-950 px-6 flex items-center gap-3">
          <div className="rounded-full bg-amber-500 p-2">
            <Bot className="h-5 w-5 text-slate-950" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-50">The Librarian</h1>
            <p className="text-xs text-slate-400">AI Content Strategist</p>
          </div>
        </header>

        {/* Idea Lab (Brain) + Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950">
          {/* IdeaLab stacked above chat */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-50">Idea Lab</h2>
                <p className="text-xs text-slate-400">
                  Grade and refine ideas before turning them into conversations and scripts.
                </p>
              </div>
            </div>
            <IdeaLab niche={niche} />
          </div>

          {/* Messages Area */}
          {messageList.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start gap-3 max-w-3xl ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                {message.sender === 'bot' && (
                  <div className="rounded-full bg-amber-500 p-2 flex-shrink-0">
                    <Bot className="h-5 w-5 text-slate-950" />
                  </div>
                )}
                {message.sender === 'user' && (
                  <div className="rounded-full bg-slate-700 p-2 flex-shrink-0">
                    <MessageCircle className="h-5 w-5 text-slate-300" />
                  </div>
                )}

                {/* Message Bubble or Scorecard */}
                {message.scorecard ? (
                  <ViralScorecard
                    messageId={message.id}
                    analysis={message.scorecard}
                    ideaText={message.text.replace(/Here's my analysis for "(.+)":/, '$1') || message.text}
                    isExpanded={expandedTasks.has(message.id)}
                    onSave={() =>
                      handleSaveToLibrary(
                        message.text.replace(/Here's my analysis for "(.+)":/, '$1') || message.text
                      )
                    }
                    onAddToPlaybook={() =>
                      handleAddToPlaybook(
                        message.text.replace(/Here's my analysis for "(.+)":/, '$1') || message.text,
                        message.scorecard as IdeaAnalysis
                      )
                    }
                    onToggleTasks={() => handleToggleTasks(message.id)}
                  />
                ) : (
                  <div
                    className={`rounded-2xl px-5 py-3 ${
                      message.sender === 'user'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-100'
                    }`}
                  >
                    <p className="text-base whitespace-pre-wrap break-words leading-relaxed">
                      {message.text}
                    </p>
                    <div
                      className={`text-xs mt-2 opacity-60 ${
                        message.sender === 'user' ? 'text-slate-950' : 'text-slate-400'
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-start gap-3 max-w-3xl">
                <div className="rounded-full bg-amber-500 p-2 flex-shrink-0">
                  <Bot className="h-5 w-5 text-slate-950" />
                </div>
                <div className="bg-slate-800 rounded-2xl px-5 py-3">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-24 right-6 z-50 rounded-xl bg-amber-500 text-slate-950 px-6 py-3 shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold text-sm">{toastMessage}</span>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-slate-800 bg-slate-950 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask the Librarian anything..."
                rows={1}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition resize-none min-h-[48px] max-h-[200px]"
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
              />
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className="rounded-xl bg-amber-500 p-3 text-slate-950 hover:bg-amber-400 transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                aria-label="Send message"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2 px-1">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
