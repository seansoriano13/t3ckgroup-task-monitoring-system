import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Search,
  Filter,
  Users,
  Building2,
  Calendar as CalendarIcon,
} from "lucide-react";
import TaskDetails from "../../components/TaskDetails.jsx";
import TaskCard from "../../components/TaskCard";
import { useAuth } from "../../context/AuthContext";
import { taskService } from "../../services/taskService.js";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

// --- DATE PICKER IMPORTS ---
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useTaskFilters } from "../../hooks/useTaskFilters.jsx";
import { employeeService } from "../../services/employeeService.js";

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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

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
    ? (hrViewMode === "ALL" ? "all" : "personal")
    : (isManagement ? "all" : "personal");

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
  const filteredEmployeesForFilters = isHr && hrViewMode === "PERSONAL" ? [] : allEmployees;

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
    { isManagement: isHr && hrViewMode === "PERSONAL" ? false : isManagement, allEmployees: filteredEmployeesForFilters },
  );

  // 3. Third, Paginate
  const totalPages = Math.ceil(sortedAndFilteredTasks.length / itemsPerPage);
  const paginatedTasks = sortedAndFilteredTasks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Pre-compute category totals from FULL filtered set (not paginated slice)
  const statusTotals = useMemo(() => {
    const totals = {};
    [
      "INCOMPLETE",
      "COMPLETE_UNVERIFIED",
      "COMPLETE_VERIFIED",
      "NOT APPROVED",
    ].forEach((key) => {
      totals[key] = sortedAndFilteredTasks.filter((t) => {
        if (key === "COMPLETE_UNVERIFIED")
          return t.status === "COMPLETE" && !t.hrVerified;
        if (key === "COMPLETE_VERIFIED")
          return t.status === "COMPLETE" && t.hrVerified;
        return t.status === key;
      }).length;
    });
    return totals;
  }, [sortedAndFilteredTasks]);

  useEffect(() => {
    queueMicrotask(() => setCurrentPage(1));
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
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-r border-gray-4 ${hrViewMode === "ALL"
                ? "bg-primary text-white shadow-inner"
                : "bg-transparent text-gray-10 hover:bg-gray-3 hover:text-gray-12"
                }`}
            >
              Company
            </button>
            <button
              onClick={() => setHrViewMode("PERSONAL")}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${hrViewMode === "PERSONAL"
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
      <div className="grid gap-3 md:gap-4">
        {/* Row 1: Search & Base Filters */}
        <div className="border border-gray-4 p-3 md:p-4 rounded-xl flex flex-col lg:flex-row gap-3 md:gap-4  relative z-20">
          {/* Search - Grows to fill space */}
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-8"
              size={18}
            />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-1 border border-gray-4 text-gray-12 rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-primary transition-colors placeholder:text-gray-7 text-sm md:text-base"
            />
          </div>

          {/* Date & Selects Group */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* DATE PICKER - Full width on mobile */}
            <div className="relative flex-1 sm:flex-initial">
              <div className="flex items-center bg-gray-1 border border-gray-4 rounded-lg px-3 py-2.5 h-[46px]">
                <CalendarIcon size={16} className="text-gray-8 mr-2 shrink-0" />
                <DatePicker
                  selectsRange={true}
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(update) => setDateRange(update)}
                  isClearable={true}
                  placeholderText="Date Range"
                  className="bg-transparent outline-none text-gray-12 w-full sm:w-[150px] text-sm cursor-pointer"
                />
              </div>
            </div>

            {/* Status & Priority - Side by side on small screens */}
            <div className="flex gap-2 flex-1 sm:flex-initial">
              <div className="relative flex-1">
                <Filter
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-8"
                  size={14}
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full appearance-none bg-gray-1 border border-gray-4 text-gray-12 rounded-lg pl-8 pr-4 py-2.5 outline-none text-xs md:text-sm h-[46px]"
                >
                  <option value="ALL">Status</option>
                  <option value="COMPLETE">Complete</option>
                  <option value="INCOMPLETE">Incomplete</option>
                  <option value="NOT APPROVED">Not Approved</option>
                </select>
              </div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="flex-1 appearance-none bg-gray-1 border border-gray-4 text-gray-12 rounded-lg px-3 py-2.5 outline-none text-xs md:text-sm h-[46px]"
              >
                <option value="ALL">Priority</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Management Filters - 1 Column on Mobile, 3 on Tablet */}
        {isManagement && (!isHr || hrViewMode === "ALL") && (
          <div className="bg-gray-1 border border-gray-4 p-4 rounded-xl  grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 relative z-10">
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-10 uppercase tracking-widest">
                <Building2 size={12} /> Dept
              </label>
              <select
                value={deptFilter}
                onChange={(e) => {
                  setDeptFilter(e.target.value);
                  setSubDeptFilter("ALL");
                }}
                disabled={!isHr}
                className="w-full bg-gray-2 border border-gray-4 text-gray-12 rounded-lg p-2.5 text-sm disabled:opacity-50"
              >
                <option value="ALL">All Depts</option>
                {uniqueDepts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-10 uppercase tracking-widest">
                <Building2 size={12} /> Sub-Dept
              </label>
              <select
                value={subDeptFilter}
                onChange={(e) => setSubDeptFilter(e.target.value)}
                disabled={deptFilter === "ALL"}
                className="w-full bg-gray-2 border border-gray-4 text-gray-12 rounded-lg p-2.5 text-sm disabled:opacity-50"
              >
                <option value="ALL">All Sub-Depts</option>
                {uniqueSubDepts.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2 md:col-span-1">
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest">
                <Users size={12} /> Team Member
              </label>
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="w-full bg-gray-2 border border-gray-4 text-gray-12 rounded-lg p-2.5 font-semibold text-sm"
              >
                <option value="ALL">Everyone</option>
                {uniqueEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* THE CATEGORIZED GRID */}
      <div className="space-y-12 pb-10">
        {[
          "INCOMPLETE",
          "COMPLETE_UNVERIFIED",
          "COMPLETE_VERIFIED",
          "NOT APPROVED",
        ].map((statusKey) => {
          const statusTasks = paginatedTasks.filter((t) => {
            if (statusKey === "COMPLETE_UNVERIFIED")
              return t.status === "COMPLETE" && !t.hrVerified;
            if (statusKey === "COMPLETE_VERIFIED")
              return t.status === "COMPLETE" && t.hrVerified;
            return t.status === statusKey;
          });
          if (statusTasks.length === 0) return null;

          return (
            <div key={statusKey} className="space-y-4">
              <div className="flex items-center gap-3 border-b border-gray-4 pb-2 px-1">
                <div
                  className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)] ${statusKey === "COMPLETE_VERIFIED"
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
                    ? "Verified"
                    : statusKey === "COMPLETE_UNVERIFIED"
                      ? "Completed (Unverified)"
                      : statusKey === "NOT APPROVED"
                        ? "Not Approved"
                        : "Pending / In Progress"}
                </h3>
                <span className="text-[10px] font-bold text-gray-8 bg-gray-2 px-2 py-0.5 rounded-full border border-gray-4 ml-auto">
                  {statusTotals[statusKey]} Total
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
                {statusTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onView={() => setViewTask(task)}
                    onSilentUpdate={(payload) => editTaskMutation.mutateAsync(payload)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {paginatedTasks.length === 0 && (
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

      {/* PAGINATION - Stacked buttons on tiny screens */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-4 mb-10">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              className="flex-1 sm:flex-none px-6 py-2 bg-gray-3 border border-gray-4 rounded-lg text-gray-12 font-bold disabled:opacity-30 active:scale-95 transition-all"
            >
              Prev
            </button>
            <span className="sm:hidden text-gray-11 font-bold text-xs uppercase">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="flex-1 sm:flex-none px-6 py-2 bg-gray-3 border border-gray-4 rounded-lg text-gray-12 font-bold disabled:opacity-30 active:scale-95 transition-all"
            >
              Next
            </button>
          </div>
          <span className="hidden sm:block text-gray-11 font-bold text-sm uppercase tracking-widest">
            Page {currentPage} of {totalPages}
          </span>
        </div>
      )}
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
