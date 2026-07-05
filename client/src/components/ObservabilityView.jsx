import React, { useEffect, useState } from 'react';
import { 
  Database, 
  Activity, 
  Clock, 
  Cpu, 
  Zap,
  RefreshCw,
  Info
} from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000';

export default function ObservabilityView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = () => {
    setLoading(true);
    fetch(`${BACKEND_URL}/api/observability`)
      .then(res => res.json())
      .then(data => {
        if (data.logs) setLogs(data.logs);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        // Fallback mock logs
        setLogs([
          { id: 1, endpoint: 'POST /api/analyze', latency: 4500, tokens: 320, cache_hit: 0, errors: null, timestamp: new Date().toISOString() },
          { id: 2, endpoint: 'GET /api/portfolio/user-default-101', latency: 120, tokens: 0, cache_hit: 1, errors: null, timestamp: new Date().toISOString() },
          { id: 3, endpoint: 'POST /api/simulate', latency: 850, tokens: 150, cache_hit: 0, errors: null, timestamp: new Date().toISOString() }
        ]);
      });
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const totalRequests = logs.length;
  const avgLatency = totalRequests > 0 ? Math.round(logs.reduce((acc, l) => acc + l.latency, 0) / totalRequests) : 0;
  const cacheHits = logs.filter(l => l.cache_hit === 1).length;
  const hitRate = totalRequests > 0 ? Math.round((cacheHits / totalRequests) * 100) : 0;
  const totalTokens = logs.reduce((acc, l) => acc + (l.tokens || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="glass-panel p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-400" /> Platform Observability Console
          </h2>
          <p className="text-xs text-slate-400 mt-1">Audit execution speeds, API cache hit performance, and token burn metrics in real time.</p>
        </div>

        <button 
          onClick={fetchLogs}
          disabled={loading}
          className="cursor-pointer flex items-center gap-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold px-3 py-1.5 rounded text-xs transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Reload Audit Logs
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="glass-panel p-6 flex items-center gap-3">
          <div className="p-2.5 rounded bg-emerald-950/20 text-emerald-400">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">API Calls</span>
            <span className="text-xl font-black text-white block mt-0.5">{totalRequests} Requests</span>
          </div>
        </div>

        <div className="glass-panel p-6 flex items-center gap-3">
          <div className="p-2.5 rounded bg-cyan-950/20 text-cyan-400">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Avg Latency</span>
            <span className="text-xl font-black text-white block mt-0.5">{avgLatency} ms</span>
          </div>
        </div>

        <div className="glass-panel p-6 flex items-center gap-3">
          <div className="p-2.5 rounded bg-amber-950/20 text-amber-400">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Cache Hit Rate</span>
            <span className="text-xl font-black text-white block mt-0.5">{hitRate}%</span>
          </div>
        </div>

        <div className="glass-panel p-6 flex items-center gap-3">
          <div className="p-2.5 rounded bg-purple-950/20 text-purple-400">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tokens Spent</span>
            <span className="text-xl font-black text-white block mt-0.5">{totalTokens.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-panel p-6 overflow-x-auto">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-4">Request Log Audit Trail</span>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-900 text-slate-500">
              <th className="pb-3 font-semibold uppercase tracking-wider">Time</th>
              <th className="pb-3 font-semibold uppercase tracking-wider">Endpoint</th>
              <th className="pb-3 font-semibold uppercase tracking-wider">Latency</th>
              <th className="pb-3 font-semibold uppercase tracking-wider">Cache State</th>
              <th className="pb-3 font-semibold uppercase tracking-wider">Token Count</th>
              <th className="pb-3 font-semibold text-right uppercase tracking-wider">Response Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900/60">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-950/20">
                <td className="py-3 font-mono text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                <td className="py-3 font-mono text-white font-bold">{log.endpoint}</td>
                <td className="py-3 font-mono text-slate-300">{log.latency} ms</td>
                <td className="py-3">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${log.cache_hit === 1 ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-950' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>
                    {log.cache_hit === 1 ? 'HIT' : 'MISS'}
                  </span>
                </td>
                <td className="py-3 font-mono text-slate-300">{log.tokens ? log.tokens : '—'}</td>
                <td className="py-3 text-right">
                  <span className={`text-[10px] font-bold ${log.errors ? 'text-red-400' : 'text-emerald-400'}`}>
                    {log.errors ? log.errors : 'Success 200'}
                  </span>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan="6" className="py-8 text-center text-slate-500">No request records logged yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
