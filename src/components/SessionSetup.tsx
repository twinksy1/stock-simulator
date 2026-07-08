"use client";

import { useState, useMemo } from "react";
import { useSimulationStore } from "@/store/simulation";
import type { Candle, AltTimeframeView } from "@/types/market";
import { findWindowsByVolatility, type VolatilityMode } from "@/lib/volatility";

const POPULAR_SYMBOLS = ["MSFT", "AAPL", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "SPY", "QQQ", "AMD", "NFLX", "JPM"];

type Interval = "1m" | "2m" | "5m" | "15m" | "30m" | "1h" | "1d";

// Max range to fetch from Yahoo for each interval
const MAX_RANGE: Record<Interval, string> = {
  "1m": "5d",
  "2m": "5d",
  "5m": "57d",
  "15m": "57d",
  "30m": "57d",
  "1h": "720d",
  "1d": "10y",
};

// Higher-TF context to show during study phase (decoupled from trading interval)
// For intraday intervals, we show hourly or daily candles for trend context.
// For daily, we use the same data (single-TF mode).
interface ContextConfig {
  interval: Interval;
  range: string;
  maxCandles: number; // How many context candles to show
}

const CONTEXT_CONFIG: Record<Interval, ContextConfig | null> = {
  "1m":  { interval: "1h", range: "720d", maxCandles: 120 }, // ~4 months of hourly
  "2m":  { interval: "1h", range: "720d", maxCandles: 120 },
  "5m":  { interval: "1h", range: "720d", maxCandles: 120 },
  "15m": { interval: "1d", range: "10y",  maxCandles: 120 }, // ~6 months of daily
  "30m": { interval: "1d", range: "10y",  maxCandles: 120 },
  "1h":  { interval: "1d", range: "10y",  maxCandles: 120 },
  "1d":  null, // No higher TF — use single-TF mode
};

// Higher-timeframe display overlays offered per base interval (display-only;
// trading stays anchored to the base interval). Intraday-only, within the ~7d window.
const ALT_VIEW_INTERVALS: Partial<Record<Interval, Interval[]>> = {
  "1m": ["2m", "5m"],
  "2m": ["5m"],
};

// ─── Difficulty System ───────────────────────────────────────────────

type Difficulty = "beginner" | "intermediate" | "advanced" | "expert" | "custom";

interface DifficultyOption {
  id: Difficulty;
  label: string;
  icon: string;
  color: string;
  ringColor: string;
  description: string;
}

const DIFFICULTIES: DifficultyOption[] = [
  { id: "beginner", label: "Beginner", icon: "🟢", color: "bg-emerald-600/15 border-emerald-500/60", ringColor: "ring-emerald-500/30", description: "Short sessions to build chart-reading basics" },
  { id: "intermediate", label: "Intermediate", icon: "🟡", color: "bg-yellow-600/15 border-yellow-500/60", ringColor: "ring-yellow-500/30", description: "Full-day sessions with more price action" },
  { id: "advanced", label: "Advanced", icon: "🟠", color: "bg-orange-600/15 border-orange-500/60", ringColor: "ring-orange-500/30", description: "Multi-day patterns, trend continuations" },
  { id: "expert", label: "Expert", icon: "🔴", color: "bg-red-600/15 border-red-500/60", ringColor: "ring-red-500/30", description: "Extended sessions — full week replays" },
  { id: "custom", label: "Custom", icon: "⚙️", color: "bg-slate-600/15 border-slate-500/60", ringColor: "ring-slate-500/30", description: "Choose your own session length" },
];

// Candle ranges per difficulty per interval: { min, max, humanLabel }
// At startSession, tradingCandles = random int in [min, max]
interface CandleRange {
  min: number;
  max: number;
  label: string;
}

const DIFFICULTY_CANDLES: Record<Interval, Record<Exclude<Difficulty, "custom">, CandleRange>> = {
  "1m": {
    beginner:     { min: 120,  max: 390,  label: "2 hrs – 1 day" },
    intermediate: { min: 390,  max: 780,  label: "1–2 days" },
    advanced:     { min: 1170, max: 1950, label: "3–5 days (random)" },
    expert:       { min: 2340, max: 3900, label: "Full week (random)" },
  },
  "2m": {
    beginner:     { min: 60,  max: 195,  label: "2 hrs – 1 day" },
    intermediate: { min: 195, max: 390,  label: "1–2 days" },
    advanced:     { min: 585, max: 975,  label: "3–5 days (random)" },
    expert:       { min: 1170, max: 1755, label: "Full week (random)" },
  },
  "5m": {
    beginner:     { min: 36,   max: 78,   label: "Half – full day" },
    intermediate: { min: 234,  max: 390,  label: "3–5 days" },
    advanced:     { min: 780,  max: 1560, label: "2–4 weeks (random)" },
    expert:       { min: 2340, max: 3900, label: "6–10 weeks (random)" },
  },
  "15m": {
    beginner:     { min: 13,  max: 26,  label: "Half – full day" },
    intermediate: { min: 52,  max: 130, label: "2–5 days" },
    advanced:     { min: 260, max: 520, label: "2–4 weeks (random)" },
    expert:       { min: 520, max: 1040, label: "1–2 months (random)" },
  },
  "30m": {
    beginner:     { min: 13,  max: 26,  label: "1–2 days" },
    intermediate: { min: 65,  max: 130, label: "1–2 weeks" },
    advanced:     { min: 260, max: 520, label: "1–2 months (random)" },
    expert:       { min: 520, max: 1040, label: "2–4 months (random)" },
  },
  "1h": {
    beginner:     { min: 35,  max: 70,   label: "1–2 weeks" },
    intermediate: { min: 140, max: 420,  label: "1–3 months" },
    advanced:     { min: 840, max: 1680, label: "6–12 months (random)" },
    expert:       { min: 1680, max: 3360, label: "1–2 years (random)" },
  },
  "1d": {
    beginner:     { min: 21,  max: 63,   label: "1–3 months" },
    intermediate: { min: 126, max: 252,  label: "6–12 months" },
    advanced:     { min: 252, max: 504,  label: "1–2 years (random)" },
    expert:       { min: 504, max: 1260, label: "2–5 years (random)" },
  },
};

// ─── Custom Session Lengths (shown when difficulty === "custom") ─────

interface SessionLength {
  id: string;
  label: string;
  description: string;
  tradingCandles: number;
}

const SESSION_LENGTHS: Record<Interval, SessionLength[]> = {
  "1m": [
    { id: "quick", label: "⚡ Quick (30 min)", description: "~30 candles", tradingCandles: 30 },
    { id: "medium", label: "🕐 Half Session (2 hrs)", description: "~120 candles", tradingCandles: 120 },
    { id: "full", label: "📅 Full Day (6.5 hrs)", description: "~390 candles", tradingCandles: 390 },
    { id: "multi2", label: "📆 2 Days", description: "~780 candles", tradingCandles: 780 },
    { id: "multi3", label: "📆 3 Days", description: "~1,170 candles", tradingCandles: 1170 },
    { id: "week", label: "📆 Full Week (5 days)", description: "~1,950 candles", tradingCandles: 1950 },
  ],
  "2m": [
    { id: "quick", label: "⚡ Quick (30 min)", description: "~15 candles", tradingCandles: 15 },
    { id: "medium", label: "🕐 Half Session (2 hrs)", description: "~60 candles", tradingCandles: 60 },
    { id: "full", label: "📅 Full Day (6.5 hrs)", description: "~195 candles", tradingCandles: 195 },
    { id: "multi2", label: "📆 2 Days", description: "~390 candles", tradingCandles: 390 },
    { id: "multi3", label: "📆 3 Days", description: "~585 candles", tradingCandles: 585 },
    { id: "week", label: "📆 Full Week (5 days)", description: "~975 candles", tradingCandles: 975 },
  ],
  "5m": [
    { id: "quick", label: "⚡ Quick (1 hr)", description: "~12 candles", tradingCandles: 12 },
    { id: "medium", label: "🕐 Half Day (3 hrs)", description: "~36 candles", tradingCandles: 36 },
    { id: "full", label: "📅 Full Day", description: "~78 candles", tradingCandles: 78 },
    { id: "multi3", label: "📆 3 Days", description: "~234 candles", tradingCandles: 234 },
    { id: "multi5", label: "📆 Full Week", description: "~390 candles", tradingCandles: 390 },
    { id: "multi10", label: "📆 2 Weeks", description: "~780 candles", tradingCandles: 780 },
  ],
  "15m": [
    { id: "quick", label: "⚡ Half Day", description: "~13 candles", tradingCandles: 13 },
    { id: "full", label: "📅 Full Day", description: "~26 candles", tradingCandles: 26 },
    { id: "multi", label: "📆 One Week", description: "~130 candles", tradingCandles: 130 },
    { id: "multi2w", label: "📆 Two Weeks", description: "~260 candles", tradingCandles: 260 },
  ],
  "30m": [
    { id: "full", label: "📅 Full Day", description: "~13 candles", tradingCandles: 13 },
    { id: "multi", label: "📆 One Week", description: "~65 candles", tradingCandles: 65 },
    { id: "long", label: "📆 Two Weeks", description: "~130 candles", tradingCandles: 130 },
    { id: "month", label: "📆 One Month", description: "~260 candles", tradingCandles: 260 },
  ],
  "1h": [
    { id: "week", label: "📆 One Week", description: "~35 candles", tradingCandles: 35 },
    { id: "month", label: "📅 One Month", description: "~140 candles", tradingCandles: 140 },
    { id: "quarter", label: "📊 One Quarter", description: "~420 candles", tradingCandles: 420 },
    { id: "half", label: "📈 Six Months", description: "~840 candles", tradingCandles: 840 },
  ],
  "1d": [
    { id: "month", label: "📅 One Month", description: "~21 candles", tradingCandles: 21 },
    { id: "quarter", label: "📊 One Quarter", description: "~63 candles", tradingCandles: 63 },
    { id: "half", label: "📈 Six Months", description: "~126 candles", tradingCandles: 126 },
    { id: "year", label: "🗓️ One Year", description: "~252 candles", tradingCandles: 252 },
    { id: "multi", label: "🗓️ 2 Years", description: "~504 candles", tradingCandles: 504 },
  ],
};

// ─── Interval Options ────────────────────────────────────────────────

interface IntervalOption {
  value: Interval;
  label: string;
  availability: string;
  bestFor: string;
}

const INTERVAL_OPTIONS: IntervalOption[] = [
  { value: "1m", label: "1 min", availability: "Last ~7 trading days", bestFor: "Scalping, tape reading" },
  { value: "2m", label: "2 min", availability: "Last ~7 trading days", bestFor: "Scalping with less noise" },
  { value: "5m", label: "5 min", availability: "Last ~60 trading days", bestFor: "Day trading, VWAP plays" },
  { value: "15m", label: "15 min", availability: "Last ~60 trading days", bestFor: "Intraday swing setups" },
  { value: "30m", label: "30 min", availability: "Last ~60 trading days", bestFor: "Multi-day patterns" },
  { value: "1h", label: "1 hour", availability: "Up to ~2 years", bestFor: "Swing trading" },
  { value: "1d", label: "Daily", availability: "10+ years", bestFor: "Position trading" },
];

// ─── Volatility Mode Options ─────────────────────────────────────────

interface VolatilityOption {
  id: VolatilityMode;
  label: string;
  icon: string;
  description: string;
}

const VOLATILITY_OPTIONS: VolatilityOption[] = [
  { id: "any", label: "Any", icon: "🌊", description: "Random market conditions" },
  { id: "calm", label: "Calm", icon: "😌", description: "Low-volatility, tight ranges" },
  { id: "wild", label: "Wild", icon: "🔥", description: "High-volatility, big moves" },
];

// ─── Replay Lockout (localStorage) ───────────────────────────────────

interface RecentWindow {
  symbol: string;
  interval: string;
  startIndex: number;
  windowSize: number;
  timestamp: number;
}

const LOCKOUT_KEY = "stock-sim-recent-windows";
const MAX_RECENT = 5;

function getRecentWindows(): RecentWindow[] {
  try {
    const stored = localStorage.getItem(LOCKOUT_KEY);
    if (!stored) return [];
    const windows: RecentWindow[] = JSON.parse(stored);
    // Expire entries older than 24 hours
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return windows.filter((w) => w.timestamp > cutoff);
  } catch {
    return [];
  }
}

function saveRecentWindow(window: RecentWindow) {
  const recent = getRecentWindows().slice(-(MAX_RECENT - 1));
  recent.push(window);
  try {
    localStorage.setItem(LOCKOUT_KEY, JSON.stringify(recent));
  } catch {
    // localStorage might be full or unavailable
  }
}

function isOverlapping(
  start: number,
  size: number,
  recent: RecentWindow[],
  symbol: string,
  interval: string,
): boolean {
  return recent.some(
    (w) =>
      w.symbol === symbol &&
      w.interval === interval &&
      Math.abs(w.startIndex - start) < Math.min(size, w.windowSize) * 0.5,
  );
}

// ─── Component ───────────────────────────────────────────────────────

export default function SessionSetup() {
  const [symbol, setSymbol] = useState("MSFT");
  const [customSymbol, setCustomSymbol] = useState("");
  const [interval, setInterval] = useState<Interval>("5m");
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate");
  const [sessionLengthId, setSessionLengthId] = useState("full");
  const [volatilityMode, setVolatilityMode] = useState<VolatilityMode>("any");
  const [startBalance, setStartBalance] = useState(70000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadSession = useSimulationStore((s) => s.loadSession);
  const setYahooInsights = useSimulationStore((s) => s.setYahooInsights);

  const effectiveSymbol = customSymbol.trim().toUpperCase() || symbol;
  const intervalOption = INTERVAL_OPTIONS.find((o) => o.value === interval)!;
  const difficultyOption = DIFFICULTIES.find((d) => d.id === difficulty)!;

  // Current difficulty candle range (shown in UI)
  const difficultyRange = difficulty !== "custom" ? DIFFICULTY_CANDLES[interval][difficulty] : null;

  // Custom session lengths
  const customLengths = SESSION_LENGTHS[interval];
  const selectedCustomLength = customLengths.find((l) => l.id === sessionLengthId) ?? customLengths[0];

  // Show data-limit warning for 1m/2m multi-day sessions
  const showDataWarning = useMemo(() => {
    if (!["1m", "2m"].includes(interval)) return false;
    if (difficulty === "custom") return selectedCustomLength.tradingCandles > 390;
    if (difficultyRange) return difficultyRange.min > 390;
    return false;
  }, [interval, difficulty, difficultyRange, selectedCustomLength]);

  const fetchAndApplyInsights = async (sym: string) => {
    try {
      const res = await fetch(`/api/data/insights?symbol=${sym}`);
      if (res.ok) {
        const data = await res.json();
        setYahooInsights(data);
      }
    } catch {
      // Insights are optional
    }
  };

  // Resolve trading candle count (random for difficulty levels, fixed for custom)
  const resolveTradingCandles = (): number => {
    if (difficulty === "custom") return selectedCustomLength.tradingCandles;
    const range = DIFFICULTY_CANDLES[interval][difficulty];
    return range.min + Math.floor(Math.random() * (range.max - range.min + 1));
  };

  // Fetch trading data, then higher-TF context (sequential to avoid Yahoo rate limits)
  const startSession = async (targetSymbol: string) => {
    setLoading(true);
    setError(null);
    try {
      const ctxConfig = CONTEXT_CONFIG[interval];
      const maxRange = MAX_RANGE[interval];

      // 1. Fetch trading data first
      const tradingRes = await fetch(`/api/data/historical?symbol=${targetSymbol}&interval=${interval}&range=${maxRange}`);
      if (!tradingRes.ok) {
        const errData = await tradingRes.json();
        throw new Error(errData.error || `HTTP ${tradingRes.status}`);
      }

      const tradingData = await tradingRes.json();
      const allTradingCandles: Candle[] = tradingData.candles;

      if (allTradingCandles.length < 30) {
        throw new Error(`Only ${allTradingCandles.length} candles available — not enough for a session. Try a different symbol.`);
      }

      const tradingCandleCount = resolveTradingCandles();

      // 2. Determine trading window (volatility-filtered + lockout)
      let tradingSlice: Candle[];
      let sliceStart: number;

      if (allTradingCandles.length <= tradingCandleCount) {
        tradingSlice = allTradingCandles;
        sliceStart = 0;
      } else {
        const candidates = findWindowsByVolatility(allTradingCandles, tradingCandleCount, volatilityMode);
        const recent = getRecentWindows();
        let filtered = candidates.filter((start) => !isOverlapping(start, tradingCandleCount, recent, targetSymbol, interval));
        if (filtered.length === 0) filtered = candidates;
        sliceStart = filtered[Math.floor(Math.random() * filtered.length)];
        tradingSlice = allTradingCandles.slice(sliceStart, sliceStart + tradingCandleCount);
      }

      saveRecentWindow({ symbol: targetSymbol, interval, startIndex: sliceStart, windowSize: tradingSlice.length, timestamp: Date.now() });

      // 3. Fetch higher-TF context (sequential — after trading fetch to avoid Yahoo rate limits)
      let contextSlice: Candle[] = [];
      let contextIntervalUsed = "";

      if (ctxConfig) {
        try {
          const contextRes = await fetch(`/api/data/historical?symbol=${targetSymbol}&interval=${ctxConfig.interval}&range=${ctxConfig.range}`);
          if (contextRes.ok) {
            const contextData = await contextRes.json();
            const allContextCandles: Candle[] = contextData.candles;
            const tradingStartTime = tradingSlice[0].time;
            const contextBefore = allContextCandles.filter((c) => c.time < tradingStartTime);
            contextSlice = contextBefore.slice(-ctxConfig.maxCandles);
            contextIntervalUsed = ctxConfig.interval;
          }
        } catch {
          // Context fetch failed — will use fallback below
        }
      }

      // 4. Fallback: if higher-TF context failed, use same-interval candles BEFORE the trading window
      //    This doesn't eat into the trading window — it's data we already fetched but isn't in the slice
      if (contextSlice.length <= 10 && sliceStart > 0) {
        const beforeTrading = allTradingCandles.slice(0, sliceStart);
        contextSlice = beforeTrading.slice(-Math.min(200, beforeTrading.length));
        contextIntervalUsed = interval;
      }

      // 5. Prepend same-interval lookback to trading data (visible when going live)
      //    This lets users scroll back to see recent price action at the trading interval
      const lookbackCount = Math.min(sliceStart, 200);
      const lookback = lookbackCount > 0 ? allTradingCandles.slice(sliceStart - lookbackCount, sliceStart) : [];
      const fullTradingData = [...lookback, ...tradingSlice];
      const tradingStartOffset = lookback.length;

      // 5b. Alt-timeframe overlays: fetch higher-TF series spanning the same window.
      //     Display-only views (trading stays anchored to the base timeline).
      //     1m sessions get 2m + 5m views; 2m sessions get a 5m view.
      const altViews: AltTimeframeView[] = [];
      const altIntervals = ALT_VIEW_INTERVALS[interval] ?? [];
      const firstTime = fullTradingData[0].time;
      const lastTime = fullTradingData[fullTradingData.length - 1].time;
      for (const altInt of altIntervals) {
        try {
          const altRes = await fetch(`/api/data/historical?symbol=${targetSymbol}&interval=${altInt}&range=${MAX_RANGE[altInt]}`);
          if (altRes.ok) {
            const altData = await altRes.json();
            const allAltCandles: Candle[] = altData.candles;
            const windowCandles = allAltCandles.filter((c) => c.time >= firstTime && c.time <= lastTime);
            if (windowCandles.length > 0) altViews.push({ interval: altInt, candles: windowCandles });
          }
        } catch {
          // Alt overlays are optional — session works without them
        }
      }

      // 6. Load session
      if (contextSlice.length > 10) {
        loadSession(targetSymbol, interval, fullTradingData, 0, startBalance, contextSlice, contextIntervalUsed, tradingStartOffset, altViews);
      } else {
        // No higher-TF context — start directly with trading data (lookback is still prepended)
        loadSession(targetSymbol, interval, fullTradingData, tradingStartOffset, startBalance, undefined, undefined, undefined, altViews);
      }

      fetchAndApplyInsights(targetSymbol);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => startSession(effectiveSymbol);

  const handleSurprise = () => {
    const randomSymbol = POPULAR_SYMBOLS[Math.floor(Math.random() * POPULAR_SYMBOLS.length)];
    startSession(randomSymbol);
  };

  const handleIntervalChange = (newInterval: Interval) => {
    setInterval(newInterval);
    setSessionLengthId(SESSION_LENGTHS[newInterval][0].id);
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 max-w-xl mx-auto">
      <h2 className="text-xl font-bold text-white mb-1">📈 Start a Trading Session</h2>
      <p className="text-slate-400 text-sm mb-5">
        Practice reading real price action and making decisions. You won&apos;t know when this data is from — just read the chart and trade.
      </p>

      <div className="space-y-5">
        {/* Symbol */}
        <div>
          <label className="text-slate-400 text-xs uppercase tracking-wide font-semibold">What do you want to trade?</label>
          <div className="flex gap-2 mt-1.5">
            <select
              value={symbol}
              onChange={(e) => { setSymbol(e.target.value); setCustomSymbol(""); }}
              className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              {POPULAR_SYMBOLS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="or type any ticker"
              value={customSymbol}
              onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
              className="w-40 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500 placeholder-slate-500"
            />
          </div>
        </div>

        {/* Candle Size */}
        <div>
          <label className="text-slate-400 text-xs uppercase tracking-wide font-semibold">Candle size</label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {INTERVAL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleIntervalChange(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  interval === opt.value
                    ? "bg-blue-600 text-white ring-1 ring-blue-400/50"
                    : "bg-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">
            {intervalOption.availability} • Best for: {intervalOption.bestFor}
          </p>
        </div>

        {/* Difficulty */}
        <div>
          <label className="text-slate-400 text-xs uppercase tracking-wide font-semibold">Session difficulty</label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                onClick={() => setDifficulty(d.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  difficulty === d.id
                    ? `${d.color} ring-1 ${d.ringColor} text-white`
                    : "bg-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                {d.icon} {d.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">
            {difficultyOption.description}
            {difficultyRange && (
              <span className="text-slate-400"> — {difficultyRange.label}</span>
            )}
          </p>
        </div>

        {/* Custom Session Length (only when difficulty === "custom") */}
        {difficulty === "custom" && (
          <div>
            <label className="text-slate-400 text-xs uppercase tracking-wide font-semibold">Session length</label>
            <div className="space-y-1.5 mt-1.5">
              {customLengths.map((len) => (
                <button
                  key={len.id}
                  onClick={() => setSessionLengthId(len.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${
                    sessionLengthId === len.id
                      ? "bg-blue-600/15 border-blue-500/60 ring-1 ring-blue-500/30"
                      : "bg-slate-700/30 border-slate-600/50 hover:border-slate-500"
                  }`}
                >
                  <span className="text-sm font-medium text-white">{len.label}</span>
                  <span className="text-[10px] text-slate-400 ml-2">{len.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Market Conditions (Volatility) */}
        <div>
          <label className="text-slate-400 text-xs uppercase tracking-wide font-semibold">Market conditions</label>
          <div className="flex gap-1.5 mt-1.5">
            {VOLATILITY_OPTIONS.map((v) => (
              <button
                key={v.id}
                onClick={() => setVolatilityMode(v.id)}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all text-center ${
                  volatilityMode === v.id
                    ? "bg-blue-600 text-white ring-1 ring-blue-400/50"
                    : "bg-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                {v.icon} {v.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">
            {VOLATILITY_OPTIONS.find((v) => v.id === volatilityMode)?.description}
            {volatilityMode !== "any" && " — filtered by ATR analysis"}
          </p>
        </div>

        {/* How it works */}
        <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/50">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">How it works</div>
          <div className="space-y-1 text-[11px] text-slate-400">
            {CONTEXT_CONFIG[interval] ? (
              <>
                <p>📖 <span className="text-slate-300">Study phase</span> — You&apos;ll see {CONTEXT_CONFIG[interval]!.interval === "1h" ? "hourly" : "daily"} candles for trend context before the trading window.</p>
                <p>🚀 <span className="text-slate-300">Go live</span> — Chart switches to {intervalOption.label} candles. Trade as price plays forward.</p>
              </>
            ) : (
              <>
                <p>📖 <span className="text-slate-300">Study phase</span> — Analyze the first portion of the chart for context.</p>
                <p>🚀 <span className="text-slate-300">Go live</span> — Trade as candles play forward one at a time.</p>
              </>
            )}
            <p>🎲 <span className="text-slate-300">Blind dates</span> — Random time period. No hindsight bias.</p>
            <p>🔒 <span className="text-slate-300">Anti-repeat</span> — Recent sessions are tracked to avoid immediate replays.</p>
          </div>
        </div>

        {/* Starting Balance */}
        <div>
          <label className="text-slate-400 text-xs uppercase tracking-wide font-semibold">Starting Balance</label>
          <div className="relative mt-1.5">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input
              type="number"
              min={1000}
              max={10000000}
              step={1000}
              value={startBalance}
              onChange={(e) => setStartBalance(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 pl-7 text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex gap-1.5 mt-1.5">
            {[10000, 25000, 50000, 70000, 100000].map((v) => (
              <button
                key={v}
                onClick={() => setStartBalance(v)}
                className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                  startBalance === v
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-400 hover:text-white"
                }`}
              >
                {v >= 1000 ? `${v / 1000}k` : v}
              </button>
            ))}
          </div>
        </div>

        {/* Data-limit warning */}
        {showDataWarning && (
          <div className="bg-amber-900/30 border border-amber-500/40 rounded px-3 py-2 text-amber-300 text-[11px]">
            ⚠️ Only ~7 trading days of {interval} data available — longer sessions may repeat across practice runs.
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="bg-red-900/40 border border-red-500/50 rounded px-3 py-2 text-red-300 text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleStart}
            disabled={loading}
            className={`py-2.5 rounded-lg font-semibold transition-colors ${
              loading
                ? "bg-slate-600 text-slate-400 cursor-wait"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            {loading ? "Loading..." : `Start ${effectiveSymbol}`}
          </button>
          <button
            onClick={handleSurprise}
            disabled={loading}
            className={`py-2.5 rounded-lg font-semibold transition-colors ${
              loading
                ? "bg-slate-600 text-slate-400 cursor-wait"
                : "bg-slate-700 hover:bg-slate-600 text-white border border-slate-600"
            }`}
          >
            🎲 Surprise Me
          </button>
        </div>

        <p className="text-[10px] text-slate-500 text-center">
          Real market data from Yahoo Finance. Dates are hidden to prevent hindsight bias.
        </p>
      </div>
    </div>
  );
}
