"use client";

import { useSimulationStore } from "@/store/simulation";

export default function SessionScoreCard() {
  const getSessionScore = useSimulationStore((s) => s.getSessionScore);
  const trades = useSimulationStore((s) => s.trades);
  const closedTrades = useSimulationStore((s) => s.closedTrades);

  if (trades.length === 0) return null;

  const score = getSessionScore();

  const gradeColor: Record<string, string> = {
    A: "text-green-400", B: "text-cyan-400", C: "text-yellow-400", D: "text-orange-400", F: "text-red-400",
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-white">🎯 Session Score</span>
        <span className={`text-2xl font-bold ${gradeColor[score.overallGrade]}`}>
          {score.overallGrade}
        </span>
      </div>

      <div className="space-y-2">
        <ScoreBar label="Patience" value={score.patienceScore} tip="Low trading frequency" />
        <ScoreBar label="Risk Mgmt" value={score.riskScore} tip="Using stop-losses" />
        <ScoreBar label="Journal" value={score.journalScore} tip="Documenting trades" />
      </div>

      {closedTrades.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700 text-[11px] text-slate-400">
          {score.patienceScore < 50 && <p>⚠️ Consider trading less — quality over quantity</p>}
          {score.riskScore < 50 && <p>⚠️ Set stop-losses on your entries</p>}
          {score.journalScore < 50 && <p>⚠️ Document your thesis before entering</p>}
          {score.patienceScore >= 80 && score.riskScore >= 80 && score.journalScore >= 80 && (
            <p className="text-green-400">✨ Excellent discipline this session!</p>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreBar({ label, value, tip }: { label: string; value: number; tip: string }) {
  const color = value >= 75 ? "bg-green-500" : value >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div title={tip}>
      <div className="flex justify-between text-[11px] mb-0.5">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-mono">{value.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
