import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "../../../components/ProtectedRoute.jsx";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { taskActivityService } from "../../../services/tasks/taskActivityService";
import { taskService } from "../../../services/taskService";
import { employeeService } from "../../../services/employeeService";
import TaskDetails from "../../../components/TaskDetails.jsx";
import toast from "react-hot-toast";
import {
  ShieldCheck,
  MessageCircle,
  Zap,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";

const PAGE_SIZE = 50;

function typeIcon(type) {
  if (type === "APPROVAL") return ShieldCheck;
  if (type === "HR_NOTE") return ShieldCheck;
  if (type === "COMMENT") return MessageCircle;
  return Zap;
}

function formatWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SuperAdminActivityLogPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const [filters, setFilters] = useState({
    type: "ALL",
    authorId: "ALL",
    employeeId: "ALL",
    taskStatus: "ALL",
    dept: "ALL",
    subDept: "ALL",
    dateFrom: "",
    dateTo: "",
    search: "",
  });

  const offset = useMemo(() => page * PAGE_SIZE, [page]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(0);
  }, [
    filters.type,
    filters.authorId,
    filters.employeeId,
    filters.taskStatus,
    filters.dept,
    filters.subDept,
    filters.dateFrom,
    filters.dateTo,
    filters.search,
  ]);

  const { data: employees = [] } = useQuery({
    queryKey: ["allEmployees"],
    queryFn: () => employeeService.getAllEmployees(),
  });

  const { data: entries = [], isLoading, isError, error } = useQuery({
    queryKey: ["superAdminActivityLog", offset, filters],
    queryFn: () =>
      taskActivityService.getRecentTaskActivity({
        limit: PAGE_SIZE,
        offset,
        type: filters.type,
        authorId: filters.authorId,
        employeeId: filters.employeeId,
        taskStatus: filters.taskStatus,
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom).toISOString() : null,
        dateTo: filters.dateTo ? new Date(filters.dateTo).toISOString() : null,
        search: filters.search,
      }),
    staleTime: 15_000,
  });

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (filters.dept !== "ALL" && (e.taskCreatorDept || "") !== filters.dept)
        return false;
      if (
        filters.subDept !== "ALL" &&
        (e.taskCreatorSubDept || "") !== filters.subDept
      )
        return false;
      return true;
    });
  }, [entries, filters.dept, filters.subDept]);

  const uniqueDepts = useMemo(() => {
    const s = new Set(["ALL"]);
    employees.forEach((e) => {
      const d = e.department;
      if (typeof d === "string" && d.trim()) s.add(d);
    });
    return Array.from(s).sort();
  }, [employees]);

  const uniqueSubDepts = useMemo(() => {
    const s = new Set(["ALL"]);
    const pool =
      filters.dept === "ALL"
        ? employees
        : employees.filter((e) => e.department === filters.dept);
    pool.forEach((e) => {
      const sd = e.subDepartment;
      if (typeof sd === "string" && sd.trim()) s.add(sd);
    });
    return Array.from(s).sort();
  }, [employees, filters.dept]);

  const { data: selectedTask } = useQuery({
    queryKey: ["taskById", selectedTaskId],
    queryFn: () => taskService.getTaskById(selectedTaskId),
    enabled: !!selectedTaskId,
  });

  const updateTaskMutation = useMutation({
    mutationFn: (payload) => taskService.updateTask(payload.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superAdminActivityLog"] });
      queryClient.invalidateQueries({ queryKey: ["taskById", selectedTaskId] });
      toast.success("Task updated.");
    },
    onError: (err) => toast.error(err?.message || "Failed to update task."),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: ({ taskId, userId }) => taskService.deleteTask(taskId, userId),
    onSuccess: () => {
      toast.success("Task deleted.");
      setSelectedTaskId(null);
      queryClient.invalidateQueries({ queryKey: ["superAdminActivityLog"] });
    },
    onError: (err) => toast.error(err?.message || "Failed to delete task."),
  });

  return (
    <ProtectedRoute requireSuperAdmin={true}>
      <div className="max-w-6xl mx-auto space-y-5 px-2">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-gray-4 pb-4">
          <div>
            <p className="text-[10px] font-black text-purple-500 uppercase tracking-[0.2em] mb-1">
              Super Admin
            </p>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-12">
              Activity Log
            </h1>
            <p className="text-gray-9 mt-1 font-medium text-sm">
              Recent task timeline events across the system.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-2 rounded-lg bg-gray-2 border border-gray-4 text-gray-11 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-3 transition-colors flex items-center gap-1.5"
            >
              <ChevronLeft size={16} /> Newer
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={entries.length < PAGE_SIZE}
              className="px-3 py-2 rounded-lg bg-gray-2 border border-gray-4 text-gray-11 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-3 transition-colors flex items-center gap-1.5"
            >
              Older <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-1 border border-gray-4 rounded-xl p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-9" />
              <span className="text-xs font-black text-gray-9 uppercase tracking-widest">
                Filters
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                setFilters({
                  type: "ALL",
                  authorId: "ALL",
                  employeeId: "ALL",
                  taskStatus: "ALL",
                  dept: "ALL",
                  subDept: "ALL",
                  dateFrom: "",
                  dateTo: "",
                  search: "",
                })
              }
              className="px-3 py-2 rounded-lg bg-gray-2 border border-gray-4 text-gray-11 font-bold text-xs hover:bg-gray-3 transition-colors flex items-center gap-1.5"
            >
              <X size={14} /> Clear
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            <input
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              placeholder="Search content or task description…"
              className="w-full bg-gray-2 border border-gray-4 rounded-lg px-3 py-2.5 text-sm text-gray-12 outline-none focus:border-primary/50"
            />

            <select
              value={filters.type}
              onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))}
              className="w-full bg-gray-2 border border-gray-4 rounded-lg px-3 py-2.5 text-sm text-gray-12 outline-none focus:border-primary/50"
            >
              <option value="ALL">All Types</option>
              <option value="SYSTEM">SYSTEM</option>
              <option value="COMMENT">COMMENT</option>
              <option value="APPROVAL">APPROVAL</option>
              <option value="HR_NOTE">HR_NOTE</option>
            </select>

            <select
              value={filters.taskStatus}
              onChange={(e) =>
                setFilters((p) => ({ ...p, taskStatus: e.target.value }))
              }
              className="w-full bg-gray-2 border border-gray-4 rounded-lg px-3 py-2.5 text-sm text-gray-12 outline-none focus:border-primary/50"
            >
              <option value="ALL">All Task Status</option>
              <option value="INCOMPLETE">INCOMPLETE</option>
              <option value="AWAITING APPROVAL">AWAITING APPROVAL</option>
              <option value="COMPLETE">COMPLETE</option>
              <option value="NOT APPROVED">NOT APPROVED</option>
              <option value="DELETED">DELETED</option>
            </select>

            <select
              value={filters.authorId}
              onChange={(e) =>
                setFilters((p) => ({ ...p, authorId: e.target.value }))
              }
              className="w-full bg-gray-2 border border-gray-4 rounded-lg px-3 py-2.5 text-sm text-gray-12 outline-none focus:border-primary/50"
            >
              <option value="ALL">All Actors (Author)</option>
              <option value="SYSTEM">System</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>

            <select
              value={filters.employeeId}
              onChange={(e) =>
                setFilters((p) => ({ ...p, employeeId: e.target.value }))
              }
              className="w-full bg-gray-2 border border-gray-4 rounded-lg px-3 py-2.5 text-sm text-gray-12 outline-none focus:border-primary/50"
            >
              <option value="ALL">All Employees (Task Owner)</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>

            <select
              value={filters.dept}
              onChange={(e) =>
                setFilters((p) => ({ ...p, dept: e.target.value, subDept: "ALL" }))
              }
              className="w-full bg-gray-2 border border-gray-4 rounded-lg px-3 py-2.5 text-sm text-gray-12 outline-none focus:border-primary/50"
            >
              {uniqueDepts.map((d) => (
                <option key={d} value={d}>
                  {d === "ALL" ? "All Departments" : d}
                </option>
              ))}
            </select>

            <select
              value={filters.subDept}
              onChange={(e) => setFilters((p) => ({ ...p, subDept: e.target.value }))}
              className="w-full bg-gray-2 border border-gray-4 rounded-lg px-3 py-2.5 text-sm text-gray-12 outline-none focus:border-primary/50"
            >
              {uniqueSubDepts.map((s) => (
                <option key={s} value={s}>
                  {s === "ALL" ? "All Sub-Departments" : s}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))}
              className="w-full bg-gray-2 border border-gray-4 rounded-lg px-3 py-2.5 text-sm text-gray-12 outline-none focus:border-primary/50"
              title="From date"
            />

            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))}
              className="w-full bg-gray-2 border border-gray-4 rounded-lg px-3 py-2.5 text-sm text-gray-12 outline-none focus:border-primary/50"
              title="To date"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-gray-9 font-bold">
            Loading activity…
          </div>
        ) : isError ? (
          <div className="py-10 px-6 rounded-xl border border-red-a5 bg-red-a2">
            <p className="text-red-11 font-black">Failed to load activity.</p>
            <p className="text-red-11/80 text-sm mt-1">
              {error?.message || "Unknown error"}
            </p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-16 text-center text-gray-9">
            No activity found.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((e) => {
              const Icon = typeIcon(e.type);
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setSelectedTaskId(e.taskId)}
                  className="w-full text-left bg-gray-1 border border-gray-4 rounded-xl p-4 hover:border-gray-6 hover:bg-gray-2/40 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-2 border border-gray-4 flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-gray-10" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-black text-gray-9 uppercase tracking-widest truncate">
                          {e.type || "SYSTEM"}
                        </p>
                        <p className="text-[11px] text-gray-8 font-bold shrink-0">
                          {formatWhen(e.createdAt)}
                        </p>
                      </div>

                      <p className="text-sm text-gray-12 font-bold mt-1 line-clamp-1">
                        {e.taskDescription || `Task ${e.taskId}`}
                      </p>

                      <p className="text-sm text-gray-11 mt-1 line-clamp-2">
                        {e.content || "(no message)"}
                      </p>

                      <div className="flex items-center gap-2 mt-2 text-[11px] font-bold text-gray-8 uppercase tracking-wider">
                        <span>
                          By: {e.authorName || "System"}
                        </span>
                        {e.taskStatus && (
                          <span className="px-2 py-0.5 rounded-full bg-gray-2 border border-gray-4 text-gray-9">
                            {e.taskStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Task modal in-place */}
      <TaskDetails
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        task={selectedTask}
        onUpdateTask={(payload) => updateTaskMutation.mutate(payload)}
        onDeleteTask={(taskId, userId) =>
          deleteTaskMutation.mutate({ taskId, userId })
        }
      />
    </ProtectedRoute>
  );
}

