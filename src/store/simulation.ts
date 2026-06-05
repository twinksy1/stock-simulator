import { create } from "zustand";
import type { Candle, Trade, ClosedTrade, Position, PlaybackSpeed, RiskSettings } from "@/types/market";

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
  closedTrades: ClosedTrade[];

  // Risk management
  riskSettings: RiskSettings;
  realizedPnl: number;
  isLockedOut: boolean;

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
  buy: (quantity: number, plannedStop?: number) => boolean;
  sell: (quantity: number) => boolean;
  setRiskSettings: (settings: Partial<RiskSettings>) => void;
  updatePlannedStop: (stop: number | undefined) => void;
  calculateMaxShares: (stopPrice: number) => number;
  reset: () => void;
}

const STARTING_CASH = 10000;

const DEFAULT_RISK_SETTINGS: RiskSettings = {
  maxRiskPercent: 2,
  dailyLossLimitPercent: 5,
};

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
  closedTrades: [],
  riskSettings: DEFAULT_RISK_SETTINGS,
  realizedPnl: 0,
  isLockedOut: false,
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
      closedTrades: [],
      realizedPnl: 0,
      isLockedOut: false,
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

  buy: (quantity, plannedStop?) => {
    const { cash, currentPrice, position, candles, currentIndex, isLockedOut } = get();

    // Block trades if locked out
    if (isLockedOut) return false;

    const cost = currentPrice * quantity;
    if (cost > cash) return false;

    const newPosition: Position = position
      ? {
          ...position,
          quantity: position.quantity + quantity,
          avgPrice:
            (position.avgPrice * position.quantity + cost) /
            (position.quantity + quantity),
          plannedStop: plannedStop ?? position.plannedStop,
        }
      : { symbol: get().symbol, quantity, avgPrice: currentPrice, plannedStop };

    const trade: Trade = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      side: "buy",
      price: currentPrice,
      quantity,
      time: candles[currentIndex]?.time ?? 0,
      candleIndex: currentIndex,
      plannedStop,
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
    return true;
  },

  sell: (quantity) => {
    const { position, cash, currentPrice, candles, currentIndex } = get();
    if (!position || position.quantity < quantity) return false;

    const proceeds = currentPrice * quantity;
    const remaining = position.quantity - quantity;
    const newPosition: Position | null =
      remaining > 0 ? { ...position, quantity: remaining } : null;

    // Calculate realized P&L for this sale
    const tradePnl = (currentPrice - position.avgPrice) * quantity;
    const newRealizedPnl = get().realizedPnl + tradePnl;

    // Record closed trade
    const closedTrade: ClosedTrade = {
      id: `closed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      symbol: get().symbol,
      entryPrice: position.avgPrice,
      exitPrice: currentPrice,
      quantity,
      entryTime: 0, // simplified — would need entry trade lookup for exact time
      exitTime: candles[currentIndex]?.time ?? 0,
      entryCandleIndex: 0,
      exitCandleIndex: currentIndex,
      plannedStop: position.plannedStop,
      rMultiple: position.plannedStop
        ? (currentPrice - position.avgPrice) / (position.avgPrice - position.plannedStop)
        : null,
      realizedPnl: tradePnl,
    };

    const trade: Trade = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      side: "sell",
      price: currentPrice,
      quantity,
      time: candles[currentIndex]?.time ?? 0,
      candleIndex: currentIndex,
    };

    const newCash = cash + proceeds;

    // Check daily loss limit
    const { riskSettings, startingCash } = get();
    const lossLimit = (riskSettings.dailyLossLimitPercent / 100) * startingCash;
    const hitLimit = newRealizedPnl <= -lossLimit;

    set({
      cash: newCash,
      position: newPosition,
      trades: [...get().trades, trade],
      closedTrades: [...get().closedTrades, closedTrade],
      realizedPnl: newRealizedPnl,
      isLockedOut: hitLimit,
      pnl: calculatePnl({
        cash: newCash,
        startingCash: get().startingCash,
        position: newPosition,
        currentPrice,
      }),
    });
    return true;
  },

  setRiskSettings: (settings) => {
    set({ riskSettings: { ...get().riskSettings, ...settings } });
  },

  updatePlannedStop: (stop) => {
    const { position } = get();
    if (!position) return;
    set({ position: { ...position, plannedStop: stop } });
  },

  calculateMaxShares: (stopPrice) => {
    const { currentPrice, cash, startingCash, riskSettings } = get();
    if (stopPrice >= currentPrice) return 0;
    const riskPerShare = currentPrice - stopPrice;
    const maxRiskDollars = (riskSettings.maxRiskPercent / 100) * startingCash;
    const maxFromRisk = Math.floor(maxRiskDollars / riskPerShare);
    const maxFromCash = Math.floor(cash / currentPrice);
    return Math.min(maxFromRisk, maxFromCash);
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
      closedTrades: [],
      riskSettings: DEFAULT_RISK_SETTINGS,
      realizedPnl: 0,
      isLockedOut: false,
      currentPrice: 0,
      pnl: 0,
    });
  },
}));
