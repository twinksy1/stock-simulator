import type { Candle } from "@/types/market";

/**
 * Generates realistic-looking sample intraday data for development.
 * Simulates a full trading day (390 minutes, 9:30 AM - 4:00 PM ET).
 */
export function generateSampleData(
  symbol: string,
  date: string,
  basePrice = 150
): Candle[] {
  const candles: Candle[] = [];
  const marketOpen = new Date(`${date}T09:30:00-04:00`).getTime() / 1000;
  const totalMinutes = 390; // 6.5 hours

  let price = basePrice;

  for (let i = 0; i < totalMinutes; i++) {
    const time = marketOpen + i * 60;

    // Random walk with slight upward bias and volatility clusters
    const volatility = 0.002 + Math.random() * 0.003;
    const drift = (Math.random() - 0.48) * volatility * price;
    const open = price;
    const close = price + drift;
    const high = Math.max(open, close) + Math.random() * volatility * price;
    const low = Math.min(open, close) - Math.random() * volatility * price;
    const volume = Math.floor(50000 + Math.random() * 200000);

    candles.push({
      time,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
    });

    price = close;
  }

  return candles;
}
