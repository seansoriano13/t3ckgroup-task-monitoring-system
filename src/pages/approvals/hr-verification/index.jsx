import { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../../../context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskService } from "../../../services/taskService.js";
import { supabase } from "../../../lib/supabase.js";
import { TASK_STATUS } from "../../../constants/status.js";
import ProtectedRoute from "../../../components/ProtectedRoute.jsx";
import { ShieldCheck, History, Search, Users } from "lucide-react";
import toast from "react-hot-toast";
import TaskDetails from "../../../components/TaskDetails.jsx";
import TaskFilters from "../../../components/TaskFilters.jsx";
import CommitteeApprovalSection from "../components/CommitteeApprovalSection.jsx";

import { ApprovalRow } from "../components/ApprovalRow";
import BulkVerifyModal from "./components/BulkVerifyModal";
import { Button } from "@/components/ui/button";
import PageContainer from "../../../components/ui/PageContainer";
import TabGroup from "../../../components/ui/TabGroup";
import PageHeader from "../../../components/ui/PageHeader";
import { CheckSquare, XSquare, Undo2, Clock } from "lucide-react";

export default function HrVerificationPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // HR role is DB-driven only — never inherited from super-admin
  const isHr = user?.is_hr === true || user?.isHr === true;
  const isSuperAdmin = user?.is_super_admin === true || user?.isSuperAdmin === true;

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

  const [viewTask, setViewTask] = useState(null);
  const [activeTab, setActiveTab] = useState("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("OLDEST");
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [subDeptFilter, setSubDeptFilter] = useState("ALL");
  const [employeeFilter, setEmployeeFilter] = useState("ALL");
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [isBulkVerifyModalOpen, setIsBulkVerifyModalOpen] = useState(false);
  const [isBulkUnverifyPending, setIsBulkUnverifyPending] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // DEEP-LINK HOOK: notification click → auto-open task detail
  useEffect(() => {
    if (location.state?.openTaskId && rawTasks.length > 0) {
      const targetTask = rawTasks.find((t) => t.id === location.state.openTaskId);
      if (targetTask) {
        queueMicrotask(() => setViewTask(targetTask));
      }
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, rawTasks, navigate, location.pathname]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedTaskIds([]);
  }, [searchQuery, priorityFilter, sortBy, dateRange, deptFilter, subDeptFilter, employeeFilter, activeTab]);

  useEffect(() => {
    const fetchTopology = async () => {
      const { employeeService } = await import("../../../services/employeeService.js");
      const employees = await employeeService.getAllEmployees();
      if (employees) setAllEmployees(employees);
      const categories = await employeeService.getAllCategories();
      if (categories) setAllCategories(categories);
    };
    fetchTopology();
  }, []);

  const uniqueDepts = useMemo(() =>
    [...new Set(allCategories.map((c) => c.department).filter(Boolean))].sort(),
    [allCategories],
  );
  const uniqueSubDepts = useMemo(() => {
    const filteredCats = deptFilter === "ALL"
      ? allCategories
      : allCategories.filter((c) => c.department === deptFilter);
    return [...new Set(filteredCats.map((c) => c.subDepartment).filter(Boolean))].sort();
  }, [allCategories, deptFilter]);
  const uniqueEmployees = useMemo(() => {
    let pool = allEmployees.filter((e) => !e.is_super_admin);
    if (deptFilter !== "ALL") pool = pool.filter((e) => e.department === deptFilter);
    if (subDeptFilter !== "ALL") pool = pool.filter((e) => e.subDepartment === subDeptFilter);
    return pool.sort((a, b) => a.name.localeCompare(b.name));
  }, [allEmployees, deptFilter, subDeptFilter]);

  // HR PENDING QUEUE:
  // Tasks that are COMPLETE, graded by a Head (evaluated_by != null), and NOT yet hr_verified
  // SuperAdmins on this page see all unverified tasks system-wide.
  const pendingTasks = useMemo(() => {
    return rawTasks
      .filter((t) => {
        const isNotMe = t.loggedById !== user?.id;
        return (
          isNotMe &&
          t.status === TASK_STATUS.COMPLETE &&
          !t.hrVerified &&
          t.evaluatedById != null
        );
      })
      .sort((a, b) => new Date(a.evaluatedAt || a.createdAt) - new Date(b.evaluatedAt || b.createdAt));
  }, [rawTasks, user?.id]);

  // HR VERIFIED QUEUE: tasks that have been hr_verified
  const verifiedTasks = useMemo(() => {
    return rawTasks
      .filter((t) => {
        const isNotMe = t.loggedById !== user?.id;
        return isNotMe && t.status === TASK_STATUS.COMPLETE && t.hrVerified;
      })
      .sort((a, b) => new Date(b.hrVerifiedAt || b.createdAt) - new Date(a.hrVerifiedAt || a.createdAt));
  }, [rawTasks, user?.id]);

  const activeRawData = activeTab === "PENDING" ? pendingTasks : verifiedTasks;

  const filteredTasks = useMemo(() => {
    let result = [...activeRawData];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (t) =>
          (t.loggedByName || "").toLowerCase().includes(q) ||
          (t.categoryId || "").toLowerCase().includes(q) ||
          (t.taskDescription || "").toLowerCase().includes(q),
      );
    }
    if (priorityFilter === "HIGH") result = result.filter((t) => t.priority === "HIGH");
    if (priorityFilter === "NORMAL") result = result.filter((t) => t.priority !== "HIGH");
    if (startDate && endDate) {
      const filterStart = new Date(startDate).setHours(0, 0, 0, 0);
      const filterEnd = new Date(endDate).setHours(23, 59, 59, 999);
      result = result.filter((t) => {
        const taskDate = new Date(t.createdAt).getTime();
        return taskDate >= filterStart && taskDate <= filterEnd;
      });
    }
    if (deptFilter !== "ALL" || subDeptFilter !== "ALL" || employeeFilter !== "ALL") {
      const empMap = new Map();
      for (const emp of allEmployees) empMap.set(emp.id, emp);
      result = result.filter((task) => {
        let matchesDept = true, matchesSubDept = true, matchesEmp = true;
        const taskOwner = empMap.get(task.loggedById);
        if (deptFilter !== "ALL") matchesDept = taskOwner?.department === deptFilter;
        if (subDeptFilter !== "ALL") matchesSubDept = taskOwner?.subDepartment === subDeptFilter;
        if (employeeFilter !== "ALL") matchesEmp = task.loggedById === employeeFilter;
        return matchesDept && matchesSubDept && matchesEmp;
      });
    }
    if (sortBy === "NEWEST") result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sortBy === "OLDEST") result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    else if (sortBy === "NAME") result.sort((a, b) => (a.loggedByName || "").localeCompare(b.loggedByName || ""));
    return result;
  }, [
    activeRawData, searchQuery, priorityFilter, sortBy,
    startDate, endDate, deptFilter, subDeptFilter, employeeFilter, allEmployees,
  ]);

  const editTaskMutation = useMutation({
    mutationFn: (updatedData) => taskService.updateTask(updatedData.id, updatedData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task verified by HR.");
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

  const handleSelectAll = () => setSelectedTaskIds(filteredTasks.map((t) => t.id));
  const handleDeselectAll = () => setSelectedTaskIds([]);
  const toggleTaskSelection = (taskId) =>
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId],
    );

  const handleBulkVerify = async ({ notes }) => {
    if (!selectedTaskIds.length) return;
    setIsBulkVerifyModalOpen(false);
    try {
      const idsToUndo = [...selectedTaskIds];
      await taskService.bulkVerifyTasks(selectedTaskIds, user.id, notes);
      queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setSelectedTaskIds([]);
      toast.success(`${idsToUndo.length} tasks verified successfully.`, {
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await taskService.bulkUnverifyTasks(idsToUndo, user.id);
              queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] });
              queryClient.invalidateQueries({ queryKey: ["tasks"] });
              toast.success("Verification undone.");
            } catch (e) {
              toast.error(e.message || "Failed to undo.");
            }
          },
        },
        duration: 6000,
      });
    } catch (err) {
      toast.error(err.message || "Bulk verification failed.");
    }
  };

  const handleBulkUnverify = async () => {
    if (!selectedTaskIds.length) return;
    setIsBulkUnverifyPending(true);
    try {
      await taskService.bulkUnverifyTasks(selectedTaskIds, user.id);
      queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setSelectedTaskIds([]);
      toast.success("Verification undone successfully.");
    } catch (err) {
      toast.error(err.message || "Failed to unverify tasks.");
    } finally {
      setIsBulkUnverifyPending(false);
    }
  };

  const paginatedTasks = useMemo(() =>
    filteredTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [filteredTasks, currentPage, itemsPerPage],
  );
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);

  if (isLoading)
    return <div className="py-20 text-center text-muted-foreground font-bold">Loading Verification Queue...</div>;

  return (
    <ProtectedRoute requireHr={true}>
      <PageContainer className="pt-4">
        {/* PAGE HEADER */}
        <PageHeader
          title="Task Verification"
          description="HR sign-off and audit of Head-approved tasks for payroll accuracy."
        >
          {appSettings?.enable_bulk_approval && (
            <>
              {selectedTaskIds.length > 0 ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleDeselectAll}
                    className="font-semibold shadow-sm"
                  >
                    <XSquare className="mr-2 h-4 w-4" /> Deselect All
                  </Button>
                  {activeTab === "VERIFIED" ? (
                    <Button
                      onClick={handleBulkUnverify}
                      size="sm"
                      disabled={isBulkUnverifyPending}
                      className="font-semibold shadow-sm text-primary-foreground bg-destructive hover:bg-red-9"
                    >
                      <Undo2 className="mr-2 h-4 w-4" /> Undo {selectedTaskIds.length} Verification{selectedTaskIds.length > 1 ? "s" : ""}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setIsBulkVerifyModalOpen(true)}
                      size="sm"
                      className="font-semibold shadow-sm text-primary-foreground bg-blue-10 hover:bg-blue-11"
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" /> Verify {selectedTaskIds.length} Selected
                    </Button>
                  )}
                </>
              ) : filteredTasks.length > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="font-semibold shadow-sm"
                >
                  <CheckSquare className="mr-2 h-4 w-4" /> Select All
                </Button>
              ) : null}
            </>
          )}
          <div className="bg-card border border-border px-4 py-2 rounded-xl flex items-center gap-2.5 shadow-sm">
            <Clock size={16} className="text-primary" />
            <span className="text-foreground font-black text-[11px] uppercase tracking-widest">
              {activeRawData.length} {activeTab === "VERIFIED" ? "Verified" : "Pending"}
            </span>
          </div>
        </PageHeader>

        {/* TAB TOGGLE */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/50 pb-4 mt-2">
          <TabGroup
            tabs={[
              {
                value: "PENDING",
                label: "Awaiting Verification",
                icon: ShieldCheck,
                badge: pendingTasks.length || undefined,
              },
              {
                value: "VERIFIED",
                label: "Recently Verified",
                icon: History,
                badge: verifiedTasks.length || undefined,
              },
              { value: "COMMITTEE", label: "Committee Tasks", icon: Users },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            size="md"
          />
        </div>

        {/* COMMITTEE TAB */}
        {activeTab === "COMMITTEE" ? (
          <CommitteeApprovalSection />
        ) : (
          <>
            {activeRawData.length > 0 && (
              <TaskFilters
                searchTerm={searchQuery}
                setSearchTerm={setSearchQuery}
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
                isHr={true}
                hrViewMode="ALL"
                disableDeptFilter={false}
                uniqueDepts={uniqueDepts}
                uniqueSubDepts={uniqueSubDepts}
                uniqueEmployees={uniqueEmployees}
                showStatusFilter={false}
                sortBy={sortBy}
                setSortBy={setSortBy}
              />
            )}

            {filteredTasks.length > 0 ? (
              <div className="flex flex-col gap-4">
                {(searchQuery || priorityFilter !== "ALL") && (
                  <p className="text-xs font-bold text-muted-foreground px-1">
                    Showing {filteredTasks.length} of {activeRawData.length} tasks
                  </p>
                )}
                {paginatedTasks.map((task) => (
                  <ApprovalRow
                    key={task.id}
                    task={task}
                    isHr={true}
                    currentUserId={user?.id}
                    defaultExpanded={false}
                    onViewDetails={setViewTask}
                    onProcess={(payload) =>
                      editTaskMutation.mutateAsync({ ...payload, editedBy: user.id })
                    }
                    appSettings={appSettings}
                    isSelected={selectedTaskIds.includes(task.id)}
                    onToggleSelection={
                      appSettings?.enable_bulk_approval ? toggleTaskSelection : undefined
                    }
                    isVerifiedTab={activeTab === "VERIFIED"}
                  />
                ))}

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
                          setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : pendingTasks.length > 0 && activeTab === "PENDING" ? (
              <div className="flex flex-col items-center justify-center py-20 bg-card border border-border border-dashed rounded-xl shadow-sm text-center">
                <div className="p-4 bg-muted rounded-full mb-4 ring-4 ring-muted/50">
                  <Search size={28} className="text-muted-foreground" />
                </div>
                <p className="text-foreground font-semibold text-lg tracking-tight">
                  No tasks match your filter
                </p>
                <Button
                  variant="outline"
                  onClick={() => { setSearchQuery(""); setPriorityFilter("ALL"); }}
                  className="mt-6 font-semibold"
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 bg-card border border-border rounded-xl shadow-[0_4px_20px_-2px_rgba(79,70,229,0.1)] text-center relative overflow-hidden group">
                <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-[3000ms]" />
                <div
                  className={`relative inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 shadow-sm ring-4 ${
                    activeTab === "PENDING"
                      ? "bg-blue-3/50 text-blue-10 ring-blue-2"
                      : "bg-muted text-muted-foreground ring-muted/50"
                  }`}
                >
                  {activeTab === "PENDING" ? <ShieldCheck size={32} /> : <History size={32} />}
                </div>
                <p className="text-foreground font-bold text-2xl tracking-tight relative">
                  {activeTab === "PENDING" ? "All Clear!" : "No Verified Tasks"}
                </p>
                <p className="text-muted-foreground mt-2 relative font-medium">
                  {activeTab === "PENDING"
                    ? "No tasks are awaiting HR verification right now."
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
        onUpdateTask={(updatedTask) => editTaskMutation.mutateAsync(updatedTask)}
        onDeleteTask={(payload) => deleteTaskMutation.mutateAsync(payload)}
      />

      <BulkVerifyModal
        isOpen={isBulkVerifyModalOpen}
        onClose={() => setIsBulkVerifyModalOpen(false)}
        selectedCount={selectedTaskIds.length}
        onConfirm={handleBulkVerify}
        isSubmitting={editTaskMutation.isPending}
      />
    </ProtectedRoute>
  );
}
