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
}

export interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
}

export type PlaybackSpeed = 1 | 2 | 5 | 10;

export interface SimSession {
  symbol: string;
  date: string;
  candles: Candle[];
  startBalance: number;
}
