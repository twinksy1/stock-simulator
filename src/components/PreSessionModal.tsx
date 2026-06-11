"use client";

import { useState } from "react";
import type {
  PreSessionReflection,
  ReflectionRegime,
  ReflectionStrategy,
  EntrySignal,
  AvoidItem,
} from "@/types/market";

const REGIMES: { value: ReflectionRegime; label: string; emoji: string }[] = [
  { value: "uptrend", label: "Uptrend", emoji: "📈" },
  { value: "downtrend", label: "Downtrend", emoji: "📉" },
  { value: "range", label: "Range", emoji: "↔️" },
  { value: "chop", label: "Chop", emoji: "🌊" },
  { value: "low-vol-drift", label: "Low-Vol Drift", emoji: "😴" },
  { value: "high-vol-expansion", label: "High-Vol Expansion", emoji: "💥" },
];

const STRATEGIES: { value: ReflectionStrategy; label: string; emoji: string }[] = [
  { value: "mean-reversion", label: "Mean Reversion", emoji: "🔄" },
  { value: "trend-pullback", label: "Trend Pullback", emoji: "📐" },
  { value: "breakout", label: "Breakout", emoji: "🚀" },
  { value: "avoid-observe", label: "Avoid / Observe", emoji: "👀" },
];

const ENTRY_SIGNALS: { value: EntrySignal; label: string }[] = [
  { value: "wick-rejection", label: "Wick Rejection" },
  { value: "liquidity-sweep", label: "Liquidity Sweep" },
  { value: "reclaim", label: "Reclaim" },
  { value: "divergence", label: "Divergence" },
];

const AVOID_ITEMS: { value: AvoidItem; label: string }[] = [
  { value: "trading-against-trend", label: "Trading against trend" },
  { value: "trading-without-confirmation", label: "Trading without confirmation" },
  { value: "trading-in-chop", label: "Trading in low-vol chop" },
  { value: "entering-early", label: "Entering early" },
];

interface PreSessionModalProps {
  onSubmit: (reflection: PreSessionReflection) => void;
}

export default function PreSessionModal({ onSubmit }: PreSessionModalProps) {
  const [regime, setRegime] = useState<ReflectionRegime | "">("");
  const [strategy, setStrategy] = useState<ReflectionStrategy | "">("");
  const [signals, setSignals] = useState<EntrySignal[]>([]);
  const [avoids, setAvoids] = useState<AvoidItem[]>([]);

  const toggleSignal = (s: EntrySignal) =>
    setSignals((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const toggleAvoid = (a: AvoidItem) =>
    setAvoids((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const canSubmit = regime !== "" && strategy !== "";

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      predictedRegime: regime as ReflectionRegime,
      strategy: strategy as ReflectionStrategy,
      entrySignals: signals,
      avoidItems: avoids,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🧭</span>
          <h2 className="text-xl font-bold text-white">Pre-Session Assessment</h2>
        </div>
        <p className="text-slate-400 text-sm mb-5">
          Before trading begins, classify the market and plan your approach. The simulation is paused until you submit.
        </p>

        {/* Regime Prediction */}
        <div className="mb-5">
          <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2 block">
            A. What regime do you predict today?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {REGIMES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRegime(r.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium text-left transition-all ${
                  regime === r.value
                    ? "bg-indigo-600 text-white border border-indigo-400"
                    : "bg-slate-700 text-slate-300 border border-slate-600 hover:border-slate-400"
                }`}
              >
                {r.emoji} {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Strategy */}
        <div className="mb-5">
          <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2 block">
            B. What strategy will you use?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {STRATEGIES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStrategy(s.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium text-left transition-all ${
                  strategy === s.value
                    ? "bg-green-700 text-white border border-green-400"
                    : "bg-slate-700 text-slate-300 border border-slate-600 hover:border-slate-400"
                }`}
              >
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Entry Signals */}
        <div className="mb-5">
          <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2 block">
            C. What signals will confirm entries? <span className="text-slate-500">(select all that apply)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {ENTRY_SIGNALS.map((s) => (
              <button
                key={s.value}
                onClick={() => toggleSignal(s.value)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  signals.includes(s.value)
                    ? "bg-cyan-700 text-white border border-cyan-400"
                    : "bg-slate-700 text-slate-300 border border-slate-600 hover:border-slate-400"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Avoid Items */}
        <div className="mb-6">
          <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2 block">
            D. What will you avoid today? <span className="text-slate-500">(select all that apply)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {AVOID_ITEMS.map((a) => (
              <button
                key={a.value}
                onClick={() => toggleAvoid(a.value)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  avoids.includes(a.value)
                    ? "bg-red-700 text-white border border-red-400"
                    : "bg-slate-700 text-slate-300 border border-slate-600 hover:border-slate-400"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${
            canSubmit
              ? "bg-green-600 hover:bg-green-500 text-white"
              : "bg-slate-700 text-slate-500 cursor-not-allowed"
          }`}
        >
          {canSubmit ? "🚀 Start Trading" : "Select regime and strategy to continue"}
        </button>
      </div>
    </div>
  );
}
