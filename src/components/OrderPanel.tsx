"use client";

import { useState } from "react";
import { useSimulationStore } from "@/store/simulation";

export default function OrderPanel() {
  const { currentPrice, cash, position, pnl, buy, sell, candles } =
    useSimulationStore();
  const [quantity, setQuantity] = useState(10);

  const positionValue = position ? position.quantity * currentPrice : 0;
  const totalEquity = cash + positionValue;
  const isLoaded = candles.length > 0;

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-4">
      {/* Price display */}
      <div className="text-center">
        <div className="text-slate-400 text-xs uppercase tracking-wide">Current Price</div>
        <div className="text-3xl font-bold text-white font-mono">
          ${isLoaded ? currentPrice.toFixed(2) : "---"}
        </div>
      </div>

      {/* Quantity input */}
      <div>
        <label className="text-slate-400 text-xs uppercase tracking-wide">Shares</label>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
          className="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Buy/Sell buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => buy(quantity)}
          disabled={!isLoaded || currentPrice * quantity > cash}
          className="bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2 rounded font-semibold transition-colors"
        >
          BUY
        </button>
        <button
          onClick={() => sell(quantity)}
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
        <div className="flex justify-between">
          <span className="text-slate-400">Equity</span>
          <span className="text-white font-mono">${totalEquity.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-t border-slate-700 pt-2">
          <span className="text-slate-400 font-semibold">P&L</span>
          <span
            className={`font-mono font-bold ${
              pnl >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
