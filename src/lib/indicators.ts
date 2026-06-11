import { SMA, RSI, MACD, BollingerBands } from "technicalindicators";
import type { Candle } from "@/types/market";

export interface BollingerBandData {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
}

export interface IndicatorData {
  smaLines: { period: number; values: (number | null)[] }[];
  rsi: (number | null)[];
  macd: { macd: number | null; signal: number | null; histogram: number | null }[];
  bollingerBands: BollingerBandData;
}

/**
 * Computes all indicators from candle close prices.
 * Returns arrays aligned to the candle array (padded with null for warmup periods).
 */
export function computeIndicators(candles: Candle[], maPeriods: number[]): IndicatorData {
  const closes = candles.map((c) => c.close);

  // SMAs for each requested period
  const smaLines = maPeriods.map((period) => {
    if (period > closes.length) {
      return { period, values: Array(closes.length).fill(null) as (number | null)[] };
    }
    const raw = SMA.calculate({ period, values: closes });
    const values: (number | null)[] = [
      ...Array(closes.length - raw.length).fill(null),
      ...raw,
    ];
    return { period, values };
  });

  // RSI 14
  const rsiRaw = RSI.calculate({ period: 14, values: closes });
  const rsi: (number | null)[] = [
    ...Array(closes.length - rsiRaw.length).fill(null),
    ...rsiRaw,
  ];

  // MACD (12, 26, 9)
  const macdRaw = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const macdPadding = closes.length - macdRaw.length;
  const macd = [
    ...Array(macdPadding).fill({ macd: null, signal: null, histogram: null }),
    ...macdRaw.map((m) => ({
      macd: m.MACD ?? null,
      signal: m.signal ?? null,
      histogram: m.histogram ?? null,
    })),
  ];

  // Bollinger Bands (20, 2)
  const bbRaw = BollingerBands.calculate({ period: 20, values: closes, stdDev: 2 });
  const bbPadding = closes.length - bbRaw.length;
  const bollingerBands: BollingerBandData = {
    upper: [
      ...Array(bbPadding).fill(null),
      ...bbRaw.map((b) => b.upper),
    ],
    middle: [
      ...Array(bbPadding).fill(null),
      ...bbRaw.map((b) => b.middle),
    ],
    lower: [
      ...Array(bbPadding).fill(null),
      ...bbRaw.map((b) => b.lower),
    ],
  };

  return { smaLines, rsi, macd, bollingerBands };
}
