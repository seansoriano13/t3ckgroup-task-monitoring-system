import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { salesService } from "../services/salesService";
import { Loader2 } from "lucide-react";

export default function SalesPerformanceMetrics() {
  const { data: allActivities = [], isLoading: loadingAct } = useQuery({
    queryKey: ["allSalesActivitiesAdmin"],
    queryFn: () => salesService.getAllSalesActivities(),
  });

  const employeeStats = useMemo(() => {
    if (!allActivities.length) return [];

    const stats = {};
    allActivities.forEach((act) => {
      const empId = act.employee_id;

      const roleStr = (act.employees?.role || "").toLowerCase();
      const deptStr = (act.employees?.department || "").toLowerCase();
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
          totalTasks: 0,
          totalDone: 0,
          totalUnplanned: 0,
          totalLate: 0,
        };
      }

      stats[empId].totalTasks++;
      if (act.is_unplanned) stats[empId].totalUnplanned++;
      if (act.status === "DONE") {
        stats[empId].totalDone++;
        if (act.completed_at) {
          const sDate = new Date(act.scheduled_date);
          sDate.setDate(sDate.getDate() + 1);
          const cDate = new Date(act.completed_at);
          if (cDate > sDate) stats[empId].totalLate++;
        }
      }
    });

    return Object.values(stats)
      .map((s) => {
        const completionRate =
          s.totalTasks > 0 ? Math.round((s.totalDone / s.totalTasks) * 100) : 0;
        return { ...s, completionRate };
      })
      .sort((a, b) => b.completionRate - a.completionRate);
  }, [allActivities]);

  return (
    <div className="bg-gray-1 border border-gray-4 p-4 sm:p-6 rounded-xl mt-8 mb-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-12">
          Performance & Execution Rates
        </h2>
        <p className="text-sm text-gray-9 font-medium">
          Real-time overview of tasks completion and pipeline volume per
          employee.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loadingAct ? (
          <div className="col-span-full flex justify-center py-6 text-gray-9 gap-2 font-bold">
            <Loader2 className="animate-spin" /> Gathering execution metrics...
          </div>
        ) : employeeStats.length === 0 ? (
          <p className="text-gray-9 italic col-span-full text-center py-4 text-sm font-bold">
            No operation data available to calculate.
          </p>
        ) : (
          employeeStats.map((stat) => (
            <div
              key={stat.name}
              className="bg-gray-2 border border-gray-4 p-4 rounded-xl flex flex-col gap-4 shadow-sm"
            >
              <div>
                <p className="font-black text-gray-12 text-lg truncate flex justify-between items-center">
                  {stat.name}
                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full text-white ${stat.completionRate >= 80 ? "bg-green-500" : stat.completionRate >= 50 ? "bg-yellow-500 text-yellow-900" : "bg-red-500"}`}
                  >
                    {stat.completionRate}% Done
                  </span>
                </p>
                <p className="text-[10px] text-gray-9 font-bold uppercase tracking-wide truncate mt-0.5">
                  {stat.department}
                </p>
              </div>

              <div className="space-y-2.5 mt-2">
                <div className="flex justify-between items-center text-sm font-bold border-b border-gray-4 pb-2">
                  <span className="text-gray-10">Total Pipeline</span>
                  <span className="text-gray-12 bg-gray-3 px-2 py-0.5 rounded text-xs">
                    {stat.totalTasks}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold border-b border-gray-4 pb-2">
                  <span className="text-gray-10">Tasks Done</span>
                  <span className="text-green-600 dark:text-green-500 bg-green-500/10 px-2 py-0.5 rounded text-xs">
                    {stat.totalDone}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold border-b border-gray-4 pb-2">
                  <span className="text-gray-10 flex items-center gap-1">
                    Extra (Unplanned)
                  </span>
                  <span className="text-blue-600 dark:text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded text-xs">
                    {stat.totalUnplanned}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-gray-10">Late Completions</span>
                  <span className="text-orange-600 dark:text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded text-xs">
                    {stat.totalLate}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
