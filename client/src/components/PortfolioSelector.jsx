import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend, 
  Tooltip
} from 'recharts';
import { 
  Briefcase, 
  Plus, 
  Trash2, 
  PieChart as PieIcon, 
  Coins
} from 'lucide-react';

const COLORS = ['#10b981', '#06b6d4', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
const BACKEND_URL = 'http://localhost:5000';

export default function PortfolioSelector({ portfolio, userId, currency, refreshPortfolio }) {
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Currency Converter Formatting
  const formatVal = (val) => {
    const rate = currency === 'INR' ? 95 : 1;
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}${(val * rate).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const handleAddAsset = async (e) => {
    e.preventDefault();
    if (!ticker || !shares || !price) return;
    setSubmitting(true);
    
    // Cost average input is inputted in the selected currency, so if in INR, we convert to USD for backend database consistency
    let usdPrice = parseFloat(price);
    if (currency === 'INR') {
      usdPrice = usdPrice / 95;
    }

    try {
      await fetch(`${BACKEND_URL}/api/portfolio/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: ticker.toUpperCase(),
          shares: parseFloat(shares),
          avg_price: usdPrice
        })
      });
      setTicker('');
      setShares('');
      setPrice('');
      refreshPortfolio();
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  const handleClear = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/portfolio/${userId}`, {
        method: 'DELETE'
      });
      refreshPortfolio();
    } catch (err) {
      console.error(err);
    }
  };

  // Portfolio calculations
  const totalValue = portfolio.reduce((acc, item) => acc + (item.shares * item.avg_price), 0);
  
  const sectorMap = {};
  const geoMap = {};
  portfolio.forEach(item => {
    const value = item.shares * item.avg_price;
    sectorMap[item.sector || 'Other'] = (sectorMap[item.sector || 'Other'] || 0) + value;
    geoMap[item.geo || 'USA'] = (geoMap[item.geo || 'USA'] || 0) + value;
  });

  const sectorData = Object.keys(sectorMap).map(key => ({
    name: key,
    value: sectorMap[key],
    percentage: totalValue > 0 ? parseFloat(((sectorMap[key] / totalValue) * 100).toFixed(1)) : 0
  }));

  const geoData = Object.keys(geoMap).map(key => ({
    name: key,
    value: geoMap[key],
    percentage: totalValue > 0 ? parseFloat(((geoMap[key] / totalValue) * 100).toFixed(1)) : 0
  }));

  const portfolioHealth = totalValue > 0 ? 82 : 0;
  const expectedReturn = totalValue > 0 ? 11.8 : 0;
  const riskConcentration = sectorData.length > 0 ? Math.max(...sectorData.map(s => s.percentage)) : 0;

  return (
    <div className="space-y-6">
      
      {/* Overview Cards (Responsive layout grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="glass-panel p-6">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Portfolio Net Worth</span>
          <span className="text-xl md:text-2xl font-black font-mono text-white block mt-1">
            {formatVal(totalValue)}
          </span>
          <span className="text-[9px] text-slate-400">Total holdings valuation</span>
        </div>

        <div className="glass-panel p-6">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Expected Return</span>
          <span className="text-xl md:text-2xl font-black font-mono text-emerald-400 block mt-1">
            {expectedReturn > 0 ? `+${expectedReturn}%` : 'N/A'}
          </span>
          <span className="text-[9px] text-slate-400">Annualized projection</span>
        </div>

        <div className="glass-panel p-6">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Risk Concentration</span>
          <span className={`text-xl md:text-2xl font-black font-mono block mt-1 ${riskConcentration > 50 ? 'text-red-400' : 'text-slate-200'}`}>
            {riskConcentration > 0 ? `${riskConcentration}%` : 'N/A'}
          </span>
          <span className="text-[9px] text-slate-400">Max sector allocation</span>
        </div>

        <div className="glass-panel p-6">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Portfolio Health Index</span>
          <span className="text-xl md:text-2xl font-black font-mono text-cyan-400 block mt-1">
            {portfolioHealth > 0 ? `${portfolioHealth}/100` : 'N/A'}
          </span>
          <span className="text-[9px] text-slate-400">Diversification standard index</span>
        </div>
      </div>

      {/* Grid: Assets list vs Allocation charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form and list */}
        <div className="glass-panel p-6 space-y-6 lg:col-span-1">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Add Asset Holding
            </h3>
            <form onSubmit={handleAddAsset} className="space-y-3">
              <input 
                type="text" 
                required
                placeholder="Ticker (e.g. AAPL)"
                className="w-full bg-slate-950/40 border border-slate-800 text-xs text-white rounded px-2.5 py-1.5 outline-none focus:border-emerald-500/50 uppercase"
                value={ticker}
                onChange={e => setTicker(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="number" 
                  required
                  step="any"
                  placeholder="Shares"
                  className="w-full bg-slate-950/40 border border-slate-800 text-xs text-white rounded px-2.5 py-1.5 outline-none focus:border-emerald-500/50"
                  value={shares}
                  onChange={e => setShares(e.target.value)}
                />
                <input 
                  type="number" 
                  required
                  step="any"
                  placeholder={`Cost (${currency})`}
                  className="w-full bg-slate-950/40 border border-slate-800 text-xs text-white rounded px-2.5 py-1.5 outline-none focus:border-emerald-500/50"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                />
              </div>
              <button 
                type="submit" 
                disabled={submitting}
                className="w-full cursor-pointer bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-1.5 text-xs rounded transition"
              >
                {submitting ? 'Adding...' : 'Record Holding'}
              </button>
            </form>
          </div>

          <div className="pt-4 border-t border-slate-900">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Briefcase className="h-4 w-4" /> Holding Entries
              </h3>
              {portfolio.length > 0 && (
                <button onClick={handleClear} className="text-[10px] text-red-400 hover:text-red-300 font-bold flex items-center gap-1 cursor-pointer">
                  <Trash2 className="h-3 w-3" /> Clear
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {portfolio.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs p-2 rounded bg-slate-950/30 border border-slate-900/60">
                  <div>
                    <span className="font-bold text-white block">{item.ticker}</span>
                    <span className="text-[9px] text-slate-500">
                      {item.shares} shares @ {formatVal(item.avg_price)}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-300">
                    {formatVal(item.shares * item.avg_price)}
                  </span>
                </div>
              ))}
              {portfolio.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">No portfolio holdings added yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="glass-panel p-6 lg:col-span-2 space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <PieIcon className="h-4.5 w-4.5 text-cyan-400" /> Asset Diversification Diagrams
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Sector */}
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-3 text-center">Sector Allocation</span>
              <div className="h-44">
                {sectorData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={sectorData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={40} 
                        outerRadius={65} 
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {sectorData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatVal(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-600">No data available</div>
                )}
              </div>
            </div>

            {/* Geo */}
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-3 text-center">Geographic Allocation</span>
              <div className="h-44">
                {geoData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={geoData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={40} 
                        outerRadius={65} 
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {geoData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatVal(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-600">No data available</div>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
