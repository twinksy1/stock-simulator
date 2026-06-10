"use client";

import { useMemo } from "react";
import { useSimulationStore } from "@/store/simulation";
import type { SetupLabel } from "@/types/market";

const SETUP_DISPLAY: Record<SetupLabel, string> = {
  breakout: "Breakout",
  breakdown: "Breakdown",
  pullback: "Pullback",
  reversal: "Reversal",
  momentum: "Momentum",
  "mean-reversion": "Mean Reversion",
  "support-bounce": "Support Bounce",
  "resistance-reject": "Resistance Reject",
  "ma-reclaim": "MA Reclaim",
  "rsi-divergence": "RSI Divergence",
  custom: "Custom",
};

export default function SetupStats() {
  const closedTrades = useSimulationStore((s) => s.closedTrades);

  const entries = useMemo(() => {
    const setupMap = new Map<string, { wins: number; losses: number; totalR: number; rCount: number; totalPnl: number; avgHold: number; count: number }>();

    for (const ct of closedTrades) {
      const label = ct.journal?.setupLabel ?? "unlabeled";
      const existing = setupMap.get(label) ?? { wins: 0, losses: 0, totalR: 0, rCount: 0, totalPnl: 0, avgHold: 0, count: 0 };
      existing.count++;
      if (ct.realizedPnl > 0) existing.wins++;
      else existing.losses++;
      if (ct.rMultiple !== null) { existing.totalR += ct.rMultiple; existing.rCount++; }
      existing.totalPnl += ct.realizedPnl;
      existing.avgHold += ct.holdDuration;
      setupMap.set(label, existing);
    }

    return [...setupMap.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [closedTrades]);

  if (entries.length === 0) return null;

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <h3 className="text-sm font-semibold text-white mb-3">📋 Setup Performance</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-slate-500 uppercase border-b border-slate-700">
              <th className="text-left py-1 pr-2">Setup</th>
              <th className="text-center px-1">#</th>
              <th className="text-center px-1">Win%</th>
              <th className="text-center px-1">Avg R</th>
              <th className="text-center px-1">P&L</th>
              <th className="text-center px-1">Hold</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([label, stats]) => {
              const winRate = stats.count > 0 ? (stats.wins / stats.count) * 100 : 0;
              const avgR = stats.rCount > 0 ? stats.totalR / stats.rCount : null;
              const avgHold = stats.count > 0 ? Math.round(stats.avgHold / stats.count) : 0;
              const displayLabel = label === "unlabeled" ? "No Label" : (SETUP_DISPLAY[label as SetupLabel] ?? label);

              return (
                <tr key={label} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="py-1.5 pr-2 text-slate-300 font-medium">{displayLabel}</td>
                  <td className="text-center text-slate-400">{stats.count}</td>
                  <td className={`text-center font-mono ${winRate >= 50 ? "text-green-400" : "text-red-400"}`}>
                    {winRate.toFixed(0)}%
                  </td>
                  <td className={`text-center font-mono ${avgR !== null && avgR >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {avgR !== null ? `${avgR >= 0 ? "+" : ""}${avgR.toFixed(1)}` : "—"}
                  </td>
                  <td className={`text-center font-mono ${stats.totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                    ${stats.totalPnl.toFixed(0)}
                  </td>
                  <td className="text-center text-slate-400 font-mono">{avgHold}c</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {closedTrades.length >= 5 && (
        <div className="mt-2 pt-2 border-t border-slate-700 text-[10px] text-slate-500">
          Tip: Trade setups with proven positive expectancy. Avoid setups with negative avg R.
        </div>
      )}
    </div>
  );
}
