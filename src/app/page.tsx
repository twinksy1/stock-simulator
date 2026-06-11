"use client";

import { useSimulationStore } from "@/store/simulation";
import ChartWithIndicators from "@/components/ChartWithIndicators";
import ControlPanel from "@/components/ControlPanel";
import OrderPanel from "@/components/OrderPanel";
import SessionSetup from "@/components/SessionSetup";
import IndicatorToolbar from "@/components/IndicatorToolbar";
import TradeHistory from "@/components/TradeHistory";
import RiskSettingsPanel from "@/components/RiskSettingsPanel";
import MarketContextBar from "@/components/MarketContextBar";
import SessionScoreCard from "@/components/SessionScoreCard";
import SetupStats from "@/components/SetupStats";
import OrderFlowPanel from "@/components/OrderFlowPanel";
import PreSessionModal from "@/components/PreSessionModal";
import PostSessionModal from "@/components/PostSessionModal";

export default function Home() {
  const symbol = useSimulationStore((s) => s.symbol);
  const isSessionActive = useSimulationStore((s) => s.candles.length > 0);
  const tradeCount = useSimulationStore((s) => s.trades.length);
  const isPendingExecution = useSimulationStore((s) => s.isPendingExecution);
  const isStudyPhase = useSimulationStore((s) => s.isStudyPhase);
  const goLive = useSimulationStore((s) => s.goLive);
  const contextEndIndex = useSimulationStore((s) => s.contextEndIndex);
  const showPreSession = useSimulationStore((s) => s.showPreSession);
  const showPostSession = useSimulationStore((s) => s.showPostSession);
  const submitPreSession = useSimulationStore((s) => s.submitPreSession);
  const submitPostSession = useSimulationStore((s) => s.submitPostSession);
  const dismissPostSession = useSimulationStore((s) => s.dismissPostSession);
  const trades = useSimulationStore((s) => s.trades);

  return (
    <main className="min-h-screen bg-slate-900 text-white p-6">
      <header className="max-w-7xl mx-auto mb-6">
        <h1 className="text-3xl font-bold">
          📈 Stock Replay Simulator
        </h1>
        <p className="text-slate-400 mt-1">
          Practice trading with real market patterns. No risk, all skill.
        </p>
      </header>

      <div className="max-w-7xl mx-auto">
        {!isSessionActive ? (
          <SessionSetup />
        ) : (
          <div className="space-y-4">
            {/* Study Phase Banner */}
            {isStudyPhase && (
              <div className="bg-indigo-900/40 border border-indigo-500/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-indigo-200 font-semibold text-sm flex items-center gap-2">
                      📖 Study Phase — Analyze Historical Context
                    </h3>
                    <p className="text-indigo-300/70 text-xs mt-1">
                      Scroll through {Math.round(contextEndIndex / 660)} days of prior history. Study trend, support/resistance, volume, and indicators.
                      No trading allowed yet — when ready, go live.
                    </p>
                  </div>
                  <button
                    onClick={goLive}
                    className="bg-green-600 hover:bg-green-500 text-white px-5 py-2 rounded-lg font-bold transition-colors whitespace-nowrap"
                  >
                    🚀 Go Live
                  </button>
                </div>
              </div>
            )}

            {/* Session info bar */}
            <div className="flex items-center gap-4 text-sm">
              <span className="bg-slate-700 px-3 py-1 rounded font-mono font-bold">
                {symbol}
              </span>
              {!isStudyPhase && <span className="text-slate-400">{tradeCount} trades</span>}
              {isStudyPhase && <span className="text-indigo-400 text-xs">📖 Study Mode</span>}
              {isPendingExecution && (
                <span className="text-yellow-400 text-xs animate-pulse">
                  ⏳ Executing...
                </span>
              )}
              <button
                onClick={() => useSimulationStore.getState().reset()}
                className="ml-auto text-slate-400 hover:text-white text-sm underline"
              >
                New Session
              </button>
            </div>

            {/* Market context (regime + events + sector correlation) */}
            <MarketContextBar />

            {/* Indicator toggles */}
            <IndicatorToolbar />

            {/* Main layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Chart + Controls */}
              <div className="lg:col-span-3 space-y-4">
                <ChartWithIndicators />
                <ControlPanel />
                <TradeHistory />
                <SetupStats />
              </div>

              {/* Sidebar: Order panel + extras */}
              <div className="lg:col-span-1 space-y-4">
                <OrderPanel />
                <OrderFlowPanel />
                <SessionScoreCard />
                <RiskSettingsPanel />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pre-Session Reflection Modal */}
      {showPreSession && (
        <PreSessionModal onSubmit={submitPreSession} />
      )}

      {/* Post-Session Reflection Modal */}
      {showPostSession && (
        <PostSessionModal
          trades={trades}
          onSubmit={submitPostSession}
          onDismiss={dismissPostSession}
        />
      )}
    </main>
  );
}
