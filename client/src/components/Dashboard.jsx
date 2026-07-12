import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import { 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  LineChart, 
  Line, 
  Legend 
} from 'recharts';
import { 
  ShieldAlert, 
  CheckCircle2, 
  TrendingUp, 
  HelpCircle,
  Star,
  Activity,
  ArrowUpRight,
  TrendingDown,
  Info,
  DollarSign
} from 'lucide-react';

export default function Dashboard({ report, ticker, loading, preferences, watchlist, currency, addToWatchlist, removeFromWatchlist, theme }) {
  const chartContainerRef = useRef(null);

  const rate = currency === 'INR' ? 95 : 1;
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const convertPrice = (val) => val 
    ? `${currencySymbol}${(val * rate).toLocaleString(undefined, { maximumFractionDigits: 1 })}` 
    : '—';

  const convertShortValue = (val) => {
    if (!val) return '—';
    const converted = val * rate;
    if (converted >= 1e12) return `${currencySymbol}${(converted / 1e12).toFixed(1)}T`;
    if (converted >= 1e9) return `${currencySymbol}${(converted / 1e9).toFixed(1)}B`;
    if (converted >= 1e6) return `${currencySymbol}${(converted / 1e6).toFixed(1)}M`;
    return `${currencySymbol}${converted.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const getActionableAvoidWarning = (con) => {
    const text = con.toLowerCase();
    if (/debt|leverage|loan/.test(text)) return 'Avoid high debt: Limit exposure to under 3% of portfolio value to mitigate risk from heavy balance-sheet debt loads.';
    if (/pe|valuation|premium|ratio/.test(text)) return 'Avoid peak multiples: Do not buy during bullish valuation peaks; wait for consolidations to build long-term stakes.';
    if (/growth|sluggish|slowing/.test(text)) return 'Avoid stagnant sales: Scale back position sizes if quarterly revenue or user expansion indicators begin to level off.';
    if (/margin|compress|returns/.test(text)) return 'Avoid margin traps: Avoid loading during cost-inflation cycles where operating net margins are compressed.';
    return `${con} — Keep position sizes conservative to manage volatility.`;
  };

  // Setup TradingView Widget
  useEffect(() => {
    if (loading || !report || !chartContainerRef.current) return;

    if (!document.getElementById('tradingview-widget-script')) {
      const script = document.createElement('script');
      script.id = 'tradingview-widget-script';
      script.src = 'https://s3.tradingview.com/tv.js';
      script.type = 'text/javascript';
      script.async = true;
      script.onload = initTradingViewWidget;
      document.head.appendChild(script);
    } else {
      initTradingViewWidget();
    }

    function initTradingViewWidget() {
      if (!window.TradingView || !chartContainerRef.current) return;
      const tvSymbol = ticker.includes('.NS') ? `NSE:${ticker.split('.')[0]}` 
                     : ticker.includes('.BO') ? `BSE:${ticker.split('.')[0]}` 
                     : `NASDAQ:${ticker}`;

      chartContainerRef.current.innerHTML = '';
      const widgetId = 'tradingview_widget_container';
      const childDiv = document.createElement('div');
      childDiv.id = widgetId;
      childDiv.style.width = childDiv.style.height = '100%';
      chartContainerRef.current.appendChild(childDiv);

      try {
        new window.TradingView.widget({
          autosize: true,
          symbol: tvSymbol,
          interval: "D",
          timezone: "Asia/Kolkata",
          theme: theme === 'light' ? 'light' : 'dark',
          style: "1",
          locale: "en",
          container_id: widgetId,
          hide_legend: true
        });
      } catch (err) {
        console.warn('Failed to construct TradingView Widget:', err.message);
      }
    }
  }, [report, ticker, loading, theme]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="glass-panel p-6 h-24 bg-slate-900/10 border-slate-800" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 h-60 bg-slate-900/10 border-slate-800" />
          <div className="glass-panel p-6 md:col-span-2 h-60 bg-slate-900/10 border-slate-800" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-panel p-6 lg:col-span-2 h-72 bg-slate-900/10 border-slate-800" />
          <div className="glass-panel p-6 h-72 bg-slate-900/10 border-slate-800" />
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-500">
        <TrendingUp className="h-12 w-12 text-slate-700 mb-4" />
        <p className="text-sm">Submit onboarding variables or search a ticker above to run analysis.</p>
      </div>
    );
  }

  const {
    companyName,
    recommendationGrade,
    confidence,
    scoreBreakdown,
    pros,
    cons,
    alternatives,
    sourceAttributions,
    quote,
    financials,
    news
  } = report;

  const isStarred = watchlist.includes(ticker);
  const chartFinancials = financials?.map(f => ({
    year: f.year,
    revenue: parseFloat(((f.revenue * rate) / 1e6).toFixed(1)),
    netIncome: parseFloat(((f.netIncome * rate) / 1e6).toFixed(1))
  })) || [];

  const getExperienceNote = () => {
    const exp = preferences.experience || 'Beginner';
    if (exp === 'Beginner') return 'Beginner Note: Focus on index funds or blue-chips first. Avoid complex leveraged strategies.';
    if (exp === 'Intermediate') return 'Intermediate Note: Good for active sector learning and mid-cap analysis. Maintain stop losses.';
    return 'Advanced Note: Suitable for volatile entries, options research, or micro-cap alpha harvesting.';
  };

  const verdictStyles = {
    'Strong Buy': { css: 'text-emerald-400 border-emerald-500/20 bg-emerald-950/20', advice: 'Should I invest? YES. The company presents exceptional financial stability and growth parameters.' },
    'Buy / Consider': { css: 'text-cyan-400 border-cyan-500/20 bg-cyan-950/20', advice: 'Should I invest? YES, CONSIDER. Highly promising profile. Consider entry on minor price consolidations.' },
    'Avoid / High Risk': { css: 'text-red-400 border-red-500/20 bg-red-950/20', advice: 'Should I invest? NO, AVOID. Ratios indicate high debt leverage or extreme valuation premiums.' }
  };
  const { css: investVerdictClass, advice: investAdviceText } = verdictStyles[recommendationGrade] || { css: 'text-amber-400 border-amber-500/20 bg-amber-950/20', advice: 'Should I invest? Hold / Wait. Neutral outlook. Monitor quarterly statements.' };

  return (
    <div className="space-y-6">
      {/* Top Banner Ticker Row */}
      <div className="glass-panel p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">{companyName}</h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">{ticker}</span>
            <button onClick={() => isStarred ? removeFromWatchlist(ticker) : addToWatchlist(ticker)} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition cursor-pointer">
              <Star className={`h-5 w-5 ${isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-2">
            <span className="text-slate-400 text-xs">Sector: <span className="text-slate-200 font-semibold">{quote?.sector || 'N/A'}</span></span>
            <span className="text-slate-400 text-xs">Market: <span className="text-slate-200 font-semibold">{quote?.geo === 'India' ? 'NSE / BSE' : 'NASDAQ / NYSE'}</span></span>
          </div>
        </div>
        {quote && (
          <div className="flex items-center gap-6 md:border-l md:border-slate-800 md:pl-6">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Stock Price</div>
              <div className="text-xl md:text-2xl font-black font-mono text-white mt-0.5">{convertPrice(quote.price)}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today</div>
              <div className={`flex items-center font-mono font-bold text-sm mt-1.5 ${quote.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {quote.change >= 0 ? '+' : ''}{(quote.change * rate).toFixed(1)} ({quote.change >= 0 ? '+' : ''}{quote.percentChange?.toFixed(2)}%)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Consensus & Metrics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`glass-panel border p-6 flex flex-col justify-between ${investVerdictClass}`}>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-60">Consensus Verdict</div>
            <div className="text-2xl font-black tracking-tight mt-1.5">{recommendationGrade}</div>
            <p className="text-xs font-medium leading-relaxed mt-3 opacity-90">{investAdviceText}</p>
            <p className="text-[10px] font-bold mt-2.5 opacity-80 leading-normal border-t border-white/10 pt-2">{getExperienceNote()}</p>
          </div>
          <div className="pt-4 border-t border-white/5 mt-4 text-[10px] opacity-60 font-semibold">
            Tailored to your {convertShortValue(parseInt(preferences.investmentAmount))} capital at {preferences.investmentHorizon} horizon.
          </div>
        </div>

        <div className="glass-panel p-6 lg:col-span-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Core Model Ratios (Hover for Definitions)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'P/E Ratio', value: quote?.pe, subtitle: 'Sector Avg: ~28x', tTitle: 'Price-to-Earnings Ratio', tDesc: 'Measures how expensive a stock is compared to its actual profit. Lower numbers generally indicate better value.', valColor: 'text-white' },
              { label: 'P/B Ratio', value: quote?.pb, subtitle: 'Sector Avg: ~4.2x', tTitle: 'Price-to-Book Ratio', tDesc: "Compares the stock price to the company's net assets. Numbers below 3 are often considered reasonable.", valColor: 'text-white' },
              { label: 'ROE Index', value: quote?.roe ? `${(quote.roe * 100).toFixed(1)}%` : 'N/A', subtitle: 'Capital Return', tTitle: 'Return on Equity', tDesc: 'Measures how efficiently the company turns invested capital into profit. Values above 15% are excellent.', valColor: 'text-emerald-400' },
              { label: 'Debt / Equity', value: quote?.debtEq, subtitle: 'Leverage Index', tTitle: 'Debt to Equity Ratio', tDesc: "Compares company debt to owned equity. Lower values (below 0.8) are safer and indicate less risk.", valColor: 'text-amber-400', isRight: true }
            ].map(({ label, value, subtitle, tTitle, tDesc, valColor, isRight }, idx) => (
              <div key={idx} className="bg-slate-950/40 p-3.5 rounded-lg border border-slate-900/60 relative group cursor-help">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{label}</span>
                  <HelpCircle className="h-3 w-3 text-slate-600" />
                </div>
                <span className={`text-lg font-mono font-black ${valColor} block mt-1`}>{value || 'N/A'}</span>
                <span className="text-[9px] text-slate-400">{subtitle}</span>
                <div className={`absolute ${isRight ? 'right-0' : 'left-0'} bottom-full mb-2 w-52 p-3 bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-slate-300 leading-normal hidden group-hover:block z-50 shadow-2xl`}>
                  <span className="font-bold text-white block mb-1">{tTitle}</span>
                  {tDesc}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-900/60 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Metrics that Influenced this Verdict</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {[
                { label: 'Financial Health (25% weight)', score: scoreBreakdown?.financialHealth, color: 'bg-emerald-500' },
                { label: 'Growth Potential (20% weight)', score: scoreBreakdown?.growthPotential, color: 'bg-cyan-500' },
                { label: 'Valuation Multiples (10% weight)', score: scoreBreakdown?.valuation, color: 'bg-purple-500' },
                { label: 'Risk Factor (5% weight)', score: scoreBreakdown?.riskRating, color: 'bg-amber-500' }
              ].map(({ label, score, color }, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">{label}</span>
                    <span className="text-white font-bold">{score}/10</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                    <div className={`${color} h-full rounded-full`} style={{ width: `${(score || 5) * 10}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stock Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Historical Price Movement (60D)</h3>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded">Vite Live Feed</span>
          </div>
          <div ref={chartContainerRef} className="w-full relative border border-slate-900/60 rounded bg-slate-950/20" style={{ width: '100%', height: '260px', position: 'relative', overflow: 'hidden' }} />
        </div>

        <div className="glass-panel p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Revenue & Profits Trends ({currencySymbol}M)</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartFinancials} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                <XAxis dataKey="year" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} width={45} />
                <Tooltip contentStyle={{ backgroundColor: '#090d16', border: '1px solid #1e293b', borderRadius: '6px' }} labelStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }} />
                <Legend iconSize={8} fontSize={10} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Line type="monotone" name="Revenue" dataKey="revenue" stroke="#06b6d4" strokeWidth={2.5} activeDot={{ r: 6 }} />
                <Line type="monotone" name="Net Income" dataKey="netIncome" stroke="#10b981" strokeWidth={2.5} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Strengths & Risks Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 border border-emerald-950/30">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-3 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> Why Invest? (Strengths)
          </span>
          <ul className="space-y-3">
            {pros?.map((pro, i) => (
              <li key={i} className="text-xs text-slate-300 flex items-start gap-2 bg-emerald-950/10 border border-emerald-950/20 p-2.5 rounded-lg">
                <span className="text-emerald-400 shrink-0 font-bold mt-0.5">•</span>
                <span>{pro}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-panel p-6 border border-red-950/30">
          <span className="text-xs font-bold uppercase tracking-wider text-red-400 block mb-3 flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4" /> What to avoid while investing in this company
          </span>
          <ul className="space-y-3">
            {cons?.map((con, i) => (
              <li key={i} className="text-xs text-slate-300 flex items-start gap-2 bg-red-950/10 border border-red-950/20 p-2.5 rounded-lg">
                <span className="text-red-400 shrink-0 font-bold mt-0.5">•</span>
                <span>{getActionableAvoidWarning(con)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* What could change this card */}
      <div className="glass-panel p-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <Info className="h-4.5 w-4.5 text-cyan-400" /> What could make this recommendation change?
        </h3>
        <p className="text-xs text-slate-300 leading-normal bg-slate-950/40 p-4 rounded-lg border border-slate-900/60">
          This rating could contract if central banks announce unexpected interest rate hikes (+100bps), which historically compresses tech stock valuation multiples. Additionally, watch for upcoming quarterly balance sheets; a decline in auto margins below 15% or a contraction in market capitalization share would shift the verdict down to a HOLD.
        </p>
      </div>

      {/* News Audit Timeline */}
      <div className="glass-panel p-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">News Audit Timeline</h3>
        <div className="space-y-4">
          {news?.slice(0, 3).map((item, idx) => (
            <div key={idx} className="flex justify-between items-start gap-4 text-xs pb-4 border-b border-slate-900/40 last:border-b-0 last:pb-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.source}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${item.sentiment > 0 ? 'bg-emerald-950 text-emerald-400' : item.sentiment < 0 ? 'bg-red-950 text-red-400' : 'bg-slate-900 text-slate-400'}`}>
                    {item.sentiment > 0 ? 'Bullish' : item.sentiment < 0 ? 'Bearish' : 'Neutral'}
                  </span>
                </div>
                <h4 className="font-bold text-white leading-tight">{item.title}</h4>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Sources footer */}
      <div className="flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-500 font-semibold uppercase tracking-wider px-2 gap-2">
        <span>Confidence Index: {confidence}%</span>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <span>Sources:</span>
          {sourceAttributions?.map((src, i) => (
            <span key={i} className="text-slate-400 border border-slate-900 px-1.5 py-0.5 rounded bg-slate-950/20">{src}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
