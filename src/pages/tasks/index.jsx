import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { TASK_STATUS } from "../../constants/status.js";
import TaskDetails from "../../components/TaskDetails.jsx";
import TaskCard from "../../components/TaskCard";
import TaskFilters from "../../components/TaskFilters.jsx";
import { useAuth } from "../../context/AuthContext";
import { taskService } from "../../services/taskService.js";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

// --- DATE PICKER IMPORTS ---
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useTaskFilters } from "../../hooks/useTaskFilters.jsx";
import { employeeService } from "../../services/employeeService.js";
import { useMemo } from "react";

export default function TasksPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // --- ROLE CHECKS ---
  const isSA = user?.is_super_admin === true || user?.isSuperAdmin === true;
  const isHr = user?.is_hr === true || user?.isHr === true || isSA;
  const isHead = user?.is_head === true || user?.isHead === true;
  const isManagement = isHr || isHead;
  const userDept = user?.department;
  const userSubDept = user?.sub_department || user?.subDepartment;

  // Pagination
  const ITEMS_PER_GROUP = 6; // tasks shown per status group per page
  const [groupPages, setGroupPages] = useState({});

  const setGroupPage = (key, page) =>
    setGroupPages((prev) => ({ ...prev, [key]: page }));

  // HR Specific Toggle
  const [hrViewMode, setHrViewMode] = useState("ALL"); // "ALL" or "PERSONAL"

  // 1. Filter State (Standard)
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  // Date Picker State ([startDate, endDate])
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;

  // 2. Filter State (Management Cascading)
  // Pre-fill with user's dept/subdept if they are a HEAD, otherwise default to "ALL"
  const [deptFilter, setDeptFilter] = useState(
    isHr ? "ALL" : userDept || "ALL",
  );
  const [subDeptFilter, setSubDeptFilter] = useState(
    isHr ? "ALL" : userSubDept || "ALL",
  );
  const [employeeFilter, setEmployeeFilter] = useState("ALL");

  // --- DB DATA STATES FOR DROPDOWNS ---
  const [allEmployees, setAllEmployees] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  // 3. UI State (Pop-ups)
  const [viewTask, setViewTask] = useState(null);

  const deleteTaskMutation = useMutation({
    mutationFn: ({ id, userId }) => taskService.deleteTask(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] });
      toast.success("Task deleted.");
    },
  });

  // Fetch all employees and categories
  useEffect(() => {
    if (!isManagement) return;

    const fetchTopology = async () => {
      const employees = await employeeService.getAllEmployees();
      if (employees) setAllEmployees(employees);

      const categories = await employeeService.getAllCategories();
      if (categories) setAllCategories(categories);
    };

    fetchTopology();
  }, [isManagement]);

  // Fetch all tasks
  const fetchStrategy = isHr
    ? hrViewMode === "ALL"
      ? "all"
      : "personal"
    : isManagement
      ? "all"
      : "personal";

  const {
    data: rawTasks = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["tasks", user?.id, fetchStrategy],
    queryFn: () =>
      fetchStrategy === "all"
        ? taskService.getAllTasks()
        : taskService.getMyTasks(user?.id),
    enabled: !!user?.id,
  });

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.openTaskId && rawTasks.length > 0) {
      const targetTask = rawTasks.find(
        (t) => t.id === location.state.openTaskId,
      );
      if (targetTask) {
        queueMicrotask(() => {
          setViewTask(targetTask);
          navigate(location.pathname, { replace: true, state: {} });
        });
      }
    }
  }, [location.state, rawTasks, navigate, location.pathname]);

  const editTaskMutation = useMutation({
    mutationFn: (updatedData) =>
      taskService.updateTask(updatedData.id, updatedData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] });
      toast.success("Task updated successfully!");
    },
    onError: (error) => {
      console.error("Failed to update task:", error);
      toast.error("Database error: Could not update task.");
    },
  });

  // --- BUILD DYNAMIC DROPDOWNS ---
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
    if (!isManagement) return [];
    let pool = allEmployees.filter((e) => !e.is_super_admin);
    if (deptFilter !== "ALL")
      pool = pool.filter((e) => e.department === deptFilter);
    if (subDeptFilter !== "ALL")
      pool = pool.filter((e) => e.subDepartment === subDeptFilter);
    return pool.sort((a, b) => a.name.localeCompare(b.name));
  }, [allEmployees, deptFilter, subDeptFilter, isManagement]);

  // --- THE MASTER FILTER ENGINE ---
  const filteredEmployeesForFilters =
    isHr && hrViewMode === "PERSONAL" ? [] : allEmployees;

  const { filteredTasks: sortedAndFilteredTasks } = useTaskFilters(
    rawTasks,
    {
      searchTerm,
      statusFilter,
      priorityFilter,
      hrFilter: "ALL", // Default to ALL since standard tasks view doesn't use it yet
      startDate,
      endDate,
      deptFilter,
      subDeptFilter,
      employeeFilter,
    },
    {
      isManagement: isHr && hrViewMode === "PERSONAL" ? false : isManagement,
      allEmployees: filteredEmployeesForFilters,
    },
  );

  useEffect(() => {
    setGroupPages({});
  }, [
    searchTerm,
    statusFilter,
    priorityFilter,
    dateRange,
    deptFilter,
    subDeptFilter,
    employeeFilter,
  ]);

  // --- LOADING / ERROR STATES ---
  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-gray-9 h-[60vh]">
        <div className="w-8 h-8 border-4 border-gray-4 border-t-red-9 rounded-full animate-spin mb-4"></div>
        <p className="font-bold animate-pulse tracking-wider uppercase text-sm">
          Fetching Directory...
        </p>
      </div>
    );
  }

  if (isError)
    return (
      <div className="py-10 text-center bg-red-a2 border border-red-a5 rounded-xl">
        <p className="text-red-11 font-bold">
          Connection Error: Failed to load task directory.
        </p>
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto space-y-4 md:space-y-6 pb-20 md:pb-10">
      {/* HEADER - Smaller text on mobile */}
      <div className="px-1 md:px-0 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-4 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-12 tracking-tight">
            {isHr
              ? hrViewMode === "ALL"
                ? "Company Tasks"
                : "My Tasks"
              : isManagement
                ? "All tasks"
                : "My Tasks"}
          </h1>
          <p className="text-sm md:text-base text-gray-9 mt-1">
            {isHr
              ? hrViewMode === "ALL"
                ? "Monitor and filter company-wide task logs."
                : "Manage and filter your own personal tasks."
              : isManagement
                ? "Monitor and filter employee task logs."
                : "Manage and filter your logged tasks."}
          </p>
        </div>
        {/* HR VIEW TOGGLE */}
        {isHr && (
          <div className="flex bg-gray-2 border border-gray-4 rounded-lg overflow-hidden shrink-0">
            <button
              onClick={() => setHrViewMode("ALL")}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-r border-gray-4 ${
                hrViewMode === "ALL"
                  ? "bg-primary text-white shadow-inner"
                  : "bg-transparent text-gray-10 hover:bg-gray-3 hover:text-gray-12"
              }`}
            >
              Company
            </button>
            <button
              onClick={() => setHrViewMode("PERSONAL")}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                hrViewMode === "PERSONAL"
                  ? "bg-primary text-white shadow-inner"
                  : "bg-transparent text-gray-10 hover:bg-gray-3 hover:text-gray-12"
              }`}
            >
              My Tasks
            </button>
          </div>
        )}
      </div>

      {/* FILTER CONTROL BARS */}
      <TaskFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
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
        isManagement={isManagement}
        isHr={isHr}
        hrViewMode={hrViewMode}
        uniqueDepts={uniqueDepts}
        uniqueSubDepts={uniqueSubDepts}
        uniqueEmployees={uniqueEmployees}
      />

      {/* THE CATEGORIZED GRID — each group has its own pagination */}
      <div className="space-y-12 pb-10">
        {[
          "INCOMPLETE",
          "AWAITING_APPROVAL",
          "COMPLETE_UNVERIFIED",
          "COMPLETE_VERIFIED",
          "NOT APPROVED",
        ].map((statusKey) => {
          // All tasks that belong to this group
          const allGroupTasks = sortedAndFilteredTasks.filter((t) => {
            if (statusKey === "COMPLETE_UNVERIFIED")
              return t.status === "COMPLETE" && !t.hrVerified;
            if (statusKey === "COMPLETE_VERIFIED")
              return t.status === "COMPLETE" && t.hrVerified;
            if (statusKey === "AWAITING_APPROVAL") {
              return t.status === TASK_STATUS.AWAITING_APPROVAL;
            }
            return t.status === statusKey;
          });
          if (allGroupTasks.length === 0) return null;

          const currentGroupPage = groupPages[statusKey] || 1;
          const totalGroupPages = Math.ceil(
            allGroupTasks.length / ITEMS_PER_GROUP,
          );
          const groupTasks = allGroupTasks.slice(
            (currentGroupPage - 1) * ITEMS_PER_GROUP,
            currentGroupPage * ITEMS_PER_GROUP,
          );

          return (
            <div key={statusKey} className="space-y-4">
              {/* Group Header */}
              <div className="flex items-center gap-3 border-b border-gray-4 pb-2 px-1">
                <div
                  className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)] ${
                    statusKey === "COMPLETE_VERIFIED"
                      ? "bg-green-500"
                      : statusKey === "COMPLETE_UNVERIFIED"
                        ? "bg-emerald-400"
                        : statusKey === "AWAITING_APPROVAL"
                          ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]"
                          : statusKey === "NOT APPROVED"
                            ? "bg-red-500"
                            : "bg-amber-500"
                  }`}
                />
                <h3 className="text-[10px] font-black text-gray-9 uppercase tracking-[0.2em]">
                  {statusKey === "COMPLETE_VERIFIED"
                    ? "Verified"
                    : statusKey === "COMPLETE_UNVERIFIED"
                      ? "Completed (Unverified)"
                      : statusKey === "AWAITING_APPROVAL"
                        ? "Awaiting Approval"
                        : statusKey === "NOT APPROVED"
                          ? "Not Approved"
                          : "Pending / In Progress"}
                </h3>
                <span className="text-[10px] font-bold text-gray-8 bg-gray-2 px-2 py-0.5 rounded-full border border-gray-4 ml-auto">
                  {allGroupTasks.length} Total
                </span>
              </div>

              {/* Task Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5 items-start">
                {groupTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onView={() => setViewTask(task)}
                    onSilentUpdate={(payload) =>
                      editTaskMutation.mutateAsync(payload)
                    }
                  />
                ))}
              </div>

              {/* Per-Group Mini Pagination */}
              {totalGroupPages > 1 && (
                <div className="flex items-center justify-end gap-3 pt-1">
                  <span className="text-[10px] font-bold text-gray-8 uppercase tracking-widest">
                    Page {currentGroupPage} / {totalGroupPages}
                  </span>
                  <div className="flex gap-1">
                    <button
                      disabled={currentGroupPage === 1}
                      onClick={() =>
                        setGroupPage(statusKey, currentGroupPage - 1)
                      }
                      className="px-3 py-1 rounded bg-gray-3 border border-gray-4 text-gray-12 text-xs font-bold disabled:opacity-30 active:scale-95 transition-all"
                    >
                      ←
                    </button>
                    {/* Page number pills */}
                    {Array.from(
                      { length: totalGroupPages },
                      (_, i) => i + 1,
                    ).map((p) => (
                      <button
                        key={p}
                        onClick={() => setGroupPage(statusKey, p)}
                        className={`w-7 h-7 rounded text-xs font-bold transition-all border ${
                          p === currentGroupPage
                            ? "bg-primary text-white border-primary"
                            : "bg-gray-3 text-gray-10 border-gray-4 hover:border-gray-6"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      disabled={currentGroupPage === totalGroupPages}
                      onClick={() =>
                        setGroupPage(statusKey, currentGroupPage + 1)
                      }
                      className="px-3 py-1 rounded bg-gray-3 border border-gray-4 text-gray-12 text-xs font-bold disabled:opacity-30 active:scale-95 transition-all"
                    >
                      →
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {sortedAndFilteredTasks.length === 0 && (
          <div className="text-center py-12 md:py-20 bg-gray-2 border border-gray-4 border-dashed rounded-xl mt-4 mx-1">
            <p className="text-gray-10 font-bold text-base md:text-lg">
              No tasks found.
            </p>
            <p className="text-gray-8 text-xs md:text-sm mt-1 px-4">
              Try adjusting your filters or search term.
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
    </div>
  );
}
