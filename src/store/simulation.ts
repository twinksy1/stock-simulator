import { create } from "zustand";
import type { Candle, Trade, Position, PlaybackSpeed } from "@/types/market";

interface SimulationState {
  // Session
  symbol: string;
  date: string;
  candles: Candle[];
  currentIndex: number;

  // Playback
  isPlaying: boolean;
  speed: PlaybackSpeed;

  // Trading
  cash: number;
  startingCash: number;
  position: Position | null;
  trades: Trade[];

  // Computed
  currentPrice: number;
  pnl: number;

  // Actions
  loadSession: (symbol: string, date: string, candles: Candle[]) => void;
  tick: () => void;
  play: () => void;
  pause: () => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  jumpTo: (index: number) => void;
  buy: (quantity: number) => void;
  sell: (quantity: number) => void;
  reset: () => void;
}

const STARTING_CASH = 10000;

function calculatePnl(state: {
  cash: number;
  startingCash: number;
  position: Position | null;
  currentPrice: number;
}): number {
  const positionValue = state.position
    ? state.position.quantity * state.currentPrice
    : 0;
  return state.cash + positionValue - state.startingCash;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  symbol: "",
  date: "",
  candles: [],
  currentIndex: 0,
  isPlaying: false,
  speed: 1,
  cash: STARTING_CASH,
  startingCash: STARTING_CASH,
  position: null,
  trades: [],
  currentPrice: 0,
  pnl: 0,

  loadSession: (symbol, date, candles) => {
    set({
      symbol,
      date,
      candles,
      currentIndex: 0,
      isPlaying: false,
      speed: 1,
      cash: STARTING_CASH,
      startingCash: STARTING_CASH,
      position: null,
      trades: [],
      currentPrice: candles.length > 0 ? candles[0].close : 0,
      pnl: 0,
    });
  },

  tick: () => {
    const { candles, currentIndex, isPlaying } = get();
    if (!isPlaying || currentIndex >= candles.length - 1) {
      if (currentIndex >= candles.length - 1) set({ isPlaying: false });
      return;
    }
    const nextIndex = currentIndex + 1;
    const price = candles[nextIndex].close;
    const state = get();
    const newState = { ...state, currentIndex: nextIndex, currentPrice: price };
    set({
      currentIndex: nextIndex,
      currentPrice: price,
      pnl: calculatePnl(newState),
    });
  },

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  setSpeed: (speed) => set({ speed }),

  jumpTo: (index) => {
    const { candles } = get();
    const clamped = Math.max(0, Math.min(index, candles.length - 1));
    const price = candles[clamped].close;
    const state = get();
    const newState = { ...state, currentIndex: clamped, currentPrice: price };
    set({
      currentIndex: clamped,
      currentPrice: price,
      pnl: calculatePnl(newState),
    });
  },

  buy: (quantity) => {
    const { cash, currentPrice, position, candles, currentIndex } = get();
    const cost = currentPrice * quantity;
    if (cost > cash) return; // insufficient funds

    const newPosition: Position = position
      ? {
          ...position,
          quantity: position.quantity + quantity,
          avgPrice:
            (position.avgPrice * position.quantity + cost) /
            (position.quantity + quantity),
        }
      : { symbol: get().symbol, quantity, avgPrice: currentPrice };

    const trade: Trade = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      side: "buy",
      price: currentPrice,
      quantity,
      time: candles[currentIndex]?.time ?? 0,
    };

    const newCash = cash - cost;
    set({
      cash: newCash,
      position: newPosition,
      trades: [...get().trades, trade],
      pnl: calculatePnl({
        cash: newCash,
        startingCash: get().startingCash,
        position: newPosition,
        currentPrice,
      }),
    });
  },

  sell: (quantity) => {
    const { position, cash, currentPrice, candles, currentIndex } = get();
    if (!position || position.quantity < quantity) return; // nothing to sell

    const proceeds = currentPrice * quantity;
    const remaining = position.quantity - quantity;
    const newPosition: Position | null =
      remaining > 0 ? { ...position, quantity: remaining } : null;

    const trade: Trade = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      side: "sell",
      price: currentPrice,
      quantity,
      time: candles[currentIndex]?.time ?? 0,
    };

    const newCash = cash + proceeds;
    set({
      cash: newCash,
      position: newPosition,
      trades: [...get().trades, trade],
      pnl: calculatePnl({
        cash: newCash,
        startingCash: get().startingCash,
        position: newPosition,
        currentPrice,
      }),
    });
  },

  reset: () => {
    set({
      symbol: "",
      date: "",
      candles: [],
      currentIndex: 0,
      isPlaying: false,
      speed: 1,
      cash: STARTING_CASH,
      startingCash: STARTING_CASH,
      position: null,
      trades: [],
      currentPrice: 0,
      pnl: 0,
    });
  },
}));
