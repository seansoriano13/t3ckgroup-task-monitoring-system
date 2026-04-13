import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { salesService } from "../services/salesService";
import { useAuth } from "../context/AuthContext";
import { REVENUE_STATUS } from "../constants/status";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Calculator,
  Tag,
  Wallet,
  Trophy,
  XCircle,
  Clock,
  Briefcase,
  ArrowUpRight,
  ArrowDownRight,
  Users,
} from "lucide-react";

export default function SalesPerformanceMetrics({ selectedMonth }) {
  const { user } = useAuth();
  const isAdminView =
    user?.isSuperAdmin ||
    user?.is_super_admin ||
    user?.isHr ||
    user?.is_hr ||
    user?.isHead ||
    user?.is_head;

  // Real-world reference for "Due" logic
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const todayMonthKey = today.slice(0, 7); // YYYY-MM

  // 1. Month Logic & Labels
  // We compute these on every render based on the prop to ensure perfect synchronization
  const { monthFilter, monthLabel } = useMemo(() => {
    if (!selectedMonth) return { monthFilter: null, monthLabel: "All Time" };

    // Robust parsing: handle YYYY-MM or YYYY-MM-DD
    const parts = String(selectedMonth).split("-");
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);

    if (isNaN(year) || isNaN(month))
      return { monthFilter: null, monthLabel: "All Time" };

    const filter = `${year}-${String(month).padStart(2, "0")}`;
    const dateObj = new Date(year, month - 1, 1);
    const label = dateObj.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });

    return { monthFilter: filter, monthLabel: label };
  }, [selectedMonth]);

  // Compute previous month key for MoM comparison
  const prevMonthFilter = useMemo(() => {
    if (!monthFilter) return null;
    const [y, m] = monthFilter.split("-").map(Number);
    const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
    return prev;
  }, [monthFilter]);

  const { data: allActivities = [], isLoading: loadingAct } = useQuery({
    queryKey: ["allSalesActivitiesAdmin", monthFilter],
    queryFn: () => salesService.getAllSalesActivities(monthFilter),
  });

  // Previous month data for MoM comparison (only fetched for admin views)
  const { data: prevActivities = [] } = useQuery({
    queryKey: ["allSalesActivitiesAdmin", prevMonthFilter],
    queryFn: () => salesService.getAllSalesActivities(prevMonthFilter),
    enabled: !!isAdminView && !!prevMonthFilter,
  });

  // 2. PERFORMANCE STATS (Filtered by Month)
  const employeeStats = useMemo(() => {
    if (!allActivities.length) return [];

    const stats = {};

    allActivities.forEach((act) => {
      // Filter activities strictly for the selected month
      if (monthFilter && !act.scheduled_date.startsWith(monthFilter)) return;

      const empId = act.employee_id;
      const roleStr = (act.employees?.role || "").toLowerCase();
      const deptStr = (act.employees?.department || "").toLowerCase();

      // Filter out admins from performance results
      if (
        act.employees?.is_super_admin ||
        roleStr.includes("admin") ||
        deptStr.includes("super admin")
      ) {
        return;
      }

      if (!stats[empId]) {
        stats[empId] = {
          empId,
          name: act.employees?.name || "Sales Rep",
          department: act.employees?.department || "Sales",
          totalPipeline: 0,
          totalDue: 0,
          totalDone: 0,
          totalPlannedDone: 0,
          totalUnplanned: 0,
          totalLate: 0,
          totalIncomplete: 0,
        };
      }

      stats[empId].totalPipeline++;
      const isUnplanned = !!act.is_unplanned;
      const isDone = act.status === "DONE" || act.status === "APPROVED";

      // COMMITMENT ADHERENCE (The Rate)
      // - If we are viewing a past month: all planned tasks are considered 'Due'.
      // - If we are viewing the current month: only tasks scheduled <= today are 'Due'.
      // - If we are viewing a future month: 0 tasks are 'Due' yet (Pipeline only).
      let isDue = false;
      if (!isUnplanned) {
        if (monthFilter < todayMonthKey) {
          isDue = true;
        } else if (monthFilter === todayMonthKey) {
          isDue = act.scheduled_date <= today;
        }
      }

      if (isUnplanned) {
        stats[empId].totalUnplanned++;
      } else if (isDue) {
        stats[empId].totalDue++;
        if (isDone) {
          stats[empId].totalPlannedDone++;
        } else {
          stats[empId].totalIncomplete++;
        }
      }

      if (isDone) {
        stats[empId].totalDone++;
        if (act.completed_at) {
          const sDate = new Date(act.scheduled_date);
          sDate.setDate(sDate.getDate() + 1); // 1-day grace
          const cDate = new Date(act.completed_at);
          if (cDate > sDate) stats[empId].totalLate++;
        }
      }
    });

    const sortedStats = Object.values(stats)
      .map((s) => {
        const executionRate =
          s.totalDue > 0
            ? Math.round((s.totalPlannedDone / s.totalDue) * 100)
            : 0;
        return { ...s, executionRate };
      })
      .sort((a, b) => b.executionRate - a.executionRate);

    // Filter out other employees if the current user is not a Head,
    // but the calculated rankings/sort remains preserved implicitly!
    if (!isAdminView && user?.id) {
      return sortedStats.filter((s) => s.empId === user.id);
    }

    return sortedStats;
  }, [allActivities, today, todayMonthKey, monthFilter, isAdminView, user?.id]);

  // 3. EXPENSE SUMMARY (Filtered by Month — Outcome-Based)
  const expenseSummary = useMemo(() => {
    if (!isAdminView) return null;

    // Accumulators — outcome-based
    let wonExpense = 0, wonCount = 0;
    let lostExpense = 0, lostCount = 0;
    let pendingExpense = 0, pendingCount = 0; // has ref, no outcome yet
    let bizDevExpense = 0, bizDevCount = 0;   // no ref (operations)
    let totalExpense = 0, totalCount = 0;
    let withRefExpense = 0, withRefCount = 0; // legacy totals preserved

    // Per-employee tracker
    const empMap = {};

    allActivities.forEach((act) => {
      if (monthFilter && !act.scheduled_date.startsWith(monthFilter)) return;
      // Exclude rejected expenses — denied budget shouldn't count
      if (act.status === REVENUE_STATUS.REJECTED) return;

      const amt = Number(act.expense_amount) || 0;
      if (amt <= 0) return;

      totalExpense += amt;
      totalCount++;

      // Per-employee accumulation
      const empName = act.employees?.name || "Unknown";
      const empId = act.employee_id;
      if (!empMap[empId]) {
        empMap[empId] = { name: empName, total: 0, won: 0, lost: 0, pending: 0, bizDev: 0, wonCount: 0, lostCount: 0, totalCount: 0 };
      }
      empMap[empId].total += amt;
      empMap[empId].totalCount++;

      if (act.reference_number) {
        withRefExpense += amt;
        withRefCount++;

        if (act.sales_outcome === REVENUE_STATUS.COMPLETED) {
          wonExpense += amt; wonCount++;
          empMap[empId].won += amt; empMap[empId].wonCount++;
        } else if (act.sales_outcome === REVENUE_STATUS.LOST) {
          lostExpense += amt; lostCount++;
          empMap[empId].lost += amt; empMap[empId].lostCount++;
        } else {
          pendingExpense += amt; pendingCount++;
          empMap[empId].pending += amt;
        }
      } else {
        bizDevExpense += amt; bizDevCount++;
        empMap[empId].bizDev += amt;
      }
    });

    // Per-employee sorted array
    const employeeBreakdown = Object.values(empMap)
      .sort((a, b) => b.total - a.total)
      .map(emp => ({
        ...emp,
        winRate: (emp.wonCount + emp.lostCount) > 0
          ? Math.round((emp.wonCount / (emp.wonCount + emp.lostCount)) * 100)
          : null, // null = no outcomes tagged yet
      }));

    // Conversion efficiency (only among outcome-tagged items)
    const conversionRate = (wonCount + lostCount) > 0
      ? Math.round((wonCount / (wonCount + lostCount)) * 100)
      : null;

    return {
      totalExpense, totalCount,
      wonExpense, wonCount,
      lostExpense, lostCount,
      pendingExpense, pendingCount,
      bizDevExpense, bizDevCount,
      withRefExpense, withRefCount, // legacy
      conversionRate,
      employeeBreakdown,
    };
  }, [allActivities, isAdminView, monthFilter]);

  // 3b. Previous month gross for MoM comparison
  const prevMonthGross = useMemo(() => {
    if (!isAdminView || !prevActivities.length) return null;
    let total = 0;
    prevActivities.forEach((act) => {
      if (prevMonthFilter && !act.scheduled_date.startsWith(prevMonthFilter)) return;
      if (act.status === REVENUE_STATUS.REJECTED) return;
      const amt = Number(act.expense_amount) || 0;
      if (amt > 0) total += amt;
    });
    return total;
  }, [prevActivities, isAdminView, prevMonthFilter]);

  return (
    <div className="space-y-8 mt-8 mb-8 transition-all duration-500">
      {/* === PERFORMANCE METRICS === */}
      <div className="bg-gray-1 border border-gray-4 p-4 sm:p-6 rounded-xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <TrendingUp size={120} />
        </div>

        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-gray-12 uppercase tracking-tight">
              Performance Metrics{" "}
              <span className="text-purple-500">— {monthLabel}</span>
            </h2>
            <p className="text-sm text-gray-9 font-medium mt-1">
              Execution rate identifies planned tasks due in{" "}
              <span className="text-gray-12 font-bold">{monthLabel}</span> vs
              actual completions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingAct ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-9 gap-3">
              <Loader2 className="animate-spin" size={32} />
              <p className="font-black uppercase tracking-widest text-xs">
                Synchronizing Metrics...
              </p>
            </div>
          ) : employeeStats.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-4 rounded-2xl bg-gray-2/50">
              <Calculator className="text-gray-6 mb-2" size={32} />
              <p className="text-gray-9 font-bold uppercase tracking-widest text-xs">
                No records for {monthLabel}
              </p>
            </div>
          ) : (
            employeeStats.map((stat) => (
              <div
                key={stat.name}
                className="bg-gray-2 border border-gray-4 p-5 rounded-2xl flex flex-col gap-4 shadow-sm hover:border-gray-6 transition-all group"
              >
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-black text-gray-12 text-lg truncate flex-1 pr-2">
                      {stat.name}
                    </p>
                    <span
                      className={`text-[10px] font-black uppercase tracking-tighter px-2.5 py-1 rounded-lg shadow-sm border ${
                        stat.executionRate >= 80
                          ? "bg-green-500 border-green-400 text-white"
                          : stat.executionRate >= 50
                            ? "bg-amber-400 border-amber-300 text-amber-900"
                            : "bg-red-500 border-red-400 text-white"
                      }`}
                    >
                      {stat.executionRate}% EXECUTION
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-9 font-black uppercase tracking-widest truncate">
                    {stat.department}
                  </p>
                </div>

                <div className="space-y-2.5 mt-2">
                  <MetricRow
                    label="Month Pipeline"
                    value={stat.totalPipeline}
                  />
                  <MetricRow
                    label="Due within Month"
                    value={stat.totalDue}
                    color="text-blue-500 bg-blue-500/10"
                  />
                  <MetricRow
                    label="Tasks Completed"
                    value={stat.totalDone}
                    color="text-emerald-500 bg-emerald-500/10"
                  />
                  <MetricRow
                    label="Backlog"
                    value={stat.totalIncomplete}
                    color={
                      stat.totalIncomplete > 0
                        ? "text-red-500 bg-red-500/10 font-black"
                        : "text-gray-6 bg-gray-6/10"
                    }
                  />
                  <MetricRow
                    label="Extra (Unplanned)"
                    value={stat.totalUnplanned}
                    color="text-purple-500 bg-purple-500/10"
                  />
                  <MetricRow
                    label="Late Submissions"
                    value={stat.totalLate}
                    color={
                      stat.totalLate > 0
                        ? "text-orange-500 bg-orange-500/10"
                        : "text-gray-6 bg-gray-6/10"
                    }
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* === FINANCIAL OVERVIEW (Outcome-Based) === */}
      {isAdminView && expenseSummary && expenseSummary.totalCount > 0 && (
        <div className="bg-gray-1 border border-gray-4 p-6 sm:p-8 rounded-3xl shadow-xl space-y-8">
          {/* ── HEADER ── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-4">
            <div>
              <h2 className="text-2xl font-black text-gray-12 uppercase tracking-tight">
                Financial Overview
              </h2>
              <p className="text-sm text-gray-9 font-bold uppercase tracking-widest">
                {monthLabel}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Total Volume */}
              <div className="bg-gray-2 px-4 py-2 border border-gray-4 rounded-xl">
                <p className="text-[10px] font-black text-gray-8 uppercase tracking-widest">
                  Gross Budget
                </p>
                <p className="text-lg font-black text-gray-12">
                  ₱ {expenseSummary.totalExpense.toLocaleString()}
                </p>
              </div>

              {/* Conversion Efficiency */}
              {expenseSummary.conversionRate !== null && (
                <div className={`px-4 py-2 border rounded-xl ${
                  expenseSummary.conversionRate >= 60
                    ? "border-green-500/30 bg-green-500/5"
                    : expenseSummary.conversionRate >= 30
                      ? "border-amber-500/30 bg-amber-500/5"
                      : "border-red-500/30 bg-red-500/5"
                }`}>
                  <p className="text-[10px] font-black text-gray-8 uppercase tracking-widest">
                    Conversion Rate
                  </p>
                  <p className={`text-lg font-black ${
                    expenseSummary.conversionRate >= 60
                      ? "text-green-500"
                      : expenseSummary.conversionRate >= 30
                        ? "text-amber-500"
                        : "text-red-500"
                  }`}>
                    {expenseSummary.conversionRate}%
                  </p>
                </div>
              )}

              {/* Month-over-Month */}
              {prevMonthGross !== null && prevMonthGross > 0 && (() => {
                const pctChange = Math.round(((expenseSummary.totalExpense - prevMonthGross) / prevMonthGross) * 100);
                const isUp = pctChange > 0;
                const isFlat = pctChange === 0;
                return (
                  <div className="px-4 py-2 border border-gray-4 rounded-xl bg-gray-2">
                    <p className="text-[10px] font-black text-gray-8 uppercase tracking-widest">
                      vs Last Month
                    </p>
                    <p className={`text-lg font-black flex items-center gap-1 ${
                      isFlat ? "text-gray-9" : isUp ? "text-red-500" : "text-green-500"
                    }`}>
                      {isFlat ? "—" : isUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      {isFlat ? "Flat" : `${Math.abs(pctChange)}%`}
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ── OUTCOME CARDS ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <OutcomeCard
              title="Won Investments"
              amount={expenseSummary.wonExpense}
              count={expenseSummary.wonCount}
              icon={Trophy}
              accentClass="text-green-500"
              borderClass="border-green-500/20 hover:border-green-500/40"
              bgClass="bg-green-500/5"
            />
            <OutcomeCard
              title="Lost Investments"
              amount={expenseSummary.lostExpense}
              count={expenseSummary.lostCount}
              icon={XCircle}
              accentClass="text-red-500"
              borderClass="border-red-500/20 hover:border-red-500/40"
              bgClass="bg-red-500/5"
            />
            <OutcomeCard
              title="Pending Verdict"
              amount={expenseSummary.pendingExpense}
              count={expenseSummary.pendingCount}
              icon={Clock}
              accentClass="text-amber-500"
              borderClass="border-amber-500/20 hover:border-amber-500/40"
              bgClass="bg-amber-500/5"
            />
            <OutcomeCard
              title="Operations"
              amount={expenseSummary.bizDevExpense}
              count={expenseSummary.bizDevCount}
              icon={Briefcase}
              accentClass="text-blue-500"
              borderClass="border-blue-500/20 hover:border-blue-500/40"
              bgClass="bg-blue-500/5"
            />
          </div>

          {/* ── COMPACT LEGACY BREAKDOWN ── */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3 px-4 bg-gray-2 rounded-xl border border-gray-3 text-xs text-gray-9">
            <span className="font-bold text-gray-11">Summary:</span>
            <span>
              <span className="font-black text-gray-12">{expenseSummary.totalCount}</span> expense items
            </span>
            <span className="hidden sm:inline text-gray-6">·</span>
            <span>
              Account Tasks: <span className="font-black text-gray-12">₱{expenseSummary.withRefExpense.toLocaleString()}</span>
              <span className="text-gray-7 ml-1">({expenseSummary.withRefCount})</span>
            </span>
            <span className="hidden sm:inline text-gray-6">·</span>
            <span>
              BizDev: <span className="font-black text-gray-12">₱{expenseSummary.bizDevExpense.toLocaleString()}</span>
              <span className="text-gray-7 ml-1">({expenseSummary.bizDevCount})</span>
            </span>
          </div>

          {/* ── PER-EMPLOYEE BREAKDOWN ── */}
          {expenseSummary.employeeBreakdown.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users size={16} className="text-gray-9" />
                <h3 className="text-xs font-black text-gray-10 uppercase tracking-widest">
                  Expense Breakdown by Representative
                </h3>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-4">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-2 text-[10px] font-black text-gray-9 uppercase tracking-widest border-b border-gray-4">
                      <th className="p-3 pl-4">Representative</th>
                      <th className="p-3 text-right">Total Spent</th>
                      <th className="p-3 text-right">Won</th>
                      <th className="p-3 text-right">Lost</th>
                      <th className="p-3 text-right">Pending</th>
                      <th className="p-3 text-right">Ops</th>
                      <th className="p-3 text-center">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-3">
                    {expenseSummary.employeeBreakdown.map((emp) => (
                      <tr key={emp.name} className="hover:bg-gray-2/50 transition-colors">
                        <td className="p-3 pl-4 font-bold text-sm text-gray-12">{emp.name}</td>
                        <td className="p-3 text-right font-mono text-sm font-black text-gray-12">
                          ₱{emp.total.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono text-xs text-green-500 font-bold">
                          {emp.won > 0 ? `₱${emp.won.toLocaleString()}` : "—"}
                        </td>
                        <td className="p-3 text-right font-mono text-xs text-red-500 font-bold">
                          {emp.lost > 0 ? `₱${emp.lost.toLocaleString()}` : "—"}
                        </td>
                        <td className="p-3 text-right font-mono text-xs text-amber-500 font-bold">
                          {emp.pending > 0 ? `₱${emp.pending.toLocaleString()}` : "—"}
                        </td>
                        <td className="p-3 text-right font-mono text-xs text-blue-500 font-bold">
                          {emp.bizDev > 0 ? `₱${emp.bizDev.toLocaleString()}` : "—"}
                        </td>
                        <td className="p-3 text-center">
                          {emp.winRate !== null ? (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              emp.winRate >= 60
                                ? "bg-green-500/10 text-green-500"
                                : emp.winRate >= 30
                                  ? "bg-amber-500/10 text-amber-500"
                                  : "bg-red-500/10 text-red-500"
                            }`}>
                              {emp.winRate}%
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-7">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OutcomeCard({
  title,
  amount,
  count,
  icon,
  accentClass,
  borderClass,
  bgClass,
}) {
  const Icon = icon;
  return (
    <div
      className={`${bgClass} border ${borderClass} rounded-2xl p-5 flex flex-col relative overflow-hidden group transition-all`}
    >
      <div className="absolute -top-4 -right-4 opacity-[0.04] pointer-events-none">
        <Icon size={100} />
      </div>
      <p className="text-[10px] font-black text-gray-9 uppercase tracking-widest mb-2 flex items-center gap-2">
        <Icon size={13} className={accentClass} /> {title}
      </p>
      <p className={`text-2xl lg:text-3xl font-black text-gray-12 mb-1`}>
        ₱{amount.toLocaleString()}
      </p>
      <span className="text-[10px] font-bold text-gray-8 uppercase tracking-widest mt-auto">
        {count} {count === 1 ? "item" : "items"}
      </span>
    </div>
  );
}

function MetricRow({ label, value, color = "text-gray-12 bg-gray-3" }) {
  return (
    <div className="flex justify-between items-center text-sm font-bold border-b border-gray-4/50 pb-2 last:border-0 last:pb-0">
      <span className="text-gray-10">{label}</span>
      <span
        className={`${color} px-2 py-0.5 rounded text-xs min-w-[2rem] text-center`}
      >
        {value}
      </span>
    </div>
  );
}
