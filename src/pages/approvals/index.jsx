import { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskService } from "../../services/taskService.js";
import { supabase } from "../../lib/supabase.js";
import { TASK_STATUS } from "../../constants/status.js";
import ProtectedRoute from "../../components/ProtectedRoute.jsx";
import { Search, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import ExpenseApprovalQueue from "../../components/ExpenseApprovalQueue.jsx";
import TaskDetails from "../../components/TaskDetails.jsx";
import TaskFilters from "../../components/TaskFilters.jsx";

import { ApprovalHeader } from "./components/ApprovalHeader";
import { ApprovalRow } from "./components/ApprovalRow";

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

  // DEEP LINKING HOOK
  useEffect(() => {
    if (location.state?.openTaskId && rawTasks.length > 0) {
      const targetTask = rawTasks.find(
        (t) => t.id === location.state.openTaskId,
      );
      queueMicrotask(() => {
        setAutoOpenId(location.state.openTaskId);
        if (targetTask) setViewTask(targetTask);
      });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, rawTasks, navigate, location.pathname]);

  // THE FORKED QUEUE LOGIC
  const pendingTasks = useMemo(() => {
    return rawTasks
      .filter((t) => {
        const isNotMe = t.loggedById !== user?.id;

        let matchesHrQueue = false;
        let matchesHeadQueue = false;

        if (isHr) {
          const isComplete = t.status === TASK_STATUS.COMPLETE;
          const isNotVerified = !t.hrVerified;
          matchesHrQueue = isNotMe && isComplete && isNotVerified;
        }

        if (isHead || isSuperAdmin) {
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

            if (isMarketing && (isSuperAdmin || canOpsManagerApprove)) {
              matchesHeadQueueForThisTask = isNotMe;
            }
            else if (
              !isMarketing &&
              appSettings?.universal_task_submission &&
              isMyDept
            ) {
              matchesHeadQueueForThisTask = isNotMe;
            }
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

  const filteredTasks = useMemo(() => {
    let result = [...pendingTasks];

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

    if (priorityFilter === "HIGH")
      result = result.filter((t) => t.priority === "HIGH");
    if (priorityFilter === "NORMAL")
      result = result.filter((t) => t.priority !== "HIGH");

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

    if (startDate && endDate) {
      const filterStart = new Date(startDate).setHours(0, 0, 0, 0);
      const filterEnd = new Date(endDate).setHours(23, 59, 59, 999);
      result = result.filter((t) => {
        const taskDate = new Date(t.createdAt).getTime();
        return taskDate >= filterStart && taskDate <= filterEnd;
      });
    }

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

  const handleBulkApprove = async () => {
    const ids = filteredTasks.map((t) => t.id);
    if (!ids.length) return;

    if (
      !window.confirm(
        `Bulk approve ${ids.length} currently filtered tasks? This will assign a neutral grade (3) and move them to completion.`,
      )
    )
      return;

    try {
      await taskService.bulkApproveTasks(ids, user.id);
      queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(`Success! ${ids.length} tasks cleared.`);
    } catch (err) {
      toast.error(err.message || "Bulk approval failed.");
    }
  };

  if (isLoading)
    return (
      <div className="py-20 text-center text-gray-9 font-bold">
        Loading Queue...
      </div>
    );

  return (
    <ProtectedRoute requireHead={true}>
      <div className="max-w-5xl mx-auto space-y-6 pb-10">
        <ApprovalHeader
          isHr={isHr}
          isSuperAdmin={isSuperAdmin}
          appSettings={appSettings}
          filteredTasksCount={filteredTasks.length}
          pendingTasksCount={pendingTasks.length}
          handleBulkApprove={handleBulkApprove}
        />

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
            isHr={false}
            hrViewMode="ALL"
            disableDeptFilter={false}
            uniqueDepts={uniqueDepts}
            uniqueSubDepts={uniqueSubDepts}
            uniqueEmployees={uniqueEmployees}
            showStatusFilter={true}
            sortBy={sortBy}
            setSortBy={setSortBy}
          />
        )}

        {!isHr && <ExpenseApprovalQueue isSuperAdmin={false} />}

        {filteredTasks.length > 0 ? (
          <div className="flex flex-col gap-4">
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
                appSettings={appSettings}
              />
            ))}
          </div>
        ) : pendingTasks.length > 0 ? (
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
