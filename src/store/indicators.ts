import { create } from "zustand";

export interface MovingAverageConfig {
  id: string;
  period: number;
  color: string;
  enabled: boolean;
}

interface IndicatorSettings {
  showVolume: boolean;
  showRSI: boolean;
  showMACD: boolean;
  movingAverages: MovingAverageConfig[];

  toggleVolume: () => void;
  toggleRSI: () => void;
  toggleMACD: () => void;
  toggleMA: (id: string) => void;
  addMA: (period: number, color: string) => void;
  removeMA: (id: string) => void;
}

const DEFAULT_MAS: MovingAverageConfig[] = [
  { id: "sma-9", period: 9, color: "#22d3ee", enabled: false },
  { id: "sma-20", period: 20, color: "#f59e0b", enabled: true },
  { id: "sma-50", period: 50, color: "#8b5cf6", enabled: true },
  { id: "sma-100", period: 100, color: "#ec4899", enabled: false },
  { id: "sma-200", period: 200, color: "#ef4444", enabled: false },
];

export const useIndicatorStore = create<IndicatorSettings>((set) => ({
  showVolume: true,
  showRSI: true,
  showMACD: true,
  movingAverages: DEFAULT_MAS,

  toggleVolume: () => set((s) => ({ showVolume: !s.showVolume })),
  toggleRSI: () => set((s) => ({ showRSI: !s.showRSI })),
  toggleMACD: () => set((s) => ({ showMACD: !s.showMACD })),

  toggleMA: (id) =>
    set((s) => ({
      movingAverages: s.movingAverages.map((ma) =>
        ma.id === id ? { ...ma, enabled: !ma.enabled } : ma
      ),
    })),

  addMA: (period, color) =>
    set((s) => ({
      movingAverages: [
        ...s.movingAverages,
        { id: `sma-${period}-${Date.now()}`, period, color, enabled: true },
      ],
    })),

  removeMA: (id) =>
    set((s) => ({
      movingAverages: s.movingAverages.filter((ma) => ma.id !== id),
    })),
}));
