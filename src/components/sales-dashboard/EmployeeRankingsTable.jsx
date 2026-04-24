import { useState, useMemo } from "react";
import { AlertCircle, TrendingUp } from "lucide-react";

export function EmployeeRankingsTable({
  leaderboard,
  label,
  isLoading,
  currentUser,
  showQuota,
}) {
  const [subDeptFilter, setSubDeptFilter] = useState("ALL");


  // Collect unique sub-departments for filter chips
  const subDepts = useMemo(() => {
    const set = new Set();
    leaderboard.forEach((e) => {
      const team = e.sub_department || e.department;
      if (team && team !== "ALL") set.add(team);
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [leaderboard]);

  const filtered = useMemo(() => {
    if (subDeptFilter === "ALL") return leaderboard;
    return leaderboard.filter((e) => (e.sub_department || e.department) === subDeptFilter);
  }, [leaderboard, subDeptFilter]);

  if (leaderboard.length === 0 && !isLoading) {
    return (
      <div className="p-10 text-center text-muted-foreground flex flex-col items-center bg-mauve-1 border border-mauve-4 rounded-2xl mt-6">
        <AlertCircle size={32} className="mb-2 opacity-50" />
        <p className="font-medium">
          No sales data available for this period.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-mauve-1 border border-mauve-4 rounded-2xl overflow-hidden mt-6">
      <div className="bg-mauve-2 border-b border-mauve-4 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-black text-foreground text-sm uppercase tracking-wider">
            Employee Performance [{label}]
          </h2>
          {isLoading && (
            <span className="text-[10px] uppercase font-bold text-primary flex items-center gap-1 animate-pulse">
              <TrendingUp size={12} /> Syncing...
            </span>
          )}
        </div>

        {/* Sub-department filter tabs */}
        {subDepts.length > 2 && (
          <div className="flex items-center gap-0.5">
            {subDepts.map((sd) => (
              <button
                key={sd}
                onClick={() => setSubDeptFilter(sd)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${subDeptFilter === sd
                  ? "bg-mauve-3 text-foreground border border-mauve-4"
                  : "text-muted-foreground hover:text-mauve-11 bg-transparent border border-transparent"
                  }`}
              >
                {sd === "ALL" ? "All Teams" : sd}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-mauve-2 text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-mauve-4">
              <th className="p-4 w-12 text-center">Rank</th>
              <th className="p-4">Employee</th>
              {showQuota && (
                <th className="p-4 text-right">Quota Target</th>
              )}
              <th className="p-4 text-right">Completed Sales</th>
              <th className="p-4 text-right">Lost Sales</th>
              <th className="p-4 text-center">Win Rate</th>
              <th className="p-4 text-center">
                {showQuota ? "Quota %" : "Deals"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-4">
            {filtered.map((emp, idx) => {
              const pct = emp.quotaPct || 0;
              const isTop = idx === 0 && (emp.revenueWon > 0 || pct > 0);
              const isSelf = currentUser?.id === emp.employee_id;
              const canSeeNumbers =
                currentUser?.isSuperAdmin ||
                currentUser?.is_super_admin ||
                isSelf;
              const totalDeals = emp.dealsWon + emp.dealsLost;


              return (
                <tr
                  key={emp.employee_id}
                  className="hover:bg-mauve-2 transition-colors"
                >
                  <td className="p-4 text-center font-black">
                    {isTop ? (
                      <span className="font-black text-foreground text-sm">#1</span>
                    ) : (
                      <span className="text-muted-foreground">#{idx + 1}</span>
                    )}
                  </td>
                  <td className="p-4 font-bold text-foreground text-sm">
                    <span>{emp.name}</span>
                    {isSelf && (
                      <span className="ml-2 text-[10px] bg-foreground text-mauve-1 px-2 py-0.5 rounded-full uppercase tracking-widest">
                        You
                      </span>
                    )}
                    {(emp.sub_department || emp.department) && (
                      <span className="ml-2 text-[10px] font-bold text-mauve-7 uppercase tracking-wider">
                        {emp.sub_department || emp.department}
                      </span>
                    )}
                  </td>
                  {showQuota && (
                    <td className="p-4 text-right font-mono text-mauve-11 text-sm">
                      {canSeeNumbers ? (
                        `₱${Number(emp.quota).toLocaleString()}`
                      ) : (
                        <span className="text-mauve-8 italic font-sans">
                          {pct}% Quota
                        </span>
                      )}
                    </td>
                  )}
                  <td className="p-4 text-right font-mono text-foreground font-semibold text-sm tabular-nums">
                    {canSeeNumbers ? (
                      `₱${emp.revenueWon.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    ) : (
                      <span className="text-muted-foreground font-sans">
                        {pct}% Achieved
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right font-mono text-foreground font-semibold text-sm tabular-nums">
                    {canSeeNumbers ? (
                      `₱${emp.revenueLost.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    ) : (
                      <span className="text-muted-foreground italic font-sans">
                        N/A
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {emp.winRate !== null ? (
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${emp.winRate >= 70
                          ? "border-green-300 text-green-11"
                          : emp.winRate >= 40
                            ? "border-amber-300 text-[color:var(--amber-11)]"
                            : "border-red-300 text-destructive"
                          }`}
                      >
                        {emp.winRate}%
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">
                        {totalDeals === 0 ? "No deals" : "—"}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {showQuota ? (
                      <div className="flex items-center justify-center gap-2 w-max mx-auto">
                        <div className="w-20 h-1 bg-mauve-4 rounded-full overflow-hidden flex-shrink-0">
                          <div
                            className={`h-full ${pct >= 100
                              ? "bg-green-9"
                              : pct >= 50
                                ? "bg-amber-400"
                                : "bg-red-400"
                              } transition-all duration-700`}
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground w-8 tabular-nums">
                          {pct}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-mauve-11">
                        {totalDeals} deals
                      </span>
                    )}
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
