"use client";

import { useEffect, useRef } from "react";
import { useSimulationStore } from "@/store/simulation";
import type { PlaybackSpeed } from "@/types/market";

const SPEEDS: PlaybackSpeed[] = [1, 2, 5, 10];

export default function ControlPanel() {
  const { isPlaying, speed, currentIndex, candles, play, pause, setSpeed, jumpTo, tick, isStudyPhase, contextEndIndex, microNoiseEnabled, microTicksPerCandle, viewMode, altCandles, altInterval, toggleView, date: tradingInterval } =
    useSimulationStore();

  const hasAltView = altCandles.length > 0 && !isStudyPhase;

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (isPlaying) {
      // With micro-noise: fire N times faster so one full candle still takes ~1s at 1x speed
      const baseMs = Math.max(50, 1000 / speed);
      const ms = microNoiseEnabled ? Math.max(30, baseMs / microTicksPerCandle) : baseMs;
      intervalRef.current = setInterval(() => {
        tick();
      }, ms);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speed, tick, microNoiseEnabled, microTicksPerCandle]);

  const progress = candles.length > 0 ? (currentIndex / (candles.length - 1)) * 100 : 0;

  // Determine current time and session context
  const currentCandle = candles[currentIndex];
  const currentTime = currentCandle
    ? new Date(currentCandle.time * 1000).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/New_York",
      }) + " ET"
    : "--:--";

  // Determine which day we're on (multi-day support)
  const firstTime = candles.length > 0 ? candles[0].time : 0;
  const currentTimestamp = currentCandle?.time ?? 0;
  const dayNumber = Math.floor((currentTimestamp - firstTime) / 86400) + 1;
  const totalDays = candles.length > 0 ? Math.floor((candles[candles.length - 1].time - firstTime) / 86400) + 1 : 1;

  // Determine market session using Eastern Time
  const etTimeStr = currentCandle ? new Date(currentCandle.time * 1000).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" }) : "00:00";
  const [etH, etM] = etTimeStr.split(":").map(Number);
  const hour = etH + etM / 60;
  const sessionLabel = hour < 9.5 ? "Pre-Market" : hour >= 16 ? "After-Hours" : "Market Hours";
  const sessionColor = hour < 9.5 ? "text-purple-400" : hour >= 16 ? "text-orange-400" : "text-green-400";

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center gap-4 mb-3">
        {/* Play/Pause */}
        <button
          onClick={() => (isPlaying ? pause() : play())}
          disabled={candles.length === 0 || isStudyPhase}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white px-4 py-2 rounded font-semibold transition-colors"
        >
          {isStudyPhase ? "📖 Study" : isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>

        {/* Speed buttons */}
        <div className="flex gap-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                speed === s
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Timeframe view toggle (e.g. 2m ↔ 5m). Display-only; trading stays on the base timeframe. */}
        {hasAltView && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wide mr-0.5">View</span>
            <button
              onClick={() => { if (viewMode !== "base") toggleView(); }}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === "base" ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
              title="Trade on this timeframe"
            >
              {tradingInterval}
            </button>
            <button
              onClick={() => { if (viewMode !== "alt") toggleView(); }}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === "alt" ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
              title="Higher-timeframe context view (completed bars only)"
            >
              {altInterval}
            </button>
          </div>
        )}

        {/* Current time + session info */}
        <div className="ml-auto text-right">
          <span className="text-slate-300 font-mono text-sm">{currentTime}</span>
          <div className="flex items-center gap-2 text-[10px]">
            <span className={sessionColor}>{sessionLabel}</span>
            {totalDays > 1 && (
              <span className="text-slate-500">Day {dayNumber}/{totalDays}</span>
            )}
          </div>
        </div>
      </div>

      {/* Time slider */}
      <input
        type="range"
        min={0}
        max={isStudyPhase ? contextEndIndex : Math.max(0, candles.length - 1)}
        value={currentIndex}
        onChange={(e) => jumpTo(Number(e.target.value))}
        className="w-full accent-blue-500"
      />
      <div className="flex justify-between text-xs text-slate-500 mt-1">
        <span>{isStudyPhase ? "History Start" : "Start"}</span>
        <span>
          {isStudyPhase
            ? `Studying history • ${contextEndIndex} candles`
            : `${progress.toFixed(0)}% complete • ${candles.length - contextEndIndex} live candles`}
        </span>
        <span>{isStudyPhase ? "Present →" : "End"}</span>
      </div>
    </div>
  );
}
