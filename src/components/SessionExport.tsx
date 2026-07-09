"use client";

import { useCallback, useState } from "react";
import { useSimulationStore } from "@/store/simulation";

/** Formats a unix timestamp (seconds) to a human-readable time string */
function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Generates a full session export as markdown text */
function generateSessionMarkdown(): string {
  const sim = useSimulationStore.getState();
  const {
    symbol,
    date: interval,
    candles,
    currentIndex,
    closedTrades,
    trades,
    position,
    cash,
    startingCash,
    realizedPnl,
    postSessionReflection,
    tradingStartOffset,
  } = sim;

  const lines: string[] = [];

  // Header
  lines.push(`# Session Review — ${symbol} (${interval} candles)`);
  lines.push("");
  lines.push(`**Starting Balance:** $${startingCash.toLocaleString()}`);
  lines.push(`**Ending Balance:** $${(cash + (position ? position.quantity * candles[currentIndex]?.close : 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  lines.push(`**Realized P&L:** ${realizedPnl >= 0 ? "+" : ""}$${realizedPnl.toFixed(2)}`);
  lines.push(`**Total Trades:** ${closedTrades.length}${position ? " (1 open)" : ""}`);
  lines.push("");

  // Price action summary — key candles around trades
  lines.push("## Price Action (Trading Window)");
  lines.push("");
  lines.push("```");
  lines.push("Time | Open | High | Low | Close | Volume");
  lines.push("--- | --- | --- | --- | --- | ---");

  // Show candles from trading start through current index, sampled if too many
  const tradeStart = tradingStartOffset > 0 ? tradingStartOffset : 0;
  const visibleCandles = candles.slice(tradeStart, currentIndex + 1);
  const maxCandles = 100;
  const step = visibleCandles.length > maxCandles ? Math.ceil(visibleCandles.length / maxCandles) : 1;

  // Always include candles at trade entry/exit points
  const tradeIndices = new Set<number>();
  for (const t of closedTrades) {
    tradeIndices.add(t.entryCandleIndex - tradeStart);
    tradeIndices.add(t.exitCandleIndex - tradeStart);
  }
  for (const t of trades) {
    tradeIndices.add(t.candleIndex - tradeStart);
  }

  for (let i = 0; i < visibleCandles.length; i++) {
    if (i % step !== 0 && !tradeIndices.has(i)) continue;
    const c = visibleCandles[i];
    const marker = tradeIndices.has(i) ? " ◄" : "";
    lines.push(
      `${formatTime(c.time)} | ${c.open.toFixed(2)} | ${c.high.toFixed(2)} | ${c.low.toFixed(2)} | ${c.close.toFixed(2)} | ${c.volume.toLocaleString()}${marker}`
    );
  }
  lines.push("```");
  lines.push("");
  lines.push(`_◄ = trade activity at this candle. Showing ${Math.min(visibleCandles.length, maxCandles)} of ${visibleCandles.length} candles._`);
  lines.push("");

  // Closed trades detail
  if (closedTrades.length > 0) {
    lines.push("## Trades");
    lines.push("");
    for (let i = 0; i < closedTrades.length; i++) {
      const ct = closedTrades[i];
      const pnlSign = ct.realizedPnl >= 0 ? "+" : "";
      const rText = ct.rMultiple !== null ? `${ct.rMultiple >= 0 ? "+" : ""}${ct.rMultiple.toFixed(2)}R` : "N/A";
      lines.push(`### Trade ${i + 1} — ${ct.realizedPnl >= 0 ? "✅ WIN" : "❌ LOSS"} (${rText})`);
      lines.push("");
      lines.push(`| | |`);
      lines.push(`|---|---|`);
      lines.push(`| **Entry** | $${ct.entryPrice.toFixed(2)} @ ${formatTime(ct.entryTime)} |`);
      lines.push(`| **Exit** | $${ct.exitPrice.toFixed(2)} @ ${formatTime(ct.exitTime)} |`);
      lines.push(`| **Shares** | ${ct.quantity} |`);
      lines.push(`| **P&L** | ${pnlSign}$${ct.realizedPnl.toFixed(2)} |`);
      lines.push(`| **R Multiple** | ${rText} |`);
      if (ct.plannedStop) lines.push(`| **Stop Loss** | $${ct.plannedStop.toFixed(2)} |`);
      lines.push(`| **Hold Duration** | ${ct.holdDuration} candles |`);
      if (ct.regime) lines.push(`| **Market Regime** | ${ct.regime} |`);
      if (ct.mistakes.length > 0) lines.push(`| **Mistakes** | ${ct.mistakes.join(", ")} |`);
      lines.push("");

      // Journal
      if (ct.journal) {
        if (ct.journal.thesis) lines.push(`- **Thesis:** ${ct.journal.thesis}`);
        if (ct.journal.setupLabel) lines.push(`- **Setup:** ${ct.journal.customSetupLabel || ct.journal.setupLabel}`);
        if (ct.journal.confidence) lines.push(`- **Confidence:** ${ct.journal.confidence}/5`);
        if (ct.journal.exitReason) lines.push(`- **Exit Reason:** ${ct.journal.exitReason}`);
        if (ct.journal.postNotes) lines.push(`- **Notes:** ${ct.journal.postNotes}`);
        lines.push("");
      }
    }
  }

  // Open position
  if (position) {
    lines.push("## Open Position (not closed)");
    lines.push(`- **${position.symbol}** ${position.quantity} shares @ $${position.avgPrice.toFixed(2)}`);
    if (position.plannedStop) lines.push(`- **Stop:** $${position.plannedStop.toFixed(2)}`);
    const currentClose = candles[currentIndex]?.close ?? 0;
    const unrealized = (currentClose - position.avgPrice) * position.quantity;
    lines.push(`- **Unrealized P&L:** ${unrealized >= 0 ? "+" : ""}$${unrealized.toFixed(2)}`);
    lines.push("");
  }

  // Post-session reflection
  if (postSessionReflection) {
    lines.push("## Post-Session Reflection");
    lines.push(`- **Actual Regime:** ${postSessionReflection.actualRegime}`);
    lines.push(`- **Strategy Alignment:** ${postSessionReflection.strategyAlignment}`);
    if (postSessionReflection.lessonsLearned) lines.push(`- **Lessons:** ${postSessionReflection.lessonsLearned}`);
    if (postSessionReflection.nextTimeDifferent) lines.push(`- **Next time:** ${postSessionReflection.nextTimeDifferent}`);
    if (postSessionReflection.violatedTradeIds.length > 0) lines.push(`- **Violated trades:** ${postSessionReflection.violatedTradeIds.length}`);
    lines.push("");
  }

  // Session score
  const score = sim.getSessionScore();
  lines.push("## Session Score");
  lines.push(`- **Overall Grade:** ${score.overallGrade}`);
  lines.push(`- **Patience Score:** ${score.patienceScore}/100`);
  lines.push(`- **Risk Score:** ${score.riskScore}/100`);
  lines.push(`- **Journal Score:** ${score.journalScore}/100`);
  if (closedTrades.length > 0) {
    const wins = closedTrades.filter((t) => t.realizedPnl > 0).length;
    const rVals = closedTrades.map((t) => t.rMultiple).filter((r): r is number => r !== null);
    const avgR = rVals.length > 0 ? rVals.reduce((a, b) => a + b, 0) / rVals.length : 0;
    lines.push(`- **Win Rate:** ${((wins / closedTrades.length) * 100).toFixed(0)}%`);
    lines.push(`- **Avg R:** ${avgR >= 0 ? "+" : ""}${avgR.toFixed(2)}`);
  }
  lines.push("");

  lines.push("---");
  lines.push("_Paste this into Copilot for a full session review._");

  return lines.join("\n");
}

export default function SessionExport() {
  const [copied, setCopied] = useState(false);
  const closedTradeCount = useSimulationStore((s) => s.closedTrades.length);
  const tradeCount = useSimulationStore((s) => s.trades.length);

  const handleCopy = useCallback(async () => {
    const md = generateSessionMarkdown();
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-HTTPS
      const textarea = document.createElement("textarea");
      textarea.value = md;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  if (closedTradeCount === 0 && tradeCount === 0) return null;

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 hover:text-white px-3 py-1.5 rounded text-xs font-medium transition-all"
      title="Copy full session data (price action, trades, journal) as markdown for Copilot review"
    >
      {copied ? (
        <>✅ Copied!</>
      ) : (
        <>📋 Copy Session for Review</>
      )}
    </button>
  );
}
