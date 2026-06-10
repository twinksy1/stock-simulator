"use client";

import { useMemo } from "react";
import { useSimulationStore } from "@/store/simulation";
import type { MarketRegime } from "@/types/market";

const REGIME_CONFIG: Record<MarketRegime, { label: string; color: string; emoji: string }> = {
  "trending-up": { label: "Trending Up", color: "text-green-400", emoji: "📈" },
  "trending-down": { label: "Trending Down", color: "text-red-400", emoji: "📉" },
  "choppy": { label: "Choppy", color: "text-yellow-400", emoji: "🔀" },
  "low-volatility": { label: "Low Vol", color: "text-slate-400", emoji: "😴" },
  "high-volatility": { label: "High Vol", color: "text-orange-400", emoji: "⚡" },
};

export default function MarketContextBar() {
  const getCurrentRegime = useSimulationStore((s) => s.getCurrentRegime);
  const getActiveEvent = useSimulationStore((s) => s.getActiveEvent);
  const correlatedSymbols = useSimulationStore((s) => s.correlatedSymbols);
  const currentIndex = useSimulationStore((s) => s.currentIndex);
  const candles = useSimulationStore((s) => s.candles);

  const regime = getCurrentRegime();
  const activeEvent = getActiveEvent();
  const regimeConfig = REGIME_CONFIG[regime];

  const { corrChanges, mainChange } = useMemo(() => {
    const corrChanges = correlatedSymbols.map((cs) => {
      if (currentIndex === 0 || currentIndex >= cs.candles.length) return { symbol: cs.symbol, change: 0, correlation: cs.correlation };
      const prev = cs.candles[Math.max(0, currentIndex - 1)].close;
      const curr = cs.candles[currentIndex].close;
      return { symbol: cs.symbol, change: ((curr - prev) / prev) * 100, correlation: cs.correlation };
    });

    const mainChange = currentIndex > 0 && candles.length > currentIndex
      ? ((candles[currentIndex].close - candles[currentIndex - 1].close) / candles[currentIndex - 1].close) * 100
      : 0;

    return { corrChanges, mainChange };
  }, [correlatedSymbols, currentIndex, candles]);

  return (
    <div className="bg-slate-800 rounded-lg px-3 py-2 border border-slate-700 space-y-1.5">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Regime indicator */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Regime</span>
          <span className={`text-xs font-medium ${regimeConfig.color}`}>
            {regimeConfig.emoji} {regimeConfig.label}
          </span>
        </div>

        {/* Separator */}
        <span className="w-px h-4 bg-slate-600" />

        {/* Sector correlation mini-view */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Sector</span>
          {corrChanges.slice(0, 3).map((cs) => (
            <span key={cs.symbol} className="text-[11px] font-mono">
              <span className="text-slate-400">{cs.symbol}</span>{" "}
              <span className={cs.change >= 0 ? "text-green-400" : "text-red-400"}>
                {cs.change >= 0 ? "+" : ""}{cs.change.toFixed(2)}%
              </span>
            </span>
          ))}
          {candles.length > 0 && (
            <span className="text-[10px] text-slate-500 font-mono">
              (you: {mainChange >= 0 ? "+" : ""}{mainChange.toFixed(2)}%)
            </span>
          )}
        </div>
      </div>

      {/* Active event banner */}
      {activeEvent && (
        <div className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
          activeEvent.impact === "bullish"
            ? "bg-green-900/30 border border-green-700/50 text-green-300"
            : activeEvent.impact === "bearish"
            ? "bg-red-900/30 border border-red-700/50 text-red-300"
            : "bg-slate-700/50 border border-slate-600 text-slate-300"
        }`}>
          <span className="font-semibold">
            {activeEvent.type === "earnings" && "💰"}
            {activeEvent.type === "fed-speech" && "🏛️"}
            {activeEvent.type === "cpi-report" && "📊"}
            {activeEvent.type === "layoffs" && "📋"}
            {activeEvent.type === "product-launch" && "🚀"}
            {activeEvent.type === "lawsuit" && "⚖️"}
          </span>
          <span>{activeEvent.headline}</span>
          <span className="ml-auto text-[10px] opacity-70">
            {activeEvent.volatilityMultiplier.toFixed(1)}x vol
          </span>
        </div>
      )}
    </div>
  );
}
