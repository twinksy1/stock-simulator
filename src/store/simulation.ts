import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Candle,
  Trade,
  ClosedTrade,
  Position,
  PlaybackSpeed,
  RiskSettings,
  TradeJournal,
  MistakeType,
  MarketRegime,
  SessionScore,
  PreSessionReflection,
  PostSessionReflection,
  YahooInsights,
} from "@/types/market";

interface SimulationState {
  symbol: string;
  date: string;
  candles: Candle[];
  currentIndex: number;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  cash: number;
  startingCash: number;
  position: Position | null;
  trades: Trade[];
  closedTrades: ClosedTrade[];
  riskSettings: RiskSettings;
  realizedPnl: number;
  isLockedOut: boolean;
  isPendingExecution: boolean;
  regimes: { startIndex: number; regime: MarketRegime }[];
  currentPrice: number;
  pnl: number;
  contextEndIndex: number;
  isStudyPhase: boolean;
  // Dual-timeframe: higher-TF context for study, separate trading candles
  contextCandles: Candle[];
  contextInterval: string;
  tradingCandlesStored: Candle[];
  tradingStartOffset: number; // Where live trading begins within tradingCandlesStored (lookback before this)
  // Micro-tick noise
  microNoiseEnabled: boolean;
  microTicksPerCandle: number;
  microTickCount: number;
  microPath: number[];

  // Pre/Post session reflection
  showPreSession: boolean;
  showPostSession: boolean;
  preSessionReflection: PreSessionReflection | null;
  postSessionReflection: PostSessionReflection | null;
  sessionEnded: boolean;

  // Yahoo insights for real data sessions
  yahooInsights: YahooInsights | null;

  loadSession: (
    symbol: string,
    date: string,
    candles: Candle[],
    contextEndIndex?: number,
    startBalance?: number,
    contextCandles?: Candle[],
    contextInterval?: string,
    tradingStartOffset?: number
  ) => void;
  goLive: () => void;
  tick: () => void;
  play: () => void;
  pause: () => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  jumpTo: (index: number) => void;
  buy: (quantity: number, plannedStop?: number, journal?: TradeJournal) => boolean;
  sell: (quantity: number, journal?: TradeJournal) => boolean;
  setRiskSettings: (settings: Partial<RiskSettings>) => void;
  updatePlannedStop: (stop: number | undefined) => void;
  calculateMaxShares: (stopPrice: number) => number;
  setMicroNoise: (enabled: boolean, ticksPerCandle?: number) => void;
  submitPreSession: (reflection: PreSessionReflection) => void;
  submitPostSession: (reflection: PostSessionReflection) => void;
  dismissPostSession: () => void;
  setYahooInsights: (insights: YahooInsights) => void;
  getSessionScore: () => SessionScore;
  getCurrentRegime: () => MarketRegime;
  reset: () => void;
}

const STARTING_CASH = 70000;

const DEFAULT_RISK_SETTINGS: RiskSettings = {
  maxRiskPercent: 2,
  dailyLossLimitPercent: 5,
  executionDelayMs: 500,
  minHoldCandles: 3,
  cooldownCandles: 5,
  spreadBps: 10, // 0.1% spread
  commissionPerTrade: 0.65,
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

// Auto stop-loss: triggers only on candle close price
function checkAutoStopLoss(get: () => SimulationState, set: (partial: Partial<SimulationState>) => void) {
  const s = get();
  if (!s.position || !s.position.plannedStop || s.isStudyPhase || s.isPendingExecution) return;

  // Use the finalized candle close price, not micro-tick noise
  const candle = s.candles[s.currentIndex];
  if (!candle) return;
  const price = candle.close;
  const stop = s.position.plannedStop;

  // For long positions: trigger if candle close drops to or below stop
  if (price > stop) return;

  const quantity = s.position.quantity;
  const spreadMultiplier = 1 - (s.riskSettings.spreadBps / 10000);
  // Execute at stop price (or current price if it gapped below)
  const execPrice = Math.min(price, stop) * spreadMultiplier;
  const proceeds = execPrice * quantity - s.riskSettings.commissionPerTrade;
  const tradePnl = (execPrice - s.position.avgPrice) * quantity - (s.riskSettings.commissionPerTrade * 2);
  const newRealizedPnl = s.realizedPnl + tradePnl;

  const entryTrades = s.trades.filter((t) => t.side === "buy");
  const lastEntry = entryTrades[entryTrades.length - 1];

  const closedTrade: ClosedTrade = {
    id: `closed-sl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    symbol: s.symbol,
    entryPrice: s.position.avgPrice,
    exitPrice: execPrice,
    quantity,
    entryTime: lastEntry?.time ?? 0,
    exitTime: s.candles[s.currentIndex]?.time ?? 0,
    entryCandleIndex: lastEntry?.candleIndex ?? 0,
    exitCandleIndex: s.currentIndex,
    plannedStop: s.position.plannedStop,
    rMultiple: (execPrice - s.position.avgPrice) / (s.position.avgPrice - stop),
    realizedPnl: tradePnl,
    journal: { exitReason: "Auto stop-loss triggered" },
    mistakes: [],
    holdDuration: s.currentIndex - (lastEntry?.candleIndex ?? 0),
    regime: s.regimes.length > 0 ? s.regimes.reduce((c, r) => r.startIndex <= s.currentIndex ? r : c, s.regimes[0]).regime : undefined,
  };

  const trade: Trade = {
    id: `${Date.now()}-sl-${Math.random().toString(36).slice(2, 8)}`,
    side: "sell",
    price: execPrice,
    quantity,
    time: s.candles[s.currentIndex]?.time ?? 0,
    candleIndex: s.currentIndex,
    journal: { exitReason: "Auto stop-loss triggered" },
  };

  const newCash = s.cash + proceeds;
  const lossLimit = (s.riskSettings.dailyLossLimitPercent / 100) * s.startingCash;

  set({
    cash: newCash,
    position: null,
    trades: [...s.trades, trade],
    closedTrades: [...s.closedTrades, closedTrade],
    realizedPnl: newRealizedPnl,
    isLockedOut: newRealizedPnl <= -lossLimit,
    isPendingExecution: false,
    pnl: calculatePnl({ cash: newCash, startingCash: s.startingCash, position: null, currentPrice: s.currentPrice }),
  });
}

function isMarketHours(candles: Candle[], currentIndex: number): boolean {
  const candle = candles[currentIndex];
  if (!candle) return false;
  const d = new Date(candle.time * 1000);
  // Use Eastern Time for market hours check
  const etTime = d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" });
  const [h, m] = etTime.split(":").map(Number);
  const hours = h + m / 60;
  return hours >= 9.5 && hours < 16; // 9:30 AM to 4:00 PM ET
}

// Generate a realistic micro-price path within a candle's OHLC range
// Uses a random walk that starts at open, must hit high & low, and ends at close
function generateMicroPath(candle: Candle, steps: number): number[] {
  const { open, high, low, close } = candle;
  const path: number[] = [];
  const range = high - low;

  if (range === 0 || steps <= 1) {
    // Flat candle — just interpolate open to close with tiny noise
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      path.push(open + (close - open) * t + (Math.random() - 0.5) * 0.01);
    }
    return path;
  }

  // Decide where in the sequence high and low are hit
  // If bullish (close > open): tend to hit low first, then high
  // If bearish (close < open): tend to hit high first, then low
  const isBullish = close >= open;
  const firstExtreme = isBullish ? Math.floor(steps * (0.1 + Math.random() * 0.3)) : Math.floor(steps * (0.1 + Math.random() * 0.3));
  const secondExtreme = Math.floor(steps * (0.5 + Math.random() * 0.35));

  const lowStep = isBullish ? firstExtreme : secondExtreme;
  const highStep = isBullish ? secondExtreme : firstExtreme;

  // Build path with key waypoints: open → low/high → high/low → close
  for (let i = 0; i < steps; i++) {
    let target: number;
    if (i === 0) {
      target = open;
    } else if (i <= Math.min(lowStep, highStep)) {
      // Moving toward first extreme
      const t = i / Math.min(lowStep, highStep);
      const dest = lowStep < highStep ? low : high;
      target = open + (dest - open) * t;
    } else if (i <= Math.max(lowStep, highStep)) {
      // Moving toward second extreme
      const from = lowStep < highStep ? low : high;
      const dest = lowStep < highStep ? high : low;
      const t = (i - Math.min(lowStep, highStep)) / (Math.max(lowStep, highStep) - Math.min(lowStep, highStep));
      target = from + (dest - from) * t;
    } else {
      // Moving toward close
      const from = lowStep > highStep ? low : high;
      const t = (i - Math.max(lowStep, highStep)) / (steps - 1 - Math.max(lowStep, highStep));
      target = from + (close - from) * t;
    }

    // Add micro noise (jitter within ±0.3% of range)
    const noise = (Math.random() - 0.5) * range * 0.3;
    const noisy = Math.max(low - range * 0.05, Math.min(high + range * 0.05, target + noise));
    path.push(parseFloat(noisy.toFixed(2)));
  }

  // Ensure last step is exactly close
  path[steps - 1] = close;
  return path;
}

function detectMistakes(
  trades: Trade[],
  closedTrades: ClosedTrade[],
  currentCandleIndex: number,
  side: "buy" | "sell",
  candles: Candle[]
): MistakeType[] {
  const mistakes: MistakeType[] = [];

  if (side === "buy") {
    const lastClosed = closedTrades[closedTrades.length - 1];
    if (lastClosed && lastClosed.realizedPnl < 0 && currentCandleIndex - lastClosed.exitCandleIndex <= 3) {
      mistakes.push("revenge-trade");
    }
    if (currentCandleIndex >= 3) {
      let consecutiveGreen = 0;
      for (let i = currentCandleIndex; i > Math.max(0, currentCandleIndex - 5); i--) {
        if (candles[i].close > candles[i].open) consecutiveGreen++;
        else break;
      }
      if (consecutiveGreen >= 3) mistakes.push("fomo-entry");
    }
    const recentTrades = trades.filter((t) => currentCandleIndex - t.candleIndex <= 5);
    if (recentTrades.length >= 3) mistakes.push("overtrading");
  }

  if (side === "sell") {
    if (currentCandleIndex > 0) {
      const candle = candles[currentCandleIndex];
      const pctChange = (candle.close - candle.open) / candle.open;
      if (pctChange < -0.008) mistakes.push("panic-sell");
    }
  }

  return mistakes;
}

function calculateSessionScore(trades: Trade[], closedTrades: ClosedTrade[], currentIndex: number): SessionScore {
  const tradeDensity = currentIndex > 0 ? trades.length / (currentIndex / 30) : 0;
  const patienceScore = Math.max(0, Math.min(100, 100 - (tradeDensity - 1) * 30));

  const buyTrades = trades.filter((t) => t.side === "buy");
  const tradesWithStops = buyTrades.filter((t) => t.plannedStop);
  const riskScore = buyTrades.length > 0 ? Math.min(100, (tradesWithStops.length / buyTrades.length) * 100) : 100;

  const journaledTrades = trades.filter((t) => t.journal?.thesis || t.journal?.exitReason);
  const journalScore = trades.length > 0 ? Math.min(100, (journaledTrades.length / trades.length) * 100) : 100;

  const avg = (patienceScore + riskScore + journalScore) / 3;
  const overallGrade: SessionScore["overallGrade"] =
    avg >= 90 ? "A" : avg >= 75 ? "B" : avg >= 60 ? "C" : avg >= 40 ? "D" : "F";

  return { patienceScore, riskScore, journalScore, overallGrade };
}

export const useSimulationStore = create<SimulationState>()(persist((set, get) => ({
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
  isPendingExecution: false,
  regimes: [],
  currentPrice: 0,
  pnl: 0,
  contextEndIndex: 0,
  isStudyPhase: false,
  contextCandles: [],
  contextInterval: "",
  tradingCandlesStored: [],
  tradingStartOffset: 0,
  microNoiseEnabled: true,
  microTicksPerCandle: 8,
  microTickCount: 0,
  microPath: [],
  showPreSession: false,
  showPostSession: false,
  preSessionReflection: null,
  postSessionReflection: null,
  sessionEnded: false,
  yahooInsights: null,

  loadSession: (symbol, date, candles, contextEndIndex = 0, startBalance, contextCandles, contextInterval, tradingStartOffset = 0) => {
    const balance = startBalance ?? STARTING_CASH;

    if (contextCandles && contextCandles.length > 0) {
      // Dual-TF mode: show higher-TF context during study, store trading candles for swap on go-live
      const startIdx = contextCandles.length - 1;
      set({
        symbol, date,
        candles: contextCandles,
        contextCandles,
        contextInterval: contextInterval || date,
        tradingCandlesStored: candles,
        tradingStartOffset,
        currentIndex: startIdx,
        isPlaying: false, speed: 1,
        cash: balance, startingCash: balance, position: null,
        trades: [], closedTrades: [], realizedPnl: 0, isLockedOut: false,
        isPendingExecution: false, regimes: [],
        currentPrice: contextCandles[startIdx].close, pnl: 0,
        contextEndIndex: startIdx,
        isStudyPhase: true,
        yahooInsights: null,
      });
    } else {
      // Single-TF mode (1d or fallback): study + trading on same candle series
      const startIndex = contextEndIndex > 0 ? contextEndIndex : Math.min(50, Math.max(0, candles.length - 1));
      set({
        symbol, date, candles,
        contextCandles: [],
        contextInterval: "",
        tradingCandlesStored: [],
        tradingStartOffset: 0,
        currentIndex: startIndex, isPlaying: false, speed: 1,
        cash: balance, startingCash: balance, position: null,
        trades: [], closedTrades: [], realizedPnl: 0, isLockedOut: false,
        isPendingExecution: false, regimes: [],
        currentPrice: candles.length > 0 ? candles[startIndex]?.close ?? candles[0].close : 0, pnl: 0,
        contextEndIndex: startIndex,
        isStudyPhase: contextEndIndex > 0,
        yahooInsights: null,
      });
    }
  },

  goLive: () => {
    // Show pre-session reflection popup (simulation stays paused)
    set({ showPreSession: true, isPlaying: false });
  },

  tick: () => {
    const { candles, currentIndex, isPlaying, microNoiseEnabled, microTicksPerCandle, microTickCount, microPath, sessionEnded } = get();
    if (!isPlaying || currentIndex >= candles.length - 1) {
      if (currentIndex >= candles.length - 1 && !sessionEnded) {
        set({ isPlaying: false, showPostSession: true, sessionEnded: true });
      } else if (currentIndex >= candles.length - 1) {
        set({ isPlaying: false });
      }
      return;
    }

    if (!microNoiseEnabled) {
      const nextIndex = currentIndex + 1;
      const price = candles[nextIndex].close;
      const s = get();
      set({ currentIndex: nextIndex, currentPrice: price, pnl: calculatePnl({ cash: s.cash, startingCash: s.startingCash, position: s.position, currentPrice: price }) });
      checkAutoStopLoss(get, set);
      return;
    }

    if (microTickCount === 0 || microPath.length === 0) {
      const nextCandle = candles[currentIndex + 1];
      const path = generateMicroPath(nextCandle, microTicksPerCandle);
      const price = path[0];
      const s = get();
      set({
        microPath: path,
        microTickCount: 1,
        currentPrice: price,
        pnl: calculatePnl({ cash: s.cash, startingCash: s.startingCash, position: s.position, currentPrice: price }),
      });
    } else if (microTickCount < microTicksPerCandle - 1) {
      const price = microPath[microTickCount];
      const s = get();
      set({
        microTickCount: microTickCount + 1,
        currentPrice: price,
        pnl: calculatePnl({ cash: s.cash, startingCash: s.startingCash, position: s.position, currentPrice: price }),
      });
    } else {
      // Last micro-tick: candle finalizes — check stop loss on close price
      const nextIndex = currentIndex + 1;
      const price = candles[nextIndex].close;
      const s = get();
      set({
        currentIndex: nextIndex,
        currentPrice: price,
        microTickCount: 0,
        microPath: [],
        pnl: calculatePnl({ cash: s.cash, startingCash: s.startingCash, position: s.position, currentPrice: price }),
      });
      checkAutoStopLoss(get, set);
    }
  },

  play: () => { const s = get(); if (!s.isStudyPhase && !s.showPreSession && !s.showPostSession) set({ isPlaying: true }); },
  pause: () => set({ isPlaying: false }),
  setSpeed: (speed) => set({ speed }),

  jumpTo: (index) => {
    const { candles, isStudyPhase, contextEndIndex } = get();
    // During study phase, can only scroll within context history
    const maxIndex = isStudyPhase ? contextEndIndex : candles.length - 1;
    const clamped = Math.max(0, Math.min(index, maxIndex));
    const price = candles[clamped].close;
    const s = get();
    set({ currentIndex: clamped, currentPrice: price, pnl: calculatePnl({ cash: s.cash, startingCash: s.startingCash, position: s.position, currentPrice: price }) });
  },

  buy: (quantity, plannedStop?, journal?) => {
    const { cash, isLockedOut, riskSettings, closedTrades, currentIndex, isStudyPhase, candles } = get();
    if (isStudyPhase) return false;
    if (isLockedOut) return false;
    if (!isMarketHours(candles, currentIndex)) return false;

    // Cooldown check: prevent re-entry too soon after last sell
    if (riskSettings.cooldownCandles > 0 && closedTrades.length > 0) {
      const lastClosed = closedTrades[closedTrades.length - 1];
      if (currentIndex - lastClosed.exitCandleIndex < riskSettings.cooldownCandles) return false;
    }

    // Use actual candle close price for execution (not micro-tick noise)
    const realPrice = candles[currentIndex]?.close ?? 0;
    // Apply spread: buy at ask (slightly higher)
    const spreadMultiplier = 1 + (riskSettings.spreadBps / 10000);
    const askPrice = realPrice * spreadMultiplier;
    const totalCost = askPrice * quantity + riskSettings.commissionPerTrade;
    if (totalCost > cash) return false;

    set({ isPendingExecution: riskSettings.executionDelayMs > 0 });

    const executeTrade = () => {
      const s = get();
      // Always use real candle close price, not micro-tick interpolated price
      const realExecPrice = s.candles[s.currentIndex]?.close ?? 0;
      const execPrice = realExecPrice * spreadMultiplier;
      const execCost = execPrice * quantity + s.riskSettings.commissionPerTrade;
      if (execCost > s.cash) { set({ isPendingExecution: false }); return; }

      const mistakes = detectMistakes(s.trades, s.closedTrades, s.currentIndex, "buy", s.candles);
      const newPosition: Position = s.position
        ? { ...s.position, quantity: s.position.quantity + quantity, avgPrice: (s.position.avgPrice * s.position.quantity + execPrice * quantity) / (s.position.quantity + quantity), plannedStop: plannedStop ?? s.position.plannedStop }
        : { symbol: s.symbol, quantity, avgPrice: execPrice, plannedStop };

      const trade: Trade = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, side: "buy", price: execPrice, quantity, time: s.candles[s.currentIndex]?.time ?? 0, candleIndex: s.currentIndex, plannedStop, journal: journal ?? undefined };
      const newCash = s.cash - execCost;

      set({
        cash: newCash, position: newPosition, trades: [...s.trades, trade], isPendingExecution: false,
        pnl: calculatePnl({ cash: newCash, startingCash: s.startingCash, position: newPosition, currentPrice: s.currentPrice }),
      });

      if (mistakes.length > 0) {
        const updatedTrades = [...get().trades];
        const lastTrade = updatedTrades[updatedTrades.length - 1];
        if (lastTrade) { lastTrade.journal = { ...lastTrade.journal, postNotes: `⚠️ ${mistakes.join(", ")}` }; set({ trades: updatedTrades }); }
      }
    };

    if (riskSettings.executionDelayMs > 0) setTimeout(executeTrade, riskSettings.executionDelayMs);
    else executeTrade();
    return true;
  },

  sell: (quantity, journal?) => {
    const { position, riskSettings, trades, currentIndex, isStudyPhase, candles } = get();
    if (isStudyPhase) return false;
    if (!isMarketHours(candles, currentIndex)) return false;
    if (!position || position.quantity < quantity) return false;

    // Minimum hold time check
    if (riskSettings.minHoldCandles > 0) {
      const entryTrades = trades.filter((t) => t.side === "buy");
      const lastEntry = entryTrades[entryTrades.length - 1];
      if (lastEntry && currentIndex - lastEntry.candleIndex < riskSettings.minHoldCandles) return false;
    }

    set({ isPendingExecution: riskSettings.executionDelayMs > 0 });

    const executeTrade = () => {
      const s = get();
      if (!s.position || s.position.quantity < quantity) { set({ isPendingExecution: false }); return; }

      const mistakes = detectMistakes(s.trades, s.closedTrades, s.currentIndex, "sell", s.candles);
      // Apply spread: sell at bid (slightly lower) — use real candle price, not micro-tick noise
      const spreadMultiplier = 1 - (s.riskSettings.spreadBps / 10000);
      const realExecPrice = s.candles[s.currentIndex]?.close ?? 0;
      const execPrice = realExecPrice * spreadMultiplier;
      const proceeds = execPrice * quantity - s.riskSettings.commissionPerTrade;
      const remaining = s.position.quantity - quantity;
      const newPosition: Position | null = remaining > 0 ? { ...s.position, quantity: remaining } : null;
      const tradePnl = (execPrice - s.position.avgPrice) * quantity - (s.riskSettings.commissionPerTrade * 2); // account for both sides
      const newRealizedPnl = s.realizedPnl + tradePnl;

      const entryTrades = s.trades.filter((t) => t.side === "buy");
      const lastEntry = entryTrades[entryTrades.length - 1];

      const closedTrade: ClosedTrade = {
        id: `closed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, symbol: s.symbol,
        entryPrice: s.position.avgPrice, exitPrice: execPrice, quantity,
        entryTime: lastEntry?.time ?? 0, exitTime: s.candles[s.currentIndex]?.time ?? 0,
        entryCandleIndex: lastEntry?.candleIndex ?? 0, exitCandleIndex: s.currentIndex,
        plannedStop: s.position.plannedStop,
        rMultiple: s.position.plannedStop ? (execPrice - s.position.avgPrice) / (s.position.avgPrice - s.position.plannedStop) : null,
        realizedPnl: tradePnl, journal, mistakes,
        holdDuration: s.currentIndex - (lastEntry?.candleIndex ?? 0),
        regime: s.regimes.length > 0 ? s.regimes.reduce((c, r) => r.startIndex <= s.currentIndex ? r : c, s.regimes[0]).regime : undefined,
      };

      const trade: Trade = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, side: "sell", price: execPrice, quantity, time: s.candles[s.currentIndex]?.time ?? 0, candleIndex: s.currentIndex, journal };
      const newCash = s.cash + proceeds;
      const lossLimit = (s.riskSettings.dailyLossLimitPercent / 100) * s.startingCash;

      set({
        cash: newCash, position: newPosition, trades: [...s.trades, trade],
        closedTrades: [...s.closedTrades, closedTrade], realizedPnl: newRealizedPnl,
        isLockedOut: newRealizedPnl <= -lossLimit, isPendingExecution: false,
        pnl: calculatePnl({ cash: newCash, startingCash: s.startingCash, position: newPosition, currentPrice: s.currentPrice }),
      });
    };

    if (riskSettings.executionDelayMs > 0) setTimeout(executeTrade, riskSettings.executionDelayMs);
    else executeTrade();
    return true;
  },

  setRiskSettings: (settings) => set({ riskSettings: { ...get().riskSettings, ...settings } }),
  updatePlannedStop: (stop) => { const { position } = get(); if (position) set({ position: { ...position, plannedStop: stop } }); },
  calculateMaxShares: (stopPrice) => {
    const { candles, currentIndex, cash, startingCash, riskSettings } = get();
    // Use real candle price for position sizing, not micro-tick noise
    const realPrice = candles[currentIndex]?.close ?? 0;
    if (stopPrice >= realPrice) return 0;
    const maxRiskDollars = (riskSettings.maxRiskPercent / 100) * startingCash;
    return Math.min(Math.floor(maxRiskDollars / (realPrice - stopPrice)), Math.floor(cash / realPrice));
  },
  setMicroNoise: (enabled, ticksPerCandle?) => set({ microNoiseEnabled: enabled, microTicksPerCandle: ticksPerCandle ?? get().microTicksPerCandle, microTickCount: 0, microPath: [] }),
  submitPreSession: (reflection) => {
    const { tradingCandlesStored, tradingStartOffset } = get();
    if (tradingCandlesStored.length > 0) {
      // Dual-TF: swap chart to trading-interval candles
      // Lookback candles [0..offset) are already visible; live trading starts at offset
      const startIdx = tradingStartOffset;
      set({
        candles: tradingCandlesStored,
        currentIndex: startIdx,
        currentPrice: tradingCandlesStored[startIdx]?.close ?? tradingCandlesStored[0].close,
        contextEndIndex: 0,
        isStudyPhase: false,
        showPreSession: false,
        preSessionReflection: reflection,
        tradingCandlesStored: [],
        contextCandles: [],
      });
    } else {
      // Single-TF: just lift study phase restriction
      set({ preSessionReflection: reflection, showPreSession: false, isStudyPhase: false });
    }
  },
  submitPostSession: (reflection) => {
    set({ postSessionReflection: reflection, showPostSession: false });
  },
  dismissPostSession: () => {
    set({ showPostSession: false });
  },
  setYahooInsights: (insights) => set({ yahooInsights: insights }),
  getSessionScore: () => { const { trades, closedTrades, currentIndex } = get(); return calculateSessionScore(trades, closedTrades, currentIndex); },
  getCurrentRegime: () => { const { regimes, currentIndex, yahooInsights } = get(); if (regimes.length === 0) return yahooInsights?.regime ?? "choppy"; return regimes.reduce((c, r) => r.startIndex <= currentIndex ? r : c, regimes[0]).regime; },
  reset: () => set({ symbol: "", date: "", candles: [], currentIndex: 0, isPlaying: false, speed: 1, cash: STARTING_CASH, startingCash: STARTING_CASH, position: null, trades: [], closedTrades: [], realizedPnl: 0, isLockedOut: false, isPendingExecution: false, regimes: [], currentPrice: 0, pnl: 0, contextEndIndex: 0, isStudyPhase: false, contextCandles: [], contextInterval: "", tradingCandlesStored: [], tradingStartOffset: 0, microTickCount: 0, microPath: [], showPreSession: false, showPostSession: false, preSessionReflection: null, postSessionReflection: null, sessionEnded: false, yahooInsights: null }),
}), {
  name: "stock-sim-settings",
  partialize: (state) => ({
    riskSettings: state.riskSettings,
    microNoiseEnabled: state.microNoiseEnabled,
    microTicksPerCandle: state.microTicksPerCandle,
  }),
}));
