import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  X, 
  ChevronDown, 
  Trash2, 
  Sparkles, 
  TrendingUp, 
  ShieldAlert, 
  Coins, 
  Loader2,
  HelpCircle
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ChatbotWidget({ 
  ticker, 
  userId, 
  preferences, 
  portfolio, 
  watchlist, 
  currency 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modelUsed, setModelUsed] = useState('');

  const chatEndRef = useRef(null);

  // Initialize with a welcome message once onboarding is ready
  useEffect(() => {
    if (preferences && messages.length === 0) {
      const exp = preferences.experience || 'Beginner';
      const goal = preferences.investmentGoal || 'Long-Term Growth';
      const risk = preferences.riskTolerance || 'Moderate';
      
      setMessages([
        {
          id: 'welcome-1',
          sender: 'advisor',
          text: `Hello! I am your **CapitAI Personal AI Financial Advisor**. 
          
I see you are set up as a **${exp}** investor with a **${risk}** risk profile, aiming for **${goal}**. How can I help you plan your investments today?`,
          timestamp: new Date()
        }
      ]);
    }
  }, [preferences]);

  // Auto-scroll on new message
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputValue;
    if (!text.trim()) return;

    if (!textToSend) {
      setInputValue('');
    }

    const userMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Prepare history to send to backend (keep last 6 messages)
    const history = messages.slice(-6).map(m => ({
      sender: m.sender,
      text: m.text
    }));

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history,
          ticker,
          userId
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, {
          id: `msg-${Date.now()}-advisor`,
          sender: 'advisor',
          text: data.response,
          timestamp: new Date()
        }]);
        if (data.modelUsed) {
          setModelUsed(data.modelUsed);
        }
      } else {
        throw new Error('Server returned an error');
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}-error`,
        sender: 'advisor',
        text: "Sorry, I couldn't reach the advisor engine. Please ensure the backend is running and try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const clearChat = () => {
    const exp = preferences.experience || 'Beginner';
    const goal = preferences.investmentGoal || 'Long-Term Growth';
    const risk = preferences.riskTolerance || 'Moderate';
    
    setMessages([
      {
        id: `clear-${Date.now()}`,
        sender: 'advisor',
        text: `Chat cleared. Ready for your next query! Remember, your active profile is configured for **${risk}** risk tolerance and **${goal}** goals.`,
        timestamp: new Date()
      }
    ]);
  };

  // Helper to parse Markdown-like syntax (bolding and bullet lists) into react elements
  const formatText = (text) => {
    if (!text) return '';
    return text.split('\n').map((line, lineIdx) => {
      // Check if it's a header/bullet point
      let content = line;
      let isBullet = false;
      let isSubHeader = false;

      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        content = line.trim().substring(2);
        isBullet = true;
      } else if (line.trim().startsWith('### ')) {
        content = line.trim().substring(4);
        isSubHeader = true;
      } else if (line.trim().startsWith('## ')) {
        content = line.trim().substring(3);
        isSubHeader = true;
      }

      // Parse bold elements **text**
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          parts.push(content.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="font-extrabold text-white">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }

      if (lastIndex < content.length) {
        parts.push(content.substring(lastIndex));
      }

      const formattedContent = parts.length > 0 ? parts : content;

      if (isBullet) {
        return (
          <li key={lineIdx} className="ml-4 list-disc pl-1 mb-1 text-slate-300">
            {formattedContent}
          </li>
        );
      }

      if (isSubHeader) {
        return (
          <h4 key={lineIdx} className="text-sm font-bold text-emerald-400 mt-2 mb-1">
            {formattedContent}
          </h4>
        );
      }

      return (
        <p key={lineIdx} className={line.trim() === '' ? 'h-2' : 'mb-2 leading-relaxed'}>
          {formattedContent}
        </p>
      );
    });
  };

  // Construct dynamic suggestions based on active context
  const getSuggestions = () => {
    const list = [];
    if (ticker) {
      list.push({
        label: `Is ${ticker} suitable for me?`,
        query: `Should I buy ${ticker} based on my risk tolerance and goals?`
      });
    }
    if (portfolio && portfolio.length > 0) {
      list.push({
        label: `Analyze my portfolio splits`,
        query: `Analyze my current portfolio diversification and risk exposure`
      });
    } else {
      list.push({
        label: `How should I allocate my capital?`,
        query: `How should I allocate my initial capital of $${preferences?.investmentAmount || '10000'}?`
      });
    }
    list.push({
      label: `Explain my risk asset splits`,
      query: `Explain how my ${preferences?.riskTolerance || 'Moderate'} risk tolerance affects asset allocation.`
    });
    return list;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end select-none font-sans">
      
      {/* Floating Action Button (FAB) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 cursor-pointer bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-3 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 font-bold text-xs uppercase tracking-wider shadow-emerald-500/20"
        >
          <div className="relative">
            <MessageSquare className="h-4.5 w-4.5" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
          </div>
          <span>Ask Advisor</span>
        </button>
      )}

      {/* Expanded Chat Drawer */}
      {isOpen && (
        <div className="glass-panel-glow border border-emerald-500/30 w-[380px] sm:w-[420px] h-[550px] flex flex-col shadow-2xl overflow-hidden animate-fade-in select-text">
          
          {/* Header */}
          <div className="bg-slate-950/90 border-b border-slate-900 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Sparkles className="h-4.5 w-4.5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white tracking-wide uppercase flex items-center gap-1.5">
                  CapitAI Advisor
                </h3>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">
                  {modelUsed || 'Orchestrating Advisor Profile'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={clearChat}
                title="Clear Chat History"
                className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 transition cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Messages Log */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/20 scrollbar-thin">
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px] uppercase border ${
                  msg.sender === 'user' 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}>
                  {msg.sender === 'user' ? 'U' : 'AI'}
                </div>

                {/* Message Bubble */}
                <div className={`p-3 rounded-2xl text-xs ${
                  msg.sender === 'user'
                    ? 'bg-emerald-500/10 text-slate-200 border border-emerald-500/20 rounded-tr-none'
                    : 'bg-slate-900/60 text-slate-300 border border-slate-800/80 rounded-tl-none'
                }`}>
                  {formatText(msg.text)}
                  <span className="block text-[8px] text-slate-500 text-right mt-1.5 uppercase font-medium">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="h-7 w-7 rounded-full bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center shrink-0 text-[10px] font-bold">
                  AI
                </div>
                <div className="p-3 bg-slate-900/60 text-slate-400 border border-slate-800/80 rounded-2xl rounded-tl-none flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                  <span className="text-[10px] uppercase font-bold tracking-wider">Analyzing Context...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggestions Panel */}
          {messages.length < 5 && !isLoading && (
            <div className="px-4 py-2 border-t border-slate-900/60 bg-slate-950/40 space-y-1.5">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                <HelpCircle className="h-3 w-3" /> Quick Advisor Prompts:
              </span>
              <div className="flex flex-wrap gap-1.5 pb-0.5">
                {getSuggestions().map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(sug.query)}
                    className="text-[10px] text-left px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/30 text-slate-300 hover:text-white rounded-md cursor-pointer transition"
                  >
                    {sug.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message Input Footer */}
          <div className="bg-slate-950/90 border-t border-slate-900 p-3 flex gap-2">
            <input
              type="text"
              disabled={isLoading}
              placeholder="Ask about risk tolerance, stocks, or diversification..."
              className="flex-grow bg-slate-900/50 border border-slate-800 focus:border-emerald-500/40 text-slate-200 placeholder-slate-500 rounded-lg px-3 py-1.5 text-xs outline-none transition disabled:opacity-50"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputValue.trim()}
              className="cursor-pointer bg-emerald-500 hover:bg-emerald-600 text-slate-950 p-1.5 rounded-lg transition disabled:opacity-50 flex items-center justify-center shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
