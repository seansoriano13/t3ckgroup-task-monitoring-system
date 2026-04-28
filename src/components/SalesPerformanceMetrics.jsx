import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Dot from "./ui/Dot";
import { useNavigate } from "react-router";
import { salesService } from "../services/salesService";
import { useAuth } from "../context/AuthContext";
import { REVENUE_STATUS } from "../constants/status";
import Avatar from "./Avatar";
import { useEmployeeAvatarMap } from "../hooks/useEmployeeAvatarMap";
import {
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
  Search,
  X,
  List,
  LayoutGrid,
  Rows3,
  Star,
  Activity,
  Info,
  Calendar,
  Filter,
} from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import HighlightText from "./HighlightText";


export default function SalesPerformanceMetrics({ globalRange }) {
  const navigate = useNavigate();
  const { startDate, endDate, label: selectedLabel } = globalRange || {};
  const selectedMonth = startDate;
  const { user } = useAuth();
  const isAdminView =
    user?.isSuperAdmin ||
    user?.is_super_admin ||
    user?.isHr ||
    user?.is_hr ||
    user?.isHead ||
    user?.is_head;

  const [searchTerm, setSearchTerm] = useState("");
  const [layoutMode, setLayoutMode] = useState("stack"); // "row" | "stack" | "grid"
  const avatarMap = useEmployeeAvatarMap();

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
      // Filter activities strictly for the selected range
      if (startDate && endDate) {
        if (act.scheduled_date < startDate || act.scheduled_date >= endDate) return;
      } else if (monthFilter && !act.scheduled_date.startsWith(monthFilter)) {
        return;
      }

      const empId = act.employee_id;
      if (!stats[empId]) {
        stats[empId] = {
          id: empId,
          name: act.employees?.name || "Sales Rep",
          department: act.employees?.department || "Sales",
          subDept: act.employees?.sub_department || "Sales",
          total: 0,
          onTime: 0,
          late: 0,
          backlog: 0,
          unplanned: 0,
          pending: 0,
          executionRate: 0,
          totalDue: 0,
          totalPlannedDone: 0,
        };
      }

      const emp = stats[empId];
      emp.total++;

      const isUnplanned = !!act.is_unplanned;
      const isDone = act.status === "DONE" || act.status === "APPROVED";

      // BUCKET LOGIC (Exclusive for pipeline bar)
      let isDue = false;
      if (!isUnplanned) {
        if (monthFilter < todayMonthKey) {
          isDue = true;
        } else if (monthFilter === todayMonthKey) {
          isDue = act.scheduled_date <= today;
        }
      }

      if (isUnplanned) {
        emp.unplanned++;
      } else if (isDue) {
        emp.totalDue++;
        if (isDone) {
          emp.totalPlannedDone++;
          // Check if late
          if (act.completed_at) {
            const sDate = new Date(act.scheduled_date);
            sDate.setDate(sDate.getDate() + 1); // 1-day grace
            const cDate = new Date(act.completed_at);
            if (cDate > sDate) emp.late++;
            else emp.onTime++;
          } else {
            emp.onTime++; // No completion date but marked done? Treat as on-time.
          }
        } else {
          emp.backlog++;
        }
      } else {
        emp.pending++; // Future planned task
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
      .sort((a, b) => b.total - a.total);

    // Filter out other employees if the current user is not a Head,
    // but the calculated rankings/sort remains preserved implicitly!
    if (!isAdminView && user?.id) {
      return sortedStats.filter((s) => s.id === user.id);
    }

    return sortedStats;
  }, [allActivities, today, todayMonthKey, monthFilter, isAdminView, user?.id, startDate, endDate]);

  const filteredStats = useMemo(() => {
    if (!searchTerm.trim()) return employeeStats;
    const lower = searchTerm.toLowerCase();
    return employeeStats.filter(
      (e) =>
        e.name.toLowerCase().includes(lower) ||
        e.subDept.toLowerCase().includes(lower) ||
        e.department.toLowerCase().includes(lower),
    );
  }, [employeeStats, searchTerm]);

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
      // Filter activities strictly for the selected range
      if (startDate && endDate) {
        if (act.scheduled_date < startDate || act.scheduled_date >= endDate) return;
      } else if (monthFilter && !act.scheduled_date.startsWith(monthFilter)) {
        return;
      }

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
      <div className="bg-card border border-border rounded-2xl shadow-sm p-5 overflow-hidden">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 tracking-tight">
              <div className="w-10 h-10 rounded-xl bg-mauve-2 flex items-center justify-center text-mauve-11 shadow-sm border border-mauve-4">
                <Activity size={18} />
              </div>
              Representative Pipeline Radar
            </h2>
            <p className="text-sm text-mauve-10 mt-0.5">
              Performance metrics •{" "}
              <span className="font-semibold text-foreground">{displayLabel}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 min-w-[200px]">
              <Search size={14} className="text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search representative..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-foreground placeholder-[#9CA3AF] w-full"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="text-[#9CA3AF] hover:text-foreground"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-mauve-2 border border-mauve-5 p-1 rounded-lg">
              <button
                onClick={() => setLayoutMode("row")}
                className={`p-1 rounded transition-all ${layoutMode === "row" ? "bg-card shadow-sm text-red-9" : "text-muted-foreground hover:text-mauve-11"}`}
                title="Single Row"
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setLayoutMode("stack")}
                className={`p-1 rounded transition-all ${layoutMode === "stack" ? "bg-card shadow-sm text-red-9" : "text-muted-foreground hover:text-mauve-11"}`}
                title="3-Row Stack"
              >
                <Rows3 size={16} />
              </button>
              <button
                onClick={() => setLayoutMode("grid")}
                className={`p-1 rounded transition-all ${layoutMode === "grid" ? "bg-card shadow-sm text-red-9" : "text-muted-foreground hover:text-mauve-11"}`}
                title="Full Grid"
              >
                <LayoutGrid size={16} />
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 bg-card border border-border px-3 py-1.5 rounded-lg h-full">
              <Users size={14} className="text-[#9CA3AF]" />
              <span className="text-xs text-[#6B7280]">
                {employeeStats.length} reps
              </span>
            </div>
          </div>
        </div>

        {/* DYNAMIC PIPELINE GRID */}
        <div
          className={`
          ${layoutMode === "row" ? "flex gap-3 overflow-x-auto pb-4 custom-scrollbar snap-x" : ""}
          ${layoutMode === "stack" ? "grid grid-rows-3 grid-flow-col gap-3 overflow-x-auto pb-4 custom-scrollbar snap-x" : ""}
          ${layoutMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-4" : ""}
        `}
        >
          {loadingAct ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-[#6B7280] gap-3">
              <Spinner size="lg" />
              <p className="font-semibold uppercase tracking-widest text-xs">
                Synchronizing Metrics...
              </p>
            </div>
          ) : filteredStats.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 border border-dashed border-border rounded-xl">
              <Calculator className="text-[#9CA3AF] mb-2" size={32} />
              <p className="text-[#6B7280] font-medium uppercase tracking-widest text-xs">
                No records for {displayLabel}
              </p>
            </div>
          ) : (
            filteredStats.map((stat) => (
              <div
                key={stat.id}
                onClick={() =>
                  navigate("/sales/records", {
                    state: {
                      filterEmployeeId: stat.id,
                      timeframe: globalRange?.mode,
                      dateFilter: globalRange?.startDate,
                    },
                  })
                }
                className={`cursor-pointer flex flex-col transition-colors border border-border rounded-lg p-4 hover:bg-mauve-3 hover:border-mauve-5 ${
                  layoutMode === "grid" ? "w-full" : "min-w-[260px] sm:min-w-[290px] snap-start"
                }`}
              >
                {/* Header: Avatar & Name */}
                <div className="flex justify-between items-center gap-2">
                  <div className="flex gap-2.5 items-center min-w-0">
                    <Avatar
                      className="bg-white shadow-sm"
                      size="sm"
                      name={stat.name}
                      src={avatarMap.get(stat.id) ?? undefined}
                    />
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-[#111827] line-clamp-1">
                        <HighlightText text={stat.name} search={searchTerm} />
                      </h3>
                      <p className="text-xs text-[#6B7280] line-clamp-1">
                        <HighlightText text={stat.subDept || stat.department} search={searchTerm} />
                      </p>
                    </div>

                  </div>
                  <div className="flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full border border-border bg-card">
                    <Star size={11} className="text-mauve-11 fill-mauve-11" />
                    <span className="text-xs font-semibold text-[#111827]">
                      {stat.executionRate}%
                    </span>
                  </div>
                </div>

                {/* Segmented Pipeline Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1.5">
                    <span>Task Pipeline</span>
                    <span className="text-[#374151]">{stat.total} Total</span>
                  </div>

                  <div className="w-full h-[7px] rounded-sm bg-[#F3F4F6] overflow-hidden flex">
                    {stat.backlog > 0 && (
                      <div
                        className="bg-orange-a7"
                        style={{ width: `${(stat.backlog / stat.total) * 100}%` }}
                        title={`${stat.backlog} Backlog`}
                      />
                    )}
                    {stat.late > 0 && (
                      <div
                        className="bg-red-a7"
                        style={{ width: `${(stat.late / stat.total) * 100}%` }}
                        title={`${stat.late} Late`}
                      />
                    )}
                    {stat.onTime > 0 && (
                      <div
                        className="bg-green-a7"
                        style={{ width: `${(stat.onTime / stat.total) * 100}%` }}
                        title={`${stat.onTime} On-Time`}
                      />
                    )}
                    {stat.unplanned > 0 && (
                      <div
                        className="bg-blue-a7"
                        style={{ width: `${(stat.unplanned / stat.total) * 100}%` }}
                        title={`${stat.unplanned} Unplanned`}
                      />
                    )}
                    {stat.pending > 0 && (
                      <div
                        className="bg-mauve-6"
                        style={{ width: `${(stat.pending / stat.total) * 100}%` }}
                        title={`${stat.pending} Future`}
                      />
                    )}
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                    <LegendItem color="#F59E0B" count={stat.backlog} label="Back" />
                    {stat.late > 0 && <LegendItem color="#EF4444" count={stat.late} label="Late" />}
                    <LegendItem color="#22C55E" count={stat.onTime} label="Done" />
                    <LegendItem color="#3B82F6" count={stat.unplanned} label="Extra" />
                    {stat.pending > 0 && <LegendItem color="#94A3B8" count={stat.pending} label="Fut" />}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-border">
                  <span className="text-xs font-medium text-[#6B7280]">
                    Execution Rate
                  </span>
                  <span className="flex items-center gap-1 text-sm font-bold text-[#111827]">
                    {stat.executionRate}%
                    <TrendingUp
                      size={13}
                      className={
                        stat.executionRate >= 80
                          ? "text-green-a11"
                          : stat.executionRate >= 50
                            ? "text-orange-a11"
                            : "text-red-a11"
                      }
                    />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* === FINANCIAL OVERVIEW (Outcome-Based) === */}
      {isAdminView && expenseSummary && expenseSummary.totalCount > 0 && (
        <div className="bg-card border border-[#E5E7EB] p-6 sm:p-8 rounded-lg space-y-8">
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
              <div className="bg-card px-4 py-2 border border-[#E5E7EB] rounded-lg">
                <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest">
                  Gross Budget
                </p>
                <p className="text-lg font-bold text-[#111827]">
                  ₱ {expenseSummary.totalExpense.toLocaleString()}
                </p>
              </div>

              {/* Conversion Efficiency */}
              {expenseSummary.conversionRate !== null && (
                <div className={`px-4 py-2 bg-card border rounded-lg ${
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
                      ? "text-green-10"
                      : expenseSummary.conversionRate >= 30
                        ? "text-amber-10"
                        : "text-destructive"
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
                  <div className="px-4 py-2 border border-[#E5E7EB] rounded-lg bg-card">
                    <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest">
                      vs Last Month
                    </p>
                    <p className={`text-lg font-bold flex items-center gap-1 ${
                      isFlat ? "text-[#6B7280]" : isUp ? "text-destructive" : "text-green-10"
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
              accentClass="text-green-10"
              borderClass="border-green-500/20 hover:border-green-500/40"
              bgClass="bg-card"
            />
            <OutcomeCard
              title="Lost Investments"
              amount={expenseSummary.lostExpense}
              count={expenseSummary.lostCount}
              icon={XCircle}
              accentClass="text-destructive"
              borderClass="border-red-500/20 hover:border-red-500/40"
              bgClass="bg-card"
            />
            <OutcomeCard
              title="Pending Verdict"
              amount={expenseSummary.pendingExpense}
              count={expenseSummary.pendingCount}
              icon={Clock}
              accentClass="text-amber-10"
              borderClass="border-amber-500/20 hover:border-amber-500/40"
              bgClass="bg-card"
            />
            <OutcomeCard
              title="Operations"
              amount={expenseSummary.bizDevExpense}
              count={expenseSummary.bizDevCount}
              icon={Briefcase}
              accentClass="text-blue-10"
              borderClass="border-blue-500/20 hover:border-blue-500/40"
              bgClass="bg-card"
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
                        <td className="p-3 text-right font-mono text-xs text-green-10 font-semibold">
                          {emp.won > 0 ? `₱${emp.won.toLocaleString()}` : "—"}
                        </td>
                        <td className="p-3 text-right font-mono text-xs text-destructive font-semibold">
                          {emp.lost > 0 ? `₱${emp.lost.toLocaleString()}` : "—"}
                        </td>
                        <td className="p-3 text-right font-mono text-xs text-amber-10 font-semibold">
                          {emp.pending > 0 ? `₱${emp.pending.toLocaleString()}` : "—"}
                        </td>
                        <td className="p-3 text-right font-mono text-xs text-blue-10 font-semibold">
                          {emp.bizDev > 0 ? `₱${emp.bizDev.toLocaleString()}` : "—"}
                        </td>
                        <td className="p-3 text-center">
                          {emp.winRate !== null ? (
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md bg-card border ${
                              emp.winRate >= 60
                                ? "border-green-500 text-green-11"
                                : emp.winRate >= 30
                                  ? "border-amber-500 text-amber-11"
                                  : "border-red-500 text-destructive"
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

function LegendItem({ color, count, label }) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-[#6B7280]">
      <Dot size="w-1.5 h-1.5" style={{ background: color }} />
      <span className="font-bold text-[#374151]">{count}</span>
      <span>{label}</span>
    </span>
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
