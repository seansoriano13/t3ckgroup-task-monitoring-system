import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ShieldAlert,
  Star,
  Users,
  TrendingUp,
  Search,
  X,
  List,
  LayoutGrid,
  Rows3
} from "lucide-react";
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

    const rangeStart = selectedRange?.startDate
      ? new Date(`${selectedRange.startDate}T00:00:00`)
      : new Date(0);
    const rangeEnd = selectedRange?.endDate
      ? new Date(`${selectedRange.endDate}T23:59:59.999`)
      : new Date();

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
      if (task.status === TASK_STATUS.COMPLETE && !task.hrVerified)
        emp.pendingHr++;
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
    return employeeStats.filter(
      (e) =>
        e.name.toLowerCase().includes(lower) ||
        e.subDept.toLowerCase().includes(lower) ||
        e.dept.toLowerCase().includes(lower),
    );
  }, [employeeStats, searchTerm]);

  if (isLoading || employeeStats.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 tracking-tight">
            <Activity className="text-foreground" size={18} /> Team Pipeline
            Radar
          </h2>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {isHr ? "Organization-wide metrics" : "Performance metrics"} •{" "}
            <span className="font-semibold text-foreground">
              {selectedRange?.label || "This Range"}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 min-w-[200px]">
            <Search size={14} className="text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search employee..."
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

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-lg">
            <button
              onClick={() => setLayoutMode("row")}
              className={`p-1 rounded transition-all ${layoutMode === "row" ? "bg-white shadow-sm text-blue-600" : "text-slate-400 hover:text-slate-600"}`}
              title="Single Row"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setLayoutMode("stack")}
              className={`p-1 rounded transition-all ${layoutMode === "stack" ? "bg-white shadow-sm text-blue-600" : "text-slate-400 hover:text-slate-600"}`}
              title="3-Row Stack"
            >
              <Rows3 size={16} />
            </button>
            <button
              onClick={() => setLayoutMode("grid")}
              className={`p-1 rounded transition-all ${layoutMode === "grid" ? "bg-white shadow-sm text-blue-600" : "text-slate-400 hover:text-slate-600"}`}
              title="Full Grid"
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 bg-card border border-border px-3 py-1.5 rounded-lg h-full">
            <Users size={14} className="text-[#9CA3AF]" />
            <span className="text-xs text-[#6B7280]">
              {employeeStats.length} members
            </span>
          </div>
        </div>
      </div>

      {/* DYNAMIC PIPELINE GRID */}
      <div className={`
        ${layoutMode === "row" ? "flex gap-3 overflow-x-auto pb-4 custom-scrollbar snap-x" : ""}
        ${layoutMode === "stack" ? "grid grid-rows-3 grid-flow-col gap-3 overflow-x-auto pb-4 custom-scrollbar snap-x" : ""}
        ${layoutMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-4" : ""}
      `}>
        {filteredStats.map((emp) => (
          <div
            key={emp.id}
            onClick={() =>
              navigate("/tasks", { state: { filterEmployeeId: emp.id } })
            }
            className={`cursor-pointer flex flex-col transition-colors hover:bg-slate-50 hover:border-slate-300 ${layoutMode === "grid" ? "w-full" : "min-w-[260px] sm:min-w-[290px] snap-start"
              }`}
            style={{
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              padding: "16px",
              boxShadow: "none",
            }}
          >
            {/* Header: Avatar & Name */}
            <div className="flex justify-between items-center gap-2">
              <div className="flex gap-2.5 items-center min-w-0">
                <div
                  className="rounded-full flex items-center justify-center shrink-0"
                  style={{
                    width: "24px",
                    height: "24px",
                    fontSize: "12px",
                    fontWeight: 600,
                    backgroundColor: "#F1F5F9",
                    color: "#475569",
                  }}
                >
                  {emp.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h3
                    className="line-clamp-1"
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#111827",
                    }}
                  >
                    {emp.name}
                  </h3>
                  <p
                    className="line-clamp-1"
                    style={{
                      fontSize: "12px",
                      fontWeight: 400,
                      color: "#6B7280",
                    }}
                  >
                    {emp.subDept}
                  </p>
                </div>
              </div>
              <div
                className="flex items-center gap-1 shrink-0"
                style={{
                  border: "1px solid #E5E7EB",
                  borderRadius: "9999px",
                  padding: "2px 8px",
                  background: "transparent",
                }}
              >
                <Star size={11} className="text-gray-6 fill-gray-6" />
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  {emp.avgGrade}
                </span>
              </div>
            </div>

            {/* Segmented Pipeline Bar */}
            <div style={{ marginTop: "14px" }}>
              <div
                className="flex justify-between"
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#9CA3AF",
                  marginBottom: "6px",
                }}
              >
                <span>Task Pipeline</span>
                <span style={{ color: "#374151" }}>{emp.total} Total</span>
              </div>


              <div
                className="w-full overflow-hidden flex"
                style={{
                  height: "7px",
                  borderRadius: "2px",
                  background: "#F3F4F6",
                }}
              >
                {emp.draft > 0 && (
                  <div
                    style={{
                      width: `${(emp.draft / emp.total) * 100}%`,
                      background: "#3B82F6",
                    }}
                    title={`${emp.draft} Incomplete`}
                  />
                )}
                {emp.rejected > 0 && (
                  <div
                    style={{
                      width: `${(emp.rejected / emp.total) * 100}%`,
                      background: "#EF4444",
                    }}
                    title={`${emp.rejected} Rejected`}
                  />
                )}
                {emp.pendingHr > 0 && (
                  <div
                    style={{
                      width: `${(emp.pendingHr / emp.total) * 100}%`,
                      background: "#F59E0B",
                    }}
                    title={`${emp.pendingHr} Pending HR`}
                  />
                )}
                {emp.verified > 0 && (
                  <div
                    style={{
                      width: `${(emp.verified / emp.total) * 100}%`,
                      background: "#22C55E",
                    }}
                    title={`${emp.verified} Verified`}
                  />
                )}
              </div>

              {/* Legend – ultra-clean: dot + number only */}
              <div
                className="flex items-center gap-3"
                style={{ paddingTop: "8px" }}
              >
                <span
                  className="flex items-center gap-1"
                  style={{ fontSize: "12px", color: "#6B7280" }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#3B82F6",
                      display: "inline-block",
                    }}
                  />
                  {emp.draft}
                  <span>Inc</span>
                </span>
                {emp.rejected > 0 && (
                  <span
                    className="flex items-center gap-1"
                    style={{ fontSize: "12px", color: "#6B7280" }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "#EF4444",
                        display: "inline-block",
                      }}
                    />
                    {emp.rejected}
                    <span>Rej</span>
                  </span>
                )}
                <span
                  className="flex items-center gap-1"
                  style={{ fontSize: "12px", color: "#6B7280" }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#F59E0B",
                      display: "inline-block",
                    }}
                  />
                  {emp.pendingHr}
                  <span>Hr</span>
                </span>
                <span
                  className="flex items-center gap-1"
                  style={{ fontSize: "12px", color: "#6B7280" }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#22C55E",
                      display: "inline-block",
                    }}
                  />
                  {emp.verified}
                  <span>Ver</span>
                </span>
              </div>
            </div>

            {/* Completion Rate Footer */}
            <div
              className="flex justify-between items-center mt-auto"
              style={{
                paddingTop: "12px",
                marginTop: "14px",
                borderTop: "1px solid #E5E7EB",
              }}
            >
              <span
                style={{ fontSize: "12px", fontWeight: 500, color: "#6B7280" }}
              >
                Completion Rate
              </span>
              <span
                className="flex items-center gap-1"
                style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}
              >
                {emp.completionRate}%
                <TrendingUp size={13} style={{ color: "#22C55E" }} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
