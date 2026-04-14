import { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskService } from "../../services/taskService.js";
import { supabase } from "../../lib/supabase.js";
import { TASK_STATUS } from "../../constants/status.js";
import ImageAttachment from "../../components/ImageAttachment.jsx";
import ProtectedRoute from "../../components/ProtectedRoute.jsx";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Search,
  SlidersHorizontal,
  X,
  Maximize2,
} from "lucide-react";
import { formatDate } from "../../utils/formatDate.js";
import toast from "react-hot-toast";
import { formatTaskPreview } from "../../utils/taskFormatters";
import ChecklistTaskRenderer from "../../components/ChecklistTaskRenderer.jsx";
import ExpenseApprovalQueue from "../../components/ExpenseApprovalQueue.jsx";
import TaskDetails from "../../components/TaskDetails.jsx";
import TaskFilters from "../../components/TaskFilters.jsx";

export default function ApprovalsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isSuperAdmin =
    user?.is_super_admin === true || user?.isSuperAdmin === true;
  const isHr = user?.is_hr === true || user?.isHr === true || isSuperAdmin;
  const isHead = user?.is_head === true || user?.isHead === true;
  const userSubDept = user?.sub_department || user?.subDepartment;
  const userDept = user?.department;

  const { data: rawTasks = [], isLoading } = useQuery({
    queryKey: ["dashboardTasks", user?.id, "all"],
    queryFn: () => taskService.getAllTasks(),
    enabled: !!user?.id,
  });

  const { data: appSettings } = useQuery({
    queryKey: ["appSettings"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("*").single();
      return data;
    },
  });

  const location = useLocation();
  const navigate = useNavigate();
  const [autoOpenId, setAutoOpenId] = useState(null);
  const [viewTask, setViewTask] = useState(null); // Full Modal State

  // Filter state (Head-only UX)
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL"); // ALL | HIGH | NORMAL
  const [sortBy, setSortBy] = useState("OLDEST"); // OLDEST | NEWEST | NAME

  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;

  const isSuperAdminDept = user?.department === "SUPER ADMIN";

  const [statusFilter, setStatusFilter] = useState(() => {
    return isSuperAdmin && isSuperAdminDept
      ? TASK_STATUS.AWAITING_APPROVAL
      : "ALL";
  });

  const [deptFilter, setDeptFilter] = useState("ALL");
  const [subDeptFilter, setSubDeptFilter] = useState("ALL");
  const [employeeFilter, setEmployeeFilter] = useState("ALL");

  const [allEmployees, setAllEmployees] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  useEffect(() => {
    if (!isHead && !isHr) return;
    const fetchTopology = async () => {
      const { employeeService } =
        await import("../../services/employeeService.js");
      const employees = await employeeService.getAllEmployees();
      if (employees) setAllEmployees(employees);

      const categories = await employeeService.getAllCategories();
      if (categories) setAllCategories(categories);
    };
    fetchTopology();
  }, [isHead, isHr]);

  const uniqueDepts = useMemo(() => {
    return [
      ...new Set(allCategories.map((c) => c.department).filter(Boolean)),
    ].sort();
  }, [allCategories]);

  const uniqueSubDepts = useMemo(() => {
    const filteredCats =
      deptFilter === "ALL"
        ? allCategories
        : allCategories.filter((c) => c.department === deptFilter);
    return [
      ...new Set(filteredCats.map((c) => c.subDepartment).filter(Boolean)),
    ].sort();
  }, [allCategories, deptFilter]);

  const uniqueEmployees = useMemo(() => {
    let pool = allEmployees.filter((e) => !e.is_super_admin);
    if (deptFilter !== "ALL")
      pool = pool.filter((e) => e.department === deptFilter);
    if (subDeptFilter !== "ALL")
      pool = pool.filter((e) => e.subDepartment === subDeptFilter);
    return pool.sort((a, b) => a.name.localeCompare(b.name));
  }, [allEmployees, deptFilter, subDeptFilter]);

  // 🔥 DEEP LINKING HOOK
  useEffect(() => {
    if (location.state?.openTaskId && rawTasks.length > 0) {
      const targetTask = rawTasks.find(
        (t) => t.id === location.state.openTaskId,
      );
      queueMicrotask(() => {
        setAutoOpenId(location.state.openTaskId); // Still opens the row for context underneath
        if (targetTask) setViewTask(targetTask); // Pops the big modal
      });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, rawTasks, navigate, location.pathname]);

  // 2. THE FORKED QUEUE LOGIC
  const pendingTasks = useMemo(() => {
    return rawTasks
      .filter((t) => {
        const isNotMe = t.loggedById !== user?.id; // Don't approve your own tasks

        let matchesHrQueue = false;
        let matchesHeadQueue = false;

        if (isHr) {
          // 🔥 HR QUEUE: Needs to be COMPLETE, but NOT YET VERIFIED
          const isComplete = t.status === TASK_STATUS.COMPLETE;
          const isNotVerified = !t.hrVerified;
          matchesHrQueue = isNotMe && isComplete && isNotVerified;
        }

        if (isHead || isSuperAdmin) {
          // 🔥 HEAD QUEUE: Needs to be INCOMPLETE, and in their Sub-Department
          const taskSubDept =
            t.sub_department ||
            t.subDepartment ||
            t.creator?.sub_department ||
            t.employees?.sub_department ||
            "";

          const taskDept =
            t.creator?.department || t.employees?.department || "";

          let isMyDept = false;
          if (userSubDept) {
            isMyDept = taskSubDept === userSubDept;
          } else {
            // Head with no sub-dept gets everything in their department
            isMyDept = taskDept === userDept;
          }

          const isMarketing =
            taskSubDept === "MARKETING" || taskDept === "MARKETING";
          let matchesHeadQueueForThisTask = false;

          if (t.status === TASK_STATUS.INCOMPLETE) {
            matchesHeadQueueForThisTask = isNotMe && isMyDept;
          } else if (t.status === TASK_STATUS.AWAITING_APPROVAL) {
            const canOpsManagerApprove =
              appSettings?.marketing_approval_by_ops_manager && isMyDept;

            // Marketing path: always routed to Super Admin / Ops Manager (existing behaviour)
            if (isMarketing && (isSuperAdmin || canOpsManagerApprove)) {
              matchesHeadQueueForThisTask = isNotMe;
            }
            // Universal path: when setting is ON, all AWAITING APPROVAL tasks come to the Head
            else if (
              !isMarketing &&
              appSettings?.universal_task_submission &&
              isMyDept
            ) {
              matchesHeadQueueForThisTask = isNotMe;
            }
            // Super Admin fallback: sees all AWAITING APPROVAL regardless of setting
            else if (isSuperAdmin) {
              matchesHeadQueueForThisTask = isNotMe;
            }
          }

          matchesHeadQueue = matchesHeadQueueForThisTask;
        }

        return matchesHrQueue || matchesHeadQueue;
      })
      .sort((a, b) => {
        if (a.priority === "HIGH" && b.priority !== "HIGH") return -1;
        if (b.priority === "HIGH" && a.priority !== "HIGH") return 1;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
  }, [
    rawTasks,
    user?.id,
    userDept,
    userSubDept,
    isHr,
    isHead,
    isSuperAdmin,
    appSettings,
  ]);

  // Client-side filter + sort applied on top of the queue
  const filteredTasks = useMemo(() => {
    let result = [...pendingTasks];

    // Search: name, category, description, payment voucher
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (t) =>
          (t.loggedByName || "").toLowerCase().includes(q) ||
          (t.categoryId || "").toLowerCase().includes(q) ||
          (t.taskDescription || "").toLowerCase().includes(q) ||
          (t.paymentVoucher || "").toLowerCase().includes(q),
      );
    }

    // Priority filter
    if (priorityFilter === "HIGH")
      result = result.filter((t) => t.priority === "HIGH");
    if (priorityFilter === "NORMAL")
      result = result.filter((t) => t.priority !== "HIGH");

    // Status filter
    if (statusFilter !== "ALL") {
      if (statusFilter === TASK_STATUS.INCOMPLETE)
        result = result.filter((t) => t.status === TASK_STATUS.INCOMPLETE);
      else if (statusFilter === TASK_STATUS.COMPLETE)
        result = result.filter((t) => t.status === TASK_STATUS.COMPLETE);
      else if (statusFilter === "COMPLETE_UNVERIFIED")
        result = result.filter(
          (t) => t.status === TASK_STATUS.COMPLETE && !t.hrVerified,
        );
      else if (statusFilter === "COMPLETE_VERIFIED")
        result = result.filter(
          (t) => t.status === TASK_STATUS.COMPLETE && t.hrVerified,
        );
      else if (statusFilter === TASK_STATUS.AWAITING_APPROVAL)
        result = result.filter(
          (t) => t.status === TASK_STATUS.AWAITING_APPROVAL,
        );
      else if (statusFilter === "NOT APPROVED")
        result = result.filter((t) => t.status === TASK_STATUS.NOT_APPROVED);
    }

    // Date Range
    if (startDate && endDate) {
      const filterStart = new Date(startDate).setHours(0, 0, 0, 0);
      const filterEnd = new Date(endDate).setHours(23, 59, 59, 999);
      result = result.filter((t) => {
        const taskDate = new Date(t.createdAt).getTime();
        return taskDate >= filterStart && taskDate <= filterEnd;
      });
    }

    // Department / Sub-Dept / Employee
    if (
      deptFilter !== "ALL" ||
      subDeptFilter !== "ALL" ||
      employeeFilter !== "ALL"
    ) {
      const empMap = new Map();
      for (const emp of allEmployees) empMap.set(emp.id, emp);

      result = result.filter((task) => {
        let matchesDept = true,
          matchesSubDept = true,
          matchesEmp = true;
        const taskOwner = empMap.get(task.loggedById);

        if (deptFilter !== "ALL")
          matchesDept = taskOwner?.department === deptFilter;
        if (subDeptFilter !== "ALL")
          matchesSubDept = taskOwner?.subDepartment === subDeptFilter;
        if (employeeFilter !== "ALL")
          matchesEmp = task.loggedById === employeeFilter;

        return matchesDept && matchesSubDept && matchesEmp;
      });
    }

    // Sort
    if (sortBy === "NEWEST")
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sortBy === "OLDEST")
      result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    else if (sortBy === "NAME")
      result.sort((a, b) =>
        (a.loggedByName || "").localeCompare(b.loggedByName || ""),
      );

    return result;
  }, [
    pendingTasks,
    searchQuery,
    priorityFilter,
    sortBy,
    statusFilter,
    startDate,
    endDate,
    deptFilter,
    subDeptFilter,
    employeeFilter,
    allEmployees,
  ]);

  // 3. The Approval/Verification Mutation
  const editTaskMutation = useMutation({
    mutationFn: (updatedData) =>
      taskService.updateTask(updatedData.id, updatedData),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      if (variables.status === "NOT APPROVED") {
        toast.success("Task has been rejected.");
      } else {
        toast.success(
          isHr ? "Task verified by HR." : "Task approved successfully.",
        );
      }
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: ({ id, userId }) => taskService.deleteTask(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted successfully");
    },
  });

  if (isLoading)
    return (
      <div className="py-20 text-center text-gray-9 font-bold">
        Loading Queue...
      </div>
    );

  return (
    <ProtectedRoute requireHead={true}>
      <div className="max-w-5xl mx-auto space-y-6 pb-10">
        {/* HEADER */}
        <div className="flex justify-between items-end border-b border-gray-4 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-12">
              {isHr ? "HR Verification Queue" : "Manager Action Queue"}
            </h1>
            <p className="text-gray-9 mt-1">
              {isHr
                ? "Audit and verify graded tasks."
                : "Review and grade pending tasks from your team."}
            </p>
          </div>
          <div className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-lg flex items-center gap-2">
            <Clock size={16} className="text-primary" />
            <span className="text-primary font-bold">
              {pendingTasks.length} Pending
            </span>
          </div>
        </div>

        {/* FILTER BAR */}
        {pendingTasks.length > 0 && (
          <TaskFilters
            searchTerm={searchQuery}
            setSearchTerm={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            dateRange={dateRange}
            setDateRange={setDateRange}
            deptFilter={deptFilter}
            setDeptFilter={setDeptFilter}
            subDeptFilter={subDeptFilter}
            setSubDeptFilter={setSubDeptFilter}
            employeeFilter={employeeFilter}
            setEmployeeFilter={setEmployeeFilter}
            isManagement={true}
            isHr={false} // Approvals page hierarchy behaves like Head even for HR since it's just sorting pending
            hrViewMode="ALL"
            disableDeptFilter={false} // Force enable dept filter for all roles in Approvals page
            uniqueDepts={uniqueDepts}
            uniqueSubDepts={uniqueSubDepts}
            uniqueEmployees={uniqueEmployees}
            showStatusFilter={true}
            sortBy={sortBy}
            setSortBy={setSortBy}
          />
        )}

        {/* FINANCIAL QUEUE (only for Sales Heads) */}
        {!isHr && <ExpenseApprovalQueue isSuperAdmin={false} />}

        {/* THE QUEUE */}
        {filteredTasks.length > 0 ? (
          <div className="flex flex-col gap-4">
            {/* Result count when filtering */}
            {(searchQuery || priorityFilter !== "ALL") && (
              <p className="text-xs font-bold text-gray-9 px-1">
                Showing {filteredTasks.length} of {pendingTasks.length} tasks
              </p>
            )}
            {filteredTasks.map((task) => (
              <ApprovalRow
                key={task.id}
                task={task}
                isHr={isHr}
                currentUserId={user?.id}
                defaultExpanded={task.id === autoOpenId}
                onViewDetails={setViewTask}
                onProcess={(payload) =>
                  editTaskMutation.mutateAsync({
                    ...payload,
                    editedBy: user.id,
                  })
                }
                isSubmitting={editTaskMutation.isPending}
              />
            ))}
          </div>
        ) : pendingTasks.length > 0 ? (
          // Has tasks but none match the filter
          <div className="text-center py-16 bg-gray-2 border border-gray-4 border-dashed rounded-xl">
            <Search size={32} className="mx-auto text-gray-7 mb-3" />
            <p className="text-gray-12 font-bold">No tasks match your filter</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setPriorityFilter("ALL");
              }}
              className="mt-3 text-xs font-bold text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-2 border border-gray-4 border-dashed rounded-xl shadow-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-400 mb-4">
              <CheckCircle2 size={32} />
            </div>
            <p className="text-gray-12 font-bold text-xl">Inbox Zero!</p>
            <p className="text-gray-9 mt-2">
              There are no pending tasks waiting for your review.
            </p>
          </div>
        )}
      </div>

      <TaskDetails
        isOpen={!!viewTask}
        onClose={() => setViewTask(null)}
        task={viewTask}
        onUpdateTask={(updatedTask) =>
          editTaskMutation.mutateAsync(updatedTask)
        }
        onDeleteTask={(payload) => deleteTaskMutation.mutateAsync(payload)}
      />
    </ProtectedRoute>
  );
}

function ApprovalRow({
  task,
  isHr,
  onProcess,
  isSubmitting,
  currentUserId,
  defaultExpanded,
  onViewDetails,
}) {
  const [expanded, setExpanded] = useState(!!defaultExpanded);
  const [grade, setGrade] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [hrRemarks, setHrRemarks] = useState(""); // 👈 New state for HR

  useEffect(() => {
    if (defaultExpanded) {
      queueMicrotask(() => setExpanded(true));
    }
  }, [defaultExpanded]);

  // --- HEAD HANDLERS ---
  const handleHeadApprove = () => {
    onProcess({
      id: task.id,
      status: TASK_STATUS.COMPLETE,
      grade: grade,
      remarks: remarks,
      endAt: new Date().toISOString(),
      evaluatedBy: currentUserId,
      // Head approval re-opens the HR verification step.
      hrVerified: false,
      hrRemarks: "",
    });
  };

  const handleHeadReject = () => {
    onProcess({
      id: task.id,
      status: "NOT APPROVED",
      grade: 0,
      remarks: remarks,
      evaluatedBy: currentUserId,
      // Manager rejection should clear HR verification flags/notes.
      hrVerified: false,
      hrRemarks: "",
    });
  };

  // --- HR HANDLERS ---
  const handleHrVerify = () => {
    onProcess({
      id: task.id,
      status: TASK_STATUS.COMPLETE,
      hrVerified: true,
      hrVerifiedAt: new Date().toISOString(),
      hrRemarks: hrRemarks, // Optional: HR can leave a note even when approving
    });
  };

  const handleHrReject = () => {
    onProcess({
      id: task.id,
      status: "NOT APPROVED", // Hard reject (Kills the task)
      hrVerified: false,
      hrVerifiedAt: null,
      hrRemarks: hrRemarks, // Saves HR's specific reason
      // Notice we don't wipe the Head's grade/remarks. We keep them for the paper trail!
    });
  };

  return (
    <div
      className={`bg-gray-1 border transition-all rounded-xl shadow-sm ${
        expanded
          ? "border-gray-6 shadow-lg"
          : "border-gray-4 hover:border-gray-6"
      }`}
    >
      {/* COMPACT ROW */}
      <div
        className="p-3 md:p-4 flex items-center justify-between cursor-pointer gap-2"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-3 flex items-center justify-center font-bold text-gray-12 shrink-0 border border-gray-4 text-xs md:text-base">
            {task.loggedByName
              ? task.loggedByName.charAt(0).toUpperCase()
              : "?"}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-gray-12 text-xs md:text-sm truncate">
              {task.loggedByName}
            </h3>
            <p className="text-[9px] md:text-[10px] text-gray-9 font-bold uppercase tracking-widest truncate">
              {task.categoryId}
            </p>
          </div>

          {/* Description Hidden on mobile, visible on tablet/desktop */}
          <div className="hidden md:block ml-4 pl-4 border-l border-gray-4">
            <p className="text-sm font-semibold text-gray-11 line-clamp-1 max-w-md">
              {formatTaskPreview(task.taskDescription)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <span className="text-[10px] md:text-xs font-bold text-gray-9">
            {formatDate(task.createdAt)}
          </span>

          {task.priority === "HIGH" && (
            <>
              {/* Desktop Badge */}
              <span className="hidden sm:block px-2 py-1 rounded bg-red-a3 text-red-11 text-[10px] font-black uppercase tracking-widest border border-red-a5">
                High Priority
              </span>
              {/* Mobile Indicator */}
              <div className="sm:hidden w-2 h-2 rounded-full bg-red-9 shadow-[0_0_8px_rgba(229,72,77,0.5)]" />
            </>
          )}

          <button
            className="text-gray-8 hover:text-primary transition-colors p-1"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(task);
            }}
            title="Open Full Details"
          >
            <Maximize2 size={16} />
          </button>

          <button className="text-gray-8 hover:text-gray-12 transition-colors p-1">
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* EXPANDED ACTION AREA */}
      {expanded && (
        <div className="p-4 border-t border-gray-4 bg-gray-2/50 rounded-b-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Col: Full Description */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider mb-2 block">
                Task Description
              </label>
              {task.taskDescription &&
              task.taskDescription.trim().startsWith("[") ? (
                <div className="mt-1">
                  <ChecklistTaskRenderer
                    description={task.taskDescription}
                    isOwner={false}
                    disabled={true}
                  />
                </div>
              ) : (
                <div className="bg-gray-1 p-3 md:p-4 rounded-lg border border-gray-4 text-xs md:text-sm text-gray-12 whitespace-pre-wrap leading-relaxed shadow-inner">
                  {formatTaskPreview(task.taskDescription)}
                </div>
              )}

              {/* 🔥 Inline Image Preview for Quick Approval */}
              {task.attachments && task.attachments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-4/50">
                  <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider mb-2 block">
                    Screenshots / Attachments
                  </label>
                  <ImageAttachment
                    taskId={task.id}
                    userId={currentUserId}
                    attachments={task.attachments}
                    readOnly={true}
                    onChange={() => {}}
                  />
                </div>
              )}
            </div>

            {/* Right Col: Dynamic UI based on Role */}
            <div className="space-y-4">
              {isHr ? (
                /* --- HR UI --- */
                <>
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-bold text-gray-9 uppercase tracking-wider mb-1">
                      Manager's Evaluation
                    </p>
                    <div className="flex gap-1.5 md:gap-2 pointer-events-none select-none">
                      {[1, 2, 3, 4, 5].map((num) => {
                        const activeColorMap = {
                          1: "bg-red-500 text-gray-1 border-red-500 shadow-red-500/40",
                          2: "bg-orange-500 text-gray-1 border-orange-500 shadow-orange-500/40",
                          3: "bg-yellow-500 text-gray-1 border-yellow-500 shadow-yellow-500/40",
                          4: "bg-lime-500 text-gray-1 border-lime-500 shadow-lime-500/40",
                          5: "bg-green-500 text-gray-1 border-green-500 shadow-green-500/40",
                        };
                        const isSelected = task.grade === num;
                        return (
                          <div
                            key={num}
                            className={`flex-1 py-2.5 rounded-lg font-black border text-xs md:text-sm text-center transition-all ${
                              isSelected
                                ? `${activeColorMap[num]} shadow-md scale-[1.05]`
                                : "bg-gray-2 text-gray-10 border-gray-4 opacity-40"
                            }`}
                          >
                            {num}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {task.remarks && (
                    <div className="bg-gray-1 border border-gray-4 p-3 rounded-xl">
                      <p className="text-[10px] font-bold text-gray-9 uppercase tracking-wider mb-1">
                        Manager Remarks
                      </p>
                      <p className="text-xs text-gray-12">{task.remarks}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider mb-1 block">
                      HR Verification Notes
                    </label>
                    <input
                      type="text"
                      value={hrRemarks}
                      onChange={(e) => setHrRemarks(e.target.value)}
                      placeholder="Audit notes..."
                      className="w-full bg-gray-1 border border-gray-4 text-gray-12 rounded-lg px-3 py-2.5 outline-none focus:border-primary transition-colors text-sm"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                    <button
                      onClick={handleHrReject}
                      disabled={!hrRemarks || isSubmitting}
                      className="order-2 sm:order-1 px-4 py-2.5 rounded-lg font-bold text-sm bg-gray-3 border border-gray-4 text-gray-11 hover:text-red-11 transition-colors disabled:opacity-50"
                    >
                      Not Approve
                    </button>
                    <button
                      onClick={handleHrVerify}
                      disabled={isSubmitting}
                      className="order-1 sm:order-2 px-6 py-2.5 rounded-lg font-bold text-sm bg-green-600 text-white shadow-lg shadow-green-900/20 hover:bg-green-700 transition-colors active:scale-95 disabled:opacity-50"
                    >
                      Verify & Sign
                    </button>
                  </div>
                </>
              ) : (
                /* --- HEAD UI --- */
                <>
                  <div>
                    <label className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2 block">
                      Assign Grade (1-5)
                    </label>
                    <div className="flex gap-1.5 md:gap-2">
                      {[1, 2, 3, 4, 5].map((num) => {
                        const activeColorMap = {
                          1: "bg-red-500 text-gray-1 hover:bg-red-600 border-red-500 shadow-red-500/40",
                          2: "bg-orange-500 text-gray-1 hover:bg-orange-600 border-orange-500 shadow-orange-500/40",
                          3: "bg-yellow-500 text-gray-1 hover:bg-yellow-600 border-yellow-500 shadow-yellow-500/40",
                          4: "bg-lime-500 text-gray-1 hover:bg-lime-600 border-lime-500 shadow-lime-500/40",
                          5: "bg-green-500 text-gray-1 hover:bg-green-600 border-green-500 shadow-green-500/40",
                        };

                        return (
                          <button
                            key={num}
                            onClick={() => setGrade(num)}
                            className={`flex-1 py-2.5 rounded-lg font-black transition-all border text-xs md:text-sm ${
                              grade === num
                                ? `${activeColorMap[num]} shadow-md scale-[1.05]`
                                : "bg-gray-2 text-gray-10 border-gray-4 hover:border-gray-6 hover:bg-gray-3"
                            }`}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider mb-1 block">
                      Evaluation Remarks
                    </label>
                    <input
                      type="text"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Add feedback..."
                      className="w-full bg-gray-1 border border-gray-4 text-gray-12 rounded-lg px-3 py-2.5 outline-none focus:border-primary transition-colors text-sm"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                    <button
                      onClick={handleHeadReject}
                      disabled={!remarks || isSubmitting}
                      className="order-2 sm:order-1 px-4 py-2.5 rounded-lg font-bold text-sm bg-gray-3 border border-gray-4 text-gray-11 hover:text-red-11 transition-colors disabled:opacity-50"
                    >
                      Not Approve
                    </button>
                    <button
                      onClick={handleHeadApprove}
                      disabled={grade === null || isSubmitting}
                      className="order-1 sm:order-2 px-6 py-2.5 rounded-lg font-bold text-sm bg-green-600 text-white shadow-lg shadow-green-900/20 hover:bg-green-700 transition-colors active:scale-95 disabled:opacity-50"
                    >
                      Approve Task
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
