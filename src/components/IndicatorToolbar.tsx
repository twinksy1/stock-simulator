"use client";

import { useState } from "react";
import { useIndicatorStore } from "@/store/indicators";
import type { MAType } from "@/store/indicators";

const MA_TYPE_LABELS: Record<MAType, string> = {
  sma: "SMA",
  ema: "EMA",
  wma: "WMA",
  wema: "WEMA",
};

export default function IndicatorToolbar() {
  const {
    showVolume,
    showRSI,
    showMACD,
    showBollingerBands,
    showVWAP,
    showDropPercent,
    movingAverages,
    toggleVolume,
    toggleRSI,
    toggleMACD,
    toggleBollingerBands,
    toggleVWAP,
    toggleDropPercent,
    toggleMA,
    addMA,
    removeMA,
    updateMAType,
  } = useIndicatorStore();

  const [showAddMA, setShowAddMA] = useState(false);
  const [newPeriod, setNewPeriod] = useState(21);
  const [newColor, setNewColor] = useState("#10b981");
  const [newType, setNewType] = useState<MAType>("ema");
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddMA = () => {
    if (newPeriod >= 2 && newPeriod <= 500) {
      addMA(newPeriod, newColor, newType);
      setShowAddMA(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg px-3 py-2 border border-slate-700">
      <div className="flex flex-wrap items-center gap-2">
        {/* Section label */}
        <span className="text-[10px] uppercase tracking-wider text-slate-500 mr-1">
          Indicators
        </span>

        {/* Volume toggle */}
        <TogglePill label="Vol" active={showVolume} onClick={toggleVolume} color="#eab308" />

        {/* RSI toggle */}
        <TogglePill label="RSI" active={showRSI} onClick={toggleRSI} color="#06b6d4" />

        {/* MACD toggle */}
        <TogglePill label="MACD" active={showMACD} onClick={toggleMACD} color="#3b82f6" />

        {/* Bollinger Bands toggle */}
        <TogglePill label="BB" active={showBollingerBands} onClick={toggleBollingerBands} color="#a78bfa" />

        {/* VWAP toggle */}
        <TogglePill label="VWAP" active={showVWAP} onClick={toggleVWAP} color="#fbbf24" />

        {/* Drop % toggle */}
        <TogglePill label="Drop %" active={showDropPercent} onClick={toggleDropPercent} color="#f87171" />

        {/* Separator */}
        <span className="w-px h-5 bg-slate-600 mx-1" />

        {/* Moving averages */}
        <span className="text-[10px] uppercase tracking-wider text-slate-500">MAs</span>
        {movingAverages.map((ma) => (
          <div key={ma.id} className="group relative">
            <TogglePill
              label={`${MA_TYPE_LABELS[ma.type]} ${ma.period}`}
              active={ma.enabled}
              onClick={() => toggleMA(ma.id)}
              onRightClick={(e) => { e.preventDefault(); setEditingId(editingId === ma.id ? null : ma.id); }}
              color={ma.color}
            />
            {/* Remove button on hover */}
            <button
              onClick={() => removeMA(ma.id)}
              className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-600 text-white rounded-full text-[8px] leading-none hidden group-hover:flex items-center justify-center"
              title="Remove"
            >
              &times;
            </button>
            {/* Type selector dropdown */}
            {editingId === ma.id && (
              <div className="absolute top-full left-0 mt-1 bg-slate-900 border border-slate-600 rounded shadow-lg z-20 py-1 min-w-[80px]">
                {(Object.keys(MA_TYPE_LABELS) as MAType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => { updateMAType(ma.id, type); setEditingId(null); }}
                    className={`block w-full text-left px-3 py-1 text-xs transition-colors ${
                      ma.type === type
                        ? "text-white bg-slate-700"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    {MA_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Add MA button */}
        {!showAddMA ? (
          <button
            onClick={() => setShowAddMA(true)}
            className="text-slate-400 hover:text-white text-xs border border-slate-600 hover:border-slate-400 rounded px-1.5 py-0.5 transition-colors"
          >
            + MA
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as MAType)}
              className="bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              {(Object.keys(MA_TYPE_LABELS) as MAType[]).map((type) => (
                <option key={type} value={type}>{MA_TYPE_LABELS[type]}</option>
              ))}
            </select>
            <input
              type="number"
              min={2}
              max={500}
              value={newPeriod}
              onChange={(e) => setNewPeriod(Number(e.target.value))}
              className="w-14 bg-slate-900 border border-slate-600 rounded px-1.5 py-0.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              placeholder="Period"
            />
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
            />
            <button
              onClick={handleAddMA}
              className="text-green-400 hover:text-green-300 text-xs font-semibold"
            >
              &#10003;
            </button>
            <button
              onClick={() => setShowAddMA(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              &#10007;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TogglePill({
  label,
  active,
  onClick,
  onRightClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  onRightClick?: (e: React.MouseEvent) => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      onContextMenu={onRightClick}
      className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-all ${
        active
          ? "bg-slate-700 text-white border border-slate-500"
          : "bg-slate-900 text-slate-500 border border-slate-700 opacity-60"
      }`}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: active ? color : "#475569" }}
      />
      {label}
    </button>
  );
}
