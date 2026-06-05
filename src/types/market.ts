export interface Candle {
  time: number; // unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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
  time: number; // sim timestamp
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
}

export type PlaybackSpeed = 1 | 2 | 5 | 10;

export interface SimSession {
  symbol: string;
  date: string;
  candles: Candle[];
  startBalance: number;
}
