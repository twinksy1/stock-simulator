export interface Candle {
  time: number; // unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  buyVolume?: number; // for order flow
  sellVolume?: number;
}

// A higher-timeframe series aligned to the same window as the base trading
// series, used as a display-only overlay (e.g. viewing 5m during a 1m session).
export interface AltTimeframeView {
  interval: string;
  candles: Candle[];
}

export type Confidence = 1 | 2 | 3 | 4 | 5;

export type SetupLabel =
  | "breakout"
  | "breakdown"
  | "pullback"
  | "reversal"
  | "momentum"
  | "mean-reversion"
  | "support-bounce"
  | "resistance-reject"
  | "ma-reclaim"
  | "rsi-divergence"
  | "custom";

export interface TradeJournal {
  thesis?: string;
  confidence?: Confidence;
  setupLabel?: SetupLabel;
  customSetupLabel?: string;
  exitReason?: string;
  postNotes?: string;
}

export interface Trade {
  id: string;
  side: "buy" | "sell";
  price: number;
  quantity: number;
  time: number;
  candleIndex: number;
  plannedStop?: number;
  journal?: TradeJournal;
}

export type MistakeType =
  | "revenge-trade"
  | "overtrading"
  | "fomo-entry"
  | "panic-sell"
  | "moved-stop";

export type MarketRegime = "trending-up" | "trending-down" | "choppy" | "low-volatility" | "high-volatility";

export interface MacroEvent {
  candleIndex: number;
  type: "earnings" | "fed-speech" | "cpi-report" | "layoffs" | "product-launch" | "lawsuit";
  headline: string;
  impact: "bullish" | "bearish" | "neutral";
  volatilityMultiplier: number;
}

export interface ClosedTrade {
  id: string;
  symbol: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  entryTime: number;
  exitTime: number;
  entryCandleIndex: number;
  exitCandleIndex: number;
  plannedStop?: number;
  rMultiple: number | null;
  realizedPnl: number;
  journal?: TradeJournal;
  mistakes: MistakeType[];
  holdDuration: number; // in candles
  regime?: MarketRegime;
}

export interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  plannedStop?: number;
}

export interface RiskSettings {
  maxRiskPercent: number;
  dailyLossLimitPercent: number;
  executionDelayMs: number; // 0 = instant, 500-2000 for realism
  minHoldCandles: number; // minimum candles before selling (0 = instant)
  cooldownCandles: number; // candles before re-entering after a sell (0 = none)
  spreadBps: number; // bid/ask spread in basis points (e.g. 10 = 0.1%)
  commissionPerTrade: number; // flat fee per trade in dollars (e.g. 0.65)
}

export interface CorrelatedSymbol {
  symbol: string;
  correlation: number; // -1 to 1
  candles: Candle[];
}

export interface SessionScore {
  patienceScore: number; // 0-100, penalizes overtrading
  riskScore: number; // 0-100, rewards proper sizing
  journalScore: number; // 0-100, rewards documenting trades
  overallGrade: "A" | "B" | "C" | "D" | "F";
}

// Pre-session and post-session reflection types
export type ReflectionRegime =
  | "uptrend"
  | "downtrend"
  | "range"
  | "chop"
  | "low-vol-drift"
  | "high-vol-expansion";

export type ReflectionStrategy =
  | "mean-reversion"
  | "trend-pullback"
  | "breakout"
  | "avoid-observe";

export type EntrySignal =
  | "wick-rejection"
  | "liquidity-sweep"
  | "reclaim"
  | "divergence";

export type AvoidItem =
  | "trading-against-trend"
  | "trading-without-confirmation"
  | "trading-in-chop"
  | "entering-early";

export interface PreSessionReflection {
  predictedRegime: ReflectionRegime;
  strategy: ReflectionStrategy;
  entrySignals: EntrySignal[];
  avoidItems: AvoidItem[];
}

export type StrategyAlignment = "yes" | "no" | "partially";

export interface PostSessionReflection {
  actualRegime: ReflectionRegime;
  strategyAlignment: StrategyAlignment;
  matchedTradeIds: string[];
  violatedTradeIds: string[];
  lessonsLearned: string;
  nextTimeDifferent: string;
}

export type PlaybackSpeed = 1 | 2 | 5 | 10;

export interface YahooInsights {
  regime: MarketRegime;
  technicalOutlook: {
    shortTermOutlook?: { direction: string; score: number; scoreDescription: string; stateDescription: string };
    intermediateTermOutlook?: { direction: string; score: number; scoreDescription: string; stateDescription: string };
    longTermOutlook?: { direction: string; score: number; scoreDescription: string; stateDescription: string };
  } | null;
  recommendation: { rating: string; targetPrice: number } | null;
  quote: {
    marketCap: number | null;
    trailingPE: number | null;
    forwardPE: number | null;
    fiftyDayAverage: number | null;
    twoHundredDayAverage: number | null;
    fiftyTwoWeekHigh: number | null;
    fiftyTwoWeekLow: number | null;
    averageVolume: number | null;
    shortName: string;
  } | null;
}

export interface SimSession {
  symbol: string;
  date: string;
  candles: Candle[];
  startBalance: number;
}
