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
        ⚙️ Risk & Friction Settings
      </button>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">⚙️ Risk & Friction</span>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-white text-sm"
        >
          ✕
        </button>
      </div>

      {/* Risk Management */}
      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold border-b border-slate-700 pb-1">Risk Management</div>

      <div>
        <label className="text-slate-400 text-xs">Max Risk Per Trade (%)</label>
        <input
          type="number" min={0.5} max={10} step={0.5}
          value={riskSettings.maxRiskPercent}
          onChange={(e) => setRiskSettings({ maxRiskPercent: Math.max(0.5, Math.min(10, Number(e.target.value))) })}
          className="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label className="text-slate-400 text-xs">Daily Loss Limit (%)</label>
        <input
          type="number" min={1} max={20} step={1}
          value={riskSettings.dailyLossLimitPercent}
          onChange={(e) => setRiskSettings({ dailyLossLimitPercent: Math.max(1, Math.min(20, Number(e.target.value))) })}
          className="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
        />
        <p className="text-[10px] text-slate-500 mt-0.5">Lockout at -${(riskSettings.dailyLossLimitPercent / 100 * 10000).toFixed(0)}</p>
      </div>

      {/* Execution Friction */}
      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold border-b border-slate-700 pb-1 mt-2">Execution Friction</div>

      <div>
        <label className="text-slate-400 text-xs">Execution Delay</label>
        <select
          value={riskSettings.executionDelayMs}
          onChange={(e) => setRiskSettings({ executionDelayMs: Number(e.target.value) })}
          className="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value={0}>Instant (unrealistic)</option>
          <option value={500}>500ms (fast)</option>
          <option value={1000}>1s (realistic)</option>
          <option value={2000}>2s (hesitation)</option>
        </select>
      </div>

      <div>
        <label className="text-slate-400 text-xs">Min Hold Time (candles)</label>
        <select
          value={riskSettings.minHoldCandles}
          onChange={(e) => setRiskSettings({ minHoldCandles: Number(e.target.value) })}
          className="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value={0}>None (unrealistic)</option>
          <option value={3}>3 min (quick scalp)</option>
          <option value={5}>5 min (short hold)</option>
          <option value={10}>10 min (swing)</option>
          <option value={15}>15 min (patient)</option>
        </select>
        <p className="text-[10px] text-slate-500 mt-0.5">Forces conviction — can&apos;t panic-sell immediately</p>
      </div>

      <div>
        <label className="text-slate-400 text-xs">Cooldown After Sell (candles)</label>
        <select
          value={riskSettings.cooldownCandles}
          onChange={(e) => setRiskSettings({ cooldownCandles: Number(e.target.value) })}
          className="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value={0}>None</option>
          <option value={3}>3 min</option>
          <option value={5}>5 min</option>
          <option value={10}>10 min</option>
          <option value={15}>15 min</option>
        </select>
        <p className="text-[10px] text-slate-500 mt-0.5">Prevents revenge trading & FOMO re-entries</p>
      </div>

      <div>
        <label className="text-slate-400 text-xs">Bid/Ask Spread (bps)</label>
        <select
          value={riskSettings.spreadBps}
          onChange={(e) => setRiskSettings({ spreadBps: Number(e.target.value) })}
          className="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value={0}>0 bps (no spread)</option>
          <option value={5}>5 bps (tight / large-cap)</option>
          <option value={10}>10 bps (typical)</option>
          <option value={25}>25 bps (wide / small-cap)</option>
          <option value={50}>50 bps (illiquid)</option>
        </select>
        <p className="text-[10px] text-slate-500 mt-0.5">Buy at ask, sell at bid — punishes overtrading</p>
      </div>

      <div>
        <label className="text-slate-400 text-xs">Commission Per Trade ($)</label>
        <select
          value={riskSettings.commissionPerTrade}
          onChange={(e) => setRiskSettings({ commissionPerTrade: Number(e.target.value) })}
          className="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value={0}>$0 (Fidelity/Robinhood)</option>
          <option value={0.65}>$0.65 (options-like)</option>
          <option value={1}>$1.00</option>
          <option value={5}>$5.00 (prop firm)</option>
        </select>
        <p className="text-[10px] text-slate-500 mt-0.5">Small fees that compound with overtrading</p>
      </div>
    </div>
  );
}
