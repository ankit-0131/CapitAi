import React from 'react';
import { 
  MessageSquareCode, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Scale,
  Info
} from 'lucide-react';

export default function DebateMode({ debate, ticker }) {
  if (!debate) {
    return (
      <div className="glass-panel p-12 flex flex-col items-center justify-center text-center text-slate-500 space-y-2">
        <Info className="h-8 w-8 text-slate-700" />
        <p className="text-xs max-w-sm">No debate session recorded for {ticker} yet. Run a deep report first from the dashboard.</p>
      </div>
    );
  }

  const { bullArg, bearArg, verdict } = debate;

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="glass-panel p-6">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <MessageSquareCode className="h-5 w-5 text-emerald-400" /> AI Agent Debate & Verdict Mode
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          A multi-agent consensus module. The <span className="text-emerald-400">Bull Agent</span> argues for position growth while the <span className="text-red-400">Bear Agent</span> checks micro risk headwinds.
        </p>
      </div>

      {/* Split debate columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Bull Agent argument */}
        <div className="glass-panel-glow border border-emerald-500/20 p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-emerald-950/40">
              <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" /> Bull Agent Thesis
              </span>
              <span className="text-[10px] text-emerald-500 font-mono">STATUS: OPTIMISTIC</span>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed italic">
              " {bullArg} "
            </p>
          </div>
          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-4">
            Thesis target: Autonomy & Capital efficiency
          </div>
        </div>

        {/* Bear Agent argument */}
        <div className="glass-panel border border-red-500/20 p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-red-950/40">
              <span className="text-xs font-bold text-red-400 tracking-wider uppercase flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4" /> Bear Agent Thesis
              </span>
              <span className="text-[10px] text-red-500 font-mono">STATUS: CONTRASTING</span>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed italic">
              " {bearArg} "
            </p>
          </div>
          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-4">
            Thesis target: Valuation multiples & Margins compression
          </div>
        </div>

      </div>

      {/* Judge Agent final verdict */}
      <div className="glass-panel p-6 border border-cyan-500/10">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-900 mb-4">
          <Scale className="h-5 w-5 text-cyan-400" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Judge Agent Consensus Verdict</h3>
            <span className="text-[9px] text-slate-500 uppercase font-semibold">Orchestrated consolidation index</span>
          </div>
        </div>

        <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/40 p-4 rounded-lg border border-slate-900/60">
          {verdict}
        </p>
      </div>

    </div>
  );
}
