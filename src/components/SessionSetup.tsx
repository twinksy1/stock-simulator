"use client";

import { useState } from "react";
import { useSimulationStore } from "@/store/simulation";
import { generateSampleData } from "@/lib/sample-data";

const SYMBOLS = ["MSFT", "AAPL", "GOOGL", "AMZN", "TSLA", "NVDA", "META"];

const BASE_PRICES: Record<string, number> = {
  MSFT: 420,
  AAPL: 185,
  GOOGL: 175,
  AMZN: 185,
  TSLA: 175,
  NVDA: 950,
  META: 475,
};

function generateRandomDate(): string {
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, "0");
  return `2024-${month}-${day}`;
}

export default function SessionSetup() {
  const [symbol, setSymbol] = useState("MSFT");
  const loadSession = useSimulationStore((s) => s.loadSession);

  const handleStart = () => {
    const date = generateRandomDate();
    const basePrice = BASE_PRICES[symbol] ?? 150;
    const candles = generateSampleData(symbol, date, basePrice);
    loadSession(symbol, date, candles);
  };

  const handleRandom = () => {
    const randomSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const date = generateRandomDate();
    const basePrice = BASE_PRICES[randomSymbol] ?? 150;
    const candles = generateSampleData(randomSymbol, date, basePrice);
    loadSession(randomSymbol, date, candles);
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 max-w-md mx-auto">
      <h2 className="text-xl font-bold text-white mb-4">Start a Session</h2>
      <p className="text-slate-400 text-sm mb-4">
        Practice trading on a random market day. Dates are hidden to prevent pattern recall bias.
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
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

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
