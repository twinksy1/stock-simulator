"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// A snapshot of one completed session
export interface SessionRecord {
  id: string;
  symbol: string;
  interval: string;
  difficulty: string;
  startBalance: number;
  endBalance: number;
  realizedPnl: number;
  totalTrades: number;
  wins: number;
  losses: number;
  totalR: number; // Sum of R-multiples for this session
  bestR: number | null;
  worstR: number | null;
  grade: string;
  timestamp: number; // when session ended
}

export interface PerformanceStats {
  // Lifetime aggregates
  totalSessions: number;
  totalTrades: number;
  totalWins: number;
  totalLosses: number;
  totalR: number;
  bestR: number | null;
  worstR: number | null;
  longestWinStreak: number;
  longestLoseStreak: number;
  currentStreak: number; // positive = win streak, negative = lose streak

  // Per-session history (last 100)
  sessions: SessionRecord[];
}

interface PerformanceState extends PerformanceStats {
  recordSession: (session: Omit<SessionRecord, "id" | "timestamp">) => void;
  clearHistory: () => void;

  // Derived (computed on read)
  getWinRate: () => number;
  getAvgR: () => number;
  getProfitFactor: () => number;
  getExpectancy: () => number;
  getEquityCurve: () => { session: number; equity: number }[];
}

const INITIAL: PerformanceStats = {
  totalSessions: 0,
  totalTrades: 0,
  totalWins: 0,
  totalLosses: 0,
  totalR: 0,
  bestR: null,
  worstR: null,
  longestWinStreak: 0,
  longestLoseStreak: 0,
  currentStreak: 0,
  sessions: [],
};

export const usePerformanceStore = create<PerformanceState>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      recordSession: (session) => {
        const s = get();
        const record: SessionRecord = {
          ...session,
          id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: Date.now(),
        };

        // Update streak
        const sessionWon = session.realizedPnl > 0;
        let newStreak = s.currentStreak;
        if (sessionWon) {
          newStreak = newStreak > 0 ? newStreak + 1 : 1;
        } else if (session.totalTrades > 0) {
          newStreak = newStreak < 0 ? newStreak - 1 : -1;
        }
        // Don't count 0-trade sessions toward streak

        const newLongestWin = Math.max(s.longestWinStreak, newStreak > 0 ? newStreak : 0);
        const newLongestLose = Math.max(s.longestLoseStreak, newStreak < 0 ? Math.abs(newStreak) : 0);

        // Update best/worst R
        const allBest = [s.bestR, session.bestR].filter((r): r is number => r !== null);
        const allWorst = [s.worstR, session.worstR].filter((r): r is number => r !== null);

        // Keep last 100 sessions
        const sessions = [...s.sessions, record].slice(-100);

        set({
          totalSessions: s.totalSessions + 1,
          totalTrades: s.totalTrades + session.totalTrades,
          totalWins: s.totalWins + session.wins,
          totalLosses: s.totalLosses + session.losses,
          totalR: s.totalR + session.totalR,
          bestR: allBest.length > 0 ? Math.max(...allBest) : null,
          worstR: allWorst.length > 0 ? Math.min(...allWorst) : null,
          longestWinStreak: newLongestWin,
          longestLoseStreak: newLongestLose,
          currentStreak: newStreak,
          sessions,
        });
      },

      clearHistory: () => set(INITIAL),

      getWinRate: () => {
        const { totalWins, totalLosses } = get();
        const total = totalWins + totalLosses;
        return total > 0 ? (totalWins / total) * 100 : 0;
      },

      getAvgR: () => {
        const { totalR, totalTrades } = get();
        return totalTrades > 0 ? totalR / totalTrades : 0;
      },

      getProfitFactor: () => {
        const { sessions } = get();
        let grossProfit = 0;
        let grossLoss = 0;
        for (const s of sessions) {
          if (s.realizedPnl > 0) grossProfit += s.realizedPnl;
          else grossLoss += Math.abs(s.realizedPnl);
        }
        return grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
      },

      getExpectancy: () => {
        const { totalWins, totalLosses, sessions } = get();
        const total = totalWins + totalLosses;
        if (total === 0) return 0;
        // Per-trade R-multiples
        const rValues: number[] = [];
        for (const s of sessions) {
          // Approximate: distribute session totalR across trades
          if (s.totalTrades > 0) rValues.push(s.totalR / s.totalTrades);
        }
        if (rValues.length === 0) return 0;
        const winRate = totalWins / total;
        const avgWinR = rValues.filter((r) => r > 0).reduce((a, b) => a + b, 0) / Math.max(1, rValues.filter((r) => r > 0).length);
        const avgLossR = Math.abs(rValues.filter((r) => r <= 0).reduce((a, b) => a + b, 0) / Math.max(1, rValues.filter((r) => r <= 0).length));
        return winRate * avgWinR - (1 - winRate) * avgLossR;
      },

      getEquityCurve: () => {
        const { sessions } = get();
        let cumulative = 0;
        return sessions.map((s, i) => {
          cumulative += s.totalR;
          return { session: i + 1, equity: cumulative };
        });
      },
    }),
    {
      name: "stock-sim-performance",
    },
  ),
);
