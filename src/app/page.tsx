"use client";

import { useCallback } from "react";
import { useSimulationStore } from "@/store/simulation";
import { usePerformanceStore } from "@/store/performance";
import MultiTimeframeView from "@/components/MultiTimeframeView";
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
import PostSessionModal from "@/components/PostSessionModal";
import PerformanceTracker from "@/components/PerformanceTracker";
import SessionExport from "@/components/SessionExport";
import type { PostSessionReflection } from "@/types/market";

export default function Home() {
  const symbol = useSimulationStore((s) => s.symbol);
  const isSessionActive = useSimulationStore((s) => s.candles.length > 0);
  const tradeCount = useSimulationStore((s) => s.trades.length);
  const isPendingExecution = useSimulationStore((s) => s.isPendingExecution);
  const showPostSession = useSimulationStore((s) => s.showPostSession);
  const trades = useSimulationStore((s) => s.trades);

  // Record session performance before clearing state
  const recordCurrentSession = useCallback(() => {
    const sim = useSimulationStore.getState();
    const perf = usePerformanceStore.getState();
    if (sim.sessionRecorded) return;
    if (sim.closedTrades.length === 0) return;

    const closedTrades = sim.closedTrades;
    const wins = closedTrades.filter((t) => t.realizedPnl > 0).length;
    const losses = closedTrades.filter((t) => t.realizedPnl <= 0).length;
    const rValues = closedTrades.map((t) => t.rMultiple).filter((r): r is number => r !== null);
    const totalR = rValues.reduce((sum, r) => sum + r, 0);
    const bestR = rValues.length > 0 ? Math.max(...rValues) : null;
    const worstR = rValues.length > 0 ? Math.min(...rValues) : null;
    const score = sim.getSessionScore();

    perf.recordSession({
      symbol: sim.symbol,
      interval: sim.date,
      difficulty: "", // Not stored in sim state, but could be added later
      startBalance: sim.startingCash,
      endBalance: sim.cash + (sim.position ? sim.position.quantity * sim.currentPrice : 0),
      realizedPnl: sim.realizedPnl,
      totalTrades: closedTrades.length,
      wins,
      losses,
      totalR,
      bestR,
      worstR,
      grade: score.overallGrade,
    });

    useSimulationStore.getState().markSessionRecorded();
  }, []);

  const handlePostSubmit = useCallback((reflection: PostSessionReflection) => {
    recordCurrentSession();
    useSimulationStore.getState().submitPostSession(reflection);
  }, [recordCurrentSession]);

  const handlePostDismiss = useCallback(() => {
    recordCurrentSession();
    useSimulationStore.getState().dismissPostSession();
  }, [recordCurrentSession]);

  const handleReset = useCallback(() => {
    recordCurrentSession();
    useSimulationStore.getState().reset();
  }, [recordCurrentSession]);

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
          <div className="space-y-6">
            <SessionSetup />
            <PerformanceTracker />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Session info bar */}
            <div className="flex items-center gap-4 text-sm">
              <span className="bg-slate-700 px-3 py-1 rounded font-mono font-bold">
                {symbol}
              </span>
              <span className="text-slate-400">{tradeCount} trades</span>
              {isPendingExecution && (
                <span className="text-yellow-400 text-xs animate-pulse">
                  ⏳ Executing...
                </span>
              )}
              <button
                onClick={handleReset}
                className="ml-auto text-slate-400 hover:text-white text-sm underline"
              >
                New Session
              </button>
              <SessionExport />
            </div>

            {/* Market context (regime + events + sector correlation) */}
            <MarketContextBar />

            {/* Indicator toggles */}
            <IndicatorToolbar />

            {/* Main layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Chart + Controls */}
              <div className="lg:col-span-3 space-y-4">
                <MultiTimeframeView />
                <ControlPanel />
                <TradeHistory />
                <SetupStats />
              </div>

              {/* Sidebar: Order panel + extras */}
              <div className="lg:col-span-1 space-y-4">
                <OrderPanel />
                <OrderFlowPanel />
                <SessionScoreCard />
                <PerformanceTracker />
                <RiskSettingsPanel />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Post-Session Reflection Modal */}
      {showPostSession && (
        <PostSessionModal
          trades={trades}
          onSubmit={handlePostSubmit}
          onDismiss={handlePostDismiss}
        />
      )}
    </main>
  );
}
