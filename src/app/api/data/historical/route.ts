import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

interface YFQuote {
  date: Date;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  adjclose?: number | null;
  volume: number | null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol") ?? "MSFT";
  const interval = searchParams.get("interval") ?? "1d";
  const range = searchParams.get("range") ?? "1y";

  try {
    const result = await yf.chart(symbol, {
      interval: interval as "1d" | "5m" | "15m" | "1h" | "1m" | "2m" | "30m",
      period1: getRangeStart(range),
      period2: new Date(),
    });

    const quotes: YFQuote[] = result?.quotes ?? [];

    if (quotes.length === 0) {
      return NextResponse.json({ error: "No data returned for this symbol/range" }, { status: 404 });
    }

    const candles = quotes
      .filter((q) => q.open != null && q.high != null && q.low != null && q.close != null && q.volume != null)
      .map((q) => ({
        time: Math.floor(new Date(q.date).getTime() / 1000),
        open: round2(q.open!),
        high: round2(q.high!),
        low: round2(q.low!),
        close: round2(q.close!),
        volume: q.volume!,
      }));

    // Include meta info for the client
    const meta = result?.meta
      ? {
          shortName: result.meta.shortName ?? null,
          longName: result.meta.longName ?? null,
          currency: result.meta.currency ?? null,
          exchangeName: result.meta.exchangeName ?? null,
          timezone: result.meta.exchangeTimezoneName ?? null,
          fiftyTwoWeekHigh: result.meta.fiftyTwoWeekHigh ?? null,
          fiftyTwoWeekLow: result.meta.fiftyTwoWeekLow ?? null,
          regularMarketPrice: result.meta.regularMarketPrice ?? null,
          chartPreviousClose: result.meta.chartPreviousClose ?? null,
        }
      : null;

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      interval,
      range,
      count: candles.length,
      candles,
      meta,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Yahoo Finance fetch error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function getRangeStart(range: string): Date {
  const now = new Date();
  // Generic "<N>d" handler (e.g. "8d", "58d", "725d") so new day-ranges
  // never silently fall through to the 1-year default.
  const dayMatch = /^(\d+)d$/.exec(range);
  if (dayMatch) {
    return new Date(now.getTime() - Number(dayMatch[1]) * 86400000);
  }
  switch (range) {
    case "6mo":
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case "1y":
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    case "2y":
      return new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
    case "5y":
      return new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
    case "10y":
      return new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
    case "max":
      return new Date("2000-01-01");
    default:
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }
}
