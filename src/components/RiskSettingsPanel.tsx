"use client";

import { useState } from "react";
import { useSimulationStore } from "@/store/simulation";

export default function RiskSettingsPanel() {
  const { riskSettings, setRiskSettings } = useSimulationStore();
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-[11px] text-slate-500 hover:text-slate-300 underline transition-colors"
      >
        ⚙️ Risk Settings
      </button>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">⚙️ Risk Settings</span>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-white text-sm"
        >
          ✕
        </button>
      </div>

      <div>
        <label className="text-slate-400 text-xs uppercase tracking-wide">
          Max Risk Per Trade (%)
        </label>
        <input
          type="number"
          min={0.5}
          max={10}
          step={0.5}
          value={riskSettings.maxRiskPercent}
          onChange={(e) =>
            setRiskSettings({ maxRiskPercent: Math.max(0.5, Math.min(10, Number(e.target.value))) })
          }
          className="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
        />
        <p className="text-[10px] text-slate-500 mt-0.5">
          Max $ risk = {riskSettings.maxRiskPercent}% × $10,000 = ${(riskSettings.maxRiskPercent / 100 * 10000).toFixed(0)}
        </p>
      </div>

      <div>
        <label className="text-slate-400 text-xs uppercase tracking-wide">
          Daily Loss Limit (%)
        </label>
        <input
          type="number"
          min={1}
          max={20}
          step={1}
          value={riskSettings.dailyLossLimitPercent}
          onChange={(e) =>
            setRiskSettings({ dailyLossLimitPercent: Math.max(1, Math.min(20, Number(e.target.value))) })
          }
          className="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
        />
        <p className="text-[10px] text-slate-500 mt-0.5">
          Lockout at -${(riskSettings.dailyLossLimitPercent / 100 * 10000).toFixed(0)} realized loss
        </p>
      </div>
    </div>
  );
}
