"use client";

import { useSimulationStore } from "@/store/simulation";

export default function OrderFlowPanel() {
  const candles = useSimulationStore((s) => s.candles);
  const currentIndex = useSimulationStore((s) => s.currentIndex);

  if (candles.length === 0 || currentIndex === 0) return null;

  // Look at last 20 candles for order flow analysis
  const lookback = 20;
  const start = Math.max(0, currentIndex - lookback);
  const recentCandles = candles.slice(start, currentIndex + 1);

  // Aggregate buy/sell volume
  const totalBuyVol = recentCandles.reduce((sum, c) => sum + (c.buyVolume ?? c.volume * 0.5), 0);
  const totalSellVol = recentCandles.reduce((sum, c) => sum + (c.sellVolume ?? c.volume * 0.5), 0);
  const totalVol = totalBuyVol + totalSellVol;
  const buyPct = totalVol > 0 ? (totalBuyVol / totalVol) * 100 : 50;

  // Detect absorption: high volume but little price movement
  const priceRange = Math.abs(recentCandles[recentCandles.length - 1].close - recentCandles[0].open);
  const avgVolume = totalVol / recentCandles.length;
  const normalizedRange = priceRange / recentCandles[0].open;
  const isAbsorption = avgVolume > 100000 && normalizedRange < 0.003;

  // Detect aggressive selling/buying: volume spike + directional
  const lastFew = recentCandles.slice(-5);
  const recentSellRatio = lastFew.reduce((sum, c) => sum + (c.sellVolume ?? c.volume * 0.5), 0) /
    lastFew.reduce((sum, c) => sum + c.volume, 0);
  const recentBuyRatio = 1 - recentSellRatio;

  const isAggressiveSelling = recentSellRatio > 0.65;
  const isAggressiveBuying = recentBuyRatio > 0.65;

  // Volume spike detection
  const avgVol20 = recentCandles.reduce((s, c) => s + c.volume, 0) / recentCandles.length;
  const currentVol = candles[currentIndex].volume;
  const isVolumeSpike = currentVol > avgVol20 * 2;

  // Last 10 candles for visual bars
  const barCandles = recentCandles.slice(-10);

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

      {/* Buy/Sell pressure bar */}
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

      {/* Volume bars (last 10 candles) */}
      <div className="flex items-end gap-0.5 h-12 mb-2">
        {barCandles.map((c, i) => {
          const maxVol = Math.max(...barCandles.map((b) => b.volume));
          const height = maxVol > 0 ? (c.volume / maxVol) * 100 : 0;
          const buyRatio = c.buyVolume ? c.buyVolume / c.volume : 0.5;
          return (
            <div key={i} className="flex-1 flex flex-col justify-end" style={{ height: "100%" }}>
              <div
                className="w-full rounded-t-sm relative overflow-hidden"
                style={{ height: `${height}%` }}
              >
                <div
                  className="absolute bottom-0 w-full bg-green-500/60"
                  style={{ height: `${buyRatio * 100}%` }}
                />
                <div
                  className="absolute top-0 w-full bg-red-500/60"
                  style={{ height: `${(1 - buyRatio) * 100}%` }}
                />
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
