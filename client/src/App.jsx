import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  TrendingUp, 
  Briefcase, 
  Eye, 
  Sliders, 
  History, 
  ShieldAlert, 
  MessageSquareCode, 
  Terminal, 
  Search, 
  Coins, 
  Loader2, 
  CheckCircle,
  Database,
  UserCheck,
  LogOut,
  Mail,
  Lock,
  Globe2,
  Settings,
  Shield,
  HelpCircle,
  EyeOff,
  Sun,
  Moon
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import PortfolioSelector from './components/PortfolioSelector';
import WatchlistMonitor from './components/WatchlistMonitor';
import ScenarioSimulator from './components/ScenarioSimulator';
import Backtester from './components/Backtester';
import DebateMode from './components/DebateMode';
import ObservabilityView from './components/ObservabilityView';
import ChatbotWidget from './components/ChatbotWidget';

const BACKEND_URL = 'http://localhost:5000';

const STOCK_PRESETS = [
  { symbol: 'TSLA', name: 'Tesla, Inc.' },
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd' },
  { symbol: 'TCS', name: 'Tata Consultancy Services' },
  { symbol: 'INFY', name: 'Infosys Limited' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Limited' }
];

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
  { id: 'portfolio', label: 'Portfolio Analysis', icon: Briefcase },
  { id: 'watchlist', label: 'Watchlist Monitor', icon: Eye },
  { id: 'debate', label: 'AI Debate Mode', icon: MessageSquareCode },
  { id: 'simulator', label: 'Scenario Simulator', icon: Sliders },
  { id: 'backtester', label: 'Historical Backtest', icon: History },
  { id: 'observability', label: 'Observability Hub', icon: Database }
];

export default function App() {
  // Auth states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Onboarding Wizard states
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [onboardStep, setOnboardStep] = useState(1);
  const [preferences, setPreferences] = useState({
    companyName: 'TSLA',
    investmentGoal: 'Long-Term Growth',
    investmentAmount: '10000',
    investmentHorizon: '5 Years',
    riskTolerance: 'Moderate',
    preferredInvestmentType: 'Public Companies',
    preferredSectors: 'AI, Technology, EV',
    excludedSectors: 'Tobacco',
    experience: 'Beginner'
  });

  // Global settings
  const [currency, setCurrency] = useState('USD');
  const [theme, setTheme] = useState(() => localStorage.getItem('capitai_theme') || 'dark');
  const [ticker, setTicker] = useState('TSLA');
  const [searchTicker, setSearchTicker] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [analysisReport, setAnalysisReport] = useState(null);
  
  // Real-time streaming log states
  const [streamLog, setStreamLog] = useState([]);
  const [activeAgent, setActiveAgent] = useState('');
  const terminalRef = useRef(null);
  
  // Watchlist & Portfolio states
  const [watchlist, setWatchlist] = useState(['AAPL', 'MSFT', 'TSLA']);
  const [portfolio, setPortfolio] = useState([]);
  const [pastRecommendations, setPastRecommendations] = useState([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleMainScroll = (e) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop > 40) {
      setIsSidebarCollapsed(true);
    } else {
      setIsSidebarCollapsed(false);
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('capitai_theme', nextTheme);
  };

  // Check session on start
  useEffect(() => {
    const savedToken = localStorage.getItem('capitai_token');
    const savedUser = localStorage.getItem('capitai_user');
    
    if (savedToken && savedUser) {
      setAuthLoading(true);
      fetch(`${BACKEND_URL}/api/auth/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: savedToken })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.userId) {
            setUserId(data.userId);
            setSessionToken(savedToken);
            setAuthUsername(savedUser);
            setIsAuthenticated(true);
            
            fetch(`${BACKEND_URL}/api/user-memory/${data.userId}`)
              .then(r => r.json())
              .then(prefData => {
                if (prefData.preferences) {
                  setPreferences(prefData.preferences);
                  setTicker(prefData.preferences.companyName || 'TSLA');
                  setHasOnboarded(true);
                }
              })
              .catch(() => {});
          } else {
            handleLogout();
          }
          setAuthLoading(false);
        })
        .catch(() => {
          setUserId(`user-offline-id`);
          setSessionToken(savedToken);
          setAuthUsername(savedUser);
          setIsAuthenticated(true);
          setHasOnboarded(true);
          setAuthLoading(false);
        });
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && userId) refreshData();
  }, [isAuthenticated, userId]);

  useEffect(() => {
    if (hasOnboarded && ticker && !analysisReport && !loading) {
      triggerAnalysis(ticker);
    }
  }, [hasOnboarded, ticker]);

  const refreshData = () => {
    if (!userId) return;
    fetch(`${BACKEND_URL}/api/watchlist/${userId}`).then(res => res.json()).then(data => data.watchlist && setWatchlist(data.watchlist)).catch(() => {});
    fetch(`${BACKEND_URL}/api/portfolio/${userId}`).then(res => res.json()).then(data => data.portfolio && setPortfolio(data.portfolio)).catch(() => {});
    fetch(`${BACKEND_URL}/api/recommendations/${userId}`).then(res => res.json()).then(data => data.recommendations && setPastRecommendations(data.recommendations)).catch(() => {});
  };

  // Socket sync
  useEffect(() => {
    const socket = io(BACKEND_URL);
    socket.on('analysis_step', (step) => {
      setStreamLog((prev) => [...prev, step]);
      setActiveAgent(step.agent);
    });
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [streamLog]);

  // Auth actions
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!authUsername || !authPassword) return;
    if (authPassword.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    setAuthMessage('');

    const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUsername, password: authPassword })
      });
      const data = await res.json();
      if (res.ok) {
        if (authMode === 'register') {
          setAuthMode('login');
          setAuthMessage('Account created successfully. Please login.');
        } else {
          setUserId(data.userId);
          setSessionToken(data.sessionToken);
          localStorage.setItem('capitai_token', data.sessionToken);
          localStorage.setItem('capitai_user', data.username);
          setIsAuthenticated(true);

          const prefRes = await fetch(`${BACKEND_URL}/api/user-memory/${data.userId}`);
          const prefData = await prefRes.json();
          if (prefData.preferences) {
            setPreferences(prefData.preferences);
            setTicker(prefData.preferences.companyName || 'TSLA');
            setHasOnboarded(true);
          }
        }
      } else {
        setAuthError(data.error || 'Authentication error.');
      }
    } catch {
      setUserId(`user-${authUsername}`);
      setSessionToken('offline-token-uuid');
      localStorage.setItem('capitai_token', 'offline-token-uuid');
      localStorage.setItem('capitai_user', authUsername);
      setIsAuthenticated(true);
    }
    setAuthLoading(false);
  };

  const handleLogout = () => {
    if (sessionToken) {
      fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken })
      }).catch(() => {});
    }
    localStorage.removeItem('capitai_token');
    localStorage.removeItem('capitai_user');
    setIsAuthenticated(false);
    setHasOnboarded(false);
    setOnboardStep(1);
    setUserId('');
    setSessionToken('');
    setAuthPassword('');
    setAnalysisReport(null);
  };

  const handleOnboardSubmit = (e) => {
    e.preventDefault();
    fetch(`${BACKEND_URL}/api/user-memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, preferences })
    })
      .then(() => {
        setHasOnboarded(true);
        triggerAnalysis(preferences.companyName || 'TSLA');
      })
      .catch(() => {
        setHasOnboarded(true);
        triggerAnalysis('TSLA');
      });
  };

  const triggerAnalysis = (sym) => {
    if (!sym) return;
    const tickerSymbol = sym.toUpperCase();
    setTicker(tickerSymbol);
    setLoading(true);
    setStreamLog([]);
    setActiveAgent('Investment Coordinator Agent');
    
    fetch(`${BACKEND_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker: tickerSymbol, userId })
    })
      .then(res => res.json())
      .then(data => {
        setAnalysisReport(data);
        setLoading(false);
        refreshData();
      })
      .catch(() => {
        setLoading(false);
        generateOfflineFallback(tickerSymbol);
      });
  };

  const generateOfflineFallback = (sym) => {
    setAnalysisReport({
      ticker: sym,
      companyName: `${sym} Corp (Local)`,
      investmentScore: 7.4,
      recommendationGrade: 'Buy / Consider',
      confidence: 95,
      scoreBreakdown: { financialHealth: 7.5, growthPotential: 8.0, managementQuality: 7.0, competitiveAdvantage: 7.5, valuation: 6.0, marketSentiment: 7.2, riskRating: 8.0 },
      pros: ['Strong balance sheet reserves', 'Leader in core technology innovation'],
      cons: ['Premium multiples compress near-term returns', 'Subject to sector volatility'],
      alternatives: ['AAPL', 'MSFT'],
      sourceAttributions: ['CapitAI Offline Generator'],
      debate: {
        bullArg: 'Strong positioning and clear cash reserves makes it stable.',
        bearArg: 'Valuation multiple is highly premium and growth is leveling.',
        verdict: 'Buy at support levels, keep positions sized moderately.'
      },
      quote: { symbol: sym, name: `${sym} Corp`, price: 150.00, change: 2.50, percentChange: 1.67, cap: 500e9, pe: 28, pb: 4.5, sector: 'Technology', geo: 'USA' },
      financials: [
        { year: 2021, revenue: 8e9, netIncome: 0.9e9, operatingIncome: 1.1e9, ebitda: 1.4e9, freeCashFlow: 1.0e9 },
        { year: 2022, revenue: 9e9, netIncome: 1.0e9, operatingIncome: 1.3e9, ebitda: 1.6e9, freeCashFlow: 1.1e9 },
        { year: 2023, revenue: 10e9, netIncome: 1.2e9, operatingIncome: 1.5e9, ebitda: 1.8e9, freeCashFlow: 1.3e9 },
        { year: 2024, revenue: 12e9, netIncome: 1.5e9, operatingIncome: 1.8e9, ebitda: 2.2e9, freeCashFlow: 1.6e9 },
        { year: 2025, revenue: 15e9, netIncome: 1.9e9, operatingIncome: 2.2e9, ebitda: 2.8e9, freeCashFlow: 2.1e9 }
      ],
      competitors: [
        { symbol: 'COMP1', name: 'Competitor A', price: 95, cap: 250e9, pe: 22 },
        { symbol: 'COMP2', name: 'Competitor B', price: 180, cap: 420e9, pe: 31 }
      ],
      news: [
        { id: '1', title: 'Company announces strategic product line launch', source: 'Reuters', sentiment: 0.8 },
        { id: '2', title: 'Earnings meet guidance; stock holds line', source: 'Bloomberg', sentiment: 0.5 }
      ]
    });
  };

  const searchTimeoutRef = useRef(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [onboardSuggestions, setOnboardSuggestions] = useState([]);
  const [onboardLoading, setOnboardLoading] = useState(false);
  const onboardTimeoutRef = useRef(null);

  const fetchSearchResults = async (val, setResults, setLoading) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/search?q=${encodeURIComponent(val)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.slice(0, 7));
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSearchChange = (val) => {
    setSearchTicker(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!val.trim()) return setSuggestions([]);
    setSearchLoading(true);
    searchTimeoutRef.current = setTimeout(() => fetchSearchResults(val, setSuggestions, setSearchLoading), 300);
  };

  const handleSuggestionClick = (sym) => {
    triggerAnalysis(sym);
    setSearchTicker('');
    setSuggestions([]);
  };

  const handleOnboardSearchChange = (val) => {
    setPreferences({ ...preferences, companyName: val });
    if (onboardTimeoutRef.current) clearTimeout(onboardTimeoutRef.current);
    if (!val.trim()) return setOnboardSuggestions([]);
    setOnboardLoading(true);
    onboardTimeoutRef.current = setTimeout(() => fetchSearchResults(val, setOnboardSuggestions, setOnboardLoading), 300);
  };

  const handleOnboardSuggestionClick = (sym) => {
    setPreferences({ ...preferences, companyName: sym.toUpperCase() });
    setOnboardSuggestions([]);
  };

  const handleRiskChange = (newRisk) => {
    const updatedPrefs = { ...preferences, riskTolerance: newRisk };
    setPreferences(updatedPrefs);
    saveUpdatedPrefs(updatedPrefs);
  };

  const handleHorizonChange = (newHorizon) => {
    const updatedPrefs = { ...preferences, investmentHorizon: newHorizon };
    setPreferences(updatedPrefs);
    saveUpdatedPrefs(updatedPrefs);
  };

  const handleAmountChange = (newAmount) => {
    const cleanAmount = newAmount.replace(/[^0-9]/g, '');
    const updatedPrefs = { ...preferences, investmentAmount: cleanAmount };
    setPreferences(updatedPrefs);
    saveUpdatedPrefs(updatedPrefs);
  };

  const handleCurrencySwitch = (newCurrency) => {
    if (newCurrency === currency) return;
    setCurrency(newCurrency);
    if (preferences.investmentAmount) {
      const currentAmount = parseFloat(preferences.investmentAmount);
      if (!isNaN(currentAmount)) {
        const rate = 95;
        const newAmount = newCurrency === 'INR' ? Math.round(currentAmount * rate) : Math.round(currentAmount / rate);
        const updatedPrefs = { ...preferences, investmentAmount: String(newAmount) };
        setPreferences(updatedPrefs);
        saveUpdatedPrefs(updatedPrefs);
      }
    }
  };

  const getExperienceCapitalSuggestion = () => {
    const exp = preferences.experience || 'Beginner';
    const rate = 95;
    if (exp === 'Beginner') {
      return { usd: 1000, inr: 1000 * rate, text: 'Suggested: $500 – $2,000 (₹47,500 – ₹190,000) to minimize early risk.' };
    } else if (exp === 'Intermediate') {
      return { usd: 5000, inr: 5000 * rate, text: 'Suggested: $2,000 – $10,000 (₹190,000 – ₹950,000) for active learning.' };
    } else {
      return { usd: 20000, inr: 20000 * rate, text: 'Suggested: $10,000+ (₹950,000+) for portfolio scaling.' };
    }
  };

  const saveUpdatedPrefs = (updatedPrefs) => {
    if (userId) {
      fetch(`${BACKEND_URL}/api/user-memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, preferences: updatedPrefs })
      }).then(() => triggerAnalysis(ticker)).catch(() => triggerAnalysis(ticker));
    }
  };

  const renderSuggestions = (list, onClickFn) => (
    list.length > 0 && (
      <div className="absolute top-full left-0 w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg shadow-xl z-50 overflow-hidden divide-y divide-slate-900">
        {list.map((item, idx) => (
          <button 
            key={idx}
            type="button"
            onClick={() => onClickFn(item.symbol)}
            className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-900 text-slate-300 hover:text-white transition flex justify-between cursor-pointer items-center"
          >
            <div>
              <span className="font-bold text-slate-200">{item.symbol}</span>
              {item.exchange && (
                <span className="text-[8px] bg-slate-900 border border-slate-800 px-1 py-0.5 rounded text-slate-400 ml-1.5 font-bold uppercase">
                  {item.exchange}
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 font-semibold truncate max-w-[180px]">{item.name}</span>
          </button>
        ))}
      </div>
    )
  );

  // Auth UI Screen
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-[#05070f] px-4 py-12 ${theme === 'light' ? 'light' : ''}`}>
        <div className="glass-panel w-full max-w-md p-8 border border-slate-800 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
              <Coins className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-black tracking-tight text-white flex items-center gap-1">
                Capit<span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-sans uppercase font-extrabold tracking-widest ml-1">AI</span> Portal
              </h1>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">Access Platform Memory</p>
            </div>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authError && <div className="p-2.5 rounded bg-red-950/20 border border-red-950 text-red-400 text-xs font-semibold">{authError}</div>}
            {authMessage && <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-950 text-emerald-400 text-xs font-semibold">{authMessage}</div>}

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Username</label>
              <input 
                type="text" 
                required
                placeholder="Enter username"
                className="w-full bg-slate-900/50 border border-slate-800 text-white placeholder-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500/50"
                value={authUsername}
                onChange={e => setAuthUsername(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="At least 6 characters"
                  className="w-full bg-slate-900/50 border border-slate-800 text-white placeholder-slate-600 rounded-lg pl-3 pr-9 py-2 text-sm outline-none focus:border-emerald-500/50"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex gap-4 text-xs font-semibold text-slate-400 pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={authMode === 'login'} onChange={() => setAuthMode('login')} className="accent-emerald-500" /> Login
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={authMode === 'register'} onChange={() => setAuthMode('register')} className="accent-emerald-500" /> Register Account
              </label>
            </div>

            <button 
              type="submit" 
              disabled={authLoading}
              className="w-full cursor-pointer bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2"
            >
              {authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : authMode === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Multi-Step Onboarding Form UI
  if (!hasOnboarded) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-[#05070f] px-4 py-12 ${theme === 'light' ? 'light' : ''}`}>
        <div className="glass-panel w-full max-w-lg p-8 border border-slate-800 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-900 pb-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Investment Onboarding</h1>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Step {onboardStep} of 4</span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className={`h-1.5 w-8 rounded ${s <= onboardStep ? 'bg-emerald-500' : 'bg-slate-900'}`} />
              ))}
            </div>
          </div>

          <form onSubmit={handleOnboardSubmit} className="space-y-4">
            {onboardStep === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Target Company / Ticker</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      required
                      placeholder="Search company name or symbol..."
                      className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500/50 text-white rounded-lg pl-3 pr-9 py-2 text-sm outline-none transition uppercase"
                      value={preferences.companyName}
                      onChange={(e) => handleOnboardSearchChange(e.target.value)}
                    />
                    {onboardLoading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-emerald-500" />}
                  </div>
                  {renderSuggestions(onboardSuggestions, handleOnboardSuggestionClick)}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Investing Experience</label>
                  <select 
                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500/50 text-white rounded-lg px-3 py-2 text-sm outline-none transition"
                    value={preferences.experience || 'Beginner'}
                    onChange={(e) => {
                      const updatedPrefs = { ...preferences, experience: e.target.value };
                      setPreferences(updatedPrefs);
                      saveUpdatedPrefs(updatedPrefs);
                    }}
                  >
                    <option value="Beginner">Beginner (No experience)</option>
                    <option value="Intermediate">Intermediate (1-3 years)</option>
                    <option value="Advanced">Advanced (3+ years)</option>
                  </select>
                </div>

                {preferences.experience && (
                  <div className="p-3 rounded bg-emerald-950/15 border border-emerald-950/30 text-emerald-400 text-xs flex justify-between items-center gap-3">
                    <div className="flex-1">
                      <p className="font-bold text-[10px] uppercase tracking-wide">Suggested Capital</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{getExperienceCapitalSuggestion().text}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const rec = getExperienceCapitalSuggestion();
                        const amountVal = currency === 'INR' ? rec.inr : rec.usd;
                        handleAmountChange(String(amountVal));
                      }}
                      className="cursor-pointer bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-2 py-1 rounded text-[10px] transition shrink-0"
                    >
                      Apply Recommended
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Investment Capital ({currency === 'INR' ? 'INR / ₹' : 'USD / $'})
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. 50,000"
                      className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500/50 text-white rounded-lg pl-8 pr-3 py-2 text-sm outline-none transition font-mono font-bold"
                      value={preferences.investmentAmount ? parseInt(preferences.investmentAmount).toLocaleString() : ''}
                      onChange={(e) => handleAmountChange(e.target.value)}
                    />
                    <span className="absolute left-3 top-2 font-mono font-black text-slate-500">{currency === 'INR' ? '₹' : '$'}</span>
                  </div>
                </div>
              </div>
            )}

            {onboardStep === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Investment Goal</label>
                  <select 
                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500/50 text-white rounded-lg px-3 py-2 text-sm outline-none transition"
                    value={preferences.investmentGoal}
                    onChange={(e) => setPreferences({ ...preferences, investmentGoal: e.target.value })}
                  >
                    {['Long-Term Growth', 'Passive Income', 'Wealth Creation', 'Short-Term Gains', 'Retirement'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Investment Horizon</label>
                  <select 
                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500/50 text-white rounded-lg px-3 py-2 text-sm outline-none transition"
                    value={preferences.investmentHorizon}
                    onChange={(e) => setPreferences({ ...preferences, investmentHorizon: e.target.value })}
                  >
                    {['1 Year', '3 Years', '5 Years', '10 Years', '15 Years', '20+ Years'].map(h => <option key={h}>{h}</option>)}
                  </select>
                </div>
              </div>
            )}

            {onboardStep === 3 && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Risk Tolerance</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Low', 'Moderate', 'High'].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setPreferences({ ...preferences, riskTolerance: r })}
                        className={`py-2 px-3 text-xs font-bold rounded-lg border transition ${preferences.riskTolerance === r ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Preferred Investment Type</label>
                  <select 
                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500/50 text-white rounded-lg px-3 py-2 text-sm outline-none transition"
                    value={preferences.preferredInvestmentType}
                    onChange={(e) => setPreferences({ ...preferences, preferredInvestmentType: e.target.value })}
                  >
                    {['Public Companies', 'Startups', 'ETFs', 'Mutual Funds', 'Mixed'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            )}

            {onboardStep === 4 && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Preferred Sectors</label>
                  <input 
                    type="text" 
                    placeholder="e.g. AI, Healthcare, Energy"
                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500/50 text-white rounded-lg px-3 py-2 text-sm outline-none transition"
                    value={preferences.preferredSectors}
                    onChange={(e) => setPreferences({ ...preferences, preferredSectors: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Excluded Sectors</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Tobacco, Weapons"
                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500/50 text-white rounded-lg px-3 py-2 text-sm outline-none transition"
                    value={preferences.excludedSectors}
                    onChange={(e) => setPreferences({ ...preferences, excludedSectors: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t border-slate-900">
              {onboardStep > 1 && (
                <button 
                  type="button" 
                  onClick={() => setOnboardStep(onboardStep - 1)}
                  className="cursor-pointer bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold px-4 py-2 rounded-lg text-xs transition"
                >
                  Previous
                </button>
              )}
              {onboardStep < 4 ? (
                <button 
                  type="button" 
                  onClick={() => setOnboardStep(onboardStep + 1)}
                  className="flex-grow cursor-pointer bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 rounded-lg text-xs transition"
                >
                  Next Step
                </button>
              ) : (
                <button type="submit" className="flex-grow cursor-pointer bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 rounded-lg text-xs transition">
                  Generate Intelligence Thesis
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen overflow-hidden bg-[#05070f] text-slate-200 flex flex-col antialiased ${theme === 'light' ? 'light' : ''}`}>
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-40 px-6 py-4 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center justify-between w-full lg:w-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Coins className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-black tracking-tight text-white flex items-center gap-1 leading-none">
                Capit<span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-sans uppercase font-extrabold tracking-widest ml-1 leading-none">AI</span>
              </h1>
              <span className="text-[9px] text-slate-500 font-bold tracking-wider uppercase block mt-1">Active: {authUsername}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="lg:hidden p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 transition cursor-pointer">
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {/* Global Autocomplete Search */}
        <div className="relative w-full max-w-sm">
          <div className="relative w-full">
            <input 
              type="text" 
              placeholder="Search ticker preset (e.g. TSLA, INFY)..." 
              className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500/40 text-slate-200 placeholder-slate-500 rounded-lg pl-9 pr-9 py-1.5 text-xs outline-none transition"
              value={searchTicker}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTicker.trim()) {
                  e.preventDefault();
                  triggerAnalysis(searchTicker.trim());
                  setSuggestions([]);
                  setSearchTicker('');
                }
              }}
            />
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            {searchLoading && <Loader2 className="absolute right-3 top-2.5 h-3.5 w-3.5 animate-spin text-emerald-500" />}
          </div>
          {renderSuggestions(suggestions, handleSuggestionClick)}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-900/50 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-slate-500 font-bold uppercase">Capital:</span>
            <span className="font-mono font-bold text-emerald-400">{currency === 'INR' ? '₹' : '$'}</span>
            <input 
              type="text" 
              className="bg-transparent text-slate-200 font-mono font-bold outline-none w-20 text-center"
              value={preferences.investmentAmount ? parseInt(preferences.investmentAmount).toLocaleString() : ''}
              onChange={(e) => handleAmountChange(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900/50 border border-slate-800 rounded-lg px-2 py-1 text-xs">
            <span className="text-slate-500 font-bold uppercase">Horizon:</span>
            <select 
              className="bg-transparent text-slate-200 outline-none font-bold"
              value={preferences.investmentHorizon}
              onChange={e => handleHorizonChange(e.target.value)}
            >
              {['1 Year', '3 Years', '5 Years', '10 Years', '15 Years', '20+ Years'].map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900/50 border border-slate-800 rounded-lg px-2 py-1 text-xs">
            <select 
              className="bg-transparent text-slate-200 outline-none font-bold"
              value={preferences.riskTolerance}
              onChange={e => handleRiskChange(e.target.value)}
            >
              <option value="Low">Low Risk</option>
              <option value="Moderate">Mod Risk</option>
              <option value="High">High Risk</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900/50 border border-slate-800 rounded-lg px-2 py-1 text-xs">
            <span className="text-slate-500 font-bold uppercase">Exp:</span>
            <select 
              className="bg-transparent text-slate-200 outline-none font-bold"
              value={preferences.experience || 'Beginner'}
              onChange={e => {
                const updatedPrefs = { ...preferences, experience: e.target.value };
                setPreferences(updatedPrefs);
                saveUpdatedPrefs(updatedPrefs);
              }}
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          <button 
            onClick={toggleTheme}
            className="p-1.5 bg-slate-900/50 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
          </button>

          <div className="flex bg-slate-900/50 border border-slate-800 rounded-lg p-0.5 text-xs font-bold">
            {['USD', 'INR'].map(c => (
              <button 
                key={c}
                onClick={() => handleCurrencySwitch(c)}
                className={`px-2 py-0.5 rounded cursor-pointer transition ${currency === c ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                {c}
              </button>
            ))}
          </div>

          <button onClick={handleLogout} className="hidden lg:flex items-center gap-1 px-3 py-1 text-xs font-bold bg-slate-900/50 border border-slate-800 rounded-lg hover:bg-slate-800 hover:text-red-400 transition cursor-pointer">
            <LogOut className="h-3.5 w-3.5" /> Log Out
          </button>
        </div>
      </header>

      <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
        <nav className={`w-full ${isSidebarCollapsed ? 'md:w-16 md:px-2' : 'md:w-64 md:p-4'} border-b md:border-b-0 md:border-r border-slate-900 bg-slate-950/40 p-4 flex md:flex-col overflow-x-auto md:overflow-x-visible shrink-0 gap-1.5 scrollbar-none transition-all duration-300`}>
          <p className={`text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2 transition-all duration-300 ${isSidebarCollapsed ? 'md:hidden opacity-0 h-0 mb-0 overflow-hidden' : 'md:block opacity-100'}`}>
            Investment Intelligence
          </p>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button 
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-3 py-2 text-xs font-semibold rounded-lg transition-all duration-300 whitespace-nowrap ${activeTab === id ? 'bg-emerald-500/10 text-emerald-400 border-l-0 md:border-l-2 border-b-2 md:border-b-0 border-emerald-500' : 'text-slate-400 hover:bg-slate-900 hover:text-white'} ${isSidebarCollapsed ? 'md:justify-center md:px-0' : 'px-3'}`}
              title={isSidebarCollapsed ? label : ''}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className={`transition-all duration-300 ${isSidebarCollapsed ? 'md:hidden opacity-0' : 'inline-block opacity-100'}`}>
                {label}
              </span>
            </button>
          ))}
        </nav>

        <main onScroll={handleMainScroll} className="flex-1 overflow-y-auto p-4 md:p-6 relative">
          {loading && (
            <div className="glass-panel-glow border border-emerald-500/30 p-4 mb-6">
              <div className="flex items-center justify-between mb-3 border-b border-emerald-950 pb-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400 tracking-wide uppercase">CapitAI Graph Engine executing...</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Status: ORCHESTRATING_AGENTS</span>
              </div>
              <div ref={terminalRef} className="bg-black/40 rounded p-3 font-mono text-[10px] leading-relaxed max-h-36 overflow-y-auto space-y-1">
                {streamLog.map((log, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="text-emerald-500">[{log.agent}]</span>
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <Dashboard 
              report={analysisReport} 
              ticker={ticker}
              loading={loading}
              preferences={preferences}
              watchlist={watchlist}
              currency={currency}
              theme={theme}
              addToWatchlist={(t) => {
                fetch(`${BACKEND_URL}/api/watchlist/${userId}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ticker: t })
                }).then(() => refreshData());
              }}
              removeFromWatchlist={(t) => {
                fetch(`${BACKEND_URL}/api/watchlist/${userId}/${t}`, { method: 'DELETE' }).then(() => refreshData());
              }}
            />
          )}

          {activeTab === 'portfolio' && (
            <PortfolioSelector portfolio={portfolio} userId={userId} currency={currency} refreshPortfolio={refreshData} />
          )}

          {activeTab === 'watchlist' && (
            <WatchlistMonitor watchlist={watchlist} userId={userId} currency={currency} refreshWatchlist={refreshData} triggerAnalysis={triggerAnalysis} />
          )}

          {activeTab === 'debate' && (
            <DebateMode debate={analysisReport?.debate} ticker={ticker} />
          )}

          {activeTab === 'simulator' && (
            <ScenarioSimulator ticker={ticker} report={analysisReport} />
          )}

          {activeTab === 'backtester' && (
            <Backtester ticker={ticker} />
          )}

          {activeTab === 'observability' && (
            <ObservabilityView />
          )}
        </main>
      </div>

      <ChatbotWidget 
        ticker={ticker}
        userId={userId}
        preferences={preferences}
        portfolio={portfolio}
        watchlist={watchlist}
        currency={currency}
      />
    </div>
  );
}
