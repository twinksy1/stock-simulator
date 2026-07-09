"use client";

import { useEffect, useRef } from "react";
import { useSimulationStore } from "@/store/simulation";
import type { PlaybackSpeed } from "@/types/market";

const SPEEDS: PlaybackSpeed[] = [1, 2, 5, 10];

export default function ControlPanel() {
  const { isPlaying, speed, currentIndex, candles, play, pause, setSpeed, tick, microNoiseEnabled, microTicksPerCandle, tradingStartOffset } =
    useSimulationStore();

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

  const liveTotal = Math.max(1, candles.length - 1 - tradingStartOffset);
  const liveElapsed = Math.max(0, currentIndex - tradingStartOffset);
  const progress = candles.length > 0 ? Math.min(100, (liveElapsed / liveTotal) * 100) : 0;

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
          disabled={candles.length === 0}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white px-4 py-2 rounded font-semibold transition-colors"
        >
          {isPlaying ? "⏸ Pause" : "▶ Play"}
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

      {/* Progress readout (no scrubber — playback is driven by Play + speed) */}
      <div className="flex justify-between text-xs text-slate-500">
        <span>Start</span>
        <span>{`${progress.toFixed(0)}% complete`}</span>
        <span>End</span>
      </div>
    </div>
  );
}
