import { useState } from "react";
import TaskCard from "./TaskCard";
import TaskDetails from "./TaskDetails";
import { useAuth } from "../context/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { taskService } from "../services/taskService.js";
import { useMemo, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { User } from "lucide-react";
import { Users } from "lucide-react";
import toast from "react-hot-toast";
import { Activity } from "lucide-react";
import { Clock } from "lucide-react";
import { TrendingUp } from "lucide-react";
import { CheckCircle2 } from "lucide-react";

function InsightBar({ label, count, total, color }) {
  const percentage = total === 0 ? 0 : Math.round((count / total) * 100);

  return (
    <div>
      <div className="flex justify-between text-xs mb-1 font-bold">
        <span className="text-gray-11">{label}</span>
        <span className="text-gray-12">
          {count}{" "}
          <span className="text-gray-8 font-normal">({percentage}%)</span>
        </span>
      </div>
      <div className="w-full bg-gray-3 rounded-full h-2 overflow-hidden border border-gray-4">
        <div
          className={`h-2 rounded-full ${color} transition-all duration-1000`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

export default function TasksList({ selectedMonth }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isHr = user?.is_hr || user?.isHr;
  const isHead = user?.is_head || user?.isHead;
  const isManagement = isHr || isHead;
  const userSubDept = user?.sub_department || user?.subDepartment;
  const userDept = user?.department;

  const [selectedTask, setSelectedTask] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data: rawTasks = [], isLoading } = useQuery({
    queryKey: ["dashboardTasks", user?.id, isManagement ? "all" : "personal"],
    queryFn: () =>
      isManagement
        ? taskService.getAllTasks()
        : taskService.getMyTasks(user?.id),
    enabled: !!user?.id,
  });

  const location = useLocation();
  const navigate = useNavigate();

  // 🔥 DEEP LINKING NOTIFICATION HOOK
  useEffect(() => {
    if (location.state?.openTaskId && rawTasks.length > 0) {
      const targetTask = rawTasks.find(
        (t) => t.id === location.state.openTaskId,
      );
      if (targetTask) {
        setSelectedTask(targetTask);
        setIsDrawerOpen(true);
        // Clear state to prevent re-firing on hot reload
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, rawTasks, navigate, location.pathname]);

  const { myTasks, teamTasks } = useMemo(() => {
    const selDate = selectedMonth ? new Date(selectedMonth) : new Date();
    const currentMonth = selDate.getMonth();
    const currentYear = selDate.getFullYear();

    // 🔥 NEW: Instantly scrub all deleted tasks and filter by THIS MONTH
    const activeTasks = rawTasks.filter((t) => {
      if (t.status === "DELETED") return false;
      const taskDate = new Date(t.createdAt);
      return (
        taskDate.getMonth() === currentMonth &&
        taskDate.getFullYear() === currentYear
      );
    });

    // SECTION A: My Private Queue (using activeTasks)
    const my = activeTasks.filter((t) => t.loggedById === user?.id);

    // SECTION B: Management/Team Feed
    let team = [];

    if (isHr) {
      // HR sees every task in the company EXCEPT their own personal ones
      team = activeTasks.filter((t) => t.loggedById !== user?.id);
    } else if (isHead) {
      // Head sees tasks in their sub-dept EXCEPT their own personal ones
      team = activeTasks.filter((t) => {
        const isNotMe = t.loggedById !== user?.id;

        // 🛠️ THE FIX: Bulletproof sub-department lookup
        // Checks every possible way your backend might map this field
        const taskSubDept =
          t.sub_department ||
          t.subDepartment ||
          t.creator?.sub_department ||
          t.employees?.sub_department ||
          t.employees?.subDepartment ||
          "";

        const taskDept = t.creator?.department || t.employees?.department || "";
        
        let inMyDept = false;
        if(userSubDept) {
           inMyDept = taskSubDept === userSubDept;
        } else {
           inMyDept = taskDept === userDept;
        }

        return isNotMe && inMyDept;
      });
    }

    return {
      myTasks: my,
      teamTasks: team,
    };
  }, [rawTasks, user?.id, isHr, isHead, userSubDept, userDept, selectedMonth]);

  const editTaskMutation = useMutation({
    mutationFn: (updatedData) =>
      taskService.updateTask(updatedData.id, updatedData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] });
    },
  });

  const handleOpenDrawer = (task) => {
    setSelectedTask(task);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedTask(null), 300);
  };

  const deleteTaskMutation = useMutation({
    mutationFn: ({ id, userId }) => taskService.deleteTask(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] });
      toast.success("Task deleted.");
    },
  });

  if (isLoading) return <div className="py-20 flex-center">...</div>; // Keep your existing loader here

  return (
    <div className="space-y-10">
      {/* SECTION 1: MY PERSONAL TASKS (Visible to Everyone) */}
      {!isManagement && (
        <section className="space-y-6">
          <div className="flex justify-between items-end">
            <div className="flex items-center gap-2">
              <User size={18} className="text-primary" />
              <h2 className="text-lg font-bold text-gray-12">My Tasks</h2>
            </div>
            <Link
              to="/tasks"
              className="text-xs font-bold text-gray-9 hover:text-primary transition-colors uppercase tracking-widest"
            >
              View All
            </Link>
          </div>

          {myTasks.length > 0 ? (
            <div className="space-y-8">
              {/* Categorized Containers */}
              {["INCOMPLETE", "COMPLETE_UNVERIFIED", "COMPLETE_VERIFIED", "NOT APPROVED"].map((statusKey) => {
                const filtered = myTasks.filter((t) => {
                  if (statusKey === "COMPLETE_UNVERIFIED") return t.status === "COMPLETE" && !t.hrVerified;
                  if (statusKey === "COMPLETE_VERIFIED") return t.status === "COMPLETE" && t.hrVerified;
                  if (statusKey === "INCOMPLETE") return t.status === "INCOMPLETE";
                  if (statusKey === "NOT APPROVED") return t.status === "NOT APPROVED";
                  return false;
                });

                if (filtered.length === 0) return null;

                return (
                  <div key={statusKey} className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          statusKey === "COMPLETE_VERIFIED"
                            ? "bg-green-500"
                            : statusKey === "COMPLETE_UNVERIFIED"
                              ? "bg-emerald-400"
                              : statusKey === "NOT APPROVED"
                                ? "bg-red-500"
                                : "bg-amber-500"
                        }`}
                      />
                      <h3 className="text-[10px] font-black text-gray-9 uppercase tracking-[0.2em]">
                        {statusKey === "COMPLETE_VERIFIED"
                          ? "HR Verified"
                          : statusKey === "COMPLETE_UNVERIFIED"
                            ? "Completed"
                            : statusKey === "NOT APPROVED"
                              ? "Revision Required"
                              : "Active / Pending Action"}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filtered.slice(0, 3).map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onView={() => handleOpenDrawer(task)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-10 text-center border border-dashed border-gray-4 rounded-xl text-gray-9 text-sm">
              You haven't logged any personal tasks for this month.
            </div>
          )}
        </section>
      )}

      {/* SECTION 2: MANAGEMENT COMMAND CENTER (HR/HEAD ONLY) */}
      {isManagement && (
        <section className="mt-8 border-t border-gray-4 pt-8">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-xl font-black text-gray-12 flex items-center gap-2">
                <Activity size={24} />
                {isHr ? "Organization Stats" : "Team Activity Feed"}
              </h2>
              <p className="text-sm text-gray-9 mt-1 font-medium">
                Real-time monitoring for{" "}
                {isHr ? "all departments" : userSubDept}.
              </p>
            </div>
            <Link
              to={isHr ? "/hr-master-log" : "/tasks"}
              className="flex items-center gap-1.5 text-sm font-bold text-primary bg-primary/10 hover:bg-primary hover:text-white px-4 py-2 rounded-lg transition-colors"
            >
              View Full Directory <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT: LIVE ACTIVITY TICKER (Takes up 2/3 of the space) */}
            <div className="lg:col-span-2 bg-gray-1 border border-gray-4 rounded-xl shadow-sm overflow-hidden">
              <div className="bg-gray-2 border-b border-gray-4 p-4">
                <h3 className="text-xs font-bold text-gray-10 uppercase tracking-wider flex items-center gap-2">
                  <Clock size={14} /> Latest Submissions
                </h3>
              </div>
              <div className="divide-y divide-gray-4">
                {teamTasks.length > 0 ? (
                  teamTasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleOpenDrawer(task)}
                      className="p-4 hover:bg-gray-2 transition-colors cursor-pointer flex items-start gap-4"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 border border-primary/20">
                        {task.loggedByName
                          ? task.loggedByName.charAt(0).toUpperCase()
                          : "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-12 font-medium truncate">
                          <span className="font-bold">{task.loggedByName}</span>{" "}
                          logged a task in{" "}
                          <span className="font-bold">{task.categoryId}</span>
                        </p>
                        <p className="text-xs text-gray-9 truncate mt-0.5">
                          {task.taskDescription}
                        </p>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end justify-between h-full gap-2">
                        {/* Upper Right: Date */}
                        <span className="text-[10px] font-bold text-gray-8 uppercase tracking-wider">
                          {new Date(task.createdAt).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric" },
                          )}
                        </span>

                        {/* Lower Right: Status Indicators */}
                        <div className="flex items-center gap-1.5 mt-auto">
                          {/* HR Verified Icon (Only shows if task is Complete AND Verified) */}
                          {task.status === "COMPLETE" && task.hrVerified && (
                            <CheckCircle2
                              className="text-green-700"
                              size={13}
                            />
                          )}

                          {/* Primary Status Dot */}
                          <span
                            className={`w-2.5 h-2.5 rounded-full shadow-sm ${
                              task.status === "COMPLETE"
                                ? "bg-green-500"
                                : task.status === "NOT APPROVED"
                                  ? "bg-red-500"
                                  : "bg-amber-500"
                            }`}
                            title={`Status: ${task.status}`}
                          />

                          {/* High Priority Pulse */}
                          {task.priority === "HIGH" && (
                            <span
                              className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse ml-1 shadow-[0_0_8px_rgba(220,38,38,0.6)]"
                              title="High Priority"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-10 text-center text-gray-9 text-sm font-medium">
                    No recent activity found.
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: MINI ANALYTICS / QUICK INSIGHTS */}
            <div className="bg-gray-1 border border-gray-4 rounded-xl shadow-sm p-5 flex flex-col gap-6">
              <div>
                <h3 className="text-xs font-bold text-gray-10 uppercase tracking-wider flex items-center gap-2 mb-4">
                  <TrendingUp size={14} /> Pipeline Status
                </h3>

                {/* Pre-calculate the buckets so the JSX stays perfectly clean */}
                {(() => {
                  const total = teamTasks.length || 1; // Fallback to 1 to prevent division by zero errors
                  const draftCount = teamTasks.filter(
                    (t) => t.status === "INCOMPLETE",
                  ).length;
                  const rejectedCount = teamTasks.filter(
                    (t) => t.status === "NOT APPROVED",
                  ).length;
                  const pendingHrCount = teamTasks.filter(
                    (t) => t.status === "COMPLETE" && !t.hrVerified,
                  ).length;
                  const verifiedCount = teamTasks.filter(
                    (t) => t.hrVerified,
                  ).length;

                  const isEmployee = !isHead && !isHr;
                  const isStrictlyHead = isHead && !isHr;

                  return (
                    <div className="space-y-4">
                      {/* ========================================== */}
                      {/* 1. EMPLOYEE VIEW                             */}
                      {/* ========================================== */}
                      {isEmployee && (
                        <>
                          <InsightBar
                            label="Action Required (Rejected)"
                            count={rejectedCount}
                            total={total}
                            color="bg-red-500"
                          />
                          <InsightBar
                            label="Drafts (Working)"
                            count={draftCount}
                            total={total}
                            color="bg-blue-500"
                          />
                          <InsightBar
                            label="Manager Approved (Pending HR)"
                            count={pendingHrCount}
                            total={total}
                            color="bg-amber-500"
                          />
                          <InsightBar
                            label="HR Verified & Finalized"
                            count={verifiedCount}
                            total={total}
                            color="bg-green-500"
                          />
                        </>
                      )}

                      {/* ========================================== */}
                      {/* 2. HEAD / MANAGER VIEW                       */}
                      {/* ========================================== */}
                      {isStrictlyHead && (
                        <>
                          <InsightBar
                            label="Needs My Review"
                            count={draftCount}
                            total={total}
                            color="bg-yellow-500"
                          />
                          <InsightBar
                            label="Rejected by Me"
                            count={rejectedCount}
                            total={total}
                            color="bg-red-400"
                          />
                          <InsightBar
                            label="Approved (Pending HR)"
                            count={pendingHrCount}
                            total={total}
                            color="bg-blue-500"
                          />
                          <InsightBar
                            label="Verified by HR"
                            count={verifiedCount}
                            total={total}
                            color="bg-green-500"
                          />
                        </>
                      )}

                      {/* ========================================== */}
                      {/* 3. HR ADMIN VIEW                             */}
                      {/* ========================================== */}
                      {isHr && (
                        <>
                          <InsightBar
                            label="Needs My Audit"
                            count={pendingHrCount}
                            total={total}
                            color="bg-amber-500"
                          />
                          <InsightBar
                            label="Employees Working"
                            count={draftCount}
                            total={total}
                            color="bg-gray-500"
                          />
                          <InsightBar
                            label="Manager Rejections"
                            count={rejectedCount}
                            total={total}
                            color="bg-red-500"
                          />
                          <InsightBar
                            label="Verified & Locked"
                            count={verifiedCount}
                            total={total}
                            color="bg-green-500"
                          />
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Dynamic Action Box based on Role */}
              <div className="mt-auto bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-xs text-primary font-bold uppercase tracking-wider mb-1">
                  System Tip
                </p>
                <p className="text-sm text-gray-11 font-medium leading-relaxed">
                  {!isHead &&
                    !isHr &&
                    "Tasks marked 'Rejected' require your immediate revision to proceed."}
                  {isHead &&
                    !isHr &&
                    "Keep your pipeline clear by reviewing 'Needs My Review' tasks daily."}
                  {isHr &&
                    "Focus on 'Needs My Audit' tasks to finalize the company timesheets."}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

    

      <TaskDetails
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        task={selectedTask}
        onUpdateTask={(updatedData) =>
          editTaskMutation.mutateAsync(updatedData)
        }
        onDeleteTask={(payload) => deleteTaskMutation.mutateAsync(payload)}
      />
    </div>
  );
}
