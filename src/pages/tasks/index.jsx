import { useState, useEffect, useMemo } from "react";
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
import { supabase } from "../../lib/supabase.js";

// --- DATE PICKER IMPORTS ---
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function TasksPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // --- ROLE CHECKS ---
  const isHr = user?.is_hr === true || user?.isHr === true;
  const isHead = user?.is_head === true || user?.isHead === true;
  const isManagement = isHr || isHead;
  const userDept = user?.department;
  const userSubDept = user?.sub_department || user?.subDepartment;

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

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

  // 🔥 FETCH DROPDOWN DATA (Topology)
  // We fetch this directly so the dropdowns populate even if no tasks exist yet
  useEffect(() => {
    if (!isManagement) return;

    const fetchTopology = async () => {
      const { data: emps } = await supabase
        .from("employees")
        .select("id, name, department, sub_department");
      if (emps) setAllEmployees(emps);

      const { data: cats } = await supabase
        .from("categories")
        .select("department, sub_department");
      if (cats) setAllCategories(cats);
    };

    fetchTopology();
  }, [isManagement]);

  // 🔥 THE DYNAMIC READ ENGINE
  const {
    data: rawTasks = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["tasks", user?.id, isManagement ? "all" : "personal"],
    queryFn: () =>
      isManagement
        ? taskService.getAllTasks()
        : taskService.getMyTasks(user?.id),
    enabled: !!user?.id,
  });

  // THE WRITE ENGINE
  const editTaskMutation = useMutation({
    mutationFn: (updatedData) =>
      taskService.updateTask(updatedData.id, updatedData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
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
      ...new Set(filteredCats.map((c) => c.sub_department).filter(Boolean)),
    ].sort();
  }, [allCategories, deptFilter]);

  const uniqueEmployees = useMemo(() => {
    if (!isManagement) return [];
    let pool = allEmployees;
    if (deptFilter !== "ALL")
      pool = pool.filter((e) => e.department === deptFilter);
    if (subDeptFilter !== "ALL")
      pool = pool.filter((e) => e.sub_department === subDeptFilter);
    return pool.sort((a, b) => a.name.localeCompare(b.name));
  }, [allEmployees, deptFilter, subDeptFilter, isManagement]);

  // --- THE MASTER FILTER ENGINE ---
  const sortedAndFilteredTasks = useMemo(() => {
    // 1. First, Filter
    const filtered = rawTasks.filter((task) => {
      const desc = task.taskDescription || "";
      const cat = task.categoryId || "";

      const matchesSearch =
        desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "ALL" || task.status === statusFilter;
      const matchesPriority =
        priorityFilter === "ALL" || task.priority === priorityFilter;

      let matchesDate = true;
      if (startDate && endDate) {
        const taskDate = new Date(task.createdAt);
        const filterStart = new Date(startDate).setHours(0, 0, 0, 0);
        const filterEnd = new Date(endDate).setHours(23, 59, 59, 999);
        matchesDate = taskDate >= filterStart && taskDate <= filterEnd;
      }

      let matchesDept = true,
        matchesSubDept = true,
        matchesEmployee = true;
      if (isManagement) {
        const taskOwner = allEmployees.find((e) => e.id === task.loggedById);
        if (deptFilter !== "ALL")
          matchesDept = taskOwner?.department === deptFilter;
        if (subDeptFilter !== "ALL")
          matchesSubDept = taskOwner?.sub_department === subDeptFilter;
        if (employeeFilter !== "ALL")
          matchesEmployee = task.loggedById === employeeFilter;
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesDate &&
        matchesDept &&
        matchesSubDept &&
        matchesEmployee
      );
    });

    // 2. Second, Sort (Strict Hierarchy)
    return filtered.sort((a, b) => {
      // Rule A: Put COMPLETE tasks at the very bottom
      if (a.status === "COMPLETE" && b.status !== "COMPLETE") return 1;
      if (a.status !== "COMPLETE" && b.status === "COMPLETE") return -1;

      // Rule B: Sort by Priority (High > Medium > Low)
      const priorityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const weightA = priorityWeight[a.priority] || 0;
      const weightB = priorityWeight[b.priority] || 0;

      if (weightA !== weightB) return weightB - weightA;

      // Rule C: Sort by Newest Created
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [
    rawTasks,
    searchTerm,
    statusFilter,
    priorityFilter,
    startDate,
    endDate,
    deptFilter,
    subDeptFilter,
    employeeFilter,
    allEmployees,
    isManagement,
  ]);

  // 3. Third, Paginate
  const totalPages = Math.ceil(sortedAndFilteredTasks.length / itemsPerPage);
  const paginatedTasks = sortedAndFilteredTasks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  useEffect(() => {
    setCurrentPage(1);
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-gray-12">
          {isManagement ? "Team Task Directory" : "Task Directory"}
        </h1>
        <p className="text-gray-9 mt-1">
          {isManagement
            ? "Monitor and filter employee task logs."
            : "Manage and filter your logged tasks."}
        </p>
      </div>

      {/* FILTER CONTROL BARS */}
      <div className="grid gap-4">
        {/* Row 1: The Standard Filters + Date Picker */}
        <div className="bg-gray-2 border border-gray-4 p-4 rounded-xl flex flex-col xl:flex-row gap-4 shadow-sm relative z-20">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-8"
              size={18}
            />
            <input
              type="text"
              placeholder="Search description or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-1 border border-gray-4 text-gray-12 rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-red-9 transition-colors placeholder:text-gray-7"
            />
          </div>

          {/* DATE PICKER */}
          <div className="relative z-50">
            <div className="flex items-center bg-gray-1 border border-gray-4 rounded-lg px-3 py-2.5 focus-within:border-red-9 transition-colors h-[46px]">
              <CalendarIcon size={16} className="text-gray-8 mr-2 shrink-0" />
              <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => setDateRange(update)}
                isClearable={true}
                placeholderText="Filter Date Range..."
                className="bg-transparent outline-none text-gray-12 w-[190px] text-sm cursor-pointer"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="relative">
              <Filter
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-8"
                size={16}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-gray-1 border border-gray-4 text-gray-12 rounded-lg pl-9 pr-8 py-2.5 outline-none focus:border-red-9 transition-colors cursor-pointer text-sm h-[46px]"
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLETE">Complete</option>
                <option value="INCOMPLETE">Incomplete</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="appearance-none bg-gray-1 border border-gray-4 text-gray-12 rounded-lg px-4 py-2.5 outline-none focus:border-red-9 transition-colors cursor-pointer text-sm h-[46px]"
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>
        </div>

        {/* Row 2: Management Filters (Only visible to HR & HEAD) */}
        {isManagement && (
          <div className="bg-gray-1 border border-primary/30 p-4 rounded-xl shadow-inner flex flex-col md:flex-row gap-4 relative z-10">
            <div className="flex-1">
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-10 uppercase tracking-wider mb-1">
                <Building2 size={12} /> Department
              </label>
              <select
                value={deptFilter}
                onChange={(e) => {
                  setDeptFilter(e.target.value);
                  setSubDeptFilter("ALL"); // Cascading reset
                  setEmployeeFilter("ALL");
                }}
                disabled={!isHr} // 👈 HEAD cannot change this!
                className="w-full bg-gray-2 border border-gray-4 text-gray-12 rounded-lg p-2.5 outline-none focus:border-red-9 transition-colors text-sm disabled:opacity-50"
              >
                <option value="ALL">All Departments</option>
                {uniqueDepts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-10 uppercase tracking-wider mb-1">
                <Building2 size={12} /> Sub-Department
              </label>
              <select
                value={subDeptFilter}
                onChange={(e) => {
                  setSubDeptFilter(e.target.value);
                  setEmployeeFilter("ALL");
                }}
                disabled={!isHr || deptFilter === "ALL"} // 👈 HEAD cannot change this!
                className="w-full bg-gray-2 border border-gray-4 text-gray-12 rounded-lg p-2.5 outline-none focus:border-red-9 transition-colors text-sm disabled:opacity-50"
              >
                <option value="ALL">All Sub-Departments</option>
                {uniqueSubDepts.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
                <Users size={12} /> Employee
              </label>
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="w-full bg-gray-2 border border-gray-4 text-gray-12 rounded-lg p-2.5 outline-none focus:border-red-9 transition-colors font-semibold text-sm"
              >
                <option value="ALL">All Team Members</option>
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

      {/* THE GRID */}
      {paginatedTasks.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-4 relative z-0">
            {paginatedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onView={() => setViewTask(task)}
              />
            ))}
          </div>

          {/* PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-10 pb-10">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
                className="px-4 py-2 bg-gray-3 border border-gray-4 rounded-lg text-gray-12 font-bold disabled:opacity-30 hover:bg-gray-4 transition-colors"
              >
                Previous
              </button>
              <span className="text-gray-11 font-bold text-sm uppercase tracking-widest">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="px-4 py-2 bg-gray-3 border border-gray-4 rounded-lg text-gray-12 font-bold disabled:opacity-30 hover:bg-gray-4 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 bg-gray-2 border border-gray-4 border-dashed rounded-xl mt-4">
          <p className="text-gray-10 font-bold text-lg">No tasks found.</p>
          <p className="text-gray-8 text-sm mt-1">
            Try adjusting your filters or search term.
          </p>
        </div>
      )}

      {/* THE POP-UPS */}
      <TaskDetails
        isOpen={!!viewTask}
        onClose={() => setViewTask(null)}
        task={viewTask}
        // 👇 Change to mutateAsync so the modal can 'await' the loading state!
        onUpdateTask={(updatedTask) =>
          editTaskMutation.mutateAsync(updatedTask)
        }
      />
    </div>
  );
}
