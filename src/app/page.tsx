"use client";

import { useSimulationStore } from "@/store/simulation";
import ChartWithIndicators from "@/components/ChartWithIndicators";
import ControlPanel from "@/components/ControlPanel";
import OrderPanel from "@/components/OrderPanel";
import SessionSetup from "@/components/SessionSetup";
import IndicatorToolbar from "@/components/IndicatorToolbar";

export default function Home() {
  const { symbol, candles, trades } = useSimulationStore();
  const isSessionActive = candles.length > 0;

  return (
    <main className="min-h-screen bg-slate-900 text-white p-6">
      <header className="max-w-6xl mx-auto mb-6">
        <h1 className="text-3xl font-bold">
          📈 Stock Replay Simulator
        </h1>
        <p className="text-slate-400 mt-1">
          Practice trading with real market patterns. No risk, all skill.
        </p>
      </header>

      <div className="max-w-6xl mx-auto">
        {!isSessionActive ? (
          <SessionSetup />
        ) : (
          <div className="space-y-4">
            {/* Session info bar */}
            <div className="flex items-center gap-4 text-sm">
              <span className="bg-slate-700 px-3 py-1 rounded font-mono font-bold">
                {symbol}
              </span>
              <span className="text-slate-400">{trades.length} trades</span>
              <button
                onClick={() => useSimulationStore.getState().reset()}
                className="ml-auto text-slate-400 hover:text-white text-sm underline"
              >
                New Session
              </button>
            </div>

            {/* Indicator toggles */}
            <IndicatorToolbar />

            {/* Main layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Chart + Controls */}
              <div className="lg:col-span-3 space-y-4">
                <ChartWithIndicators />
                <ControlPanel />
              </div>

              {/* Order panel */}
              <div className="lg:col-span-1">
                <OrderPanel />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
