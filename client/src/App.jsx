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
  EyeOff
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import PortfolioSelector from './components/PortfolioSelector';
import WatchlistMonitor from './components/WatchlistMonitor';
import ScenarioSimulator from './components/ScenarioSimulator';
import Backtester from './components/Backtester';
import DebateMode from './components/DebateMode';
import ObservabilityView from './components/ObservabilityView';

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

export default function App() {
  // Auth states (Username / Password)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
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
    excludedSectors: 'Tobacco'
  });

  // Global settings
  const [currency, setCurrency] = useState('USD'); // 'USD' | 'INR'
  const [ticker, setTicker] = useState('TSLA');
  const [searchTicker, setSearchTicker] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [analysisReport, setAnalysisReport] = useState(null);
  
  // Real-time streaming log states
  const [streamLog, setStreamLog] = useState([]);
  const [activeAgent, setActiveAgent] = useState('');
  const logEndRef = useRef(null);
  
  // Watchlist & Portfolio states
  const [watchlist, setWatchlist] = useState(['AAPL', 'MSFT', 'TSLA']);
  const [portfolio, setPortfolio] = useState([]);
  const [pastRecommendations, setPastRecommendations] = useState([]);

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
            
            // Fetch profile preferences memory
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
          // Offline fallback validation
          setUserId(`user-offline-id`);
          setSessionToken(savedToken);
          setAuthUsername(savedUser);
          setIsAuthenticated(true);
          setHasOnboarded(true);
          setAuthLoading(false);
        });
    }
  }, []);

  // Fetch watchlist & portfolio logs once authenticated
  useEffect(() => {
    if (isAuthenticated && userId) {
      refreshData();
    }
  }, [isAuthenticated, userId]);

  // Trigger default analysis once user preferences/ticker are loaded
  useEffect(() => {
    if (hasOnboarded && ticker && !analysisReport && !loading) {
      triggerAnalysis(ticker);
    }
  }, [hasOnboarded, ticker]);

  const refreshData = () => {
    if (!userId) return;

    // Fetch Watchlist
    fetch(`${BACKEND_URL}/api/watchlist/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.watchlist) setWatchlist(data.watchlist);
      })
      .catch(() => {});

    // Fetch Portfolio
    fetch(`${BACKEND_URL}/api/portfolio/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.portfolio) setPortfolio(data.portfolio);
      })
      .catch(() => {});

    // Fetch Recommendations
    fetch(`${BACKEND_URL}/api/recommendations/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.recommendations) setPastRecommendations(data.recommendations);
      })
      .catch(() => {});
  };

  // Socket sync for live analysis streaming
  useEffect(() => {
    const socket = io(BACKEND_URL);
    socket.on('analysis_step', (step) => {
      setStreamLog((prev) => [...prev, step]);
      setActiveAgent(step.agent);
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamLog]);

  // Auth actions
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!authUsername || !authPassword) return;
    
    // Password strength check
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

          // Fetch preferences
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
      // Offline fallback login
      const fallbackUid = `user-${authUsername}`;
      setUserId(fallbackUid);
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
      .then(res => res.json())
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
      .catch((err) => {
        console.error(err);
        setLoading(false);
        generateOfflineFallback(tickerSymbol);
      });
  };

  const generateOfflineFallback = (sym) => {
    const mockReport = {
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
    };
    setAnalysisReport(mockReport);
  };

  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef(null);

  const [onboardSuggestions, setOnboardSuggestions] = useState([]);
  const [onboardLoading, setOnboardLoading] = useState(false);
  const onboardTimeoutRef = useRef(null);

  const handleSearchChange = (val) => {
    setSearchTicker(val);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!val.trim()) {
      setSuggestions([]);
      return;
    }

    setSearchLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/search?q=${encodeURIComponent(val)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.slice(0, 7));
        }
      } catch (err) {
        console.error(err);
      }
      setSearchLoading(false);
    }, 300);
  };

  const handleSuggestionClick = (sym) => {
    triggerAnalysis(sym);
    setSearchTicker('');
    setSuggestions([]);
  };

  const handleOnboardSearchChange = (val) => {
    setPreferences({ ...preferences, companyName: val });
    if (onboardTimeoutRef.current) {
      clearTimeout(onboardTimeoutRef.current);
    }

    if (!val.trim()) {
      setOnboardSuggestions([]);
      return;
    }

    setOnboardLoading(true);
    onboardTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/search?q=${encodeURIComponent(val)}`);
        if (res.ok) {
          const data = await res.json();
          setOnboardSuggestions(data.slice(0, 5));
        }
      } catch (err) {
        console.error(err);
      }
      setOnboardLoading(false);
    }, 300);
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
    // strip non numeric
    const cleanAmount = newAmount.replace(/[^0-9]/g, '');
    const updatedPrefs = { ...preferences, investmentAmount: cleanAmount };
    setPreferences(updatedPrefs);
    saveUpdatedPrefs(updatedPrefs);
  };

  const saveUpdatedPrefs = (updatedPrefs) => {
    if (userId) {
      fetch(`${BACKEND_URL}/api/user-memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, preferences: updatedPrefs })
      })
        .then(() => triggerAnalysis(ticker))
        .catch(() => triggerAnalysis(ticker));
    }
  };

  // Auth UI Screen (Username / Password)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05070f] px-4 py-12">
        <div className="glass-panel w-full max-w-md p-8 border border-slate-800 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Coins className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">CapitAI Portal</h1>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Access Platform Memory</p>
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
                <input 
                  type="radio" 
                  checked={authMode === 'login'} 
                  onChange={() => setAuthMode('login')}
                  className="accent-emerald-500"
                />
                Login
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  checked={authMode === 'register'} 
                  onChange={() => setAuthMode('register')}
                  className="accent-emerald-500"
                />
                Register Account
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
      <div className="min-h-screen flex items-center justify-center bg-[#05070f] px-4 py-12">
        <div className="glass-panel w-full max-w-lg p-8 border border-slate-800 space-y-6">
          
          {/* Progress Indicator */}
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
            
            {/* STEP 1: Target & Capital */}
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
                    {onboardLoading && (
                      <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-emerald-500" />
                    )}
                  </div>

                  {onboardSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg shadow-xl z-50 overflow-hidden divide-y divide-slate-900">
                      {onboardSuggestions.map((item, idx) => (
                        <button 
                          key={idx}
                          type="button"
                          onClick={() => handleOnboardSuggestionClick(item.symbol)}
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
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Investment Capital (Amount)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. 50,000"
                      className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500/50 text-white rounded-lg pl-8 pr-3 py-2 text-sm outline-none transition font-mono font-bold"
                      value={preferences.investmentAmount ? parseInt(preferences.investmentAmount).toLocaleString() : ''}
                      onChange={(e) => handleAmountChange(e.target.value)}
                    />
                    <Coins className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-600" />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Goal & Horizon */}
            {onboardStep === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Investment Goal</label>
                  <select 
                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500/50 text-white rounded-lg px-3 py-2 text-sm outline-none transition"
                    value={preferences.investmentGoal}
                    onChange={(e) => setPreferences({ ...preferences, investmentGoal: e.target.value })}
                  >
                    <option>Long-Term Growth</option>
                    <option>Passive Income</option>
                    <option>Wealth Creation</option>
                    <option>Short-Term Gains</option>
                    <option>Retirement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Investment Horizon</label>
                  <select 
                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500/50 text-white rounded-lg px-3 py-2 text-sm outline-none transition"
                    value={preferences.investmentHorizon}
                    onChange={(e) => setPreferences({ ...preferences, investmentHorizon: e.target.value })}
                  >
                    <option>1 Year</option>
                    <option>3 Years</option>
                    <option>5 Years</option>
                    <option>10 Years</option>
                    <option>15 Years</option>
                    <option>20+ Years</option>
                  </select>
                </div>
              </div>
            )}

            {/* STEP 3: Risk & Type */}
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
                    <option>Public Companies</option>
                    <option>Startups</option>
                    <option>ETFs</option>
                    <option>Mutual Funds</option>
                    <option>Mixed</option>
                  </select>
                </div>
              </div>
            )}

            {/* STEP 4: Preferred & Excluded Sectors */}
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

            {/* Navigation buttons */}
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
                <button 
                  type="submit" 
                  className="flex-grow cursor-pointer bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 rounded-lg text-xs transition"
                >
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
    <div className="min-h-screen bg-[#05070f] text-slate-200 flex flex-col antialiased">
      {/* Top Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-40 px-6 py-4 flex flex-col lg:flex-row items-center justify-between gap-4">
        
        {/* Logo */}
        <div className="flex items-center justify-between w-full lg:w-auto">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-400">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Capit<span className="text-emerald-400">AI</span></h1>
              <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase block">Active: {authUsername}</span>
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
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (searchTicker.trim()) {
                    triggerAnalysis(searchTicker.trim());
                    setSuggestions([]);
                    setSearchTicker('');
                  }
                }
              }}
            />
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            {searchLoading && (
              <Loader2 className="absolute right-3 top-2.5 h-3.5 w-3.5 animate-spin text-emerald-500" />
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg shadow-xl z-50 overflow-hidden divide-y divide-slate-900">
              {suggestions.map((item, idx) => (
                <button 
                  key={idx}
                  onClick={() => handleSuggestionClick(item.symbol)}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-slate-900 text-slate-300 hover:text-white transition flex justify-between cursor-pointer items-center"
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
          )}
        </div>

        {/* Global Quick-Switchers (Risk, Capital, Horizon, Currency, Logout) */}
        <div className="flex flex-wrap items-center justify-end gap-3 w-full lg:w-auto">
          
          {/* Quick Capital switcher */}
          <div className="flex items-center gap-1.5 bg-slate-900/50 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-slate-500 font-bold uppercase">Capital:</span>
            <input 
              type="text" 
              className="bg-transparent text-slate-200 font-mono font-bold outline-none w-20 text-center"
              value={preferences.investmentAmount ? parseInt(preferences.investmentAmount).toLocaleString() : ''}
              onChange={(e) => handleAmountChange(e.target.value)}
            />
          </div>

          {/* Quick Horizon switcher */}
          <div className="flex items-center gap-1.5 bg-slate-900/50 border border-slate-800 rounded-lg px-2 py-1 text-xs">
            <span className="text-slate-500 font-bold uppercase">Horizon:</span>
            <select 
              className="bg-transparent text-slate-200 outline-none font-bold"
              value={preferences.investmentHorizon}
              onChange={e => handleHorizonChange(e.target.value)}
            >
              <option value="1 Year">1 Year</option>
              <option value="3 Years">3 Years</option>
              <option value="5 Years">5 Years</option>
              <option value="10 Years">10 Years</option>
              <option value="15 Years">15 Years</option>
              <option value="20+ Years">20+ Years</option>
            </select>
          </div>

          {/* Quick Risk selector */}
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

          {/* Currency Toggle */}
          <div className="flex bg-slate-900/50 border border-slate-800 rounded-lg p-0.5 text-xs font-bold">
            <button 
              onClick={() => setCurrency('USD')}
              className={`px-2 py-0.5 rounded cursor-pointer transition ${currency === 'USD' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
            >
              USD
            </button>
            <button 
              onClick={() => setCurrency('INR')}
              className={`px-2 py-0.5 rounded cursor-pointer transition ${currency === 'INR' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
            >
              INR
            </button>
          </div>

          <button onClick={handleLogout} className="hidden lg:flex items-center gap-1 px-3 py-1 text-xs font-bold bg-slate-900/50 border border-slate-800 rounded-lg hover:bg-slate-800 hover:text-red-400 transition cursor-pointer">
            <LogOut className="h-3.5 w-3.5" /> Log Out
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
        {/* Nav list - top navigation for mobile, sidebar for desktop */}
        <nav className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-900 bg-slate-950/40 p-4 flex md:flex-col overflow-x-auto md:overflow-x-visible shrink-0 gap-1.5 scrollbar-none">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2 hidden md:block">Investment Intelligence</p>
          
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-emerald-500/10 text-emerald-400 border-l-0 md:border-l-2 border-b-2 md:border-b-0 border-emerald-500' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
          >
            <TrendingUp className="h-4 w-4" />
            Dashboard
          </button>
          
          <button 
            onClick={() => setActiveTab('portfolio')}
            className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap ${activeTab === 'portfolio' ? 'bg-emerald-500/10 text-emerald-400 border-l-0 md:border-l-2 border-b-2 md:border-b-0 border-emerald-500' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
          >
            <Briefcase className="h-4 w-4" />
            Portfolio Analysis
          </button>

          <button 
            onClick={() => setActiveTab('watchlist')}
            className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap ${activeTab === 'watchlist' ? 'bg-emerald-500/10 text-emerald-400 border-l-0 md:border-l-2 border-b-2 md:border-b-0 border-emerald-500' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
          >
            <Eye className="h-4 w-4" />
            Watchlist Monitor
          </button>

          <button 
            onClick={() => setActiveTab('debate')}
            className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap ${activeTab === 'debate' ? 'bg-emerald-500/10 text-emerald-400 border-l-0 md:border-l-2 border-b-2 md:border-b-0 border-emerald-500' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
          >
            <MessageSquareCode className="h-4 w-4" />
            AI Debate Mode
          </button>

          <button 
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap ${activeTab === 'simulator' ? 'bg-emerald-500/10 text-emerald-400 border-l-0 md:border-l-2 border-b-2 md:border-b-0 border-emerald-500' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
          >
            <Sliders className="h-4 w-4" />
            Scenario Simulator
          </button>

          <button 
            onClick={() => setActiveTab('backtester')}
            className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap ${activeTab === 'backtester' ? 'bg-emerald-500/10 text-emerald-400 border-l-0 md:border-l-2 border-b-2 md:border-b-0 border-emerald-500' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
          >
            <History className="h-4 w-4" />
            Historical Backtest
          </button>

          <button 
            onClick={() => setActiveTab('observability')}
            className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap ${activeTab === 'observability' ? 'bg-emerald-500/10 text-emerald-400 border-l-0 md:border-l-2 border-b-2 md:border-b-0 border-emerald-500' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
          >
            <Database className="h-4 w-4" />
            Observability Hub
          </button>
        </nav>

        {/* Center Panel Container */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 relative">
          
          {/* Live Analysis Terminal Banner */}
          {loading && (
            <div className="glass-panel-glow border border-emerald-500/30 p-4 mb-6">
              <div className="flex items-center justify-between mb-3 border-b border-emerald-950 pb-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400 tracking-wide uppercase">CapitAI Graph Engine executing...</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Status: ORCHESTRATING_AGENTS</span>
              </div>
              <div className="bg-black/40 rounded p-3 font-mono text-[10px] leading-relaxed max-h-36 overflow-y-auto space-y-1">
                {streamLog.map((log, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="text-emerald-500">[{log.agent}]</span>
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          )}

          {/* Render Active View */}
          {activeTab === 'dashboard' && (
            <Dashboard 
              report={analysisReport} 
              ticker={ticker}
              loading={loading}
              preferences={preferences}
              watchlist={watchlist}
              currency={currency}
              addToWatchlist={(t) => {
                fetch(`${BACKEND_URL}/api/watchlist/${userId}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ticker: t })
                }).then(() => refreshData());
              }}
              removeFromWatchlist={(t) => {
                fetch(`${BACKEND_URL}/api/watchlist/${userId}/${t}`, {
                  method: 'DELETE'
                }).then(() => refreshData());
              }}
            />
          )}

          {activeTab === 'portfolio' && (
            <PortfolioSelector 
              portfolio={portfolio}
              userId={userId}
              currency={currency}
              refreshPortfolio={refreshData}
            />
          )}

          {activeTab === 'watchlist' && (
            <WatchlistMonitor 
              watchlist={watchlist}
              userId={userId}
              currency={currency}
              refreshWatchlist={refreshData}
              triggerAnalysis={triggerAnalysis}
            />
          )}

          {activeTab === 'debate' && (
            <DebateMode 
              debate={analysisReport?.debate} 
              ticker={ticker}
            />
          )}

          {activeTab === 'simulator' && (
            <ScenarioSimulator 
              ticker={ticker} 
              report={analysisReport}
            />
          )}

          {activeTab === 'backtester' && (
            <Backtester 
              ticker={ticker}
            />
          )}

          {activeTab === 'observability' && (
            <ObservabilityView />
          )}

        </main>
      </div>
    </div>
  );
}
