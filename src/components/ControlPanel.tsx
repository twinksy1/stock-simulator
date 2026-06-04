"use client";

import { useEffect, useRef } from "react";
import { useSimulationStore } from "@/store/simulation";
import type { PlaybackSpeed } from "@/types/market";

const SPEEDS: PlaybackSpeed[] = [1, 2, 5, 10];

export default function ControlPanel() {
  const { isPlaying, speed, currentIndex, candles, play, pause, setSpeed, jumpTo, tick } =
    useSimulationStore();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick engine: advance simulation based on speed
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (isPlaying) {
      const ms = Math.max(50, 1000 / speed);
      intervalRef.current = setInterval(() => {
        tick();
      }, ms);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speed, tick]);

  const progress = candles.length > 0 ? (currentIndex / (candles.length - 1)) * 100 : 0;
  const currentTime = candles[currentIndex]
    ? new Date(candles[currentIndex].time * 1000).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "--:--";

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

        {/* Current time */}
        <span className="text-slate-300 font-mono text-sm ml-auto">{currentTime}</span>
      </div>

      {/* Time slider */}
      <input
        type="range"
        min={0}
        max={Math.max(0, candles.length - 1)}
        value={currentIndex}
        onChange={(e) => jumpTo(Number(e.target.value))}
        className="w-full accent-blue-500"
      />
      <div className="flex justify-between text-xs text-slate-500 mt-1">
        <span>9:30 AM</span>
        <span>{progress.toFixed(0)}% complete</span>
        <span>4:00 PM</span>
      </div>
    </div>
  );
}
