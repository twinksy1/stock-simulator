"use client";

import { useState } from "react";
import { useSimulationStore } from "@/store/simulation";
import { generateMultiDayData } from "@/lib/sample-data";

const SYMBOLS = ["MSFT", "AAPL", "GOOGL", "AMZN", "TSLA", "NVDA", "META"];

const BASE_PRICES: Record<string, number> = {
  MSFT: 420, AAPL: 185, GOOGL: 175, AMZN: 185, TSLA: 175, NVDA: 950, META: 475,
};

function generateRandomDate(): string {
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, "0");
  return `2024-${month}-${day}`;
}

export default function SessionSetup() {
  const [symbol, setSymbol] = useState("MSFT");
  const [days, setDays] = useState(3);
  const [contextDays, setContextDays] = useState(5);
  const [scarcityMode, setScarcityMode] = useState(false);
  const loadSession = useSimulationStore((s) => s.loadSession);
  const setScarcity = useSimulationStore((s) => s.setScarcityMode);

  const handleStart = () => {
    const date = generateRandomDate();
    const basePrice = BASE_PRICES[symbol] ?? 150;
    const totalDays = contextDays + days;
    const session = generateMultiDayData(symbol, date, basePrice, totalDays, scarcityMode);
    // Context ends after contextDays worth of candles (660 candles per day)
    const contextEndIndex = contextDays * 660;
    setScarcity(scarcityMode);
    loadSession(symbol, date, session.candles, session.events, session.regimes, session.correlatedSymbols, contextEndIndex);
  };

  const handleRandom = () => {
    const randomSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const date = generateRandomDate();
    const basePrice = BASE_PRICES[randomSymbol] ?? 150;
    const randomDays = [1, 3, 5][Math.floor(Math.random() * 3)];
    const totalDays = contextDays + randomDays;
    const session = generateMultiDayData(randomSymbol, date, basePrice, totalDays, scarcityMode);
    const contextEndIndex = contextDays * 660;
    setScarcity(scarcityMode);
    loadSession(randomSymbol, date, session.candles, session.events, session.regimes, session.correlatedSymbols, contextEndIndex);
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 max-w-md mx-auto">
      <h2 className="text-xl font-bold text-white mb-4">Start a Session</h2>
      <p className="text-slate-400 text-sm mb-4">
        Practice trading on random market days. Dates are hidden to prevent pattern recall bias.
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-slate-400 text-xs uppercase tracking-wide">Symbol</label>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            {SYMBOLS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-slate-400 text-xs uppercase tracking-wide">Duration (trading days)</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value={1}>1 Day (quick session)</option>
            <option value={3}>3 Days (with overnight gaps)</option>
            <option value={5}>5 Days (full week)</option>
          </select>
        </div>

        <div>
          <label className="text-slate-400 text-xs uppercase tracking-wide">Historical Context</label>
          <select
            value={contextDays}
            onChange={(e) => setContextDays(Number(e.target.value))}
            className="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value={0}>None (start blind)</option>
            <option value={3}>3 Days prior history</option>
            <option value={5}>5 Days prior history</option>
            <option value={10}>10 Days prior history (2 weeks)</option>
          </select>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Study context before going live — like a real premarket routine
          </p>
        </div>

        {/* Scarcity Mode toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={scarcityMode}
            onChange={(e) => setScarcityMode(e.target.checked)}
            className="w-4 h-4 rounded bg-slate-900 border-slate-600 text-purple-600 focus:ring-purple-500"
          />
          <div>
            <span className="text-white text-sm font-medium">🧘 Patience Mode</span>
            <p className="text-slate-500 text-[11px]">
              Most days are boring — rewards waiting for quality setups
            </p>
          </div>
        </label>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            onClick={handleStart}
            className="bg-blue-600 hover:bg-blue-500 text-white py-2 rounded font-semibold transition-colors"
          >
            Start
          </button>
          <button
            onClick={handleRandom}
            className="bg-purple-600 hover:bg-purple-500 text-white py-2 rounded font-semibold transition-colors"
          >
            🎲 Random Everything
          </button>
        </div>
      </div>
    </div>
  );
}
