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
  Rows3,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { taskService } from "../services/taskService.js";
import { TASK_STATUS } from "../constants/status";
import Avatar from "./Avatar";
import { useEmployeeAvatarMap } from "../hooks/useEmployeeAvatarMap";
import HighlightText from "./HighlightText";

export default function EmployeePipelineMatrix({ selectedRange }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isHr = user?.is_hr === true || user?.isHr === true;

  const handleDeepLink = (e, status, empId) => {
    e.stopPropagation();
    navigate("/tasks", {
      state: {
        presetFilter: { status },
        filterEmployeeId: empId,
      },
    });
  };
  const isHead = user?.is_head === true || user?.isHead === true;

  const userDepartment = user?.department;
  const [searchTerm, setSearchTerm] = useState("");
  const [layoutMode, setLayoutMode] = useState("stack"); // "list" | "stack" | "grid"
  const avatarMap = useEmployeeAvatarMap();

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
      if (task.status === TASK_STATUS.DELETED || task.creator?.is_super_admin)
        return;

      if (!empMap[task.loggedById]) {
        empMap[task.loggedById] = {
          id: task.loggedById,
          name: task.loggedByName || "Unknown Employee",
          dept: task.creator?.department || "N/A",
          subDept: task.creator?.sub_department || "N/A",
          total: 0,
          draft: 0, // INCOMPLETE
          rejected: 0, // NOT APPROVED
          eval: 0, // AWAITING_APPROVAL
          pendingHr: 0, // COMPLETE (Not verified)
          verified: 0, // COMPLETE (Verified)
          totalGrade: 0,
          gradedCount: 0,
        };
      }

      const emp = empMap[task.loggedById];
      let matched = false;
      if (task.status === TASK_STATUS.INCOMPLETE) {
        emp.draft++;
        matched = true;
      } else if (task.status === TASK_STATUS.NOT_APPROVED) {
        emp.rejected++;
        matched = true;
      } else if (task.status === TASK_STATUS.AWAITING_APPROVAL) {
        emp.eval++;
        matched = true;
      } else if (task.status === TASK_STATUS.COMPLETE) {
        if (task.hrVerified) emp.verified++;
        else emp.pendingHr++;
        matched = true;
      }

      if (matched) {
        emp.total++;
      }

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
    <div className="bg-card border border-border rounded-2xl shadow-sm p-5 overflow-x-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 tracking-tight">
            <div className="w-10 h-10 rounded-xl bg-mauve-2 flex items-center justify-center text-mauve-11 shadow-sm border border-mauve-4">
              <Activity size={18} />
            </div>
            Team Pipeline Radar
          </h2>
          <p className="text-sm text-mauve-10  mt-0.5">
            {isHr ? "Performance metrics" : "Performance metrics"} •{" "}
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

          <div className="flex items-center gap-1.5 bg-mauve-2 border border-mauve-5 p-1 rounded-lg">
            <button
              onClick={() => setLayoutMode("list")}
              className={`p-1 rounded transition-all ${layoutMode === "list" ? "bg-card shadow-sm text-red-9" : "text-muted-foreground hover:text-mauve-11"}`}
              title="List View"
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
              {employeeStats.length} members
            </span>
          </div>
        </div>
      </div>

      {/* DYNAMIC PIPELINE GRID */}
      <div
        className={`
        ${layoutMode === "list" ? "flex flex-col gap-3 pb-4" : ""}
        ${layoutMode === "stack" ? "grid grid-rows-3 grid-flow-col gap-3 overflow-x-auto pb-4 custom-scrollbar snap-x" : ""}
        ${layoutMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-4" : ""}
      `}
      >
        {filteredStats.map((emp) => {
          if (layoutMode === "list") {
            return (
              <div
                key={emp.id}
                onClick={() =>
                  navigate("/tasks", { state: { filterEmployeeId: emp.id } })
                }
                className="cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between transition-colors hover:bg-mauve-3 hover:border-mauve-5 w-full bg-card gap-4"
                style={{
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  boxShadow: "none",
                }}
              >
                {/* Header: Avatar & Name */}
                <div className="flex items-center gap-3 min-w-[200px] w-full lg:w-1/4">
                  <Avatar
                    className="bg-white shrink-0"
                    size="sm"
                    name={emp.name}
                    src={avatarMap.get(emp.id) ?? undefined}
                  />
                  <div className="min-w-0">
                    <h3
                      className="line-clamp-1"
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#111827",
                      }}
                    >
                      <HighlightText text={emp.name} search={searchTerm} />
                    </h3>
                    <p
                      className="line-clamp-1"
                      style={{
                        fontSize: "12px",
                        fontWeight: 400,
                        color: "#6B7280",
                      }}
                    >
                      <HighlightText text={emp.subDept} search={searchTerm} />
                    </p>
                  </div>
                </div>

                {/* Pipeline Bar & Legend inline */}
                <div className="flex-1 flex flex-col justify-center min-w-0 w-full lg:w-auto">
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
                        className="bg-orange-a7 hover:opacity-80 cursor-pointer"
                        style={{ width: `${(emp.draft / emp.total) * 100}%` }}
                        title={`${emp.draft} Incomplete`}
                        onClick={(e) =>
                          handleDeepLink(e, TASK_STATUS.INCOMPLETE, emp.id)
                        }
                      />
                    )}
                    {emp.rejected > 0 && (
                      <div
                        className="bg-red-a7 hover:opacity-80 cursor-pointer"
                        style={{
                          width: `${(emp.rejected / emp.total) * 100}%`,
                        }}
                        title={`${emp.rejected} Returned`}
                        onClick={(e) =>
                          handleDeepLink(e, TASK_STATUS.NOT_APPROVED, emp.id)
                        }
                      />
                    )}
                    {emp.eval > 0 && (
                      <div
                        className="bg-violet-a7 hover:opacity-80 cursor-pointer"
                        style={{ width: `${(emp.eval / emp.total) * 100}%` }}
                        title={`${emp.eval} Awaiting Approval`}
                        onClick={(e) =>
                          handleDeepLink(
                            e,
                            TASK_STATUS.AWAITING_APPROVAL,
                            emp.id,
                          )
                        }
                      />
                    )}
                    {emp.pendingHr > 0 && (
                      <div
                        className="bg-blue-a7 hover:opacity-80 cursor-pointer"
                        style={{
                          width: `${(emp.pendingHr / emp.total) * 100}%`,
                        }}
                        title={`${emp.pendingHr} Completed`}
                        onClick={(e) =>
                          handleDeepLink(e, TASK_STATUS.COMPLETE, emp.id)
                        }
                      />
                    )}
                    {emp.verified > 0 && (
                      <div
                        className="bg-green-a7 hover:opacity-80 cursor-pointer"
                        style={{
                          width: `${(emp.verified / emp.total) * 100}%`,
                        }}
                        title={`${emp.verified} HR Verified`}
                        onClick={(e) =>
                          handleDeepLink(e, TASK_STATUS.COMPLETE, emp.id)
                        }
                      />
                    )}
                  </div>

                  <div
                    className="flex items-center gap-3"
                    style={{ paddingTop: "8px" }}
                  >
                    <span
                      className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                      style={{ fontSize: "12px", color: "#6B7280" }}
                      onClick={(e) =>
                        handleDeepLink(e, TASK_STATUS.INCOMPLETE, emp.id)
                      }
                    >
                      <span className="w-1.5 h-1.5 rounded-full inline-block bg-orange-a7" />
                      {emp.draft} <span>Inc</span>
                    </span>
                    {emp.rejected > 0 && (
                      <span
                        className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                        style={{ fontSize: "12px", color: "#6B7280" }}
                        onClick={(e) =>
                          handleDeepLink(e, TASK_STATUS.NOT_APPROVED, emp.id)
                        }
                      >
                        <span className="w-1.5 h-1.5 rounded-full inline-block bg-red-a7" />
                        {emp.rejected} <span>Ret</span>
                      </span>
                    )}
                    {emp.eval > 0 && (
                      <span
                        className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                        style={{ fontSize: "12px", color: "#6B7280" }}
                        onClick={(e) =>
                          handleDeepLink(
                            e,
                            TASK_STATUS.AWAITING_APPROVAL,
                            emp.id,
                          )
                        }
                      >
                        <span className="w-1.5 h-1.5 rounded-full inline-block bg-violet-a7" />
                        {emp.eval} <span>Eval</span>
                      </span>
                    )}
                    <span
                      className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                      style={{ fontSize: "12px", color: "#6B7280" }}
                      onClick={(e) =>
                        handleDeepLink(e, TASK_STATUS.COMPLETE, emp.id)
                      }
                    >
                      <span className="w-1.5 h-1.5 rounded-full inline-block bg-blue-a7" />
                      {emp.pendingHr} <span>Comp</span>
                    </span>
                    <span
                      className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                      style={{ fontSize: "12px", color: "#6B7280" }}
                      onClick={(e) =>
                        handleDeepLink(e, TASK_STATUS.COMPLETE, emp.id)
                      }
                    >
                      <span className="w-1.5 h-1.5 rounded-full inline-block bg-green-a7" />
                      {emp.verified} <span>Hr</span>
                    </span>
                  </div>
                </div>

                {/* Grade & Completion Rate */}
                <div className="flex items-center gap-4 lg:gap-6 shrink-0 w-full lg:w-auto justify-between lg:justify-end">
                  <div
                    className="flex items-center gap-1 shrink-0"
                    style={{
                      border: "1px solid #E5E7EB",
                      borderRadius: "9999px",
                      padding: "2px 8px",
                      background: "transparent",
                    }}
                  >
                    <Star size={11} className="text-mauve-6 fill-gray-6" />
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

                  <div className="flex items-center gap-3">
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#6B7280",
                      }}
                    >
                      Completion Rate
                    </span>
                    <span
                      className="flex items-center gap-1"
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#111827",
                      }}
                    >
                      {emp.completionRate}%
                      <TrendingUp
                        size={13}
                        style={{
                          color:
                            emp.completionRate >= 80
                              ? "#22C55E"
                              : emp.completionRate >= 50
                                ? "#F59E0B"
                                : "#EF4444",
                        }}
                      />
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={emp.id}
              onClick={() =>
                navigate("/tasks", { state: { filterEmployeeId: emp.id } })
              }
              className={`cursor-pointer flex flex-col transition-colors hover:bg-mauve-3 hover:border-mauve-5 ${
                layoutMode === "grid"
                  ? "w-full"
                  : "min-w-[260px] sm:min-w-[290px] snap-start"
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
                  <Avatar
                    className="bg-white"
                    size="sm"
                    name={emp.name}
                    src={avatarMap.get(emp.id) ?? undefined}
                  />
                  <div className="min-w-0">
                    <h3
                      className="line-clamp-1"
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#111827",
                      }}
                    >
                      <HighlightText text={emp.name} search={searchTerm} />
                    </h3>
                    <p
                      className="line-clamp-1"
                      style={{
                        fontSize: "12px",
                        fontWeight: 400,
                        color: "#6B7280",
                      }}
                    >
                      <HighlightText text={emp.subDept} search={searchTerm} />
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
                  <Star size={11} className="text-mauve-6 fill-gray-6" />
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
                      className="bg-orange-a7 hover:opacity-80 cursor-pointer"
                      style={{
                        width: `${(emp.draft / emp.total) * 100}%`,
                      }}
                      title={`${emp.draft} Incomplete`}
                      onClick={(e) =>
                        handleDeepLink(e, TASK_STATUS.INCOMPLETE, emp.id)
                      }
                    />
                  )}
                  {emp.rejected > 0 && (
                    <div
                      className="bg-red-a7 hover:opacity-80 cursor-pointer"
                      style={{
                        width: `${(emp.rejected / emp.total) * 100}%`,
                      }}
                      title={`${emp.rejected} Returned`}
                      onClick={(e) =>
                        handleDeepLink(e, TASK_STATUS.NOT_APPROVED, emp.id)
                      }
                    />
                  )}
                  {emp.eval > 0 && (
                    <div
                      className="bg-violet-a7 hover:opacity-80 cursor-pointer"
                      style={{
                        width: `${(emp.eval / emp.total) * 100}%`,
                      }}
                      title={`${emp.eval} Awaiting Approval`}
                      onClick={(e) =>
                        handleDeepLink(e, TASK_STATUS.AWAITING_APPROVAL, emp.id)
                      }
                    />
                  )}
                  {emp.pendingHr > 0 && (
                    <div
                      className="bg-blue-a7 hover:opacity-80 cursor-pointer"
                      style={{
                        width: `${(emp.pendingHr / emp.total) * 100}%`,
                      }}
                      title={`${emp.pendingHr} Completed`}
                      onClick={(e) =>
                        handleDeepLink(e, TASK_STATUS.COMPLETE, emp.id)
                      }
                    />
                  )}
                  {emp.verified > 0 && (
                    <div
                      className="bg-green-a7 hover:opacity-80 cursor-pointer"
                      style={{
                        width: `${(emp.verified / emp.total) * 100}%`,
                      }}
                      title={`${emp.verified} HR Verified`}
                      onClick={(e) =>
                        handleDeepLink(e, TASK_STATUS.COMPLETE, emp.id)
                      }
                    />
                  )}
                </div>

                {/* Legend – ultra-clean: dot + number only */}
                <div
                  className="flex items-center gap-3"
                  style={{ paddingTop: "8px" }}
                >
                  <span
                    className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                    style={{ fontSize: "12px", color: "#6B7280" }}
                    onClick={(e) =>
                      handleDeepLink(e, TASK_STATUS.INCOMPLETE, emp.id)
                    }
                  >
                    <span className="w-1.5 h-1.5 rounded-full inline-block bg-orange-a7" />
                    {emp.draft}
                    <span>Inc</span>
                  </span>
                  {emp.rejected > 0 && (
                    <span
                      className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                      style={{ fontSize: "12px", color: "#6B7280" }}
                      onClick={(e) =>
                        handleDeepLink(e, TASK_STATUS.NOT_APPROVED, emp.id)
                      }
                    >
                      <span className="w-1.5 h-1.5 rounded-full inline-block bg-red-a7" />
                      {emp.rejected}
                      <span>Ret</span>
                    </span>
                  )}
                  {emp.eval > 0 && (
                    <span
                      className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                      style={{ fontSize: "12px", color: "#6B7280" }}
                      onClick={(e) =>
                        handleDeepLink(e, TASK_STATUS.AWAITING_APPROVAL, emp.id)
                      }
                    >
                      <span className="w-1.5 h-1.5 rounded-full inline-block bg-violet-a7" />
                      {emp.eval}
                      <span>Eval</span>
                    </span>
                  )}
                  <span
                    className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                    style={{ fontSize: "12px", color: "#6B7280" }}
                    onClick={(e) =>
                      handleDeepLink(e, TASK_STATUS.COMPLETE, emp.id)
                    }
                  >
                    <span className="w-1.5 h-1.5 rounded-full inline-block bg-blue-a7" />
                    {emp.pendingHr}
                    <span>Comp</span>
                  </span>
                  <span
                    className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                    style={{ fontSize: "12px", color: "#6B7280" }}
                    onClick={(e) =>
                      handleDeepLink(e, TASK_STATUS.COMPLETE, emp.id)
                    }
                  >
                    <span className="w-1.5 h-1.5 rounded-full inline-block bg-green-a7" />
                    {emp.verified}
                    <span>Hr</span>
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
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "#6B7280",
                  }}
                >
                  Completion Rate
                </span>
                <span
                  className="flex items-center gap-1"
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  {emp.completionRate}%
                  <TrendingUp
                    size={13}
                    style={{
                      color:
                        emp.completionRate >= 80
                          ? "#22C55E"
                          : emp.completionRate >= 50
                            ? "#F59E0B"
                            : "#EF4444",
                    }}
                  />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
