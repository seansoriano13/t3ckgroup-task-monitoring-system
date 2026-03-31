import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { salesService } from "../services/salesService";
import { useAuth } from "../context/AuthContext";
import { Loader2, TrendingUp, Calculator, Tag, Wallet } from "lucide-react";

export default function SalesPerformanceMetrics({ selectedMonth }) {
  const { user } = useAuth();
  const isAdminView = user?.isSuperAdmin || user?.isHr || user?.is_hr;
  
  // Real-world reference for "Due" logic
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const todayMonthKey = today.slice(0, 7); // YYYY-MM

  // 1. Month Logic & Labels
  // We compute these on every render based on the prop to ensure perfect synchronization
  const { monthFilter, monthLabel } = useMemo(() => {
    if (!selectedMonth) return { monthFilter: null, monthLabel: "All Time" };
    
    // Robust parsing: handle YYYY-MM or YYYY-MM-DD
    const parts = String(selectedMonth).split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    
    if (isNaN(year) || isNaN(month)) return { monthFilter: null, monthLabel: "All Time" };

    const filter = `${year}-${String(month).padStart(2, "0")}`;
    const dateObj = new Date(year, month - 1, 1);
    const label = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    return { monthFilter: filter, monthLabel: label };
  }, [selectedMonth]);

  const { data: allActivities = [], isLoading: loadingAct } = useQuery({
    queryKey: ["allSalesActivitiesAdmin"],
    queryFn: () => salesService.getAllSalesActivities(),
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
        act.employees?.isSuperAdmin ||
        roleStr.includes("admin") ||
        deptStr.includes("super admin")
      ) {
        return;
      }

      if (!stats[empId]) {
        stats[empId] = {
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
      const isDone = act.status === "DONE";

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

    return Object.values(stats)
      .map((s) => {
        const executionRate =
          s.totalDue > 0 ? Math.round((s.totalPlannedDone / s.totalDue) * 100) : 0;
        return { ...s, executionRate };
      })
      .sort((a, b) => b.executionRate - a.executionRate);
  }, [allActivities, today, todayMonthKey, monthFilter]);

  // 3. EXPENSE SUMMARY (Filtered by Month)
  const expenseSummary = useMemo(() => {
    if (!isAdminView) return null;
    let totalExpense = 0;
    let withRefExpense = 0;
    let bizDevExpense = 0;
    let withRefCount = 0;
    let bizDevCount = 0;

    allActivities.forEach((act) => {
      if (monthFilter && !act.scheduled_date.startsWith(monthFilter)) return;

      const amt = Number(act.expense_amount) || 0;
      if (amt <= 0) return;

      totalExpense += amt;
      if (act.reference_number) {
        withRefExpense += amt;
        withRefCount++;
      } else {
        bizDevExpense += amt;
        bizDevCount++;
      }
    });

    const totalCount = withRefCount + bizDevCount;
    const avgTotal = totalCount > 0 ? Math.round(totalExpense / totalCount) : 0;
    const avgWithRef = withRefCount > 0 ? Math.round(withRefExpense / withRefCount) : 0;
    const avgBizDev = bizDevCount > 0 ? Math.round(bizDevExpense / bizDevCount) : 0;

    return { 
      totalExpense, withRefExpense, bizDevExpense, 
      withRefCount, bizDevCount, totalCount,
      avgTotal, avgWithRef, avgBizDev
    };
  }, [allActivities, isAdminView, monthFilter]);

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
              Performance Metrics <span className="text-purple-500">— {monthLabel}</span>
            </h2>
            <p className="text-sm text-gray-9 font-medium mt-1">
              Execution rate identifies planned tasks due in <span className="text-gray-12 font-bold">{monthLabel}</span> vs actual completions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingAct ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-9 gap-3">
              <Loader2 className="animate-spin" size={32} /> 
              <p className="font-black uppercase tracking-widest text-xs">Synchronizing Metrics...</p>
            </div>
          ) : employeeStats.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-4 rounded-2xl bg-gray-2/50">
               <Calculator className="text-gray-6 mb-2" size={32} />
               <p className="text-gray-9 font-bold uppercase tracking-widest text-xs">No records for {monthLabel}</p>
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
                        stat.executionRate >= 80 ? "bg-green-500 border-green-400 text-white" : 
                        stat.executionRate >= 50 ? "bg-amber-400 border-amber-300 text-amber-900" : 
                        "bg-red-500 border-red-400 text-white"
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
                   <MetricRow label="Month Pipeline" value={stat.totalPipeline} />
                   <MetricRow label="Due within Month" value={stat.totalDue} color="text-blue-500 bg-blue-500/10" />
                   <MetricRow label="Tasks Completed" value={stat.totalDone} color="text-emerald-500 bg-emerald-500/10" />
                   <MetricRow label="Backlog" value={stat.totalIncomplete} color={stat.totalIncomplete > 0 ? "text-red-500 bg-red-500/10 font-black" : "text-gray-6 bg-gray-6/10"} />
                   <MetricRow label="Extra (Unplanned)" value={stat.totalUnplanned} color="text-purple-500 bg-purple-500/10" />
                   <MetricRow label="Late Submissions" value={stat.totalLate} color={stat.totalLate > 0 ? "text-orange-500 bg-orange-500/10" : "text-gray-6 bg-gray-6/10"} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* === EXPENSE SUMMARY === */}
      {isAdminView && expenseSummary && (
        <div className="bg-gray-1 border border-gray-4 p-6 sm:p-8 rounded-3xl shadow-xl space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-4">
            <div className="flex items-center gap-4">
               <div>
                  <h2 className="text-2xl font-black text-gray-12 uppercase tracking-tight">Financial Overview</h2>
                  <p className="text-sm text-gray-9 font-bold uppercase tracking-widest">{monthLabel}</p>
               </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
               <div className="bg-gray-2 px-4 py-2 border border-gray-4 rounded-xl">
                  <p className="text-[10px] font-black text-gray-8 uppercase tracking-widest">Total Volume</p>
                  <p className="text-lg font-black text-gray-12">{expenseSummary.totalCount} <span className="text-[10px] text-gray-9 font-medium">Items</span></p>
               </div>
               <div className="px-4 py-2 border border-gray-4 rounded-xl">
                  <p className="text-[10px] font-black text-gray-8 uppercase tracking-widest">Global Avg</p>
                  <p className="text-lg font-black text-gray-12">₱ {expenseSummary.avgTotal.toLocaleString()}</p>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SummaryCard title="Gross Budget" amount={expenseSummary.totalExpense} count={expenseSummary.totalCount} avg={expenseSummary.avgTotal} Icon={Calculator} colorClass="hover:border-gray-4" iconColor="text-gray-12" />
            <SummaryCard title="Account Tasks" amount={expenseSummary.withRefExpense} count={expenseSummary.withRefCount} avg={expenseSummary.avgWithRef} Icon={Tag} colorClass="hover:border-gray-4" iconColor="text-gray-12" />
            <SummaryCard title="Misc BizDev" amount={expenseSummary.bizDevExpense} count={expenseSummary.bizDevCount} avg={expenseSummary.avgBizDev} Icon={Calculator} colorClass="hover:border-gray-4" iconColor="text-gray-12" />
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, amount, count, avg, Icon, colorClass, iconColor }) {
  return (
    <div className={`bg-gray-1 border-2 border-gray-4 rounded-3xl p-6 flex flex-col relative overflow-hidden group ${colorClass} transition-colors`}>
       <div className="absolute -top-4 -right-4 text-gray-4 group-hover:opacity-5 transition-opacity">
          <Icon size={120} />
       </div>
       <p className="text-xs font-black text-gray-10 uppercase tracking-widest mb-1 flex items-center gap-2">
         <Icon size={14} className={iconColor} /> {title}
       </p>
       <p className="text-4xl font-black text-gray-12 my-2 drop-shadow-sm">
         ₱ {amount.toLocaleString()}
       </p>
       <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-3">
          <span className="text-[10px] font-black text-gray-8 uppercase tracking-widest">{count} Items</span>
          <span className={`text-[10px] font-black bg-gray-2 px-2 py-0.5 rounded-full`}>₱ {avg}/avg</span>
       </div>
    </div>
  );
}

function MetricRow({ label, value, color = "text-gray-12 bg-gray-3" }) {
  return (
    <div className="flex justify-between items-center text-sm font-bold border-b border-gray-4/50 pb-2 last:border-0 last:pb-0">
      <span className="text-gray-10">{label}</span>
      <span className={`${color} px-2 py-0.5 rounded text-xs min-w-[2rem] text-center`}>
        {value}
      </span>
    </div>
  );
}
