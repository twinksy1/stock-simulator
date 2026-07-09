"use client";

import { useEffect, useRef, useMemo } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  createSeriesMarkers,
} from "lightweight-charts";
import type { IChartApi, ISeriesApi, Time, SeriesMarker, ISeriesMarkersPluginApi } from "lightweight-charts";
import { useSimulationStore } from "@/store/simulation";
import { useIndicatorStore } from "@/store/indicators";
import { computeIndicators } from "@/lib/indicators";
import type { Candle } from "@/types/market";

/** Convert an interval label (e.g. "5m", "1h", "1d") to seconds. */
function intervalToSeconds(interval: string): number {
  const m = /^(\d+)(m|h|d)$/.exec(interval);
  if (!m) return 300;
  const n = parseInt(m[1], 10);
  const unit = m[2];
  return unit === "m" ? n * 60 : unit === "h" ? n * 3600 : n * 86400;
}

/** Detect completed bearish legs in visible candles.
 *  A "drop" = swing high → swing low where at least 2 candles moved down.
 *  Returns array of { index, pctDrop } for completed drops only. */
function detectDrops(candles: Candle[], upToIndex: number): { index: number; pctDrop: number }[] {
  const drops: { index: number; pctDrop: number }[] = [];
  if (upToIndex < 2) return drops;

  let legHigh = candles[0].high;
  let legLow = candles[0].low;
  let legHighIdx = 0;
  let inDrop = false;
  let legCandles = 0;

  for (let i = 1; i <= upToIndex; i++) {
    const c = candles[i];
    if (!c) break;

    if (c.close < candles[i - 1].close) {
      // Bearish candle — extend or start a drop
      if (!inDrop) {
        // Start new potential drop from the highest high in recent upswing
        legHigh = candles[i - 1].high;
        legHighIdx = i - 1;
        // Check if any of the last few candles had a higher high
        for (let j = Math.max(0, i - 3); j < i; j++) {
          if (candles[j].high > legHigh) {
            legHigh = candles[j].high;
            legHighIdx = j;
          }
        }
        legLow = c.low;
        inDrop = true;
        legCandles = 1;
      } else {
        legLow = Math.min(legLow, c.low);
        legCandles++;
      }
    } else if (inDrop) {
      // Reversal — drop is complete
      if (legCandles >= 2 && legHigh > 0) {
        const pctDrop = ((legHigh - legLow) / legHigh) * 100;
        if (pctDrop >= 0.1) {
          drops.push({ index: i - 1, pctDrop });
        }
      }
      // Reset — start tracking potential new high
      legHigh = c.high;
      legHighIdx = i;
      legLow = c.low;
      inDrop = false;
      legCandles = 0;
    } else {
      // Continuing up — track the high
      if (c.high > legHigh) {
        legHigh = c.high;
        legHighIdx = i;
      }
    }
  }
  // Don't record in-progress drops — only completed ones
  return drops;
}

export default function ChartWithIndicators({
  viewInterval = "base",
  compact = false,
}: {
  viewInterval?: string;
  compact?: boolean;
} = {}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);

  const mainChartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);

  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const signalLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdHistRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const maSeriesMapRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const bbUpperRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbMiddleRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<"Line"> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const dropMarkersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  const candles = useSimulationStore((s) => s.candles);
  const currentIndex = useSimulationStore((s) => s.currentIndex);
  const currentPrice = useSimulationStore((s) => s.currentPrice);
  const altViews = useSimulationStore((s) => s.altViews);

  // Which series this pane renders: "base" (the traded series) or an alt interval.
  const activeView = viewInterval;

  // Display series: in an alt view show the higher-TF candles up to the last
  // COMPLETED bar at the current base-timeframe market time (lookahead-safe).
  // Trading/engine state stays on the base series; this only affects rendering.
  const { displayCandles, displayIndex } = useMemo(() => {
    if (activeView !== "base") {
      const av = altViews.find((v) => v.interval === activeView);
      if (av && av.candles.length > 0) {
        const currentTime = candles[currentIndex]?.time ?? 0;
        const altSecs = intervalToSeconds(av.interval);
        let di = -1;
        for (let i = 0; i < av.candles.length; i++) {
          if (av.candles[i].time + altSecs <= currentTime) di = i;
          else break;
        }
        return { displayCandles: av.candles, displayIndex: di };
      }
    }
    return { displayCandles: candles, displayIndex: currentIndex };
  }, [activeView, altViews, candles, currentIndex]);

  const { showVolume, showRSI, showMACD, showBollingerBands, showVWAP, showDropPercent, movingAverages } = useIndicatorStore();
  // Compact alt-context panes suppress the sub-charts to stay short and readable.
  const effShowRSI = compact ? false : showRSI;
  const effShowMACD = compact ? false : showMACD;
  const enabledMAs = useMemo(
    () => movingAverages.filter((ma) => ma.enabled),
    [movingAverages]
  );

  // Compute indicators for the full displayed dataset
  const maKey = movingAverages.map((m) => `${m.id}:${m.type}:${m.period}`).join(",");
  const indicators = useMemo(() => {
    if (displayCandles.length === 0) return null;
    return computeIndicators(displayCandles, movingAverages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayCandles, maKey]);

  // Create all three charts once
  useEffect(() => {
    if (!chartContainerRef.current || !rsiContainerRef.current || !macdContainerRef.current)
      return;

    const commonOptions = {
      layout: { background: { color: "#0f172a" }, textColor: "#94a3b8" },
      grid: { vertLines: { color: "#1e293b" }, horzLines: { color: "#1e293b" } },
      timeScale: {
        timeVisible: false,
        secondsVisible: false,
        tickMarkFormatter: (_time: number, _tickMarkType: number, _locale: string) => {
          return "";
        },
      },
      localization: {
        timeFormatter: () => {
          return "";
        },
      },
    };

    // Main chart
    const mainChart = createChart(chartContainerRef.current, {
      ...commonOptions,
      width: chartContainerRef.current.clientWidth,
      height: compact ? 200 : 340,
    });

    const candleSeries = mainChart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    // Drop % markers plugin
    const dropMarkers = createSeriesMarkers(candleSeries);
    dropMarkersRef.current = dropMarkers;

    const volumeSeries = mainChart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    mainChart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    // RSI chart
    const rsiChart = createChart(rsiContainerRef.current, {
      ...commonOptions,
      width: rsiContainerRef.current.clientWidth,
      height: 120,
    });
    const rsiSeries = rsiChart.addSeries(LineSeries, {
      color: "#06b6d4",
      lineWidth: 1,
      priceLineVisible: false,
    });
    rsiChart.priceScale("right").applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });

    // MACD chart
    const macdChart = createChart(macdContainerRef.current, {
      ...commonOptions,
      width: macdContainerRef.current.clientWidth,
      height: 120,
    });
    const macdLine = macdChart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const signalLine = macdChart.addSeries(LineSeries, {
      color: "#f97316",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const macdHist = macdChart.addSeries(HistogramSeries, {
      priceLineVisible: false,
      lastValueVisible: false,
    });

    // Sync time scales
    mainChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) {
        rsiChart.timeScale().setVisibleLogicalRange(range);
        macdChart.timeScale().setVisibleLogicalRange(range);
      }
    });

    mainChartRef.current = mainChart;
    rsiChartRef.current = rsiChart;
    macdChartRef.current = macdChart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    rsiSeriesRef.current = rsiSeries;
    macdLineRef.current = macdLine;
    signalLineRef.current = signalLine;
    macdHistRef.current = macdHist;

    // Bollinger Bands series (on main chart)
    const bbUpper = mainChart.addSeries(LineSeries, {
      color: "#a78bfa",
      lineWidth: 1,
      lineStyle: 2, // dashed
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const bbMiddle = mainChart.addSeries(LineSeries, {
      color: "#a78bfa",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const bbLower = mainChart.addSeries(LineSeries, {
      color: "#a78bfa",
      lineWidth: 1,
      lineStyle: 2, // dashed
      priceLineVisible: false,
      lastValueVisible: false,
    });
    bbUpperRef.current = bbUpper;
    bbMiddleRef.current = bbMiddle;
    bbLowerRef.current = bbLower;

    // VWAP series (on main chart)
    const vwapSeries = mainChart.addSeries(LineSeries, {
      color: "#fbbf24",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    vwapSeriesRef.current = vwapSeries;

    const handleResize = () => {
      const w = chartContainerRef.current?.clientWidth ?? 600;
      mainChart.applyOptions({ width: w });
      rsiChart.applyOptions({ width: w });
      macdChart.applyOptions({ width: w });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      mainChart.remove();
      rsiChart.remove();
      macdChart.remove();
      maSeriesMapRef.current.clear();
    };
  }, [compact]);

  // Manage MA line series dynamically (add/remove as toggles change)
  useEffect(() => {
    const chart = mainChartRef.current;
    if (!chart) return;

    const currentMap = maSeriesMapRef.current;
    const desiredIds = new Set(enabledMAs.map((ma) => ma.id));

    // Remove series no longer needed
    for (const [id, series] of currentMap.entries()) {
      if (!desiredIds.has(id)) {
        chart.removeSeries(series);
        currentMap.delete(id);
      }
    }

    // Add new series
    for (const ma of enabledMAs) {
      if (!currentMap.has(ma.id)) {
        const series = chart.addSeries(LineSeries, {
          color: ma.color,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        currentMap.set(ma.id, series);
      }
    }
  }, [enabledMAs]);

  // Track what was last rendered to enable incremental updates
  const lastRenderedIndexRef = useRef<number>(-1);
  const lastIndicatorTogglesRef = useRef<string>("");
  const lastDisplayCandlesRef = useRef<Candle[] | null>(null);

  // Build a toggle key to detect when indicators change (requires full redraw)
  const toggleKey = `${showVolume}-${effShowRSI}-${effShowMACD}-${showBollingerBands}-${showVWAP}-${showDropPercent}-${enabledMAs.map(m => m.id).join(",")}`;

  // Update chart data — incremental when just ticking forward, full redraw on jumps/toggles
  useEffect(() => {
    if (!candleSeriesRef.current || displayCandles.length === 0 || !indicators || displayIndex < 0) return;

    const slice = displayIndex + 1;
    const prevIndex = lastRenderedIndexRef.current;
    const togglesChanged = toggleKey !== lastIndicatorTogglesRef.current;
    const seriesSwapped = lastDisplayCandlesRef.current !== displayCandles;
    const isIncremental = !togglesChanged && !seriesSwapped && displayIndex === prevIndex + 1 && prevIndex >= 0;

    if (isIncremental) {
      // FAST PATH: Only append the new data point to each series
      const c = displayCandles[displayIndex];
      const t = c.time as Time;

      candleSeriesRef.current.update({ time: t, open: c.open, high: c.high, low: c.low, close: c.close });

      if (showVolume) {
        volumeSeriesRef.current?.update({ time: t, value: c.volume, color: c.close >= c.open ? "#22c55e40" : "#ef444440" });
      }

      for (const ma of enabledMAs) {
        const series = maSeriesMapRef.current.get(ma.id);
        const maLine = indicators.maLines.find((s) => s.id === ma.id);
        if (series && maLine) {
          const val = maLine.values[displayIndex];
          if (val !== null) series.update({ time: t, value: val });
        }
      }

      if (showVWAP) {
        const val = indicators.vwap[displayIndex];
        if (val !== null) vwapSeriesRef.current?.update({ time: t, value: val });
      }

      if (showBollingerBands && indicators.bollingerBands) {
        const bb = indicators.bollingerBands;
        if (bb.upper[displayIndex] !== null) bbUpperRef.current?.update({ time: t, value: bb.upper[displayIndex]! });
        if (bb.middle[displayIndex] !== null) bbMiddleRef.current?.update({ time: t, value: bb.middle[displayIndex]! });
        if (bb.lower[displayIndex] !== null) bbLowerRef.current?.update({ time: t, value: bb.lower[displayIndex]! });
      }

      if (effShowRSI) {
        const val = indicators.rsi[displayIndex];
        if (val !== null) rsiSeriesRef.current?.update({ time: t, value: val });
      }

      if (effShowMACD) {
        const m = indicators.macd[displayIndex];
        if (m.macd !== null) macdLineRef.current?.update({ time: t, value: m.macd });
        if (m.signal !== null) signalLineRef.current?.update({ time: t, value: m.signal });
        if (m.histogram !== null) macdHistRef.current?.update({ time: t, value: m.histogram, color: m.histogram >= 0 ? "#22c55e80" : "#ef444480" });
      }

      // Drop markers: only recompute if last candle was bearish (potential new drop completed)
      if (showDropPercent && dropMarkersRef.current) {
        const prev = displayCandles[displayIndex - 1];
        if (c.close >= prev.close) {
          // Reversal candle — a drop may have just completed
          const drops = detectDrops(displayCandles, displayIndex);
          const markers: SeriesMarker<Time>[] = drops.map((d) => {
            const pct = d.pctDrop;
            let color: string;
            let shape: "arrowDown" | "circle" = "arrowDown";
            if (pct >= 1.0) color = "#ef4444";
            else if (pct >= 0.5) { color = "#eab308"; }
            else { color = "#6b7280"; shape = "circle"; }
            return { time: displayCandles[d.index].time as Time, position: "belowBar" as const, color, shape, text: `−${pct.toFixed(2)}%` };
          });
          dropMarkersRef.current.setMarkers(markers);
        }
      }

    } else {
      // FULL REDRAW: initial load, jump, view swap, or indicator toggle change
      candleSeriesRef.current.setData(
        displayCandles.slice(0, slice).map((c) => ({
          time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close,
        }))
      );

      if (showVolume) {
        volumeSeriesRef.current?.setData(
          displayCandles.slice(0, slice).map((c) => ({
            time: c.time as Time, value: c.volume, color: c.close >= c.open ? "#22c55e40" : "#ef444440",
          }))
        );
      } else {
        volumeSeriesRef.current?.setData([]);
      }

      for (const ma of enabledMAs) {
        const series = maSeriesMapRef.current.get(ma.id);
        const maLine = indicators.maLines.find((s) => s.id === ma.id);
        if (series && maLine) {
          series.setData(
            maLine.values.slice(0, slice).reduce<{ time: Time; value: number }[]>(
              (acc, val, i) => { if (val !== null) acc.push({ time: displayCandles[i].time as Time, value: val }); return acc; }, []
            )
          );
        }
      }

      if (showVWAP) {
        vwapSeriesRef.current?.setData(
          indicators.vwap.slice(0, slice).reduce<{ time: Time; value: number }[]>((acc, val, i) => {
            if (val !== null) acc.push({ time: displayCandles[i].time as Time, value: val }); return acc;
          }, [])
        );
      } else { vwapSeriesRef.current?.setData([]); }

      if (showBollingerBands && indicators.bollingerBands) {
        const toLineData = (arr: (number | null)[]) =>
          arr.slice(0, slice).reduce<{ time: Time; value: number }[]>((acc, val, i) => {
            if (val !== null) acc.push({ time: displayCandles[i].time as Time, value: val }); return acc;
          }, []);
        bbUpperRef.current?.setData(toLineData(indicators.bollingerBands.upper));
        bbMiddleRef.current?.setData(toLineData(indicators.bollingerBands.middle));
        bbLowerRef.current?.setData(toLineData(indicators.bollingerBands.lower));
      } else {
        bbUpperRef.current?.setData([]);
        bbMiddleRef.current?.setData([]);
        bbLowerRef.current?.setData([]);
      }

      if (effShowRSI) {
        rsiSeriesRef.current?.setData(
          indicators.rsi.slice(0, slice).reduce<{ time: Time; value: number }[]>((acc, val, i) => {
            if (val !== null) acc.push({ time: displayCandles[i].time as Time, value: val }); return acc;
          }, [])
        );
      } else { rsiSeriesRef.current?.setData([]); }

      if (effShowMACD) {
        const macdData: { time: Time; value: number }[] = [];
        const signalData: { time: Time; value: number }[] = [];
        const histData: { time: Time; value: number; color: string }[] = [];
        for (let i = 0; i < slice; i++) {
          const m = indicators.macd[i];
          if (m.macd !== null) macdData.push({ time: displayCandles[i].time as Time, value: m.macd });
          if (m.signal !== null) signalData.push({ time: displayCandles[i].time as Time, value: m.signal });
          if (m.histogram !== null) histData.push({ time: displayCandles[i].time as Time, value: m.histogram, color: m.histogram >= 0 ? "#22c55e80" : "#ef444480" });
        }
        macdLineRef.current?.setData(macdData);
        signalLineRef.current?.setData(signalData);
        macdHistRef.current?.setData(histData);
      } else {
        macdLineRef.current?.setData([]);
        signalLineRef.current?.setData([]);
        macdHistRef.current?.setData([]);
      }

      // Drop markers (full recalculate)
      if (showDropPercent && dropMarkersRef.current) {
        const drops = detectDrops(displayCandles, displayIndex);
        const markers: SeriesMarker<Time>[] = drops.map((d) => {
          const pct = d.pctDrop;
          let color: string;
          let shape: "arrowDown" | "circle" = "arrowDown";
          if (pct >= 1.0) color = "#ef4444";
          else if (pct >= 0.5) { color = "#eab308"; }
          else { color = "#6b7280"; shape = "circle"; }
          return { time: displayCandles[d.index].time as Time, position: "belowBar" as const, color, shape, text: `−${pct.toFixed(2)}%` };
        });
        dropMarkersRef.current.setMarkers(markers);
      } else if (dropMarkersRef.current) {
        dropMarkersRef.current.setMarkers([]);
      }

      // On a view swap, re-fit the time scale to the newly displayed series
      if (seriesSwapped) mainChartRef.current?.timeScale().fitContent();
    }

    lastRenderedIndexRef.current = displayIndex;
    lastIndicatorTogglesRef.current = toggleKey;
    lastDisplayCandlesRef.current = displayCandles;
  }, [displayCandles, displayIndex, indicators, showVolume, effShowRSI, effShowMACD, showBollingerBands, showVWAP, showDropPercent, enabledMAs, toggleKey]);

  // Current candle info bar (reflects the displayed series)
  const currentCandle = displayCandles[displayIndex] ?? null;
  const currentRSI = indicators?.rsi[displayIndex] ?? null;

  return (
    <div className="space-y-1">
      {/* OHLCV info bar */}
      {currentCandle && !compact && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono px-2 py-1.5 bg-slate-800 rounded border border-slate-700">
          <span className="text-slate-400">
            O <span className="text-white">{currentCandle.open.toFixed(2)}</span>
          </span>
          <span className="text-slate-400">
            H <span className="text-white">{currentCandle.high.toFixed(2)}</span>
          </span>
          <span className="text-slate-400">
            L <span className="text-white">{currentCandle.low.toFixed(2)}</span>
          </span>
          <span className="text-slate-400">
            C{" "}
            <span
              className={
                currentPrice >= currentCandle.open ? "text-green-400" : "text-red-400"
              }
            >
              {currentPrice.toFixed(2)}
            </span>
          </span>
          <span className="text-slate-400">
            Vol <span className="text-yellow-300">{currentCandle.volume.toLocaleString()}</span>
          </span>
          {effShowRSI && currentRSI !== null && (
            <span className="text-slate-400">
              RSI <span className="text-cyan-400">{currentRSI.toFixed(1)}</span>
            </span>
          )}
        </div>
      )}

      {/* Main chart */}
      <div
        ref={chartContainerRef}
        className="w-full rounded-t-lg overflow-hidden border border-slate-700"
      />

      {/* RSI */}
      <div className="relative" style={{ display: effShowRSI ? "block" : "none" }}>
        <span className="absolute top-1 left-2 text-[10px] text-cyan-400 font-mono z-10">
          RSI (14)
        </span>
        <div ref={rsiContainerRef} className="w-full overflow-hidden border-x border-slate-700" />
      </div>

      {/* MACD */}
      <div className="relative" style={{ display: effShowMACD ? "block" : "none" }}>
        <span className="absolute top-1 left-2 text-[10px] text-blue-400 font-mono z-10">
          MACD (12,26,9)
        </span>
        <div
          ref={macdContainerRef}
          className="w-full rounded-b-lg overflow-hidden border border-t-0 border-slate-700"
        />
      </div>

      {/* Legend for enabled MAs */}
      {enabledMAs.length > 0 && !compact && (
        <div className="flex gap-4 text-[11px] text-slate-400 px-1 pt-1">
          {enabledMAs.map((ma) => (
            <span key={ma.id}>
              <span
                className="inline-block w-3 h-0.5 mr-1 align-middle"
                style={{ backgroundColor: ma.color }}
              />
              {ma.type.toUpperCase()} {ma.period}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
