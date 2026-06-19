import { create } from "zustand";

export type MAType = "sma" | "ema" | "wma" | "wema";

export interface MovingAverageConfig {
  id: string;
  period: number;
  type: MAType;
  color: string;
  enabled: boolean;
}

interface IndicatorSettings {
  showVolume: boolean;
  showRSI: boolean;
  showMACD: boolean;
  showBollingerBands: boolean;
  showVWAP: boolean;
  showDropPercent: boolean;
  movingAverages: MovingAverageConfig[];

  toggleVolume: () => void;
  toggleRSI: () => void;
  toggleMACD: () => void;
  toggleBollingerBands: () => void;
  toggleVWAP: () => void;
  toggleDropPercent: () => void;
  toggleMA: (id: string) => void;
  addMA: (period: number, color: string, type: MAType) => void;
  removeMA: (id: string) => void;
  updateMAType: (id: string, type: MAType) => void;
}

const DEFAULT_MAS: MovingAverageConfig[] = [
  { id: "sma-9", period: 9, type: "sma", color: "#22d3ee", enabled: false },
  { id: "ema-9", period: 9, type: "ema", color: "#34d399", enabled: false },
  { id: "sma-20", period: 20, type: "sma", color: "#f59e0b", enabled: true },
  { id: "sma-50", period: 50, type: "sma", color: "#8b5cf6", enabled: true },
  { id: "sma-100", period: 100, type: "sma", color: "#ec4899", enabled: false },
  { id: "sma-200", period: 200, type: "sma", color: "#ef4444", enabled: false },
];

export const useIndicatorStore = create<IndicatorSettings>((set) => ({
  showVolume: true,
  showRSI: true,
  showMACD: true,
  showBollingerBands: false,
  showVWAP: false,
  showDropPercent: false,
  movingAverages: DEFAULT_MAS,

  toggleVolume: () => set((s) => ({ showVolume: !s.showVolume })),
  toggleRSI: () => set((s) => ({ showRSI: !s.showRSI })),
  toggleMACD: () => set((s) => ({ showMACD: !s.showMACD })),
  toggleBollingerBands: () => set((s) => ({ showBollingerBands: !s.showBollingerBands })),
  toggleVWAP: () => set((s) => ({ showVWAP: !s.showVWAP })),
  toggleDropPercent: () => set((s) => ({ showDropPercent: !s.showDropPercent })),

  toggleMA: (id) =>
    set((s) => ({
      movingAverages: s.movingAverages.map((ma) =>
        ma.id === id ? { ...ma, enabled: !ma.enabled } : ma
      ),
    })),

  addMA: (period, color, type) =>
    set((s) => ({
      movingAverages: [
        ...s.movingAverages,
        { id: `${type}-${period}-${Date.now()}`, period, type, color, enabled: true },
      ],
    })),

  updateMAType: (id, type) =>
    set((s) => ({
      movingAverages: s.movingAverages.map((ma) =>
        ma.id === id ? { ...ma, type } : ma
      ),
    })),

  removeMA: (id) =>
    set((s) => ({
      movingAverages: s.movingAverages.filter((ma) => ma.id !== id),
    })),
}));
