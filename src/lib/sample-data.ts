import type { Candle, MacroEvent, MarketRegime, CorrelatedSymbol } from "@/types/market";

/**
 * Generates realistic multi-day intraday data with overnight gaps,
 * pre/after-market, regime changes, and macro events.
 */

interface GeneratedSession {
  candles: Candle[];
  events: MacroEvent[];
  regimes: { startIndex: number; regime: MarketRegime }[];
  correlatedSymbols: CorrelatedSymbol[];
}

const MARKET_OPEN_HOUR = 9.5; // 9:30 AM ET
const MARKET_CLOSE_HOUR = 16; // 4:00 PM ET
const PREMARKET_HOUR = 7; // 7:00 AM ET
const AFTERHOURS_HOUR = 18; // 6:00 PM ET

// Macro event templates
const EVENT_TEMPLATES: Omit<MacroEvent, "candleIndex">[] = [
  { type: "earnings", headline: "Earnings beat estimates by 12%", impact: "bullish", volatilityMultiplier: 2.5 },
  { type: "earnings", headline: "Revenue miss, guidance lowered", impact: "bearish", volatilityMultiplier: 3.0 },
  { type: "fed-speech", headline: "Fed signals rate pause", impact: "bullish", volatilityMultiplier: 1.8 },
  { type: "fed-speech", headline: "Hawkish Fed comments spook markets", impact: "bearish", volatilityMultiplier: 2.0 },
  { type: "cpi-report", headline: "CPI comes in hotter than expected", impact: "bearish", volatilityMultiplier: 2.2 },
  { type: "cpi-report", headline: "Inflation cooling, CPI below forecast", impact: "bullish", volatilityMultiplier: 1.8 },
  { type: "layoffs", headline: "Company announces 10% workforce reduction", impact: "bearish", volatilityMultiplier: 1.5 },
  { type: "product-launch", headline: "New product line exceeds pre-order expectations", impact: "bullish", volatilityMultiplier: 1.6 },
  { type: "lawsuit", headline: "Major antitrust lawsuit filed", impact: "bearish", volatilityMultiplier: 1.7 },
];

function classifyRegime(candles: Candle[], startIdx: number, window: number): MarketRegime {
  if (startIdx + window > candles.length) window = candles.length - startIdx;
  if (window < 5) return "choppy";

  const slice = candles.slice(startIdx, startIdx + window);
  const returns = slice.map((c) => (c.close - c.open) / c.open);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const volatility = Math.sqrt(
    returns.reduce((sum, r) => sum + (r - avgReturn) ** 2, 0) / returns.length
  );

  if (volatility > 0.005) return "high-volatility";
  if (volatility < 0.001) return "low-volatility";
  if (avgReturn > 0.001) return "trending-up";
  if (avgReturn < -0.001) return "trending-down";
  return "choppy";
}

function generateOvernightGap(lastClose: number): number {
  // Most gaps are small (0-1%), occasional large gaps (2-5%)
  const isLargeGap = Math.random() < 0.15;
  const magnitude = isLargeGap
    ? 0.02 + Math.random() * 0.03
    : Math.random() * 0.01;
  const direction = Math.random() > 0.5 ? 1 : -1;
  return lastClose * (1 + direction * magnitude);
}

function generateCorrelatedSymbol(
  mainCandles: Candle[],
  symbol: string,
  basePrice: number,
  correlation: number
): CorrelatedSymbol {
  const candles: Candle[] = [];
  let price = basePrice;

  for (let i = 0; i < mainCandles.length; i++) {
    const mainReturn = i > 0
      ? (mainCandles[i].close - mainCandles[i - 1].close) / mainCandles[i - 1].close
      : 0;

    // Correlated move + independent noise
    const correlatedReturn = mainReturn * correlation;
    const noise = (Math.random() - 0.5) * 0.003;
    const totalReturn = correlatedReturn + noise * (1 - Math.abs(correlation));

    const open = price;
    const close = price * (1 + totalReturn);
    const high = Math.max(open, close) * (1 + Math.random() * 0.002);
    const low = Math.min(open, close) * (1 - Math.random() * 0.002);

    candles.push({
      time: mainCandles[i].time,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.floor(30000 + Math.random() * 150000),
    });

    price = close;
  }

  return { symbol, correlation, candles };
}

export function generateMultiDayData(
  symbol: string,
  startDate: string,
  basePrice: number,
  days: number = 5,
  scarcityMode: boolean = false
): GeneratedSession {
  const candles: Candle[] = [];
  const events: MacroEvent[] = [];
  let price = basePrice;
  const startTimestamp = new Date(`${startDate}T00:00:00-04:00`).getTime() / 1000;

  // Decide which days have events (sparse)
  const eventDays = new Set<number>();
  const numEvents = Math.max(1, Math.floor(days * 0.3));
  while (eventDays.size < numEvents) {
    eventDays.add(Math.floor(Math.random() * days));
  }

  for (let day = 0; day < days; day++) {
    const dayTimestamp = startTimestamp + day * 86400;

    // Overnight gap (skip first day)
    if (day > 0) {
      price = generateOvernightGap(price);
    }

    // Determine day character
    const isBoring = scarcityMode ? Math.random() < 0.7 : Math.random() < 0.3;
    const dayVolatility = isBoring ? 0.001 : 0.002 + Math.random() * 0.003;
    const dayDrift = isBoring
      ? (Math.random() - 0.5) * 0.0002
      : (Math.random() - 0.48) * 0.001;

    // Generate event for this day
    let dayEvent: (Omit<MacroEvent, "candleIndex"> & { minuteOffset: number }) | null = null;
    if (eventDays.has(day)) {
      const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
      // Events happen pre-market (before open) or during market hours
      const minuteOffset = Math.random() < 0.4
        ? Math.floor(Math.random() * 60) // pre-market event
        : 150 + Math.floor(Math.random() * 240); // mid-day event
      dayEvent = { ...template, minuteOffset };
    }

    // Pre-market (7:00 AM - 9:30 AM) — 150 minutes, lower volume
    const premarketStart = dayTimestamp + PREMARKET_HOUR * 3600;
    for (let min = 0; min < 150; min++) {
      const time = premarketStart + min * 60;
      const vol = dayVolatility * 0.5; // lower pre-market volatility
      const drift = (Math.random() - 0.5) * vol * price;

      // Apply event impact if it fires in premarket
      let eventBoost = 0;
      if (dayEvent && min === dayEvent.minuteOffset && dayEvent.minuteOffset < 150) {
        const dir = dayEvent.impact === "bullish" ? 1 : dayEvent.impact === "bearish" ? -1 : 0;
        eventBoost = dir * dayEvent.volatilityMultiplier * dayVolatility * price * 3;
        events.push({ ...dayEvent, candleIndex: candles.length });
      }

      const open = price;
      const close = price + drift + eventBoost;
      const high = Math.max(open, close) + Math.random() * vol * price * 0.5;
      const low = Math.min(open, close) - Math.random() * vol * price * 0.5;
      const volume = Math.floor(10000 + Math.random() * 40000);
      const buyRatio = 0.3 + Math.random() * 0.4;

      candles.push({
        time,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume,
        buyVolume: Math.floor(volume * buyRatio),
        sellVolume: Math.floor(volume * (1 - buyRatio)),
      });
      price = close;
    }

    // Regular market hours (9:30 AM - 4:00 PM) — 390 minutes
    const marketStart = dayTimestamp + MARKET_OPEN_HOUR * 3600;
    for (let min = 0; min < 390; min++) {
      const time = marketStart + min * 60;

      // Volume U-shape (high at open/close)
      const normalizedMin = min / 390;
      const volumeMultiplier = 1 + 2 * (Math.pow(normalizedMin - 0.5, 2) * 4);

      const vol = dayVolatility * (1 + (Math.random() < 0.05 ? 3 : 0)); // occasional spikes
      const drift = dayDrift + (Math.random() - 0.5) * vol * price;

      // Event during market hours
      let eventBoost = 0;
      if (dayEvent && (min + 150) === dayEvent.minuteOffset && dayEvent.minuteOffset >= 150) {
        const dir = dayEvent.impact === "bullish" ? 1 : dayEvent.impact === "bearish" ? -1 : 0;
        eventBoost = dir * dayEvent.volatilityMultiplier * dayVolatility * price * 5;
        events.push({ ...dayEvent, candleIndex: candles.length });
      }

      const open = price;
      const close = price + drift + eventBoost;
      const high = Math.max(open, close) + Math.random() * vol * price;
      const low = Math.min(open, close) - Math.random() * vol * price;
      const baseVolume = Math.floor((50000 + Math.random() * 200000) * volumeMultiplier);
      const buyRatio = close >= open ? 0.5 + Math.random() * 0.2 : 0.3 + Math.random() * 0.2;

      candles.push({
        time,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: baseVolume,
        buyVolume: Math.floor(baseVolume * buyRatio),
        sellVolume: Math.floor(baseVolume * (1 - buyRatio)),
      });
      price = close;
    }

    // After-hours (4:00 PM - 6:00 PM) — 120 minutes
    const afterStart = dayTimestamp + MARKET_CLOSE_HOUR * 3600;
    for (let min = 0; min < 120; min++) {
      const time = afterStart + min * 60;
      const vol = dayVolatility * 0.4;
      const drift = (Math.random() - 0.5) * vol * price;

      const open = price;
      const close = price + drift;
      const high = Math.max(open, close) + Math.random() * vol * price * 0.3;
      const low = Math.min(open, close) - Math.random() * vol * price * 0.3;
      const volume = Math.floor(5000 + Math.random() * 20000);
      const buyRatio = 0.3 + Math.random() * 0.4;

      candles.push({
        time,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume,
        buyVolume: Math.floor(volume * buyRatio),
        sellVolume: Math.floor(volume * (1 - buyRatio)),
      });
      price = close;
    }
  }

  // Classify regimes every 50 candles
  const regimes: { startIndex: number; regime: MarketRegime }[] = [];
  for (let i = 0; i < candles.length; i += 50) {
    regimes.push({ startIndex: i, regime: classifyRegime(candles, i, 50) });
  }

  // Generate correlated symbols
  const correlationMap: Record<string, { symbols: string[]; correlations: number[] }> = {
    MSFT: { symbols: ["AAPL", "GOOGL", "QQQ"], correlations: [0.7, 0.65, 0.85] },
    AAPL: { symbols: ["MSFT", "QQQ", "AMZN"], correlations: [0.7, 0.8, 0.5] },
    GOOGL: { symbols: ["META", "MSFT", "QQQ"], correlations: [0.6, 0.65, 0.8] },
    AMZN: { symbols: ["MSFT", "GOOGL", "QQQ"], correlations: [0.5, 0.55, 0.75] },
    TSLA: { symbols: ["NVDA", "QQQ", "ARKK"], correlations: [0.4, 0.5, 0.7] },
    NVDA: { symbols: ["AMD", "QQQ", "MSFT"], correlations: [0.75, 0.7, 0.5] },
    META: { symbols: ["GOOGL", "SNAP", "QQQ"], correlations: [0.6, 0.5, 0.7] },
  };

  const corrConfig = correlationMap[symbol] ?? { symbols: ["SPY", "QQQ"], correlations: [0.6, 0.7] };
  const correlatedSymbols = corrConfig.symbols.map((sym, idx) =>
    generateCorrelatedSymbol(
      candles,
      sym,
      basePrice * (0.5 + Math.random()),
      corrConfig.correlations[idx]
    )
  );

  return { candles, events, regimes, correlatedSymbols };
}

// Keep the simple single-day generator for backward compatibility
export function generateSampleData(
  symbol: string,
  date: string,
  basePrice = 150
): Candle[] {
  return generateMultiDayData(symbol, date, basePrice, 1, false).candles;
}

