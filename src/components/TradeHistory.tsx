"use client";

import { useState } from "react";
import { useSimulationStore } from "@/store/simulation";
import type { MistakeType } from "@/types/market";

const MISTAKE_LABELS: Record<MistakeType, { emoji: string; label: string }> = {
  "revenge-trade": { emoji: "😤", label: "Revenge Trade" },
  "overtrading": { emoji: "⚡", label: "Overtrading" },
  "fomo-entry": { emoji: "🏃", label: "FOMO Entry" },
  "panic-sell": { emoji: "😱", label: "Panic Sell" },
  "moved-stop": { emoji: "🚫", label: "Moved Stop" },
};

export default function TradeHistory() {
  const { closedTrades, trades, realizedPnl } = useSimulationStore();
  const [isOpen, setIsOpen] = useState(false);

  const winningTrades = closedTrades.filter((t) => t.realizedPnl > 0);
  const losingTrades = closedTrades.filter((t) => t.realizedPnl < 0);
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
  const avgR =
    closedTrades.filter((t) => t.rMultiple !== null).length > 0
      ? closedTrades
          .filter((t) => t.rMultiple !== null)
          .reduce((sum, t) => sum + (t.rMultiple ?? 0), 0) /
        closedTrades.filter((t) => t.rMultiple !== null).length
      : null;

  const totalMistakes = closedTrades.reduce((sum, t) => sum + t.mistakes.length, 0);
  const totalTrades = trades.length;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg px-4 py-3 text-left transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">📊 Trade History</span>
            {closedTrades.length > 0 && (
              <span className="text-xs text-slate-400">
                {closedTrades.length} closed
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs">
            {closedTrades.length > 0 && (
              <>
                <span className={winRate >= 50 ? "text-green-400" : "text-red-400"}>
                  {winRate.toFixed(0)}% win
                </span>
                {totalMistakes > 0 && (
                  <span className="text-orange-400">⚠️ {totalMistakes}</span>
                )}
              </>
            )}
            <span className="text-slate-500">▶</span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <span className="text-sm font-semibold text-white">📊 Trade History</span>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-white text-sm"
        >
          ✕
        </button>
      </div>

      {/* Stats summary */}
      {closedTrades.length > 0 && (
        <div className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-slate-700 bg-slate-800/50">
          <StatBox
            label="Win Rate"
            value={`${winRate.toFixed(0)}%`}
            color={winRate >= 50 ? "text-green-400" : "text-red-400"}
          />
          <StatBox
            label="Avg R"
            value={avgR !== null ? `${avgR >= 0 ? "+" : ""}${avgR.toFixed(2)}` : "N/A"}
            color={avgR !== null && avgR >= 0 ? "text-green-400" : "text-red-400"}
          />
          <StatBox
            label="Realized"
            value={`${realizedPnl >= 0 ? "+" : ""}$${realizedPnl.toFixed(0)}`}
            color={realizedPnl >= 0 ? "text-green-400" : "text-red-400"}
          />
          <StatBox
            label="Mistakes"
            value={`${totalMistakes}`}
            color={totalMistakes === 0 ? "text-green-400" : "text-orange-400"}
          />
        </div>
      )}

      {/* Trade list */}
      <div className="max-h-64 overflow-y-auto">
        {closedTrades.length === 0 ? (
          <div className="px-4 py-6 text-center text-slate-500 text-sm">
            No closed trades yet. Complete a buy → sell round trip to see history.
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {[...closedTrades].reverse().map((ct) => (
              <div key={ct.id} className="px-4 py-2.5 hover:bg-slate-700/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-mono font-bold ${
                        ct.realizedPnl >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {ct.realizedPnl >= 0 ? "+" : ""}${ct.realizedPnl.toFixed(2)}
                    </span>
                    {ct.rMultiple !== null && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({ct.rMultiple >= 0 ? "+" : ""}{ct.rMultiple.toFixed(1)}R)
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {ct.quantity} @ ${ct.entryPrice.toFixed(2)} → ${ct.exitPrice.toFixed(2)}
                  </span>
                </div>

                {/* Journal info */}
                {ct.journal?.thesis && (
                  <div className="mt-1 text-[11px] text-slate-400 italic">
                    &ldquo;{ct.journal.thesis}&rdquo;
                  </div>
                )}
                {ct.journal?.exitReason && (
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    Exit: {ct.journal.exitReason}
                  </div>
                )}
                {ct.journal?.setupLabel && (
                  <span className="inline-block mt-1 text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                    {ct.journal.setupLabel === "custom"
                      ? ct.journal.customSetupLabel
                      : ct.journal.setupLabel}
                  </span>
                )}

                {/* Mistakes */}
                {ct.mistakes.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {ct.mistakes.map((m) => (
                      <span
                        key={m}
                        className="text-[10px] bg-orange-900/50 text-orange-300 px-1.5 py-0.5 rounded border border-orange-700/50"
                      >
                        {MISTAKE_LABELS[m].emoji} {MISTAKE_LABELS[m].label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with total trades */}
      <div className="px-4 py-2 border-t border-slate-700 text-[11px] text-slate-500">
        {totalTrades} total orders • {closedTrades.length} round trips •{" "}
        {winningTrades.length}W / {losingTrades.length}L
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] text-slate-500 uppercase">{label}</div>
      <div className={`text-sm font-bold font-mono ${color}`}>{value}</div>
    </div>
  );
}
