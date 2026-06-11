"use client";

import { useState } from "react";
import type {
  PostSessionReflection,
  ReflectionRegime,
  StrategyAlignment,
  Trade,
} from "@/types/market";

const REGIMES: { value: ReflectionRegime; label: string; emoji: string }[] = [
  { value: "uptrend", label: "Uptrend", emoji: "📈" },
  { value: "downtrend", label: "Downtrend", emoji: "📉" },
  { value: "range", label: "Range", emoji: "↔️" },
  { value: "chop", label: "Chop", emoji: "🌊" },
  { value: "low-vol-drift", label: "Low-Vol Drift", emoji: "😴" },
  { value: "high-vol-expansion", label: "High-Vol Expansion", emoji: "💥" },
];

const ALIGNMENTS: { value: StrategyAlignment; label: string; emoji: string }[] = [
  { value: "yes", label: "Yes", emoji: "✅" },
  { value: "partially", label: "Partially", emoji: "⚠️" },
  { value: "no", label: "No", emoji: "❌" },
];

interface PostSessionModalProps {
  trades: Trade[];
  onSubmit: (reflection: PostSessionReflection) => void;
  onDismiss: () => void;
}

export default function PostSessionModal({ trades, onSubmit, onDismiss }: PostSessionModalProps) {
  const [regime, setRegime] = useState<ReflectionRegime | "">("");
  const [alignment, setAlignment] = useState<StrategyAlignment | "">("");
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [violatedIds, setViolatedIds] = useState<string[]>([]);
  const [lessons, setLessons] = useState("");
  const [nextTime, setNextTime] = useState("");

  const buyTrades = trades.filter((t) => t.side === "buy");

  const toggleMatched = (id: string) => {
    setMatchedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setViolatedIds((prev) => prev.filter((x) => x !== id));
  };

  const toggleViolated = (id: string) => {
    setViolatedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setMatchedIds((prev) => prev.filter((x) => x !== id));
  };

  const canSubmit = regime !== "" && alignment !== "";

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      actualRegime: regime as ReflectionRegime,
      strategyAlignment: alignment as StrategyAlignment,
      matchedTradeIds: matchedIds,
      violatedTradeIds: violatedIds,
      lessonsLearned: lessons,
      nextTimeDifferent: nextTime,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">📋</span>
          <h2 className="text-xl font-bold text-white">Post-Session Reflection</h2>
        </div>
        <p className="text-slate-400 text-sm mb-5">
          Session complete. Review your performance and identify areas for improvement.
        </p>

        {/* Actual Regime */}
        <div className="mb-5">
          <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2 block">
            A. What regime did the day actually produce?
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

        {/* Strategy Alignment */}
        <div className="mb-5">
          <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2 block">
            B. Did you use the correct strategy for this regime?
          </label>
          <div className="flex gap-2">
            {ALIGNMENTS.map((a) => (
              <button
                key={a.value}
                onClick={() => setAlignment(a.value)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium text-center transition-all ${
                  alignment === a.value
                    ? "bg-green-700 text-white border border-green-400"
                    : "bg-slate-700 text-slate-300 border border-slate-600 hover:border-slate-400"
                }`}
              >
                {a.emoji} {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Trade Classification */}
        {buyTrades.length > 0 && (
          <div className="mb-5">
            <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2 block">
              C/D. Classify your trades
            </label>
            <p className="text-slate-500 text-xs mb-2">
              Click once = matched setup (green). Click again = violated rules (red). Click again = unclassified.
            </p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {buyTrades.map((trade, idx) => {
                const isMatched = matchedIds.includes(trade.id);
                const isViolated = violatedIds.includes(trade.id);
                const time = new Date(trade.time * 1000).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                  timeZone: "America/New_York",
                });

                const handleClick = () => {
                  if (!isMatched && !isViolated) {
                    toggleMatched(trade.id);
                  } else if (isMatched) {
                    setMatchedIds((prev) => prev.filter((x) => x !== trade.id));
                    toggleViolated(trade.id);
                  } else {
                    setViolatedIds((prev) => prev.filter((x) => x !== trade.id));
                  }
                };

                return (
                  <button
                    key={trade.id}
                    onClick={handleClick}
                    className={`w-full text-left px-3 py-1.5 rounded text-xs font-mono transition-all ${
                      isMatched
                        ? "bg-green-900/50 border border-green-500 text-green-300"
                        : isViolated
                        ? "bg-red-900/50 border border-red-500 text-red-300"
                        : "bg-slate-700 border border-slate-600 text-slate-300 hover:border-slate-400"
                    }`}
                  >
                    #{idx + 1} — BUY {trade.quantity} @ ${trade.price.toFixed(2)} ({time})
                    {isMatched && " ✅ Matched"}
                    {isViolated && " ❌ Violated"}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Lessons Learned */}
        <div className="mb-4">
          <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2 block">
            E. What did you learn today?
          </label>
          <textarea
            value={lessons}
            onChange={(e) => setLessons(e.target.value)}
            placeholder="Key takeaway from this session..."
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
            rows={2}
          />
        </div>

        {/* Next Time */}
        <div className="mb-6">
          <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2 block">
            F. What will you do differently next time?
          </label>
          <textarea
            value={nextTime}
            onChange={(e) => setNextTime(e.target.value)}
            placeholder="Specific change for next session..."
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
            rows={2}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${
              canSubmit
                ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                : "bg-slate-700 text-slate-500 cursor-not-allowed"
            }`}
          >
            {canSubmit ? "📊 Submit Reflection" : "Select regime and alignment"}
          </button>
          <button
            onClick={onDismiss}
            className="px-4 py-3 rounded-lg text-sm text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 transition-all"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
