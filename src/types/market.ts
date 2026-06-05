export interface Candle {
  time: number; // unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Trade {
  id: string;
  side: "buy" | "sell";
  price: number;
  quantity: number;
  time: number; // sim timestamp
  candleIndex: number;
  plannedStop?: number; // stop-loss price (planning only, not auto-executed)
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
  rMultiple: number | null; // (exit - entry) / (entry - stop), null if no stop
  realizedPnl: number;
}

export interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  plannedStop?: number;
}

export interface RiskSettings {
  maxRiskPercent: number; // max % of account to risk per trade (default 2)
  dailyLossLimitPercent: number; // max daily realized loss as % of starting cash (default 5)
}

export type PlaybackSpeed = 1 | 2 | 5 | 10;

export interface SimSession {
  symbol: string;
  date: string;
  candles: Candle[];
  startBalance: number;
}
