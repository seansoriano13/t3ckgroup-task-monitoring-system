import { TrendingUp, TrendingDown, Trophy } from "lucide-react";

export function SummaryMetrics({ totalWon, totalLost, companyPct }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-gray-1 border border-gray-4 p-6 rounded-2xl border-b-4 transition-transform hover:-translate-y-1">
        <h3 className="text-xs font-bold text-gray-9 uppercase tracking-widest flex items-center gap-2 mb-2">
          <TrendingUp size={14} className="text-green-500" /> Total Completed Sales
        </h3>
        <p className="text-4xl font-black text-gray-12">
          ₱{totalWon.toLocaleString()}
        </p>
      </div>
      <div className="bg-gray-1 border border-gray-4 p-6 rounded-2xl border-b-4 transition-transform hover:-translate-y-1">
        <h3 className="text-xs font-bold text-gray-9 uppercase tracking-widest flex items-center gap-2 mb-2">
          <TrendingDown size={14} className="text-red-500" /> Total Lost Sales
        </h3>
        <p className="text-4xl font-black text-gray-12">
          ₱{totalLost.toLocaleString()}
        </p>
      </div>
      <div className="bg-gray-1 border border-gray-4 p-6 rounded-2xl border-b-4 relative overflow-hidden transition-transform hover:-translate-y-1">
        <h3 className="text-xs font-bold text-gray-9 uppercase tracking-widest flex items-center gap-2 mb-2">
          <Trophy size={14} className="text-blue-500" /> Quota Percentage
        </h3>
        <p className="text-4xl font-black text-gray-12">{companyPct}%</p>
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
      </div>
    </div>
  );
}
