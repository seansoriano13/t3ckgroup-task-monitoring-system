import { useQuery } from "@tanstack/react-query";
import { Activity, ShieldAlert, Star, Users, TrendingUp, Search, X, List, LayoutGrid, Rows3 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { taskService } from "../services/taskService.js";
import { TASK_STATUS } from "../constants/status";

export default function EmployeePipelineMatrix({ selectedRange }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isHr = user?.is_hr === true || user?.isHr === true;
  const isHead = user?.is_head === true || user?.isHead === true;

  const userDepartment = user?.department;
  const [searchTerm, setSearchTerm] = useState("");
  const [layoutMode, setLayoutMode] = useState("stack"); // "row" | "stack" | "grid"

  // Fetch ALL tasks (we will filter them down for Heads)
  const { data: rawTasks = [], isLoading } = useQuery({
    queryKey: ["allTasks", "matrix"],
    queryFn: () => taskService.getAllTasks(),
    enabled: !!user?.id,
  });

  const employeeStats = useMemo(() => {
    if (!rawTasks.length) return [];

    const rangeStart = selectedRange?.startDate ? new Date(`${selectedRange.startDate}T00:00:00`) : new Date(0);
    const rangeEnd = selectedRange?.endDate ? new Date(`${selectedRange.endDate}T23:59:59.999`) : new Date();

    const empMap = {};

    rawTasks.forEach((task) => {
      if (!task.loggedById || task.status === TASK_STATUS.DELETED) return;

      const taskDate = new Date(task.createdAt);
      if (taskDate < rangeStart || taskDate > rangeEnd) {
        return;
      }

      // If they are a Head (but NOT HR), strictly filter out tasks from other departments
      if (!isHr && isHead) {
        if (task.creator?.department !== userDepartment) return;
      }

      // If Super Admin, exclude tasks/stats belonging to other Heads or HR
      if (user?.isSuperAdmin) {
        if (task.creator?.is_head || task.creator?.is_hr) return;
      }

      // Exclude tasks logged BY any super admin (they don't need pipeline tracking)
      if (task.creator?.is_super_admin) return;

      if (!empMap[task.loggedById]) {
        empMap[task.loggedById] = {
          id: task.loggedById,
          name: task.loggedByName || "Unknown Employee",
          dept: task.creator?.department || "N/A",
          subDept: task.creator?.sub_department || "N/A",
          total: 0,
          draft: 0, // INCOMPLETE
          rejected: 0, // NOT APPROVED
          pendingHr: 0, // COMPLETE (Not verified)
          verified: 0, // COMPLETE (Verified)
          totalGrade: 0,
          gradedCount: 0,
        };
      }

      const emp = empMap[task.loggedById];
      emp.total++;

      // Bucket Logic
      if (task.status === TASK_STATUS.INCOMPLETE) emp.draft++;
      if (task.status === TASK_STATUS.NOT_APPROVED) emp.rejected++;
      if (task.status === TASK_STATUS.COMPLETE && !task.hrVerified) emp.pendingHr++;
      if (task.hrVerified) emp.verified++;

      // Grade Logic
      // Only count finalized "COMPLETE" tasks toward average grade.
      if (task.status === TASK_STATUS.COMPLETE && task.grade > 0) {
        emp.totalGrade += task.grade;
        emp.gradedCount++;
      }
    });

    // 2. Convert Map to Array & Calculate final percentages
    return Object.values(empMap)
      .map((emp) => ({
        ...emp,
        avgGrade:
          emp.gradedCount > 0
            ? (emp.totalGrade / emp.gradedCount).toFixed(1)
            : "N/A",
        completionRate:
          Math.round(((emp.pendingHr + emp.verified) / emp.total) * 100) || 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [
    rawTasks,
    isHr,
    isHead,
    userDepartment,
    user?.isSuperAdmin,
    selectedRange,
  ]);

  const filteredStats = useMemo(() => {
    if (!searchTerm.trim()) return employeeStats;
    const lower = searchTerm.toLowerCase();
    return employeeStats.filter(e => 
      e.name.toLowerCase().includes(lower) || 
      e.subDept.toLowerCase().includes(lower) ||
      e.dept.toLowerCase().includes(lower)
    );
  }, [employeeStats, searchTerm]);

  if (isLoading || employeeStats.length === 0) return null;

  return (
    <div className="bg-gray-1 border border-gray-4 rounded-2xl shadow-sm p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-12 flex items-center gap-2 tracking-tight">
            <Activity className="text-primary" size={20} /> Team Pipeline Radar
          </h2>
          <p className="text-sm text-gray-9 mt-0.5 font-medium">
            {isHr
              ? "Organization-wide metrics for: "
              : "Performance metrics for: "}
            <span className="font-bold text-gray-11">{selectedRange?.label || "This Range"}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-2 border border-gray-4 rounded-lg px-3 py-1.5 min-w-[200px]">
            <Search size={14} className="text-gray-9" />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-gray-12 placeholder-gray-8 w-full"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="text-gray-9 hover:text-gray-12">
                <X size={12} />
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 bg-gray-2 border border-gray-4 p-1 rounded-lg h-full">
            <button
              onClick={() => setLayoutMode("row")}
              className={`p-1 rounded transition-all ${layoutMode === "row" ? "bg-white shadow-sm text-primary" : "text-gray-9 hover:text-gray-12"}`}
              title="Single Row"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setLayoutMode("stack")}
              className={`p-1 rounded transition-all ${layoutMode === "stack" ? "bg-white shadow-sm text-primary" : "text-gray-9 hover:text-gray-12"}`}
              title="3-Row Stack"
            >
              <Rows3 size={16} />
            </button>
            <button
              onClick={() => setLayoutMode("grid")}
              className={`p-1 rounded transition-all ${layoutMode === "grid" ? "bg-white shadow-sm text-primary" : "text-gray-9 hover:text-gray-12"}`}
              title="Full Grid"
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 bg-gray-2 border border-gray-4 px-3 py-1.5 rounded-lg h-full">
            <Users size={14} className="text-gray-10" />
            <span className="text-xs font-bold text-gray-11 tracking-wider uppercase">
              {employeeStats.length} Members Active
            </span>
          </div>
        </div>
      </div>

      {/* DYNAMIC PIPELINE GRID */}
      <div className={`
        ${layoutMode === "row" ? "flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x" : ""}
        ${layoutMode === "stack" ? "grid grid-rows-3 grid-flow-col gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x" : ""}
        ${layoutMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4 px-0.5" : ""}
      `}>
        {filteredStats.map((emp) => (
          <div
            key={emp.id}
            onClick={() => navigate("/tasks", { state: { filterEmployeeId: emp.id } })}
            className={`cursor-pointer bg-gray-2 border border-gray-4 rounded-xl p-4 flex flex-col gap-4 transition-colors hover:border-gray-5 ${
              layoutMode === "grid" ? "w-full" : "min-w-[280px] sm:min-w-[320px] snap-start"
            }`}
          >
            {/* Header: Avatar & Name */}
            <div className="flex justify-between items-start gap-3">
              <div className="flex gap-3 items-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-red-9 flex items-center justify-center text-white font-black shadow-md shrink-0">
                  {emp.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-12 text-sm line-clamp-1">
                    {emp.name}
                  </h3>
                  <p className="text-[10px] font-bold text-gray-8 uppercase tracking-wider line-clamp-1">
                    {emp.subDept}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1 text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  <Star size={12} className="fill-current" />
                  <span className="text-xs font-black">{emp.avgGrade}</span>
                </div>
              </div>
            </div>

            {/* Segmented Pipeline Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-9">
                <span>Task Pipeline</span>
                <span className="text-gray-11">{emp.total} Total</span>
              </div>

              {/* The Visual Bar */}
              <div className="h-3 w-full bg-gray-3 rounded-full overflow-hidden flex shadow-inner">
                {emp.draft > 0 && (
                  <div
                    style={{ width: `${(emp.draft / emp.total) * 100}%` }}
                    className="bg-blue-500 border-r border-gray-1"
                    title={`${emp.draft} Drafts`}
                  />
                )}
                {emp.rejected > 0 && (
                  <div
                    style={{ width: `${(emp.rejected / emp.total) * 100}%` }}
                    className="bg-red-500 border-r border-gray-1"
                    title={`${emp.rejected} Rejected`}
                  />
                )}
                {emp.pendingHr > 0 && (
                  <div
                    style={{ width: `${(emp.pendingHr / emp.total) * 100}%` }}
                    className="bg-amber-500 border-r border-gray-1"
                    title={`${emp.pendingHr} Pending HR`}
                  />
                )}
                {emp.verified > 0 && (
                  <div
                    style={{ width: `${(emp.verified / emp.total) * 100}%` }}
                    className="bg-green-500"
                    title={`${emp.verified} Verified`}
                  />
                )}
              </div>

              {/* Legend / Breakdown */}
              <div className="flex justify-between text-[10px] font-semibold text-gray-8 pt-1">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  {emp.draft} Incomplete
                </span>
                {emp.rejected > 0 && (
                  <span className="flex items-center gap-1 text-red-500">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    {emp.rejected} Rej
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  {emp.pendingHr} HR
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  {emp.verified} Ver
                </span>
              </div>
            </div>

            {/* Completion Rate Footer */}
            <div className="pt-3 border-t border-gray-4 flex justify-between items-center mt-auto">
              <span className="text-[10px] font-bold text-gray-9 uppercase tracking-wider">
                Completion Rate
              </span>
              <span className="text-sm font-black text-green-500 flex items-center gap-1">
                {emp.completionRate}% <TrendingUp size={14} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
