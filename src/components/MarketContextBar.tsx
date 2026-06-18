"use client";

import { useSimulationStore } from "@/store/simulation";
import type { MarketRegime } from "@/types/market";

const REGIME_CONFIG: Record<MarketRegime, { label: string; color: string; emoji: string }> = {
  "trending-up": { label: "Trending Up", color: "text-green-400", emoji: "📈" },
  "trending-down": { label: "Trending Down", color: "text-red-400", emoji: "📉" },
  "choppy": { label: "Choppy", color: "text-yellow-400", emoji: "🔀" },
  "low-volatility": { label: "Low Vol", color: "text-slate-400", emoji: "😴" },
  "high-volatility": { label: "High Vol", color: "text-orange-400", emoji: "⚡" },
};

function formatMarketCap(val: number | null): string {
  if (val == null) return "—";
  if (val >= 1e12) return `$${(val / 1e12).toFixed(1)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  return `$${val.toLocaleString()}`;
}

export default function MarketContextBar() {
  const getCurrentRegime = useSimulationStore((s) => s.getCurrentRegime);
  const yahooInsights = useSimulationStore((s) => s.yahooInsights);

  const regime = getCurrentRegime();
  const regimeConfig = REGIME_CONFIG[regime];
  const outlook = yahooInsights?.technicalOutlook;

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

        {/* Yahoo quote context */}
        {yahooInsights?.quote && (
          <>
            <span className="w-px h-4 bg-slate-600" />
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[11px] font-mono text-slate-300">
                {yahooInsights.quote.shortName}
              </span>
              {yahooInsights.quote.marketCap != null && (
                <span className="text-[11px] font-mono text-slate-400">
                  MCap {formatMarketCap(yahooInsights.quote.marketCap)}
                </span>
              )}
              {yahooInsights.quote.trailingPE != null && (
                <span className="text-[11px] font-mono text-slate-400">
                  P/E {yahooInsights.quote.trailingPE.toFixed(1)}
                </span>
              )}
              {yahooInsights.quote.fiftyDayAverage != null && (
                <span className="text-[11px] font-mono text-slate-400">
                  50d ${yahooInsights.quote.fiftyDayAverage.toFixed(2)}
                </span>
              )}
              {yahooInsights.quote.twoHundredDayAverage != null && (
                <span className="text-[11px] font-mono text-slate-400">
                  200d ${yahooInsights.quote.twoHundredDayAverage.toFixed(2)}
                </span>
              )}
              {yahooInsights.quote.fiftyTwoWeekHigh != null && yahooInsights.quote.fiftyTwoWeekLow != null && (
                <span className="text-[11px] font-mono text-slate-400">
                  52w ${yahooInsights.quote.fiftyTwoWeekLow.toFixed(2)}–${yahooInsights.quote.fiftyTwoWeekHigh.toFixed(2)}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Yahoo technical outlook */}
      {outlook && (
        <div className="flex items-center gap-3 flex-wrap text-[11px]">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Yahoo Outlook</span>
          {outlook.shortTermOutlook && (
            <span className={`font-mono ${
              outlook.shortTermOutlook.direction === "Bullish" ? "text-green-400" :
              outlook.shortTermOutlook.direction === "Bearish" ? "text-red-400" : "text-slate-400"
            }`}>
              Short: {outlook.shortTermOutlook.scoreDescription ?? outlook.shortTermOutlook.direction}
            </span>
          )}
          {outlook.intermediateTermOutlook && (
            <span className={`font-mono ${
              outlook.intermediateTermOutlook.direction === "Bullish" ? "text-green-400" :
              outlook.intermediateTermOutlook.direction === "Bearish" ? "text-red-400" : "text-slate-400"
            }`}>
              Mid: {outlook.intermediateTermOutlook.scoreDescription ?? outlook.intermediateTermOutlook.direction}
            </span>
          )}
          {outlook.longTermOutlook && (
            <span className={`font-mono ${
              outlook.longTermOutlook.direction === "Bullish" ? "text-green-400" :
              outlook.longTermOutlook.direction === "Bearish" ? "text-red-400" : "text-slate-400"
            }`}>
              Long: {outlook.longTermOutlook.scoreDescription ?? outlook.longTermOutlook.direction}
            </span>
          )}
        </div>
      )}

      {/* No data placeholder */}
      {!yahooInsights && (
        <div className="text-[11px] text-slate-500">
          Loading market context...
        </div>
      )}
    </div>
  );
}
