"use client";

import { useState } from "react";
import type { Confidence, SetupLabel, TradeJournal } from "@/types/market";

const SETUP_LABELS: { value: SetupLabel; label: string }[] = [
  { value: "breakout", label: "Breakout" },
  { value: "breakdown", label: "Breakdown" },
  { value: "pullback", label: "Pullback Buy" },
  { value: "reversal", label: "Reversal" },
  { value: "momentum", label: "Momentum" },
  { value: "mean-reversion", label: "Mean Reversion" },
  { value: "support-bounce", label: "Support Bounce" },
  { value: "resistance-reject", label: "Resistance Reject" },
  { value: "ma-reclaim", label: "MA Reclaim" },
  { value: "rsi-divergence", label: "RSI Divergence" },
  { value: "custom", label: "Custom..." },
];

interface TradeJournalModalProps {
  mode: "entry" | "exit";
  onConfirm: (journal: TradeJournal) => void;
  onSkip: () => void;
  onCancel: () => void;
}

export default function TradeJournalModal({ mode, onConfirm, onSkip, onCancel }: TradeJournalModalProps) {
  const [thesis, setThesis] = useState("");
  const [confidence, setConfidence] = useState<Confidence>(3);
  const [setupLabel, setSetupLabel] = useState<SetupLabel | "">("");
  const [customSetupLabel, setCustomSetupLabel] = useState("");
  const [exitReason, setExitReason] = useState("");

  const handleSubmit = () => {
    const journal: TradeJournal = {};
    if (mode === "entry") {
      if (thesis) journal.thesis = thesis;
      journal.confidence = confidence;
      if (setupLabel) journal.setupLabel = setupLabel as SetupLabel;
      if (setupLabel === "custom" && customSetupLabel) {
        journal.customSetupLabel = customSetupLabel;
      }
    } else {
      if (exitReason) journal.exitReason = exitReason;
    }
    onConfirm(journal);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-5 w-full max-w-md shadow-xl">
        <h3 className="text-lg font-bold text-white mb-1">
          {mode === "entry" ? "📝 Entry Journal" : "📝 Exit Journal"}
        </h3>
        <p className="text-slate-400 text-xs mb-4">
          {mode === "entry"
            ? "Document your reasoning before entering this trade."
            : "Why are you exiting this position?"}
        </p>

        <div className="space-y-3">
          {mode === "entry" && (
            <>
              {/* Thesis */}
              <div>
                <label className="text-slate-400 text-xs uppercase tracking-wide">
                  Trade Thesis
                </label>
                <textarea
                  value={thesis}
                  onChange={(e) => setThesis(e.target.value)}
                  placeholder="Why are you taking this trade? What's your edge?"
                  rows={2}
                  className="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Confidence */}
              <div>
                <label className="text-slate-400 text-xs uppercase tracking-wide">
                  Confidence Level
                </label>
                <div className="flex gap-1 mt-1">
                  {([1, 2, 3, 4, 5] as Confidence[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => setConfidence(level)}
                      className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                        confidence === level
                          ? level <= 2
                            ? "bg-red-600 text-white"
                            : level === 3
                            ? "bg-yellow-600 text-white"
                            : "bg-green-600 text-white"
                          : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 px-1">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>

              {/* Setup Label */}
              <div>
                <label className="text-slate-400 text-xs uppercase tracking-wide">
                  Setup Type
                </label>
                <select
                  value={setupLabel}
                  onChange={(e) => setSetupLabel(e.target.value as SetupLabel | "")}
                  className="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select setup...</option>
                  {SETUP_LABELS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {setupLabel === "custom" && (
                  <input
                    type="text"
                    value={customSetupLabel}
                    onChange={(e) => setCustomSetupLabel(e.target.value)}
                    placeholder="Describe your setup..."
                    className="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                )}
              </div>
            </>
          )}

          {mode === "exit" && (
            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wide">
                Exit Reason
              </label>
              <textarea
                value={exitReason}
                onChange={(e) => setExitReason(e.target.value)}
                placeholder="Why are you closing? Hit target? Stop hit? Changed thesis?"
                rows={3}
                className="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSubmit}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded font-semibold transition-colors"
          >
            {mode === "entry" ? "Confirm Entry" : "Confirm Exit"}
          </button>
          <button
            onClick={onSkip}
            className="px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded transition-colors text-sm"
          >
            Skip
          </button>
          <button
            onClick={onCancel}
            className="px-4 bg-red-900/50 hover:bg-red-800/50 text-red-300 py-2 rounded transition-colors text-sm border border-red-700/50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
