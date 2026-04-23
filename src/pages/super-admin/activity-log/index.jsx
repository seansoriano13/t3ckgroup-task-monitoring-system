import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import ProtectedRoute from "../../../components/ProtectedRoute.jsx";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { taskActivityService } from "../../../services/tasks/taskActivityService";
import { taskService } from "../../../services/taskService";
import { employeeService } from "../../../services/employeeService";
import TaskDetails from "../../../components/TaskDetails.jsx";
import { LOG_TASK_SELECT_STYLES } from "../../../constants/task";
import toast from "react-hot-toast";
import {
  activityLogClassNames,
  portalStyles,
} from "../../../styles/selectStyles";
import {
  ShieldCheck,
  MessageCircle,
  Zap,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Search,
  Calendar,
  Activity,
  Clock,
  ChevronDown,
  CheckSquare,
  Square,
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

function getInitials(name) {
  if (!name || name === "System") return "SY";
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// ── Checklist Parser ──────────────────────────────────────────────────────────
function tryParseChecklist(str) {
  if (!str) return null;
  try {
    const trimmed = str.trim();
    if (!trimmed.startsWith("[")) return null;
    let parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
      parsed = parsed[0];
    }
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object" && "text" in parsed[0]) {
      return parsed;
    }
  // eslint-disable-next-line no-empty, no-unused-vars
  } catch (e) {}
  return null;
}

// ── ContentDisplay ────────────────────────────────────────────────────────────
function ContentDisplay({ content }) {
  if (!content) return <span className="italic opacity-70">(no message)</span>;
  
  const parsedChecklist = tryParseChecklist(content);



  if (parsedChecklist) {
    const displayItems = parsedChecklist.slice(0, 4);
    const remaining = parsedChecklist.length - 4;
    
    return (
      <div className="space-y-1.5 mt-2 flex flex-col">
        {displayItems.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
            {item.checked ? (
              <CheckSquare size={13} className="shrink-0 text-primary mt-[2px]" />
            ) : (
              <Square size={13} className="shrink-0 text-muted-foreground/40 mt-[2px]" />
            )}
            <span className={`${item.checked ? "line-through opacity-60" : ""} break-words leading-snug line-clamp-2`}>
              {item.text}
            </span>
          </div>
        ))}
        {remaining > 0 && (
          <div className="text-[10px] font-bold text-muted-foreground/60 pl-[22px] pt-0.5 uppercase tracking-wider">
            + {remaining} more item{remaining !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    );
  }

  return <span className="line-clamp-2 leading-relaxed">{content}</span>;
}

// ── FieldBox — mirrors LogTaskAssignmentBar's label+container pattern ────────
function FieldBox({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-muted shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="h-2.5 w-16 bg-muted rounded-full" />
            <div className="h-2.5 w-28 bg-muted rounded-full" />
          </div>
          <div className="h-4 w-3/4 bg-muted rounded-full" />
          <div className="h-3 w-full bg-muted rounded-full" />
          <div className="h-3 w-2/3 bg-muted rounded-full" />
          <div className="flex items-center gap-2 pt-1">
            <div className="h-5 w-5 bg-muted rounded-full" />
            <div className="h-3 w-20 bg-muted rounded-full" />
            <div className="h-5 w-16 bg-muted rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  PAGE COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
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
    dateFrom: null,
    dateTo: null,
    search: "",
  });

  const offset = useMemo(() => page * PAGE_SIZE, [page]);

  useEffect(() => {
    queueMicrotask(() => setPage(0));
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

  const {
    data: entries = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["superAdminActivityLog", offset, filters],
    queryFn: () =>
      taskActivityService.getRecentTaskActivity({
        limit: PAGE_SIZE,
        offset,
        type: filters.type,
        authorId: filters.authorId,
        employeeId: filters.employeeId,
        taskStatus: filters.taskStatus,
        dateFrom: filters.dateFrom
          ? new Date(filters.dateFrom).toISOString()
          : null,
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
      if (typeof e.department === "string" && e.department.trim())
        s.add(e.department);
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
      if (typeof e.subDepartment === "string" && e.subDepartment.trim())
        s.add(e.subDepartment);
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

  const hasActiveFilters =
    filters.type !== "ALL" ||
    filters.authorId !== "ALL" ||
    filters.employeeId !== "ALL" ||
    filters.taskStatus !== "ALL" ||
    filters.dept !== "ALL" ||
    filters.subDept !== "ALL" ||
    filters.dateFrom !== null ||
    filters.dateTo !== null ||
    filters.search !== "";

  const clearFilters = () =>
    setFilters({
      type: "ALL",
      authorId: "ALL",
      employeeId: "ALL",
      taskStatus: "ALL",
      dept: "ALL",
      subDept: "ALL",
      dateFrom: null,
      dateTo: null,
      search: "",
    });

  // Date input style — matches LogTaskModal inner fields
  const dateCls =
    "w-full bg-gray-1 border border-gray-4 rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-gray-6 transition-colors hover:border-gray-5 cursor-pointer";

  return (
    <ProtectedRoute requireSuperAdmin={true}>
      <div className="max-w-6xl mx-auto space-y-5 px-2 pb-10">
        {/* ── Header — same eyebrow pattern as LogTaskHeader ─────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-3/40 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
              Activity Log
            </h1>
            <p className="text-muted-foreground mt-1 font-medium text-sm">
              Recent task timeline events across the system.
            </p>
          </div>

          {/* Pagination — styled like LogTaskFooter action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-muted-foreground font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted hover:text-foreground transition-colors"
            >
              <ChevronLeft size={14} /> Newer
            </button>
            {page > 0 && (
              <span className="text-[11px] font-bold text-muted-foreground px-1">
                Page {page + 1}
              </span>
            )}
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={entries.length < PAGE_SIZE}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-muted-foreground font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted hover:text-foreground transition-colors"
            >
              Older <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* ── Filter Panel — mirrors LogTaskPropertyBar container ─────── */}
        <div className="bg-card border border-border rounded-2xl shadow-sm">
          {/* Panel top bar — matches LogTaskHeader strip */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-3/40 bg-muted/30">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="w-[18px] h-[18px] rounded flex items-center justify-center bg-muted border border-border shrink-0">
                <Filter size={10} className="text-muted-foreground" />
              </div>
              <ChevronDown size={11} className="text-gray-6 -rotate-90" />
              <span className="font-medium text-muted-foreground/80">
                Filters
              </span>
              {hasActiveFilters && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                  Active
                </span>
              )}
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-foreground transition-colors"
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>

          {/* Filter fields — react-select matching LogTaskAssignmentBar exactly */}
          <div className="px-4 py-3.5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-4">
            {/* Search — spans 2 cols */}
            <div className="lg:col-span-2">
              <FieldBox label="Search">
                <div className="relative flex items-center">
                  <Search
                    size={13}
                    className="absolute left-3 text-gray-7 pointer-events-none shrink-0"
                  />
                  <input
                    value={filters.search}
                    onChange={(e) =>
                      setFilters((p) => ({ ...p, search: e.target.value }))
                    }
                    placeholder="Search content or task description…"
                    className="w-full bg-gray-1 border border-gray-4 rounded-lg pl-8 pr-3 py-2 text-xs text-gray-12 outline-none focus:border-gray-6 hover:border-gray-5 transition-colors placeholder:text-gray-7"
                  />
                </div>
              </FieldBox>
            </div>

            <FieldBox label="Type">
              <Select
                options={[
                  { value: "ALL", label: "All Types" },
                  { value: "SYSTEM", label: "SYSTEM" },
                  { value: "COMMENT", label: "COMMENT" },
                  { value: "APPROVAL", label: "APPROVAL" },
                  { value: "HR_NOTE", label: "HR_NOTE" },
                ]}
                value={
                  filters.type === "ALL"
                    ? { value: "ALL", label: "All Types" }
                    : { value: filters.type, label: filters.type }
                }
                onChange={(opt) =>
                  setFilters((p) => ({ ...p, type: opt?.value || "ALL" }))
                }
                placeholder="All Types"
                classNamePrefix="react-select"
                classNames={activityLogClassNames}
                styles={portalStyles}
                unstyled
                isClearable={filters.type !== "ALL"}
                menuPortalTarget={document.body}
                menuShouldBlockScroll={false}
              />
            </FieldBox>

            <FieldBox label="Task Status">
              <Select
                options={[
                  { value: "ALL", label: "All Statuses" },
                  { value: "INCOMPLETE", label: "INCOMPLETE" },
                  { value: "AWAITING APPROVAL", label: "AWAITING APPROVAL" },
                  { value: "COMPLETE", label: "COMPLETE" },
                  { value: "NOT APPROVED", label: "NOT APPROVED" },
                  { value: "DELETED", label: "DELETED" },
                ]}
                value={
                  filters.taskStatus === "ALL"
                    ? { value: "ALL", label: "All Statuses" }
                    : { value: filters.taskStatus, label: filters.taskStatus }
                }
                onChange={(opt) =>
                  setFilters((p) => ({ ...p, taskStatus: opt?.value || "ALL" }))
                }
                placeholder="All Statuses"
                classNamePrefix="react-select"
                classNames={activityLogClassNames}
                styles={portalStyles}
                unstyled
                isClearable={filters.taskStatus !== "ALL"}
                menuPortalTarget={document.body}
                menuShouldBlockScroll={false}
              />
            </FieldBox>

            <FieldBox label="Author (Actor)">
              <Select
                options={[
                  { value: "ALL", label: "All Actors" },
                  { value: "SYSTEM", label: "System" },
                  ...employees.map((emp) => ({
                    value: emp.id,
                    label: emp.name,
                  })),
                ]}
                value={
                  filters.authorId === "ALL"
                    ? { value: "ALL", label: "All Actors" }
                    : employees.find((e) => e.id === filters.authorId)
                      ? {
                          value: filters.authorId,
                          label: employees.find(
                            (e) => e.id === filters.authorId,
                          )?.name,
                        }
                      : { value: "SYSTEM", label: "System" }
                }
                onChange={(opt) =>
                  setFilters((p) => ({ ...p, authorId: opt?.value || "ALL" }))
                }
                placeholder="All Actors"
                classNamePrefix="react-select"
                classNames={activityLogClassNames}
                styles={portalStyles}
                unstyled
                isClearable={filters.authorId !== "ALL"}
                isSearchable
                menuPortalTarget={document.body}
                menuShouldBlockScroll={false}
              />
            </FieldBox>

            <FieldBox label="Task Owner">
              <Select
                options={[
                  { value: "ALL", label: "All Employees" },
                  ...employees.map((emp) => ({
                    value: emp.id,
                    label: emp.name,
                  })),
                ]}
                value={
                  filters.employeeId === "ALL"
                    ? { value: "ALL", label: "All Employees" }
                    : {
                        value: filters.employeeId,
                        label:
                          employees.find((e) => e.id === filters.employeeId)
                            ?.name || filters.employeeId,
                      }
                }
                onChange={(opt) =>
                  setFilters((p) => ({ ...p, employeeId: opt?.value || "ALL" }))
                }
                placeholder="All Employees"
                classNamePrefix="react-select"
                classNames={activityLogClassNames}
                styles={portalStyles}
                unstyled
                isClearable={filters.employeeId !== "ALL"}
                isSearchable
                menuPortalTarget={document.body}
                menuShouldBlockScroll={false}
              />
            </FieldBox>

            <FieldBox label="Department">
              <Select
                options={uniqueDepts.map((d) => ({
                  value: d,
                  label: d === "ALL" ? "All Departments" : d,
                }))}
                value={{
                  value: filters.dept,
                  label:
                    filters.dept === "ALL" ? "All Departments" : filters.dept,
                }}
                onChange={(opt) =>
                  setFilters((p) => ({
                    ...p,
                    dept: opt?.value || "ALL",
                    subDept: "ALL",
                  }))
                }
                placeholder="All Departments"
                classNamePrefix="react-select"
                classNames={activityLogClassNames}
                styles={portalStyles}
                unstyled
                isClearable={filters.dept !== "ALL"}
                menuPortalTarget={document.body}
                menuShouldBlockScroll={false}
              />
            </FieldBox>

            <FieldBox label="Sub-Department">
              <Select
                options={uniqueSubDepts.map((s) => ({
                  value: s,
                  label: s === "ALL" ? "All Sub-Depts" : s,
                }))}
                value={{
                  value: filters.subDept,
                  label:
                    filters.subDept === "ALL"
                      ? "All Sub-Depts"
                      : filters.subDept,
                }}
                onChange={(opt) =>
                  setFilters((p) => ({ ...p, subDept: opt?.value || "ALL" }))
                }
                placeholder="All Sub-Depts"
                classNamePrefix="react-select"
                classNames={activityLogClassNames}
                styles={portalStyles}
                unstyled
                isClearable={filters.subDept !== "ALL"}
                isDisabled={filters.dept === "ALL"}
                menuPortalTarget={document.body}
                menuShouldBlockScroll={false}
              />
            </FieldBox>

            <FieldBox label="Date From">
              <DatePicker
                selected={filters.dateFrom}
                onChange={(date) =>
                  setFilters((p) => ({ ...p, dateFrom: date }))
                }
                placeholderText="Select start date"
                className={dateCls}
                isClearable
                dateFormat="MMM d, yyyy"
              />
            </FieldBox>

            <FieldBox label="Date To">
              <DatePicker
                selected={filters.dateTo}
                onChange={(date) => setFilters((p) => ({ ...p, dateTo: date }))}
                placeholderText="Select end date"
                className={dateCls}
                isClearable
                dateFormat="MMM d, yyyy"
                minDate={filters.dateFrom}
              />
            </FieldBox>
          </div>
        </div>

        {/* ── Entry count ───────────────────────────────────────────── */}
        {!isLoading && !isError && filteredEntries.length > 0 && (
          <p className="text-[11px] font-semibold text-muted-foreground/70 px-0.5">
            {filteredEntries.length} entr
            {filteredEntries.length === 1 ? "y" : "ies"}
            {hasActiveFilters && " (filtered)"}
          </p>
        )}

        {/* ── States ────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="py-8 px-5 rounded-2xl border border-red-a5 bg-red-a2 flex items-start gap-4">
            <div className="w-8 h-8 rounded-lg bg-red-a3 border border-red-a5 flex items-center justify-center shrink-0">
              <X size={15} className="text-red-11" />
            </div>
            <div>
              <p className="text-red-11 font-black text-sm">
                Failed to load activity log
              </p>
              <p className="text-red-11/70 text-xs mt-1 font-medium">
                {error?.message || "Unknown error"}
              </p>
            </div>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center mb-1">
              <Activity size={20} className="text-muted-foreground/40" />
            </div>
            <p className="text-sm font-black text-foreground">
              No activity found
            </p>
            <p className="text-xs text-muted-foreground/70 font-medium max-w-[220px]">
              {hasActiveFilters
                ? "Try adjusting your filters."
                : "No log entries yet."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs font-semibold text-primary hover:underline mt-1"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          /* ── Log entry list — same card DNA as LogTaskModal DialogContent ── */
          <div className="space-y-2">
            {filteredEntries.map((e) => {
              const Icon = typeIcon(e.type);
              const initials = getInitials(e.authorName);

              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setSelectedTaskId(e.taskId)}
                  className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-gray-6 hover:bg-muted/40 transition-all duration-150 animate-content-in group"
                >
                  <div className="flex items-start gap-3">
                    {/* Icon bubble — matches LogTaskHeader dept badge style */}
                    <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                      <Icon size={14} className="text-muted-foreground" />
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Row 1: type eyebrow + timestamp */}
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                          {e.type || "SYSTEM"}
                        </p>
                        <div className="flex items-center gap-1 shrink-0 text-muted-foreground/60">
                          <Clock size={10} />
                          <span className="text-[11px] font-bold">
                            {formatWhen(e.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Task title */}
                      {(() => {
                        const checklist = tryParseChecklist(e.taskDescription);
                        if (checklist) {
                          const displayItems = checklist.slice(0, 2);
                          const remaining = checklist.length - 2;
                          return (
                            <div className="mb-1.5 space-y-1">
                              {displayItems.map((item, idx) => (
                                <div key={idx} className="flex items-start gap-1.5 text-xs font-bold text-foreground">
                                  {item.checked ? (
                                    <CheckSquare size={13} className="shrink-0 text-primary mt-[1px]" />
                                  ) : (
                                    <Square size={13} className="shrink-0 text-muted-foreground/50 mt-[1px]" />
                                  )}
                                  <span className={`${item.checked ? "line-through opacity-60" : ""} line-clamp-1`}>
                                    {item.text}
                                  </span>
                                </div>
                              ))}
                              {remaining > 0 && (
                                <div className="text-[10px] font-bold text-muted-foreground/60 pl-5 uppercase tracking-wider">
                                  + {remaining} more checklist item{remaining !== 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          );
                        }
                        return (
                          <p className="text-sm font-bold text-foreground line-clamp-1">
                            {e.taskDescription || `Task ${e.taskId}`}
                          </p>
                        );
                      })()}

                      {/* Content — parses checklist JSON if applicable */}
                      <div className="text-xs text-muted-foreground mt-1">
                        <ContentDisplay content={e.content} />
                      </div>

                      {/* Footer: author avatar + status pill — matches property-pill style */}
                      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        {/* Author — matches LogTaskHeader dept initial badge */}
                        <div className="flex items-center gap-1.5">
                          <div className="w-[16px] h-[16px] rounded flex items-center justify-center bg-primary text-white font-bold text-[8px] shrink-0">
                            {initials.charAt(0)}
                          </div>
                          <span className="text-[11px] font-semibold text-slate-400">
                            {e.authorName || "System"}
                          </span>
                        </div>

                        {/* Status — matches .property-pill */}
                        {e.taskStatus && (
                          <span className="property-pill !py-0.5 !px-2 !text-[9px] !rounded-full pointer-events-none">
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

        {/* ── Bottom pagination ─────────────────────────────────────── */}
        {filteredEntries.length > 0 && (
          <div className="flex items-center justify-center gap-3 pt-3 border-t border-gray-3/40">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card text-muted-foreground font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted hover:text-foreground transition-colors"
            >
              <ChevronLeft size={14} /> Newer
            </button>
            <span className="text-[11px] font-bold text-muted-foreground">
              Page {page + 1}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={entries.length < PAGE_SIZE}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card text-muted-foreground font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted hover:text-foreground transition-colors"
            >
              Older <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Task detail modal */}
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
