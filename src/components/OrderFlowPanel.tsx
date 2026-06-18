"use client";

import { useMemo } from "react";
import { useSimulationStore } from "@/store/simulation";

export default function OrderFlowPanel() {
  const candles = useSimulationStore((s) => s.candles);
  const currentIndex = useSimulationStore((s) => s.currentIndex);

  const analysis = useMemo(() => {
    if (candles.length === 0 || currentIndex === 0) return null;

    const lookback = 20;
    const start = Math.max(0, currentIndex - lookback);
    const recentCandles = candles.slice(start, currentIndex + 1);

    // Detect if buy/sell volume data is available (real data lacks it)
    const hasOrderFlow = recentCandles.some((c) => c.buyVolume != null && c.sellVolume != null);

    const totalBuyVol = recentCandles.reduce((sum, c) => sum + (c.buyVolume ?? 0), 0);
    const totalSellVol = recentCandles.reduce((sum, c) => sum + (c.sellVolume ?? 0), 0);
    const totalVol = hasOrderFlow ? totalBuyVol + totalSellVol : recentCandles.reduce((sum, c) => sum + c.volume, 0);
    const buyPct = hasOrderFlow && totalVol > 0 ? (totalBuyVol / totalVol) * 100 : 50;

    const priceRange = Math.abs(recentCandles[recentCandles.length - 1].close - recentCandles[0].open);
    const avgVolume = totalVol / recentCandles.length;
    const normalizedRange = priceRange / recentCandles[0].open;
    const isAbsorption = hasOrderFlow && avgVolume > 100000 && normalizedRange < 0.003;

    const lastFew = recentCandles.slice(-5);
    const recentSellRatio = hasOrderFlow
      ? lastFew.reduce((sum, c) => sum + (c.sellVolume ?? 0), 0) /
        lastFew.reduce((sum, c) => sum + c.volume, 0)
      : 0.5;
    const recentBuyRatio = 1 - recentSellRatio;

    const isAggressiveSelling = hasOrderFlow && recentSellRatio > 0.65;
    const isAggressiveBuying = hasOrderFlow && recentBuyRatio > 0.65;

    const avgVol20 = recentCandles.reduce((s, c) => s + c.volume, 0) / recentCandles.length;
    const currentVol = candles[currentIndex].volume;
    const isVolumeSpike = currentVol > avgVol20 * 2;

    const barCandles = recentCandles.slice(-10);

    return { totalBuyVol, totalSellVol, buyPct, isAbsorption, isAggressiveSelling, isAggressiveBuying, isVolumeSpike, barCandles, hasOrderFlow };
  }, [candles, currentIndex]);

  if (!analysis) return null;

  const { totalBuyVol, totalSellVol, buyPct, isAbsorption, isAggressiveSelling, isAggressiveBuying, isVolumeSpike, barCandles, hasOrderFlow } = analysis;

  return (
    <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
          Order Flow
        </span>
        {isVolumeSpike && (
          <span className="text-[10px] bg-yellow-900/50 text-yellow-300 px-1.5 py-0.5 rounded border border-yellow-700/50">
            🔥 Vol Spike
          </span>
        )}
      </div>

      {!hasOrderFlow && (
        <div className="text-[11px] text-slate-500 bg-slate-700/40 rounded px-2 py-1.5 mb-2 border border-slate-600/50">
          ℹ️ Buy/sell volume split not available for real market data. Volume bars show total volume only.
        </div>
      )}

      {/* Buy/Sell pressure bar — only shown when order flow data is available */}
      {hasOrderFlow && (
      <div className="mb-2">
        <div className="flex justify-between text-[10px] mb-0.5">
          <span className="text-green-400">Buy {buyPct.toFixed(0)}%</span>
          <span className="text-red-400">Sell {(100 - buyPct).toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-red-600/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500/70 rounded-l-full transition-all"
            style={{ width: `${buyPct}%` }}
          />
        </div>
      </div>
      )}

      {/* Volume bars (last 10 candles) */}
      <div className="flex items-end gap-0.5 h-12 mb-2">
        {barCandles.map((c, i) => {
          const maxVol = Math.max(...barCandles.map((b) => b.volume));
          const height = maxVol > 0 ? (c.volume / maxVol) * 100 : 0;
          const buyRatio = hasOrderFlow && c.buyVolume != null ? c.buyVolume / c.volume : null;
          return (
            <div key={i} className="flex-1 flex flex-col justify-end" style={{ height: "100%" }}>
              <div
                className="w-full rounded-t-sm relative overflow-hidden"
                style={{ height: `${height}%` }}
              >
                {buyRatio !== null ? (
                  <>
                    <div
                      className="absolute bottom-0 w-full bg-green-500/60"
                      style={{ height: `${buyRatio * 100}%` }}
                    />
                    <div
                      className="absolute top-0 w-full bg-red-500/60"
                      style={{ height: `${(1 - buyRatio) * 100}%` }}
                    />
                  </>
                ) : (
                  <div
                    className={`absolute inset-0 ${c.close >= c.open ? "bg-green-500/40" : "bg-red-500/40"}`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Signals */}
      <div className="space-y-1 text-[11px]">
        {isAbsorption && (
          <div className="flex items-center gap-1.5 text-cyan-400">
            <span>🛡️</span>
            <span>Buy absorption detected — high volume, low movement</span>
          </div>
        )}
        {isAggressiveSelling && (
          <div className="flex items-center gap-1.5 text-red-400">
            <span>🔻</span>
            <span>Aggressive selling — sellers dominating</span>
          </div>
        )}
        {isAggressiveBuying && !isAbsorption && (
          <div className="flex items-center gap-1.5 text-green-400">
            <span>🔺</span>
            <span>Aggressive buying — buyers in control</span>
          </div>
        )}
        {!isAbsorption && !isAggressiveSelling && !isAggressiveBuying && (
          <div className="text-slate-500">
            Balanced flow — no strong signal
          </div>
        )}
      </div>
    </div>
  );
}
