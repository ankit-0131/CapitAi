import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  Sliders, 
  TrendingUp, 
  Play, 
  RefreshCcw, 
  Activity, 
  Info,
  ShieldAlert
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ScenarioSimulator({ ticker, report }) {
  const [ratesShift, setRatesShift] = useState(0);
  const [revenueShift, setRevenueShift] = useState(0);
  const [inflationShift, setInflationShift] = useState(0);
  const [crashShift, setCrashShift] = useState(0);
  const [simResults, setSimResults] = useState(null);
  const [loading, setLoading] = useState(false);

  // Trigger simulation API
  const runSimulation = () => {
    setLoading(true);
    fetch(`${BACKEND_URL}/api/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker,
        ratesShift,
        revenueShift,
        inflationShift,
        crashShift
      })
    })
      .then(res => res.json())
      .then(data => {
        setSimResults(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        // Offline Fallback Simulator Calculation
        calculateOfflineSimulation();
      });
  };

  const calculateOfflineSimulation = () => {
    const originalScore = report?.investmentScore || 7.4;
    // Calculate simulated adjustments
    let diff = 0;
    diff -= ratesShift * 0.45;
    diff += revenueShift * 0.08;
    diff -= inflationShift * 0.22;
    diff -= crashShift * 0.38;

    const updatedScore = parseFloat(Math.min(10, Math.max(1, originalScore + diff)).toFixed(2));
    let rec = 'Hold / Wait';
    if (updatedScore >= 8.5) rec = 'Strong Buy';
    else if (updatedScore >= 7.0) rec = 'Buy / Consider';
    else if (updatedScore < 5.0) rec = 'Avoid / High Risk';

    setSimResults({
      ticker,
      originalScore,
      updatedScore,
      updatedRecommendation: rec,
      breakdown: {
        financialHealth: Math.max(1, Math.min(10, 7.5 + revenueShift * 0.06 - ratesShift * 0.2)),
        growthPotential: Math.max(1, Math.min(10, 8.0 + revenueShift * 0.1)),
        valuation: Math.max(1, Math.min(10, 6.0 - ratesShift * 0.3 - inflationShift * 0.15)),
        riskScore: Math.max(1, Math.min(10, 4.0 + ratesShift * 0.2 + crashShift * 0.4))
      }
    });
  };

  const handleReset = () => {
    setRatesShift(0);
    setRevenueShift(0);
    setInflationShift(0);
    setCrashShift(0);
    setSimResults(null);
  };

  useEffect(() => {
    // Reset simulated state when switching stocks
    setSimResults(null);
  }, [ticker]);

  // Prep chart data comparing original report scores to simulated results
  const chartData = [
    {
      name: 'Financial Health',
      Original: report?.scoreBreakdown?.financialHealth || 7.5,
      Simulated: simResults ? simResults.breakdown.financialHealth : report?.scoreBreakdown?.financialHealth || 7.5
    },
    {
      name: 'Growth Potential',
      Original: report?.scoreBreakdown?.growthPotential || 8.0,
      Simulated: simResults ? simResults.breakdown.growthPotential : report?.scoreBreakdown?.growthPotential || 8.0
    },
    {
      name: 'Valuation Index',
      Original: report?.scoreBreakdown?.valuation || 6.0,
      Simulated: simResults ? simResults.breakdown.valuation : report?.scoreBreakdown?.valuation || 6.0
    },
    {
      name: 'Risk Level (Lower is Better)',
      Original: report?.scoreBreakdown?.riskRating ? 10 - report.scoreBreakdown.riskRating : 4.0,
      Simulated: simResults ? simResults.breakdown.riskScore : report?.scoreBreakdown?.riskRating ? 10 - report.scoreBreakdown.riskRating : 4.0
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Title Panel */}
      <div className="glass-panel p-6">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Sliders className="h-5 w-5 text-emerald-400" /> Macroeconomic Stress Test Simulator
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Simulate shifting economic environments for <span className="text-slate-200 font-semibold">{report?.companyName || ticker}</span> and compute updated investment ratings.
        </p>
      </div>

      {/* Main Grid controls vs outputs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sliders Control Card */}
        <div className="glass-panel p-6 space-y-6 lg:col-span-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block pb-2 border-b border-slate-900">Environment Controls</span>

          <div className="space-y-4">
            {/* Interest Rates Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Interest Rates Shift</span>
                <span className="font-mono text-emerald-400 font-bold">+{ratesShift}% (bps)</span>
              </div>
              <input 
                type="range" min="0" max="5" step="0.5"
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                value={ratesShift}
                onChange={e => setRatesShift(parseFloat(e.target.value))}
              />
            </div>

            {/* Revenue shifts */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Revenue Adjustment</span>
                <span className={`font-mono font-bold ${revenueShift >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {revenueShift >= 0 ? '+' : ''}{revenueShift}%
                </span>
              </div>
              <input 
                type="range" min="-50" max="50" step="5"
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                value={revenueShift}
                onChange={e => setRevenueShift(parseInt(e.target.value))}
              />
            </div>

            {/* Inflation adjustments */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Inflation (CPI Shift)</span>
                <span className="font-mono text-emerald-400 font-bold">+{inflationShift}%</span>
              </div>
              <input 
                type="range" min="0" max="8" step="1"
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                value={inflationShift}
                onChange={e => setInflationShift(parseInt(e.target.value))}
              />
            </div>

            {/* Market crash slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Market Equity Drawdown</span>
                <span className="font-mono text-red-400 font-bold">-{crashShift}%</span>
              </div>
              <input 
                type="range" min="0" max="40" step="10"
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-red-500"
                value={crashShift}
                onChange={e => setCrashShift(parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-900">
            <button 
              onClick={runSimulation}
              disabled={loading}
              className="flex-1 cursor-pointer flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 rounded text-xs transition"
            >
              <Play className="h-3.5 w-3.5" /> {loading ? 'Running...' : 'Run Simulation'}
            </button>
            <button 
              onClick={handleReset}
              className="cursor-pointer flex items-center justify-center bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 p-2 rounded transition"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Results & Comparison View */}
        <div className="glass-panel p-6 lg:col-span-2 space-y-6">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block pb-2 border-b border-slate-900">Stress Test Outputs</span>

          {simResults ? (
            <div className="space-y-6">
              
              {/* Score comparisons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-900/60">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Base Grade</span>
                  <span className="text-xl font-black text-white block mt-1">{report?.investmentScore || '7.4'} / 10</span>
                  <span className="text-[9px] text-slate-400">{report?.recommendationGrade || 'Buy / Consider'}</span>
                </div>

                <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-900/30">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Simulated Grade</span>
                  <span className="text-xl font-black text-emerald-400 block mt-1">{simResults.updatedScore} / 10</span>
                  <span className="text-[9px] text-slate-400">{simResults.updatedRecommendation}</span>
                </div>

                <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-900/60 flex items-center gap-3">
                  <div className={`p-2 rounded-full ${simResults.updatedScore >= simResults.originalScore ? 'bg-emerald-950/40 text-emerald-400' : 'bg-red-950/40 text-red-400'}`}>
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Score Variance</span>
                    <span className={`text-sm font-bold block ${simResults.updatedScore >= simResults.originalScore ? 'text-emerald-400' : 'text-red-400'}`}>
                      {simResults.updatedScore >= simResults.originalScore ? '+' : ''}
                      {(simResults.updatedScore - simResults.originalScore).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Score breakdown comparison chart */}
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={10} tickLine={false} domain={[0, 10]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#090d16', border: '1px solid #1e293b', borderRadius: '6px' }} 
                      labelStyle={{ color: '#white', fontSize: '11px', fontWeight: 'bold' }}
                    />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                    <Bar name="Original Report" dataKey="Original" fill="#475569" radius={[4, 4, 0, 0]} />
                    <Bar name="Simulated Scenario" dataKey="Simulated" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

            </div>
          ) : (
            <div className="h-72 flex flex-col items-center justify-center text-center text-slate-500 space-y-2">
              <Info className="h-8 w-8 text-slate-700" />
              <p className="text-xs max-w-sm">Adjust environmental stress sliders on the left panel and hit "Run Simulation" to inspect updated scores.</p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
