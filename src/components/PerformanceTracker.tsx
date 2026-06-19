"use client";

import { useMemo } from "react";
import { usePerformanceStore } from "@/store/performance";

export default function PerformanceTracker() {
  const {
    totalSessions, totalTrades, totalWins, totalLosses, totalR,
    bestR, worstR, longestWinStreak, longestLoseStreak, currentStreak,
    sessions, getWinRate, getAvgR, getProfitFactor, getExpectancy,
    clearHistory,
  } = usePerformanceStore();

  const winRate = useMemo(() => getWinRate(), [getWinRate, totalWins, totalLosses]);
  const avgR = useMemo(() => getAvgR(), [getAvgR, totalR, totalTrades]);
  const profitFactor = useMemo(() => getProfitFactor(), [getProfitFactor, sessions]);
  const expectancy = useMemo(() => getExpectancy(), [getExpectancy, sessions, totalWins, totalLosses]);

  if (totalSessions === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <span className="text-sm font-semibold text-white">📊 Lifetime Performance</span>
        <p className="text-slate-500 text-xs mt-2">No sessions completed yet. Your R:R stats will appear here after your first trade.</p>
      </div>
    );
  }

  const streakText = currentStreak > 0
    ? `🔥 ${currentStreak}W streak`
    : currentStreak < 0
    ? `❄️ ${Math.abs(currentStreak)}L streak`
    : "—";

  const streakColor = currentStreak > 0 ? "text-green-400" : currentStreak < 0 ? "text-red-400" : "text-slate-400";

  // R equity curve — simple sparkline
  const equityCurve = useMemo(() => {
    let cum = 0;
    return sessions.map((s) => { cum += s.totalR; return cum; });
  }, [sessions]);

  const minEquity = Math.min(0, ...equityCurve);
  const maxEquity = Math.max(0.01, ...equityCurve);
  const range = maxEquity - minEquity || 1;

  // Last 5 sessions for mini-table
  const recentSessions = sessions.slice(-5).reverse();

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-white">📊 Lifetime Performance</span>
        <span className={`text-lg font-bold font-mono ${totalR >= 0 ? "text-green-400" : "text-red-400"}`}>
          {totalR >= 0 ? "+" : ""}{totalR.toFixed(2)}R
        </span>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <MetricBox label="Win Rate" value={`${winRate.toFixed(0)}%`} color={winRate >= 50 ? "text-green-400" : "text-red-400"} />
        <MetricBox label="Avg R/Trade" value={`${avgR >= 0 ? "+" : ""}${avgR.toFixed(2)}`} color={avgR >= 0 ? "text-green-400" : "text-red-400"} />
        <MetricBox label="Expectancy" value={`${expectancy >= 0 ? "+" : ""}${expectancy.toFixed(2)}R`} color={expectancy >= 0 ? "text-green-400" : "text-red-400"} />
        <MetricBox label="Profit Factor" value={profitFactor === Infinity ? "∞" : profitFactor.toFixed(2)} color={profitFactor >= 1 ? "text-green-400" : "text-red-400"} />
        <MetricBox label="W/L" value={`${totalWins}/${totalLosses}`} color="text-slate-300" />
        <MetricBox label="Streak" value={streakText} color={streakColor} />
      </div>

      {/* R Curve sparkline */}
      {equityCurve.length >= 2 && (
        <div className="mb-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">R Curve ({sessions.length} sessions)</div>
          <svg viewBox={`0 0 ${equityCurve.length} 40`} className="w-full h-8" preserveAspectRatio="none">
            {/* Zero line */}
            <line
              x1={0} y1={40 - ((0 - minEquity) / range) * 40}
              x2={equityCurve.length} y2={40 - ((0 - minEquity) / range) * 40}
              stroke="#475569" strokeWidth={0.5} strokeDasharray="2,2"
            />
            {/* Curve */}
            <polyline
              points={equityCurve.map((v, i) => `${i},${40 - ((v - minEquity) / range) * 40}`).join(" ")}
              fill="none"
              stroke={totalR >= 0 ? "#22c55e" : "#ef4444"}
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {/* Best / Worst R */}
      <div className="flex justify-between text-[11px] mb-3 px-1">
        <span className="text-slate-500">
          Best: <span className="text-green-400 font-mono">{bestR !== null ? `+${bestR.toFixed(2)}R` : "—"}</span>
        </span>
        <span className="text-slate-500">
          Worst: <span className="text-red-400 font-mono">{worstR !== null ? `${worstR.toFixed(2)}R` : "—"}</span>
        </span>
        <span className="text-slate-500">
          Best streak: <span className="text-green-400">{longestWinStreak}W</span>{" / "}
          <span className="text-red-400">{longestLoseStreak}L</span>
        </span>
      </div>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Recent Sessions</div>
          <div className="space-y-1">
            {recentSessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-[11px] bg-slate-900/50 rounded px-2 py-1">
                <span className="font-mono text-slate-300">{s.symbol}</span>
                <span className="text-slate-500">{s.interval}</span>
                <span className="text-slate-500">{s.wins}W/{s.losses}L</span>
                <span className={`font-mono font-semibold ${s.totalR >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {s.totalR >= 0 ? "+" : ""}{s.totalR.toFixed(2)}R
                </span>
                <span className={`font-mono ${s.realizedPnl >= 0 ? "text-green-400/60" : "text-red-400/60"}`}>
                  {s.realizedPnl >= 0 ? "+" : ""}${s.realizedPnl.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-700">
        <span className="text-[10px] text-slate-500">{totalSessions} sessions • {totalTrades} trades</span>
        <button
          onClick={() => { if (confirm("Clear all performance history? This cannot be undone.")) clearHistory(); }}
          className="text-[10px] text-slate-600 hover:text-red-400 transition-colors"
        >
          Reset History
        </button>
      </div>
    </div>
  );
}

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-900/50 rounded px-2 py-1.5 text-center">
      <div className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={`text-xs font-mono font-semibold ${color} mt-0.5`}>{value}</div>
    </div>
  );
}
