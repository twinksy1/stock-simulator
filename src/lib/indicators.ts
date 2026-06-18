import { SMA, EMA, WMA, WEMA, RSI, MACD, BollingerBands } from "technicalindicators";
import type { Candle } from "@/types/market";
import type { MovingAverageConfig } from "@/store/indicators";

/**
 * Computes VWAP with daily resets by detecting day boundaries from candle timestamps.
 * Each new calendar day (ET) resets the cumulative totals.
 */
function computeDailyVWAP(candles: Candle[]): (number | null)[] {
  const result: (number | null)[] = [];
  let cumTypicalPriceVolume = 0;
  let cumVolume = 0;
  let currentDay = -1;

  for (const candle of candles) {
    const d = new Date(candle.time * 1000);
    // Use en-CA locale for YYYY-MM-DD format in Eastern Time
    const etDay = d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    const dayNum = parseInt(etDay.replace(/-/g, ""), 10);

    if (dayNum !== currentDay) {
      cumTypicalPriceVolume = 0;
      cumVolume = 0;
      currentDay = dayNum;
    }

    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumTypicalPriceVolume += typicalPrice * candle.volume;
    cumVolume += candle.volume;

    result.push(cumVolume > 0 ? cumTypicalPriceVolume / cumVolume : null);
  }

  return result;
}

export interface BollingerBandData {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
}

export interface MALineData {
  id: string;
  period: number;
  type: string;
  values: (number | null)[];
}

export interface IndicatorData {
  maLines: MALineData[];
  rsi: (number | null)[];
  macd: { macd: number | null; signal: number | null; histogram: number | null }[];
  bollingerBands: BollingerBandData;
  vwap: (number | null)[];
}

function computeMA(type: string, period: number, values: number[]): number[] {
  if (period > values.length) return [];
  switch (type) {
    case "ema":
      return EMA.calculate({ period, values });
    case "wma":
      return WMA.calculate({ period, values });
    case "wema":
      return WEMA.calculate({ period, values });
    case "sma":
    default:
      return SMA.calculate({ period, values });
  }
}

/**
 * Computes all indicators from candle data.
 * Returns arrays aligned to the candle array (padded with null for warmup periods).
 */
export function computeIndicators(candles: Candle[], maConfigs: MovingAverageConfig[]): IndicatorData {
  const closes = candles.map((c) => c.close);

  // Moving averages (SMA, EMA, WMA, WEMA) for each config
  const maLines: MALineData[] = maConfigs.map((config) => {
    const raw = computeMA(config.type, config.period, closes);
    const values: (number | null)[] = [
      ...Array(closes.length - raw.length).fill(null),
      ...raw,
    ];
    return { id: config.id, period: config.period, type: config.type, values };
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

  // VWAP — resets at each new trading day
  const vwap: (number | null)[] = computeDailyVWAP(candles);

  return { maLines, rsi, macd, bollingerBands, vwap };
}
