import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  Trash2, 
  TrendingUp, 
  Activity, 
  BellRing,
  ArrowUpRight,
  ArrowDownRight,
  Plus
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_API_URL || '';

export default function WatchlistMonitor({ watchlist, userId, currency, refreshWatchlist, triggerAnalysis }) {
  const [tickerInput, setTickerInput] = useState('');
  const [quotes, setQuotes] = useState({});
  const [loading, setLoading] = useState(false);

  // Currency converter (1 USD = 95 INR)
  const formatPrice = (val) => {
    if (currency === 'INR') {
      return `₹${(val * 95).toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
    }
    return `$${val.toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
  };

  // Fetch quotes in ONE SINGLE LIGHTWEIGHT CALL to avoid UI freeze/lag
  const fetchWatchlistQuotes = async () => {
    if (watchlist.length === 0) {
      setQuotes({});
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: watchlist })
      });
      const data = await res.json();
      if (data.quotes) {
        const mapped = {};
        data.quotes.forEach(q => {
          mapped[q.symbol] = q;
        });
        setQuotes(mapped);
      }
    } catch {
      // Fallback if offline
      const mapped = {};
      watchlist.forEach(sym => {
        mapped[sym] = { symbol: sym, name: `${sym} Corp`, price: 100 + (sym.charCodeAt(0) % 50), change: 1.5, percentChange: 1.2, sector: 'Technology' };
      });
      setQuotes(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWatchlistQuotes();
  }, [watchlist]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!tickerInput) return;
    const sym = tickerInput.toUpperCase();
    try {
      await fetch(`${BACKEND_URL}/api/watchlist/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: sym })
      });
      setTickerInput('');
      refreshWatchlist();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (sym) => {
    try {
      await fetch(`${BACKEND_URL}/api/watchlist/${userId}/${sym}`, {
        method: 'DELETE'
      });
      refreshWatchlist();
    } catch (err) {
      console.error(err);
    }
  };

  const alerts = [
    { type: 'Earnings', symbol: 'TSLA', msg: 'Tesla Q3 earnings scheduled next Wednesday after close. Implied volatility stands at 6.8%.', date: 'Upcoming' },
    { type: 'Regulation', symbol: 'AAPL', msg: 'Apple EU regulatory compliance audit complete. No new structural fine notices registered.', date: 'Today' },
    { type: 'Acquisition', symbol: 'MSFT', msg: 'Microsoft Cloud segment rumored to bid for enterprise automation tooling developer.', date: 'Yesterday' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Search/Add Box */}
      <div className="glass-panel p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Eye className="h-5 w-5 text-emerald-400" /> Watchlist Monitoring Panel
          </h2>
          <p className="text-xs text-slate-400 mt-1">Continuously audit ticker events, regulatory reviews, and price spikes.</p>
        </div>
        
        <form onSubmit={handleAdd} className="flex gap-2 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Symbol (e.g. NVDA)" 
            className="bg-slate-950/40 border border-slate-800 rounded text-xs text-white px-3 py-1.5 outline-none focus:border-emerald-500/50 uppercase w-full md:w-32"
            value={tickerInput}
            onChange={e => setTickerInput(e.target.value)}
          />
          <button type="submit" className="cursor-pointer bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-1.5 rounded text-xs transition shrink-0 flex items-center gap-1">
            <Plus className="h-3 w-3" /> Monitor
          </button>
        </form>
      </div>

      {/* Grid Layout: Monitored list vs notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Watchlist tickers grid */}
        <div className="glass-panel p-6 lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-900">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Watchlist Asset Quotes</span>
            {loading && <Activity className="h-4 w-4 text-emerald-400 animate-spin" />}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {watchlist.map((sym, idx) => {
              const q = quotes[sym];
              return (
                <div key={idx} className="glass-panel p-4 flex flex-col justify-between hover:border-slate-800 transition duration-150 relative group">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-sm font-bold text-white block">{sym}</span>
                      <span className="text-[10px] text-slate-500 truncate max-w-[120px] block">{q?.name || 'Syncing details...'}</span>
                    </div>
                    <button 
                      onClick={() => handleDelete(sym)} 
                      className="p-1 rounded bg-slate-900 border border-slate-800/60 text-slate-500 hover:text-red-400 hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {q && (
                    <div className="flex justify-between items-end mt-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 block">Current Price</span>
                        <span className="font-mono text-sm font-extrabold text-white">{formatPrice(q.price)}</span>
                      </div>
                      
                      <div className="text-right">
                        <span className={`inline-flex items-center gap-0.5 font-mono font-bold text-xs ${q.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {q.change >= 0 ? '+' : ''}{q.percentChange?.toFixed(1)}%
                          {q.change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        </span>
                        
                        <button 
                          onClick={() => triggerAnalysis(sym)}
                          className="mt-1 cursor-pointer block text-[9px] font-bold text-emerald-400 hover:underline hover:text-emerald-300"
                        >
                          Trigger Deep Report
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {watchlist.length === 0 && (
              <p className="text-xs text-slate-500 py-10 text-center col-span-2">Your watchlist is currently empty.</p>
            )}
          </div>
        </div>

        {/* Real-time Alerts */}
        <div className="glass-panel p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <BellRing className="h-4 w-4 text-amber-400" /> Watchlist Event Stream
          </h3>

          <div className="space-y-4">
            {alerts.filter(a => watchlist.includes(a.symbol)).map((alert, idx) => (
              <div key={idx} className="p-3.5 rounded bg-slate-950/30 border border-slate-900/60 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-amber-400 bg-amber-950/30 border border-amber-950 px-1.5 py-0.5 rounded">{alert.type}</span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{alert.symbol} • {alert.date}</span>
                </div>
                <p className="text-xs text-slate-300 leading-normal">{alert.msg}</p>
              </div>
            ))}
            {alerts.filter(a => watchlist.includes(a.symbol)).length === 0 && (
              <p className="text-xs text-slate-600 py-8 text-center">No alerts for monitored symbols.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
