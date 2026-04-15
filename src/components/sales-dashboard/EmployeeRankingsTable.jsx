import { Trophy, AlertCircle, TrendingUp } from "lucide-react";

export function EmployeeRankingsTable({
  leaderboard,
  selectedMonth,
  isLoading,
  currentUser,
}) {
  if (leaderboard.length === 0 && !isLoading) {
    return (
      <div className="p-10 text-center text-gray-9 flex flex-col items-center bg-gray-1 border border-gray-4 rounded-2xl mt-8">
        <AlertCircle size={32} className="mb-2 opacity-50" />
        <p className="font-medium">
          No sales quotas have been distributed for this month yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-1 border border-gray-4 rounded-2xl overflow-hidden mt-8">
      <div className="bg-gray-2 border-b border-gray-4 p-4 flex justify-between items-center">
        <h2 className="font-black text-gray-12 text-sm uppercase tracking-wider">
          Employee Performance [{selectedMonth}]
        </h2>
        {isLoading && (
          <span className="text-[10px] uppercase font-bold text-primary flex items-center gap-1 animate-pulse">
            <TrendingUp size={12} /> Syncing...
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-gray-2 text-xs font-bold text-gray-9 uppercase tracking-widest border-b border-gray-4">
              <th className="p-4 w-12 text-center">Rank</th>
              <th className="p-4">Employee</th>
              <th className="p-4 text-right">Quota Target</th>
              <th className="p-4 text-right">Completed Sales</th>
              <th className="p-4 text-right">Lost Sales</th>
              <th className="p-4 text-center">Percentage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-4">
            {leaderboard.map((emp, idx) => {
              const pct =
                emp.quota > 0
                  ? Math.round((emp.revenueWon / emp.quota) * 100)
                  : 0;
              const isTop = idx === 0 && pct > 0;
              const isSelf = currentUser?.id === emp.employee_id;
              const canSeeNumbers =
                currentUser?.isSuperAdmin ||
                currentUser?.is_super_admin ||
                isSelf;

              return (
                <tr
                  key={emp.name}
                  className={`hover:bg-gray-3 transition-colors ${isTop ? "bg-yellow-500/5" : ""}`}
                >
                  <td className="p-4 text-center font-black">
                    {isTop ? (
                      <Trophy size={18} className="mx-auto drop-shadow" />
                    ) : (
                      <span className="text-gray-9">#{idx + 1}</span>
                    )}
                  </td>
                  <td className="p-4 font-bold text-gray-12 text-sm">
                    {emp.name}{" "}
                    {isSelf && (
                      <span className="ml-2 text-[10px] bg-gray-12 text-gray-1 px-2 py-0.5 rounded-full uppercase tracking-widest">
                        You
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right font-mono text-gray-11 text-sm">
                    {canSeeNumbers ? (
                      `₱${Number(emp.quota).toLocaleString()}`
                    ) : (
                      <span className="text-gray-8 italic font-sans">
                        {pct}% Quota
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right font-mono text-green-400 font-black text-sm">
                    {canSeeNumbers ? (
                      `₱${emp.revenueWon.toLocaleString()}`
                    ) : (
                      <span className="text-green-900 font-sans">
                        {pct}% Achieved
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right font-mono text-red-400 font-bold text-sm">
                    {canSeeNumbers ? (
                      `₱${emp.revenueLost.toLocaleString()}`
                    ) : (
                      <span className="text-gray-6 italic font-sans">N/A</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2 w-max mx-auto">
                      <div className="w-24 h-2 bg-gray-4 rounded-full overflow-hidden flex-shrink-0 shadow-inner">
                        <div
                          className={`h-full ${pct >= 100 ? "transition-all duration-1000 bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : pct >= 50 ? "transition-all duration-1000 bg-yellow-500" : "transition-all duration-1000 bg-red-500"}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold text-gray-12 w-8">
                        {pct}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
