import { TrendingUp, TrendingDown, Trophy, Target } from "lucide-react";

export function SummaryMetrics({
  totalWon,
  totalLost,
  companyPct,
  winRate,
  showQuota,
}) {
  return (
    <div className={`grid grid-cols-1 ${showQuota ? "md:grid-cols-4" : "md:grid-cols-3"} gap-4`}>
      <div className="bg-gray-1 border border-gray-4 p-5 rounded-2xl border-b-4 transition-transform hover:-translate-y-1">
        <h3 className="text-[10px] font-black text-gray-9 uppercase tracking-widest flex items-center gap-2 mb-2">
          <TrendingUp size={13} className="text-green-500" /> Total Completed
          Sales
        </h3>
        <p className="text-3xl font-black text-gray-12">
          ₱{totalWon.toLocaleString()}
        </p>
      </div>
      <div className="bg-gray-1 border border-gray-4 p-5 rounded-2xl border-b-4 transition-transform hover:-translate-y-1">
        <h3 className="text-[10px] font-black text-gray-9 uppercase tracking-widest flex items-center gap-2 mb-2">
          <TrendingDown size={13} className="text-red-500" /> Total Lost Sales
        </h3>
        <p className="text-3xl font-black text-gray-12">
          ₱{totalLost.toLocaleString()}
        </p>
      </div>
      {showQuota && (
        <div className="bg-gray-1 border border-gray-4 p-5 rounded-2xl border-b-4 relative overflow-hidden transition-transform hover:-translate-y-1">
          <h3 className="text-[10px] font-black text-gray-9 uppercase tracking-widest flex items-center gap-2 mb-2">
            <Trophy size={13} className="text-blue-500" /> Quota Achievement
          </h3>
          <p className="text-3xl font-black text-gray-12">{companyPct}%</p>
          <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl -mr-8 -mt-8" />
        </div>
      )}
      {winRate !== null && (
        <div className="bg-gray-1 border border-gray-4 p-5 rounded-2xl border-b-4 relative overflow-hidden transition-transform hover:-translate-y-1">
          <h3 className="text-[10px] font-black text-gray-9 uppercase tracking-widest flex items-center gap-2 mb-2">
            <Target size={13} className="text-purple-500" /> Team Win Rate
          </h3>
          <p className="text-3xl font-black text-gray-12">{winRate}%</p>
          <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/10 rounded-full blur-2xl -mr-8 -mt-8" />
        </div>
      )}
    </div>
  );
}
