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

export default function SalesPerformanceMetrics({ selectedMonth, selectedLabel }) {
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

  const displayLabel = selectedLabel || monthLabel;

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
      <div className="bg-white border border-[#E5E7EB] p-4 sm:p-6 rounded-lg">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#111827] flex items-center uppercase">
              Performance Metrics
              {displayLabel && (
                <span className="text-[#111827] ml-2">— {displayLabel}</span>
              )}
            </h2>
            <p className="text-sm text-[#6B7280] font-normal mt-1">
              Execution rate identifies planned tasks due in{" "}
              <span className="text-[#111827] font-semibold">{displayLabel}</span> vs
              actual completions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {loadingAct ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-[#6B7280] gap-3">
              <Loader2 className="animate-spin" size={32} />
              <p className="font-semibold uppercase tracking-widest text-xs">
                Synchronizing Metrics...
              </p>
            </div>
          ) : employeeStats.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 border border-dashed border-[#E5E7EB] rounded-lg">
              <Calculator className="text-[#9CA3AF] mb-2" size={32} />
              <p className="text-[#6B7280] font-medium uppercase tracking-widest text-xs">
                No records for {monthLabel}
              </p>
            </div>
          ) : (
            employeeStats.map((stat) => (
              <div
                key={stat.name}
                className="bg-white border border-[#E5E7EB] p-4 rounded-lg flex flex-col gap-3 hover:border-[#D1D5DB] transition-colors"
              >
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-[#111827] text-base truncate flex-1 pr-2">
                      {stat.name}
                    </p>
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-tight px-2 py-0.5 rounded-md bg-white border ${
                        stat.executionRate >= 80
                          ? "border-green-500 text-green-700"
                          : stat.executionRate >= 50
                            ? "border-amber-500 text-amber-700"
                            : "border-red-500 text-red-700"
                      }`}
                    >
                      {stat.executionRate}% Execution
                    </span>
                  </div>
                  <p className="text-[10px] text-[#9CA3AF] font-medium uppercase tracking-widest truncate">
                    {stat.department}
                  </p>
                </div>

                <div className="mt-1">
                  <MetricRow
                    label="Month Pipeline"
                    value={stat.totalPipeline}
                  />
                  <MetricRow
                    label="Due within Month"
                    value={stat.totalDue}
                  />
                  <MetricRow
                    label="Tasks Completed"
                    value={stat.totalDone}
                  />
                  <MetricRow
                    label="Backlog"
                    value={stat.totalIncomplete}
                    alert={stat.totalIncomplete > 0 ? "red" : null}
                  />
                  <MetricRow
                    label="Extra (Unplanned)"
                    value={stat.totalUnplanned}
                  />
                  <MetricRow
                    label="Late Submissions"
                    value={stat.totalLate}
                    alert={stat.totalLate > 0 ? "orange" : null}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* === FINANCIAL OVERVIEW (Outcome-Based) === */}
      {isAdminView && expenseSummary && expenseSummary.totalCount > 0 && (
        <div className="bg-white border border-[#E5E7EB] p-6 sm:p-8 rounded-lg space-y-8">
          {/* ── HEADER ── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#F3F4F6]">
            <div>
              <h2 className="text-2xl font-black text-[#111827] uppercase tracking-tight">
                Financial Overview
              </h2>
              <p className="text-sm text-[#6B7280] font-medium uppercase tracking-widest">
                {monthLabel}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Total Volume */}
              <div className="bg-white px-4 py-2 border border-[#E5E7EB] rounded-lg">
                <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest">
                  Gross Budget
                </p>
                <p className="text-lg font-bold text-[#111827]">
                  ₱ {expenseSummary.totalExpense.toLocaleString()}
                </p>
              </div>

              {/* Conversion Efficiency */}
              {expenseSummary.conversionRate !== null && (
                <div className={`px-4 py-2 bg-white border rounded-lg ${
                  expenseSummary.conversionRate >= 60
                    ? "border-green-500/30"
                    : expenseSummary.conversionRate >= 30
                      ? "border-amber-500/30"
                      : "border-red-500/30"
                }`}>
                  <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest">
                    Conversion Rate
                  </p>
                  <p className={`text-lg font-bold ${
                    expenseSummary.conversionRate >= 60
                      ? "text-green-600"
                      : expenseSummary.conversionRate >= 30
                        ? "text-amber-600"
                        : "text-red-600"
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
                  <div className="px-4 py-2 border border-[#E5E7EB] rounded-lg bg-white">
                    <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest">
                      vs Last Month
                    </p>
                    <p className={`text-lg font-bold flex items-center gap-1 ${
                      isFlat ? "text-[#6B7280]" : isUp ? "text-red-600" : "text-green-600"
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
              accentClass="text-green-600"
              borderClass="border-green-500/20 hover:border-green-500/40"
              bgClass="bg-white"
            />
            <OutcomeCard
              title="Lost Investments"
              amount={expenseSummary.lostExpense}
              count={expenseSummary.lostCount}
              icon={XCircle}
              accentClass="text-red-600"
              borderClass="border-red-500/20 hover:border-red-500/40"
              bgClass="bg-white"
            />
            <OutcomeCard
              title="Pending Verdict"
              amount={expenseSummary.pendingExpense}
              count={expenseSummary.pendingCount}
              icon={Clock}
              accentClass="text-amber-600"
              borderClass="border-amber-500/20 hover:border-amber-500/40"
              bgClass="bg-white"
            />
            <OutcomeCard
              title="Operations"
              amount={expenseSummary.bizDevExpense}
              count={expenseSummary.bizDevCount}
              icon={Briefcase}
              accentClass="text-blue-600"
              borderClass="border-blue-500/20 hover:border-blue-500/40"
              bgClass="bg-white"
            />
          </div>

          {/* ── COMPACT LEGACY BREAKDOWN ── */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3 px-4 bg-[#F9FAFB] rounded-lg border border-[#F3F4F6] text-xs text-[#6B7280]">
            <span className="font-semibold text-[#111827]">Summary:</span>
            <span>
              <span className="font-bold text-[#111827]">{expenseSummary.totalCount}</span> expense items
            </span>
            <span className="hidden sm:inline text-[#D1D5DB]">·</span>
            <span>
              Account Tasks: <span className="font-bold text-[#111827]">₱{expenseSummary.withRefExpense.toLocaleString()}</span>
              <span className="text-[#9CA3AF] ml-1">({expenseSummary.withRefCount})</span>
            </span>
            <span className="hidden sm:inline text-[#D1D5DB]">·</span>
            <span>
              BizDev: <span className="font-bold text-[#111827]">₱{expenseSummary.bizDevExpense.toLocaleString()}</span>
              <span className="text-[#9CA3AF] ml-1">({expenseSummary.bizDevCount})</span>
            </span>
          </div>

          {/* ── PER-EMPLOYEE BREAKDOWN ── */}
          {expenseSummary.employeeBreakdown.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users size={16} className="text-[#6B7280]" />
                <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest">
                  Expense Breakdown by Representative
                </h3>
              </div>
              <div className="overflow-x-auto rounded-lg border border-[#E5E7EB]">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-[#F9FAFB] text-[10px] font-semibold text-[#6B7280] uppercase tracking-widest border-b border-[#E5E7EB]">
                      <th className="p-3 pl-4">Representative</th>
                      <th className="p-3 text-right">Total Spent</th>
                      <th className="p-3 text-right">Won</th>
                      <th className="p-3 text-right">Lost</th>
                      <th className="p-3 text-right">Pending</th>
                      <th className="p-3 text-right">Ops</th>
                      <th className="p-3 text-center">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6]">
                    {expenseSummary.employeeBreakdown.map((emp) => (
                      <tr key={emp.name} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="p-3 pl-4 font-semibold text-sm text-[#111827]">{emp.name}</td>
                        <td className="p-3 text-right font-mono text-sm font-bold text-[#111827]">
                          ₱{emp.total.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono text-xs text-green-600 font-semibold">
                          {emp.won > 0 ? `₱${emp.won.toLocaleString()}` : "—"}
                        </td>
                        <td className="p-3 text-right font-mono text-xs text-red-600 font-semibold">
                          {emp.lost > 0 ? `₱${emp.lost.toLocaleString()}` : "—"}
                        </td>
                        <td className="p-3 text-right font-mono text-xs text-amber-600 font-semibold">
                          {emp.pending > 0 ? `₱${emp.pending.toLocaleString()}` : "—"}
                        </td>
                        <td className="p-3 text-right font-mono text-xs text-blue-600 font-semibold">
                          {emp.bizDev > 0 ? `₱${emp.bizDev.toLocaleString()}` : "—"}
                        </td>
                        <td className="p-3 text-center">
                          {emp.winRate !== null ? (
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white border ${
                              emp.winRate >= 60
                                ? "border-green-500 text-green-700"
                                : emp.winRate >= 30
                                  ? "border-amber-500 text-amber-700"
                                  : "border-red-500 text-red-700"
                            }`}>
                              {emp.winRate}%
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#9CA3AF]">—</span>
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
      className={`${bgClass} border ${borderClass} rounded-lg p-5 flex flex-col relative overflow-hidden group transition-colors`}
    >
      <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-widest mb-2 flex items-center gap-2">
        <Icon size={13} className={accentClass} /> {title}
      </p>
      <p className="text-2xl lg:text-3xl font-bold text-[#111827] mb-1">
        ₱{amount.toLocaleString()}
      </p>
      <span className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-widest mt-auto">
        {count} {count === 1 ? "item" : "items"}
      </span>
    </div>
  );
}

function MetricRow({ label, value, alert = null }) {
  return (
    <div className="flex justify-between items-center text-sm border-b border-[#F3F4F6] py-1.5 last:border-0">
      <span className="text-[#6B7280] font-normal">{label}</span>
      <span className="flex items-center gap-1.5">
        {alert === "red" && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
        )}
        {alert === "orange" && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
        )}
        <span className="text-[#111827] font-semibold text-xs tabular-nums">
          {value}
        </span>
      </span>
    </div>
  );
}
