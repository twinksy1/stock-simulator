"use client";

import { useEffect, useRef, useMemo } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
} from "lightweight-charts";
import type { IChartApi, ISeriesApi, Time } from "lightweight-charts";
import { useSimulationStore } from "@/store/simulation";
import { useIndicatorStore } from "@/store/indicators";
import { computeIndicators } from "@/lib/indicators";

export default function ChartWithIndicators() {
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

  const candles = useSimulationStore((s) => s.candles);
  const currentIndex = useSimulationStore((s) => s.currentIndex);
  const currentPrice = useSimulationStore((s) => s.currentPrice);
  const microNoiseEnabled = useSimulationStore((s) => s.microNoiseEnabled);
  const microTickCount = useSimulationStore((s) => s.microTickCount);

  const { showVolume, showRSI, showMACD, movingAverages } = useIndicatorStore();
  const enabledMAs = useMemo(
    () => movingAverages.filter((ma) => ma.enabled),
    [movingAverages]
  );

  // Compute indicators for the full dataset
  const indicators = useMemo(() => {
    if (candles.length === 0) return null;
    const allPeriods = movingAverages.map((ma) => ma.period);
    return computeIndicators(candles, allPeriods);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, movingAverages.map((m) => m.period).join(",")]);

  // Create all three charts once
  useEffect(() => {
    if (!chartContainerRef.current || !rsiContainerRef.current || !macdContainerRef.current)
      return;

    const commonOptions = {
      layout: { background: { color: "#0f172a" }, textColor: "#94a3b8" },
      grid: { vertLines: { color: "#1e293b" }, horzLines: { color: "#1e293b" } },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: number) => {
          const d = new Date(time * 1000);
          return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/New_York" });
        },
      },
      localization: {
        timeFormatter: (time: number) => {
          const d = new Date(time * 1000);
          return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/New_York" }) + " ET";
        },
      },
    };

    // Main chart
    const mainChart = createChart(chartContainerRef.current, {
      ...commonOptions,
      width: chartContainerRef.current.clientWidth,
      height: 320,
    });

    const candleSeries = mainChart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

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
  }, []);

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

  // Update all chart data on tick
  useEffect(() => {
    if (!candleSeriesRef.current || candles.length === 0 || !indicators) return;

    const slice = currentIndex + 1;

    // Candles (always shown)
    candleSeriesRef.current.setData(
      candles.slice(0, slice).map((c) => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    // Volume
    if (showVolume) {
      volumeSeriesRef.current?.setData(
        candles.slice(0, slice).map((c) => ({
          time: c.time as Time,
          value: c.volume,
          color: c.close >= c.open ? "#22c55e40" : "#ef444440",
        }))
      );
    } else {
      volumeSeriesRef.current?.setData([]);
    }

    // Moving averages
    for (const ma of enabledMAs) {
      const series = maSeriesMapRef.current.get(ma.id);
      const smaLine = indicators.smaLines.find((s) => s.period === ma.period);
      if (series && smaLine) {
        series.setData(
          smaLine.values.slice(0, slice).reduce<{ time: Time; value: number }[]>(
            (acc, val, i) => {
              if (val !== null) acc.push({ time: candles[i].time as Time, value: val });
              return acc;
            },
            []
          )
        );
      }
    }

    // RSI
    if (showRSI) {
      rsiSeriesRef.current?.setData(
        indicators.rsi.slice(0, slice).reduce<{ time: Time; value: number }[]>((acc, val, i) => {
          if (val !== null) acc.push({ time: candles[i].time as Time, value: val });
          return acc;
        }, [])
      );
    } else {
      rsiSeriesRef.current?.setData([]);
    }

    // MACD
    if (showMACD) {
      const macdData: { time: Time; value: number }[] = [];
      const signalData: { time: Time; value: number }[] = [];
      const histData: { time: Time; value: number; color: string }[] = [];

      for (let i = 0; i < slice; i++) {
        const m = indicators.macd[i];
        if (m.macd !== null) macdData.push({ time: candles[i].time as Time, value: m.macd });
        if (m.signal !== null)
          signalData.push({ time: candles[i].time as Time, value: m.signal });
        if (m.histogram !== null)
          histData.push({
            time: candles[i].time as Time,
            value: m.histogram,
            color: m.histogram >= 0 ? "#22c55e80" : "#ef444480",
          });
      }

      macdLineRef.current?.setData(macdData);
      signalLineRef.current?.setData(signalData);
      macdHistRef.current?.setData(histData);
    } else {
      macdLineRef.current?.setData([]);
      signalLineRef.current?.setData([]);
      macdHistRef.current?.setData([]);
    }
  }, [candles, currentIndex, indicators, showVolume, showRSI, showMACD, enabledMAs]);

  // Micro-tick: efficiently update just the last candle bar's close/high/low
  useEffect(() => {
    if (!microNoiseEnabled || !candleSeriesRef.current || candles.length === 0) return;
    if (microTickCount === 0) return; // skip when candle just finalized

    const candle = candles[currentIndex];
    if (!candle) return;

    // Update the last bar with current micro-tick price as the "close"
    // Expand high/low if the micro-price exceeds them
    candleSeriesRef.current.update({
      time: candle.time as Time,
      open: candle.open,
      high: Math.max(candle.high, currentPrice),
      low: Math.min(candle.low, currentPrice),
      close: currentPrice,
    });
  }, [microNoiseEnabled, microTickCount, currentPrice, candles, currentIndex]);

  // Current candle info bar
  const currentCandle = candles[currentIndex] ?? null;
  const currentRSI = indicators?.rsi[currentIndex] ?? null;

  return (
    <div className="space-y-1">
      {/* OHLCV info bar */}
      {currentCandle && (
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
              {microNoiseEnabled && microTickCount > 0 ? currentPrice.toFixed(2) : currentCandle.close.toFixed(2)}
            </span>
          </span>
          <span className="text-slate-400">
            Vol <span className="text-yellow-300">{currentCandle.volume.toLocaleString()}</span>
          </span>
          {showRSI && currentRSI !== null && (
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
      <div className="relative" style={{ display: showRSI ? "block" : "none" }}>
        <span className="absolute top-1 left-2 text-[10px] text-cyan-400 font-mono z-10">
          RSI (14)
        </span>
        <div ref={rsiContainerRef} className="w-full overflow-hidden border-x border-slate-700" />
      </div>

      {/* MACD */}
      <div className="relative" style={{ display: showMACD ? "block" : "none" }}>
        <span className="absolute top-1 left-2 text-[10px] text-blue-400 font-mono z-10">
          MACD (12,26,9)
        </span>
        <div
          ref={macdContainerRef}
          className="w-full rounded-b-lg overflow-hidden border border-t-0 border-slate-700"
        />
      </div>

      {/* Legend for enabled MAs */}
      {enabledMAs.length > 0 && (
        <div className="flex gap-4 text-[11px] text-slate-400 px-1 pt-1">
          {enabledMAs.map((ma) => (
            <span key={ma.id}>
              <span
                className="inline-block w-3 h-0.5 mr-1 align-middle"
                style={{ backgroundColor: ma.color }}
              />
              SMA {ma.period}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
