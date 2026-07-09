"use client";

import { useSimulationStore } from "@/store/simulation";
import ChartWithIndicators from "@/components/ChartWithIndicators";

/**
 * Multi-timeframe layout: the traded (base) timeframe renders large on top, and
 * each higher-timeframe context view renders as a smaller pane in a row below.
 * All panes advance together off the same market clock (the alt panes reveal only
 * completed higher-TF bars), so macro intent and micro confirmation stay in sync.
 */
export default function MultiTimeframeView() {
  const altViews = useSimulationStore((s) => s.altViews);
  const tradingInterval = useSimulationStore((s) => s.date);

  return (
    <div className="space-y-3">
      {/* Base / execution timeframe */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wide">
            {tradingInterval}
          </span>
          <span className="text-[10px] text-slate-500">execution · trades here</span>
        </div>
        <ChartWithIndicators viewInterval="base" />
      </div>

      {/* Higher-timeframe context panes */}
      {altViews.length > 0 && (
        <div
          className={`grid gap-3 ${
            altViews.length > 1 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
          }`}
        >
          {altViews.map((v) => (
            <div key={v.interval} className="bg-slate-900/40 rounded-lg p-2 border border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  {v.interval}
                </span>
                <span className="text-[10px] text-slate-500">context · higher timeframe</span>
              </div>
              <ChartWithIndicators viewInterval={v.interval} compact />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
