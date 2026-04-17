import { TrendingUp, TrendingDown, Trophy, Target } from "lucide-react";

export function SummaryMetrics({
  totalWon,
  totalLost,
  companyPct,
  winRate,
  showQuota,
}) {
  const count = 2 + (showQuota ? 1 : 0) + (winRate !== null ? 1 : 0);

  return (
    <div
      className="bg-white border border-gray-200 rounded-xl overflow-hidden"
      style={{ display: "grid", gridTemplateColumns: `repeat(${count}, 1fr)` }}
    >
      {/* Total Completed Sales */}
      <div className="p-5 flex flex-col gap-1">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
          <TrendingUp size={12} className="text-gray-400" /> Total Completed Sales
        </h3>
        <p className="text-2xl font-black text-gray-900 tabular-nums">
          ₱{totalWon.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>

      {/* Total Lost Sales */}
      <div className="p-5 flex flex-col gap-1 border-l border-gray-200">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
          <TrendingDown size={12} className="text-gray-400" /> Total Lost Sales
        </h3>
        <p className="text-2xl font-black text-gray-900 tabular-nums">
          ₱{totalLost.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>

      {/* Quota Achievement */}
      {showQuota && (
        <div className="p-5 flex flex-col gap-1 border-l border-gray-200">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
            <Trophy size={12} className="text-gray-400" /> Quota Achievement
          </h3>
          <p className="text-2xl font-black text-gray-900 tabular-nums">{companyPct}%</p>
        </div>
      )}

      {/* Team Win Rate */}
      {winRate !== null && (
        <div className="p-5 flex flex-col gap-1 border-l border-gray-200">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
            <Target size={12} className="text-gray-400" /> Team Win Rate
          </h3>
          <p className="text-2xl font-black text-gray-900 tabular-nums">{winRate}%</p>
        </div>
      )}
    </div>
  );
}
