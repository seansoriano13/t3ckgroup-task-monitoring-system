import { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskService } from "../../services/taskService.js";
import { supabase } from "../../lib/supabase.js";
import { TASK_STATUS } from "../../constants/status.js";
import ProtectedRoute from "../../components/ProtectedRoute.jsx";
import { Search, CheckCircle2, History, Users } from "lucide-react";
import toast from "react-hot-toast";
import ExpenseApprovalQueue from "../../components/ExpenseApprovalQueue.jsx";
import TaskDetails from "../../components/TaskDetails.jsx";
import TaskFilters from "../../components/TaskFilters.jsx";
import CommitteeApprovalSection from "./components/CommitteeApprovalSection.jsx";

import { ApprovalHeader } from "./components/ApprovalHeader";
import { ApprovalRow } from "./components/ApprovalRow";
import BulkGradeModal from "./components/BulkGradeModal";
import BulkDeclineModal from "./components/BulkDeclineModal";
import { Button } from "@/components/ui/button";
import PageContainer from "../../components/ui/PageContainer";

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
  const [activeTab, setActiveTab] = useState("PENDING"); // "PENDING" | "VERIFIED" | "COMMITTEE"

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

  const [selectedTaskIds, setSelectedTaskIds] = useState([]);

  const [allEmployees, setAllEmployees] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  // Pagination & Bulk Grade Modal
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [isBulkGradeModalOpen, setIsBulkGradeModalOpen] = useState(false);
  const [isBulkDeclineModalOpen, setIsBulkDeclineModalOpen] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedTaskIds([]);
    if (activeTab === "VERIFIED") {
      setStatusFilter("ALL");
    }
  }, [
    searchQuery,
    priorityFilter,
    sortBy,
    dateRange,
    statusFilter,
    deptFilter,
    subDeptFilter,
    employeeFilter,
    activeTab,
  ]);

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
          // NEW: If task has explicit reported_to, only show to THAT head
          // Super Admins still see everything regardless.
          if (t.reportedTo) {
            if (isSuperAdmin) {
              // Super Admins can see all reported tasks
              matchesHeadQueue =
                isNotMe &&
                (t.status === TASK_STATUS.INCOMPLETE ||
                  t.status === TASK_STATUS.AWAITING_APPROVAL);
            } else {
              // Regular heads: only see tasks reported to them
              matchesHeadQueue =
                isNotMe &&
                t.reportedTo === user?.id &&
                (t.status === TASK_STATUS.INCOMPLETE ||
                  t.status === TASK_STATUS.AWAITING_APPROVAL);
            }
          } else {
            // FALLBACK: legacy tasks without reported_to use department matching
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
              } else if (
                !isMarketing &&
                appSettings?.universal_task_submission &&
                isMyDept
              ) {
                matchesHeadQueueForThisTask = isNotMe;
              } else if (isSuperAdmin) {
                matchesHeadQueueForThisTask = isNotMe;
              }
            }

            matchesHeadQueue = matchesHeadQueueForThisTask;
          }
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

  const verifiedTasks = useMemo(() => {
    return rawTasks
      .filter((t) => {
        const isNotMe = t.loggedById !== user?.id;
        if (!isNotMe) return false;

        if (isHr) {
          return t.status === TASK_STATUS.COMPLETE && t.hrVerified;
        }

        if (isHead || isSuperAdmin) {
          if (isSuperAdmin) {
            return t.status === TASK_STATUS.COMPLETE && t.evaluatedById != null;
          }
          return (
            t.status === TASK_STATUS.COMPLETE && t.evaluatedById === user?.id
          );
        }

        return false;
      })
      .sort((a, b) => {
        const aDate = isHr ? a.hrVerifiedAt : a.evaluatedAt;
        const bDate = isHr ? b.hrVerifiedAt : b.evaluatedAt;
        return new Date(bDate || b.createdAt) - new Date(aDate || a.createdAt);
      });
  }, [rawTasks, user?.id, isHr, isHead, isSuperAdmin]);

  const activeRawData = activeTab === "PENDING" ? pendingTasks : verifiedTasks;

  const filteredTasks = useMemo(() => {
    let result = [...activeRawData];

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
    activeRawData,
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

  // const delayedTasks = useMemo(() => {
  //   return filteredTasks.filter((t) => {
  //     if (!t.createdAt) return false;
  //     const hrs = (new Date() - new Date(t.createdAt)) / (1000 * 60 * 60);
  //     return hrs >= 48;
  //   });
  // }, [filteredTasks]);

  const handleSelectAllPending = () => {
    const ids = filteredTasks.map((t) => t.id);
    setSelectedTaskIds(ids);
  };

  const handleDeselectAll = () => setSelectedTaskIds([]);

  const toggleTaskSelection = (taskId) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId],
    );
  };

  const handleUndoBulkDirect = async () => {
    if (!selectedTaskIds.length) return;
    try {
      if (isHr && activeTab === "VERIFIED") {
        await taskService.bulkUnverifyTasks(selectedTaskIds, user.id);
      } else {
        await taskService.undoBulkApproval(selectedTaskIds, user.id);
      }
      queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setSelectedTaskIds([]);
      toast.success("Action reverted successfully.");
    } catch (err) {
      toast.error(err.message || "Failed to revert action.");
    }
  };

  const handleUndoBulk = async (taskIds) => {
    try {
      await taskService.undoBulkApproval(taskIds, user.id);
      queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Bulk approval reverted successfully.");
    } catch (err) {
      toast.error(err.message || "Failed to revert bulk approval.");
    }
  };

  const handleBulkApprove = async ({ grade, remarks }) => {
    if (!selectedTaskIds.length) return;
    setIsBulkGradeModalOpen(false);

    try {
      const idsToUndo = [...selectedTaskIds];
      await taskService.bulkApproveTasks(
        selectedTaskIds,
        user.id,
        grade,
        remarks,
      );
      queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setSelectedTaskIds([]);
      toast.success(`Success! ${idsToUndo.length} tasks clear.`, {
        action: {
          label: "Undo",
          onClick: () => handleUndoBulk(idsToUndo),
        },
        duration: 6000,
      });
    } catch (err) {
      toast.error(err.message || "Bulk approval failed.");
    }
  };

  const handleBulkDecline = async ({ remarks }) => {
    if (!selectedTaskIds.length) return;
    setIsBulkDeclineModalOpen(false);

    try {
      const idsToUndo = [...selectedTaskIds];
      await taskService.bulkDeclineTasks(selectedTaskIds, user.id, remarks);
      queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setSelectedTaskIds([]);
      toast.success(`Success! ${idsToUndo.length} tasks declined.`, {
        action: {
          label: "Undo",
          onClick: () => handleUndoBulk(idsToUndo),
        },
        duration: 6000,
      });
    } catch (err) {
      toast.error(err.message || "Bulk decline failed.");
    }
  };

  const paginatedTasks = useMemo(() => {
    return filteredTasks.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
    );
  }, [filteredTasks, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);

  if (isLoading)
    return (
      <div className="py-20 text-center text-muted-foreground font-bold">
        Loading Queue...
      </div>
    );

  return (
    <ProtectedRoute requireHead={true}>
      <PageContainer className="pt-4">
        <ApprovalHeader
          isHr={isHr}
          isSuperAdmin={isSuperAdmin}
          appSettings={appSettings}
          pendingTasksCount={activeRawData.length}
          filteredTasksCount={filteredTasks.length}
          selectedCount={selectedTaskIds.length}
          onSelectAllPending={handleSelectAllPending}
          onDeselectAll={handleDeselectAll}
          handleBulkApprove={() => setIsBulkGradeModalOpen(true)}
          handleBulkDecline={() => setIsBulkDeclineModalOpen(true)}
          handleUndoBulk={handleUndoBulkDirect}
          isVerifiedTab={activeTab === "VERIFIED"}
        />

        {/* TAB TOGGLE */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/50 pb-4 mt-2">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-xl w-full sm:w-fit overflow-x-auto">
            <button
              onClick={() => setActiveTab("PENDING")}
              className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg transition-all whitespace-nowrap shrink-0 ${
                activeTab === "PENDING"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted-foreground/10"
              }`}
            >
              <CheckCircle2 size={14} />
              Pending
              {pendingTasks.length > 0 && (
                <span
                  className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    activeTab === "PENDING"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted-foreground/20 text-muted-foreground"
                  }`}
                >
                  {pendingTasks.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("VERIFIED")}
              className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg transition-all whitespace-nowrap shrink-0 ${
                activeTab === "VERIFIED"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted-foreground/10"
              }`}
            >
              <History size={14} />
              Recently {isHr ? "Verified" : "Approved"}
              {verifiedTasks.length > 0 && (
                <span
                  className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    activeTab === "VERIFIED"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted-foreground/20 text-muted-foreground"
                  }`}
                >
                  {verifiedTasks.length}
                </span>
              )}
            </button>
            {isHr && (
              <button
                onClick={() => setActiveTab("COMMITTEE")}
                className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg transition-all whitespace-nowrap shrink-0 ${
                  activeTab === "COMMITTEE"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted-foreground/10"
                }`}
              >
                <Users size={14} />
                Committee Tasks
              </button>
            )}
          </div>
        </div>

        {activeRawData.length > 0 && (
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
            showStatusFilter={activeTab === "PENDING"}
            sortBy={sortBy}
            setSortBy={setSortBy}
          />
        )}

        {activeTab === "COMMITTEE" && isHr ? (
          <CommitteeApprovalSection />
        ) : (
          <>
            {!isHr && activeTab === "PENDING" && (
              <ExpenseApprovalQueue isSuperAdmin={false} />
            )}
            {filteredTasks.length > 0 ? (
              <div className="flex flex-col gap-4">
                {(searchQuery || priorityFilter !== "ALL") && (
                  <p className="text-xs font-bold text-muted-foreground px-1">
                    Showing {filteredTasks.length} of {activeRawData.length}{" "}
                    tasks
                  </p>
                )}
                {paginatedTasks.map((task) => (
                  <ApprovalRow
                    key={task.id}
                    task={task}
                    isHr={task.status === TASK_STATUS.COMPLETE}
                    currentUserId={user?.id}
                    defaultExpanded={task.id === autoOpenId}
                    onViewDetails={setViewTask}
                    onProcess={(payload) =>
                      editTaskMutation.mutateAsync({
                        ...payload,
                        editedBy: user.id,
                      })
                    }
                    appSettings={appSettings}
                    isSelected={selectedTaskIds.includes(task.id)}
                    onToggleSelection={
                      appSettings?.enable_bulk_approval
                        ? toggleTaskSelection
                        : undefined
                    }
                    isVerifiedTab={activeTab === "VERIFIED"}
                  />
                ))}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border pt-6 mt-4">
                    <span className="text-sm font-semibold text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => {
                          setCurrentPage((prev) => Math.max(1, prev - 1));
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => {
                          setCurrentPage((prev) =>
                            Math.min(totalPages, prev + 1),
                          );
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : pendingTasks.length > 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-card border border-border border-dashed rounded-xl shadow-sm text-center">
                <div className="p-4 bg-muted rounded-full mb-4 ring-4 ring-muted/50">
                  <Search size={28} className="text-muted-foreground" />
                </div>
                <p className="text-foreground font-semibold text-lg tracking-tight">
                  No tasks match your filter
                </p>
                <p className="text-muted-foreground mt-1.5 text-sm max-w-sm mx-auto">
                  Try adjusting your search query or current priority filter to
                  find what you're looking for.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setPriorityFilter("ALL");
                  }}
                  className="mt-6 font-semibold"
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 bg-card border border-border rounded-xl shadow-[0_4px_20px_-2px_rgba(79,70,229,0.1)] text-center relative overflow-hidden group">
                {/* Soft blob decoration inside empty state */}
                <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-[3000ms]"></div>

                <div
                  className={`relative inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 shadow-sm ring-4 ${
                    activeTab === "PENDING"
                      ? "bg-emerald-100/50 text-emerald-600 ring-emerald-50"
                      : "bg-muted text-muted-foreground ring-muted/50"
                  }`}
                >
                  {activeTab === "PENDING" ? (
                    <CheckCircle2 size={32} />
                  ) : (
                    <History size={32} />
                  )}
                </div>
                <p className="text-foreground font-bold text-2xl tracking-tight relative">
                  {activeTab === "PENDING"
                    ? "Inbox Zero!"
                    : "No Verified Tasks"}
                </p>
                <p className="text-muted-foreground mt-2 relative font-medium">
                  {activeTab === "PENDING"
                    ? "You're all caught up. No pending approvals require your attention."
                    : "Tasks you've verified will appear here."}
                </p>
              </div>
            )}
          </>
        )}
      </PageContainer>

      <TaskDetails
        isOpen={!!viewTask}
        onClose={() => setViewTask(null)}
        task={viewTask}
        onUpdateTask={(updatedTask) =>
          editTaskMutation.mutateAsync(updatedTask)
        }
        onDeleteTask={(payload) => deleteTaskMutation.mutateAsync(payload)}
      />

      <BulkGradeModal
        isOpen={isBulkGradeModalOpen}
        onClose={() => setIsBulkGradeModalOpen(false)}
        selectedCount={selectedTaskIds.length}
        onConfirm={handleBulkApprove}
        isSubmitting={editTaskMutation.isPending}
      />

      <BulkDeclineModal
        isOpen={isBulkDeclineModalOpen}
        onClose={() => setIsBulkDeclineModalOpen(false)}
        selectedCount={selectedTaskIds.length}
        onConfirm={handleBulkDecline}
        isSubmitting={editTaskMutation.isPending}
      />
    </ProtectedRoute>
  );
}
