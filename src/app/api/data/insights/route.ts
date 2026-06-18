import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol") ?? "MSFT";

  try {
    const [insights, quote] = await Promise.allSettled([
      yf.insights(symbol),
      yf.quote(symbol),
    ]);

    const insightsData = insights.status === "fulfilled" ? insights.value : null;
    const quoteData = quote.status === "fulfilled" ? quote.value : null;

    // Extract technical outlook from Yahoo insights
    const technicalOutlook = insightsData?.instrumentInfo?.technicalEvents ?? null;
    const recommendation = insightsData?.recommendation ?? null;

    // Extract key quote fields for context
    const quoteContext = quoteData
      ? {
          marketCap: quoteData.marketCap ?? null,
          trailingPE: quoteData.trailingPE ?? null,
          forwardPE: quoteData.forwardPE ?? null,
          fiftyDayAverage: quoteData.fiftyDayAverage ?? null,
          twoHundredDayAverage: quoteData.twoHundredDayAverage ?? null,
          fiftyTwoWeekHigh: quoteData.fiftyTwoWeekHigh ?? null,
          fiftyTwoWeekLow: quoteData.fiftyTwoWeekLow ?? null,
          averageVolume: quoteData.averageDailyVolume3Month ?? null,
          shortName: quoteData.shortName ?? symbol,
        }
      : null;

    // Derive a simple regime from technicalOutlook
    let regime: string = "choppy";
    if (technicalOutlook) {
      const shortTerm = technicalOutlook.shortTermOutlook?.direction;
      const midTerm = technicalOutlook.intermediateTermOutlook?.direction;
      if (shortTerm === "Bullish" && midTerm === "Bullish") regime = "trending-up";
      else if (shortTerm === "Bearish" && midTerm === "Bearish") regime = "trending-down";
      else if (shortTerm === "Bullish" || midTerm === "Bullish") regime = "trending-up";
      else if (shortTerm === "Bearish" || midTerm === "Bearish") regime = "trending-down";
      else regime = "choppy";
    }

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      regime,
      technicalOutlook,
      recommendation,
      quote: quoteContext,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Yahoo insights fetch error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
