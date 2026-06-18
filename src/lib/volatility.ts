import type { Candle } from "@/types/market";

export type VolatilityMode = "any" | "calm" | "wild";

/**
 * Compute normalized Average True Range for a window of candles.
 * Returns ATR as a percentage of average close price.
 */
function computeNormalizedATR(candles: Candle[]): number {
  if (candles.length < 2) return 0;

  let trSum = 0;
  let closeSum = 0;

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    // True Range = max(high-low, |high-prevClose|, |low-prevClose|)
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trSum += tr;
    closeSum += candles[i].close;
  }

  const avgClose = closeSum / (candles.length - 1);
  const atr = trSum / (candles.length - 1);
  return avgClose > 0 ? (atr / avgClose) * 100 : 0; // percentage
}

interface ScoredWindow {
  startIndex: number;
  volatility: number;
}

/**
 * Find candidate window start positions filtered by volatility mode.
 * Samples ~30 evenly-spaced windows, ranks by ATR, returns the
 * appropriate third based on mode.
 */
export function findWindowsByVolatility(
  allCandles: Candle[],
  windowSize: number,
  mode: VolatilityMode,
  sampleCount = 30,
): number[] {
  const maxStart = allCandles.length - windowSize;
  if (maxStart <= 0) return [0];

  // If "any", return all positions (no filtering needed)
  if (mode === "any") {
    const positions: number[] = [];
    for (let i = 0; i <= maxStart; i++) positions.push(i);
    return positions;
  }

  // Sample evenly-spaced windows
  const step = Math.max(1, Math.floor(maxStart / sampleCount));
  const samples: ScoredWindow[] = [];

  for (let i = 0; i <= maxStart; i += step) {
    const window = allCandles.slice(i, i + Math.min(windowSize, 200)); // Cap computation at 200 candles for speed
    samples.push({ startIndex: i, volatility: computeNormalizedATR(window) });
  }

  samples.sort((a, b) => a.volatility - b.volatility);

  const thirdSize = Math.max(1, Math.ceil(samples.length / 3));

  if (mode === "calm") {
    return samples.slice(0, thirdSize).map((s) => s.startIndex);
  } else {
    // "wild"
    return samples.slice(-thirdSize).map((s) => s.startIndex);
  }
}
