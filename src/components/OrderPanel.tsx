"use client";

import { useState } from "react";
import { useSimulationStore } from "@/store/simulation";

export default function OrderPanel() {
  const {
    currentPrice,
    cash,
    position,
    pnl,
    buy,
    sell,
    candles,
    realizedPnl,
    isLockedOut,
    riskSettings,
    closedTrades,
    calculateMaxShares,
  } = useSimulationStore();
  const [quantity, setQuantity] = useState(10);
  const [stopPrice, setStopPrice] = useState<string>("");

  const positionValue = position ? position.quantity * currentPrice : 0;
  const totalEquity = cash + positionValue;
  const isLoaded = candles.length > 0;

  const parsedStop = stopPrice ? parseFloat(stopPrice) : undefined;
  const maxShares =
    parsedStop && parsedStop < currentPrice ? calculateMaxShares(parsedStop) : null;

  const handleBuy = () => {
    buy(quantity, parsedStop);
  };

  const handleSell = () => {
    sell(quantity);
  };

  // Last closed trade for R-multiple display
  const lastClosed = closedTrades.length > 0 ? closedTrades[closedTrades.length - 1] : null;

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-4">
      {/* Lockout warning */}
      {isLockedOut && (
        <div className="bg-red-900/50 border border-red-600 rounded px-3 py-2 text-center">
          <span className="text-red-300 text-xs font-semibold uppercase">
            🔒 Daily Loss Limit Hit
          </span>
          <p className="text-red-400 text-[11px] mt-0.5">
            No new positions allowed. You may still close existing positions.
          </p>
        </div>
      )}

      {/* Price display */}
      <div className="text-center">
        <div className="text-slate-400 text-xs uppercase tracking-wide">Current Price</div>
        <div className="text-3xl font-bold text-white font-mono">
          ${isLoaded ? currentPrice.toFixed(2) : "---"}
        </div>
      </div>

      {/* Stop-loss input */}
      <div>
        <label className="text-slate-400 text-xs uppercase tracking-wide">
          Stop Loss (optional)
        </label>
        <input
          type="number"
          step="0.01"
          value={stopPrice}
          onChange={(e) => setStopPrice(e.target.value)}
          placeholder={isLoaded ? (currentPrice * 0.98).toFixed(2) : "---"}
          className="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
        />
        {maxShares !== null && (
          <div className="mt-1 text-[11px] text-cyan-400">
            Max shares at {riskSettings.maxRiskPercent}% risk: <span className="font-bold">{maxShares}</span>
          </div>
        )}
      </div>

      {/* Quantity input */}
      <div>
        <label className="text-slate-400 text-xs uppercase tracking-wide">Shares</label>
        <div className="flex gap-2 mt-1">
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
          />
          {maxShares !== null && (
            <button
              onClick={() => setQuantity(maxShares)}
              className="px-2 py-1 bg-cyan-900/50 border border-cyan-700 rounded text-cyan-300 text-xs font-medium hover:bg-cyan-800/50 transition-colors"
              title="Use max shares based on risk"
            >
              Max
            </button>
          )}
        </div>
      </div>

      {/* Buy/Sell buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleBuy}
          disabled={!isLoaded || currentPrice * quantity > cash || isLockedOut}
          className="bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2 rounded font-semibold transition-colors"
        >
          BUY
        </button>
        <button
          onClick={handleSell}
          disabled={!isLoaded || !position || position.quantity < quantity}
          className="bg-red-600 hover:bg-red-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2 rounded font-semibold transition-colors"
        >
          SELL
        </button>
      </div>

      {/* Account info */}
      <div className="border-t border-slate-700 pt-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Cash</span>
          <span className="text-white font-mono">${cash.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Position</span>
          <span className="text-white font-mono">
            {position ? `${position.quantity} @ $${position.avgPrice.toFixed(2)}` : "None"}
          </span>
        </div>
        {position?.plannedStop && (
          <div className="flex justify-between">
            <span className="text-slate-400">Stop</span>
            <span className="text-orange-400 font-mono">${position.plannedStop.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-400">Equity</span>
          <span className="text-white font-mono">${totalEquity.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Realized P&L</span>
          <span
            className={`font-mono ${
              realizedPnl >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {realizedPnl >= 0 ? "+" : ""}${realizedPnl.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between border-t border-slate-700 pt-2">
          <span className="text-slate-400 font-semibold">Total P&L</span>
          <span
            className={`font-mono font-bold ${
              pnl >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Last closed trade R-multiple */}
      {lastClosed && (
        <div className="border-t border-slate-700 pt-3">
          <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">
            Last Closed Trade
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">
              {lastClosed.quantity} shares @ ${lastClosed.exitPrice.toFixed(2)}
            </span>
            <span
              className={`font-mono font-semibold ${
                lastClosed.realizedPnl >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {lastClosed.realizedPnl >= 0 ? "+" : ""}${lastClosed.realizedPnl.toFixed(2)}
            </span>
          </div>
          {lastClosed.rMultiple !== null && (
            <div className="flex justify-between text-xs mt-0.5">
              <span className="text-slate-400">R-Multiple</span>
              <span
                className={`font-mono font-semibold ${
                  lastClosed.rMultiple >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {lastClosed.rMultiple >= 0 ? "+" : ""}{lastClosed.rMultiple.toFixed(2)}R
              </span>
            </div>
          )}
        </div>
      )}

      {/* Risk settings summary */}
      <div className="border-t border-slate-700 pt-2 text-[11px] text-slate-500">
        <span>Risk: {riskSettings.maxRiskPercent}% per trade</span>
        <span className="mx-2">|</span>
        <span>Daily limit: {riskSettings.dailyLossLimitPercent}%</span>
      </div>
    </div>
  );
}
