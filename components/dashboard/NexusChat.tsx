'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, FolderOpen, CheckCircle2 } from 'lucide-react';
import { analyzeIdea, type IdeaAnalysis } from '@/lib/gemini';
import { addPlaybookEntry } from '@/lib/playbook';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  scorecard?: IdeaAnalysis;
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

// Detect "Rate this:" pattern
function detectRatePattern(text: string): string | null {
  const ratePattern = /rate this:\s*(.+)/i;
  const match = text.match(ratePattern);
  if (match && match[1]) return match[1].trim();
  
  const patterns = [/^rate:\s*(.+)/i, /^analyze this:\s*(.+)/i, /^analyze:\s*(.+)/i, /^score this:\s*(.+)/i];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

// Viral Scorecard Component (same as in chat page)
type ViralScorecardProps = {
  messageId: string;
  analysis: IdeaAnalysis;
  ideaText: string;
  isExpanded: boolean;
  onSave: () => void;
  onToggleTasks: () => void;
};

function ViralScorecard({ analysis, isExpanded, onSave, onToggleTasks }: ViralScorecardProps) {
  const { viralScore, prediction, tasks } = analysis;
  
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
  
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (viralScore / 100) * circumference;
  
  return (
    <div className={`rounded-xl border-2 px-4 py-3 bg-slate-800/90 ${getScoreBgColor()}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="relative flex-shrink-0">
          <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-700" />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={getProgressColor()}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`text-lg font-bold ${getScoreColor()}`}>{viralScore}</div>
          </div>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed flex-1 pt-1">{prediction}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-900 transition"
        >
          <FolderOpen className="h-3 w-3" />
          Save
        </button>
        <button
          type="button"
          onClick={onToggleTasks}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-900 transition"
        >
          <CheckCircle2 className="h-3 w-3" />
          Plan
        </button>
      </div>
      {isExpanded && tasks && tasks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700 space-y-1.5">
          {tasks.map((task, index) => (
            <div key={index} className="flex items-start gap-2 text-xs text-slate-300">
              <span className="text-amber-400 font-semibold">{index + 1}.</span>
              <span>{task}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NexusChat() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages] = useState<Message[]>([
    {
      id: '1',
      text: "Hey! I'm your Librarian. Ready to help you create viral content. What can I assist with?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [messageList, setMessageList] = useState<Message[]>(messages);
  const [inputText, setInputText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [niche, setNiche] = useState<string>('content creator');

  // Load niche from brand vision
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedVision = localStorage.getItem('brand_vision');
      if (storedVision) {
        const words = storedVision.split(/\s+/).slice(0, 3).join(' ');
        setNiche(words || 'content creator');
      }
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageList, isTyping, expandedTasks]);

  // Hide toast after 3 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

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

    const ideaToRate = detectRatePattern(userText);
    
    if (ideaToRate) {
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
    if (typeof window !== 'undefined') {
      const savedIdeas = JSON.parse(localStorage.getItem('saved_ideas') || '[]');
      savedIdeas.push({ text: ideaText, timestamp: new Date().toISOString() });
      localStorage.setItem('saved_ideas', JSON.stringify(savedIdeas));
    }
    setToastMessage('Idea Saved to Vault');
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

  function handleKeyPress(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg hover:shadow-xl transition-all hover:scale-110"
          aria-label="Open chat"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-500 p-2">
                <Bot className="h-5 w-5 text-slate-950" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-50">The Librarian</h3>
                <p className="text-xs text-slate-400">AI Content Strategist</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950">
            {messageList.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.scorecard ? (
                  <ViralScorecard
                    messageId={message.id}
                    analysis={message.scorecard}
                    ideaText={message.text.replace(/Here's my analysis for "(.+)":/, '$1') || message.text}
                    isExpanded={expandedTasks.has(message.id)}
                    onSave={() => handleSaveToLibrary(message.text.replace(/Here's my analysis for "(.+)":/, '$1') || message.text)}
                    onToggleTasks={() => handleToggleTasks(message.id)}
                  />
                ) : (
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      message.sender === 'user'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-100'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                    <p className="text-xs mt-1 opacity-60">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-800 rounded-2xl px-4 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-800 bg-slate-900">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask the Librarian..."
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition"
              />
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className="rounded-lg bg-amber-500 p-2.5 text-slate-950 hover:bg-amber-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
