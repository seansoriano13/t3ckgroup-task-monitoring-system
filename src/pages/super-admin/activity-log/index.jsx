import { useEffect, useMemo, useState } from "react";
import Dot from "../../../components/ui/Dot";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import ProtectedRoute from "../../../components/ProtectedRoute.jsx";
import { taskActivityService } from "../../../services/tasks/taskActivityService";
import { salesActivityLogService } from "../../../services/sales/salesActivityLogService";
import { employeeService } from "../../../services/employeeService";
import { committeeTaskActivityService } from "../../../services/committeeTaskActivityService";
import Avatar from "../../../components/Avatar.jsx";
import { useEmployeeAvatarMap } from "../../../hooks/useEmployeeAvatarMap";
import HighlightText from "../../../components/HighlightText";

import Dropdown from "../../../components/ui/Dropdown";
import {
  FilterTrigger,
  FilterOptionList,
} from "../../../components/ui/FilterDropdown";
import {
  ShieldCheck,
  MessageCircle,
  Zap,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Search,
  Activity,
  Clock,
  ChevronDown,
  CheckSquare,
  Square,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge.jsx";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { Users } from "lucide-react";
import { Calendar } from "lucide-react";

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
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      typeof parsed[0] === "object" &&
      "text" in parsed[0]
    ) {
      return parsed;
    }
    // eslint-disable-next-line no-empty, no-unused-vars
  } catch (e) {}
  return null;
}

// ── ContentDisplay ────────────────────────────────────────────────────────────
function ContentDisplay({ content, search }) {
  if (!content) return <span className="italic opacity-70">(no message)</span>;

  const parsedChecklist = tryParseChecklist(content);

  if (parsedChecklist) {
    const displayItems = parsedChecklist.slice(0, 4);
    const remaining = parsedChecklist.length - 4;

    return (
      <div className="space-y-1.5 mt-2 flex flex-col">
        {displayItems.map((item, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2 text-xs text-muted-foreground"
          >
            {item.checked ? (
              <CheckSquare
                size={13}
                className="shrink-0 text-primary mt-[2px]"
              />
            ) : (
              <Square
                size={13}
                className="shrink-0 text-muted-foreground/40 mt-[2px]"
              />
            )}
            <span
              className={`${item.checked ? "line-through opacity-60" : ""} break-words leading-snug line-clamp-2`}
            >
              <HighlightText text={item.text} search={search} />
            </span>
          </div>
        ))}
        {remaining > 0 && (
          <div className="text-[10px] font-bold text-muted-foreground/60 pl-[22px] pt-0.5 uppercase tracking-wider">
            + {remaining} more item{remaining !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    );
  }

  return (
    <span className="line-clamp-2 leading-relaxed">
      <HighlightText text={content} search={search} />
    </span>
  );
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
  const [activeTab, setActiveTab] = useState("TASKS");
  const [page, setPage] = useState(0);
  const [liveAnim, setLiveAnim] = useState(false);
  const avatarMap = useEmployeeAvatarMap();

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
    activeTab,
  ]);

  useEffect(() => {
    const handleNewEntry = () => {
      setLiveAnim(true);
      setTimeout(() => setLiveAnim(false), 2000);
      queryClient.invalidateQueries({
        queryKey: ["superAdminActivityLog", activeTab],
      });
    };

    let sub;
    if (activeTab === "TASKS")
      sub = taskActivityService.subscribeToAllActivity(handleNewEntry);
    else if (activeTab === "SALES")
      sub = salesActivityLogService.subscribeToAllActivity(handleNewEntry);
    else if (activeTab === "COMMITTEE")
      sub = committeeTaskActivityService.subscribeToAllActivity(handleNewEntry);

    return () => {
      if (sub) {
        if (activeTab === "TASKS")
          taskActivityService.unsubscribeFromActivity(sub);
        else if (activeTab === "SALES")
          salesActivityLogService.unsubscribeFromActivity(sub);
        else if (activeTab === "COMMITTEE")
          committeeTaskActivityService.unsubscribeFromActivity(sub);
      }
    };
  }, [activeTab, queryClient]);

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
    queryKey: ["superAdminActivityLog", activeTab, offset, filters],
    queryFn: () => {
      const params = {
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
      };

      if (activeTab === "SALES") {
        return salesActivityLogService.getRecentSalesActivity(params);
      }
      if (activeTab === "COMMITTEE") {
        return committeeTaskActivityService.getRecentCommitteeActivity(params);
      }
      return taskActivityService.getRecentTaskActivity(params);
    },
    staleTime: 15_000,
  });

  const filteredEntries = useMemo(() => {
    const raw = entries.filter((e) => {
      if (filters.dept !== "ALL" && (e.taskCreatorDept || "") !== filters.dept)
        return false;
      if (
        filters.subDept !== "ALL" &&
        (e.taskCreatorSubDept || "") !== filters.subDept
      )
        return false;
      return true;
    });

    // Consolidate TaskSubmitted and Reported To to lessen noise
    const consolidated = [];
    for (let i = 0; i < raw.length; i++) {
      const current = raw[i];
      const next = raw[i + 1];

      // Since logs are ORDERED BY created_at DESC:
      // 'Reported to:' (logged later) appears BEFORE 'Task submitted' (logged earlier).
      if (
        next &&
        current.taskId === next.taskId &&
        current.content?.startsWith("Reported to:") &&
        next.content?.startsWith("Task submitted")
      ) {
        consolidated.push({
          ...next,
          content: `${next.content} ${current.content}`,
        });
        i++; // Skip the next entry as it's now merged
      } else {
        consolidated.push(current);
      }
    }

    return consolidated;
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

  // Date input style — matches FilterTrigger height and premium style
  const dateCls = (isActive) =>
    `w-full border rounded-lg px-3 h-[40px] md:h-[46px] text-[13px] text-foreground outline-none transition-all cursor-pointer flex items-center ${
      isActive
        ? "bg-muted ring-1 ring-mauve-4 font-medium"
        : "bg-card border-border hover:border-border/80"
    }`;

  return (
    <ProtectedRoute requireSuperAdmin={true}>
      <div className="max-w-6xl mx-auto space-y-5 px-2 pb-10">
        {/* ── Header — same eyebrow pattern as LogTaskHeader ─────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/40 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
              Activity Log
            </h1>
            <p className="text-muted-foreground mt-1 font-medium text-sm">
              Recent timeline events across the system.
            </p>
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl shrink-0 mt-4 max-w-fit border border-border/40">
              <button
                onClick={() => setActiveTab("TASKS")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "TASKS"
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Task Logs
              </button>
              <button
                onClick={() => setActiveTab("SALES")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "SALES"
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sales Logs
              </button>
              <button
                onClick={() => setActiveTab("COMMITTEE")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "COMMITTEE"
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Committee Logs
              </button>
            </div>
          </div>

          {/* Pagination — styled like LogTaskFooter action buttons */}
          <div className="flex flex-col items-end gap-3 shrink-0">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-300 ${liveAnim ? "bg-green-a2 border-green-a4 text-green-11" : "bg-transparent border-transparent text-muted-foreground/60"}`}
            >
              <Dot
                size="w-1.5 h-1.5"
                color={
                  liveAnim
                    ? "bg-green-9 shadow-[0_0_8px_var(--green-9)]"
                    : "bg-muted-foreground/40"
                }
                className={liveAnim ? "animate-pulse" : ""}
              />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {liveAnim ? "New Update" : "Live"}
              </span>
            </div>
            <div className="flex items-center gap-2">
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
        </div>

        {/* ── Filter Panel — mirrors LogTaskPropertyBar container ─────── */}
        <div className="bg-card border border-border rounded-2xl shadow-sm">
          {/* Panel top bar — matches LogTaskHeader strip */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-[18px] h-[18px] rounded flex items-center justify-center bg-muted border border-border shrink-0">
                <Filter size={10} className="text-muted-foreground" />
              </div>
              <ChevronDown
                size={11}
                className="text-muted-foreground -rotate-90"
              />
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
                className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
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
                    className="absolute left-3 text-muted-foreground pointer-events-none shrink-0"
                  />
                  <input
                    value={filters.search}
                    onChange={(e) =>
                      setFilters((p) => ({ ...p, search: e.target.value }))
                    }
                    placeholder="Search content or task description…"
                    className="w-full bg-card border border-border rounded-lg pl-8 pr-3 h-[40px] md:h-[46px] text-[13px] text-foreground outline-none focus:ring-1 focus:ring-mauve-4 hover:border-border/80 transition-all placeholder:text-muted-foreground"
                  />
                </div>
              </FieldBox>
            </div>

            <FieldBox label="Type">
              <Dropdown
                usePortal
                className="w-full"
                trigger={({ isOpen }) => (
                  <FilterTrigger
                    label={filters.type === "ALL" ? "All Types" : filters.type}
                    isActive={filters.type !== "ALL"}
                    isOpen={isOpen}
                    icon={Activity}
                  />
                )}
              >
                {({ close }) => (
                  <FilterOptionList
                    options={[
                      { value: "ALL", label: "All Types" },
                      { value: "SYSTEM", label: "SYSTEM" },
                      { value: "COMMENT", label: "COMMENT" },
                      { value: "APPROVAL", label: "APPROVAL" },
                      { value: "HR_NOTE", label: "HR_NOTE" },
                    ]}
                    value={filters.type}
                    onChange={(val) => {
                      setFilters((p) => ({ ...p, type: val }));
                      close();
                    }}
                    close={close}
                  />
                )}
              </Dropdown>
            </FieldBox>

            <FieldBox
              label={activeTab === "SALES" ? "Sales Status" : "Task Status"}
            >
              <Dropdown
                usePortal
                className="w-full"
                trigger={({ isOpen }) => (
                  <FilterTrigger
                    label={
                      filters.taskStatus === "ALL"
                        ? "All Statuses"
                        : filters.taskStatus
                    }
                    isActive={filters.taskStatus !== "ALL"}
                    isOpen={isOpen}
                    icon={Clock}
                  />
                )}
              >
                {({ close }) => (
                  <FilterOptionList
                    options={
                      activeTab === "SALES"
                        ? [
                            { value: "ALL", label: "All Statuses" },
                            { value: "PENDING", label: "PENDING" },
                            { value: "APPROVED", label: "APPROVED" },
                            { value: "REJECTED", label: "REJECTED" },
                            { value: "COMPLETED", label: "COMPLETED" },
                            { value: "LOST", label: "LOST" },
                          ]
                        : [
                            { value: "ALL", label: "All Statuses" },
                            { value: "INCOMPLETE", label: "INCOMPLETE" },
                            {
                              value: "AWAITING APPROVAL",
                              label: "AWAITING APPROVAL",
                            },
                            { value: "COMPLETE", label: "COMPLETE" },
                            { value: "NOT APPROVED", label: "NOT APPROVED" },
                            { value: "DELETED", label: "DELETED" },
                          ]
                    }
                    value={filters.taskStatus}
                    onChange={(val) => {
                      setFilters((p) => ({ ...p, taskStatus: val }));
                      close();
                    }}
                    close={close}
                  />
                )}
              </Dropdown>
            </FieldBox>

            <FieldBox label="Author (Actor)">
              <Dropdown
                usePortal
                className="w-full"
                trigger={({ isOpen }) => (
                  <FilterTrigger
                    label={
                      filters.authorId === "ALL"
                        ? "All Actors"
                        : employees.find((e) => e.id === filters.authorId)
                          ? employees.find((e) => e.id === filters.authorId)
                              .name
                          : filters.authorId === "SYSTEM"
                            ? "System"
                            : "All Actors"
                    }
                    isActive={filters.authorId !== "ALL"}
                    isOpen={isOpen}
                    icon={ShieldCheck}
                  />
                )}
              >
                {({ close }) => (
                  <FilterOptionList
                    showSearch
                    options={[
                      { value: "ALL", label: "All Actors" },
                      { value: "SYSTEM", label: "System" },
                      ...employees.map((emp) => ({
                        value: emp.id,
                        label: emp.name,
                      })),
                    ]}
                    value={filters.authorId}
                    onChange={(val) => {
                      setFilters((p) => ({ ...p, authorId: val }));
                      close();
                    }}
                    close={close}
                  />
                )}
              </Dropdown>
            </FieldBox>

            <FieldBox
              label={activeTab === "SALES" ? "Sales Rep" : "Task Owner"}
            >
              <Dropdown
                usePortal
                className="w-full"
                trigger={({ isOpen }) => (
                  <FilterTrigger
                    label={
                      filters.employeeId === "ALL"
                        ? "All Employees"
                        : employees.find((e) => e.id === filters.employeeId)
                            ?.name || filters.employeeId
                    }
                    isActive={filters.employeeId !== "ALL"}
                    isOpen={isOpen}
                    icon={Users}
                  />
                )}
              >
                {({ close }) => (
                  <FilterOptionList
                    showSearch
                    options={[
                      { value: "ALL", label: "All Employees" },
                      ...employees.map((emp) => ({
                        value: emp.id,
                        label: emp.name,
                      })),
                    ]}
                    value={filters.employeeId}
                    onChange={(val) => {
                      setFilters((p) => ({ ...p, employeeId: val }));
                      close();
                    }}
                    close={close}
                  />
                )}
              </Dropdown>
            </FieldBox>

            <FieldBox label="Department">
              <Dropdown
                usePortal
                className="w-full"
                trigger={({ isOpen }) => (
                  <FilterTrigger
                    label={
                      filters.dept === "ALL" ? "All Departments" : filters.dept
                    }
                    isActive={filters.dept !== "ALL"}
                    isOpen={isOpen}
                    icon={Building2}
                  />
                )}
              >
                {({ close }) => (
                  <FilterOptionList
                    options={uniqueDepts.map((d) => ({
                      value: d,
                      label: d === "ALL" ? "All Departments" : d,
                    }))}
                    value={filters.dept}
                    onChange={(val) => {
                      setFilters((p) => ({
                        ...p,
                        dept: val,
                        subDept: "ALL",
                      }));
                      close();
                    }}
                    close={close}
                  />
                )}
              </Dropdown>
            </FieldBox>

            <FieldBox label="Sub-Department">
              <Dropdown
                usePortal
                className="w-full"
                disabled={filters.dept === "ALL"}
                trigger={({ isOpen, disabled }) => (
                  <FilterTrigger
                    label={
                      filters.subDept === "ALL"
                        ? "All Sub-Depts"
                        : filters.subDept
                    }
                    isActive={filters.subDept !== "ALL"}
                    isOpen={isOpen}
                    icon={Building2}
                    disabled={disabled}
                  />
                )}
              >
                {({ close }) => (
                  <FilterOptionList
                    options={uniqueSubDepts.map((s) => ({
                      value: s,
                      label: s === "ALL" ? "All Sub-Depts" : s,
                    }))}
                    value={filters.subDept}
                    onChange={(val) => {
                      setFilters((p) => ({ ...p, subDept: val }));
                      close();
                    }}
                    close={close}
                  />
                )}
              </Dropdown>
            </FieldBox>

            <FieldBox label="Date From">
              <div className="relative flex items-center">
                <DatePicker
                  selected={filters.dateFrom}
                  onChange={(date) =>
                    setFilters((p) => ({ ...p, dateFrom: date }))
                  }
                  placeholderText="Select start date"
                  className={`${dateCls(!!filters.dateFrom)} pl-9`}
                  isClearable
                  dateFormat="MMM d, yyyy"
                />
                <Calendar
                  size={14}
                  className={`absolute left-3 transition-colors pointer-events-none z-10 ${filters.dateFrom ? "text-mauve-11" : "text-mauve-8"}`}
                />
              </div>
            </FieldBox>

            <FieldBox label="Date To">
              <div className="relative flex items-center">
                <DatePicker
                  selected={filters.dateTo}
                  onChange={(date) =>
                    setFilters((p) => ({ ...p, dateTo: date }))
                  }
                  placeholderText="Select end date"
                  className={`${dateCls(!!filters.dateTo)} pl-9`}
                  isClearable
                  dateFormat="MMM d, yyyy"
                  minDate={filters.dateFrom}
                />
                <Calendar
                  size={14}
                  className={`absolute left-3 transition-colors pointer-events-none z-10 ${filters.dateTo ? "text-mauve-11" : "text-mauve-8"}`}
                />
              </div>
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

              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    const typeMap = {
                      TASKS: "TASK",
                      SALES: "SALES",
                      COMMITTEE: "COMMITTEE_TASK",
                    };
                    window.dispatchEvent(
                      new CustomEvent("OPEN_ENTITY_DETAILS", {
                        detail: {
                          id: e.taskId,
                          type: typeMap[activeTab],
                        },
                      }),
                    );
                  }}
                  className={`w-full text-left bg-card border border-border rounded-xl p-4 transition-all duration-150 animate-content-in group hover:border-mauve-6 hover:bg-muted/40 cursor-pointer`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon bubble — matches LogTaskHeader dept badge style */}
                    <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                      <Icon size={14} className="text-muted-foreground" />
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Row 1: type eyebrow + timestamp */}
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                            {e.type || "SYSTEM"}
                          </p>
                          {e.isCommittee && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-violet-3 text-violet-11 border border-violet-5">
                              Committee Task
                            </span>
                          )}
                        </div>
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
                                <div
                                  key={idx}
                                  className="flex items-start gap-1.5 text-xs font-bold text-foreground"
                                >
                                  {item.checked ? (
                                    <CheckSquare
                                      size={13}
                                      className="shrink-0 text-mauve-10 mt"
                                    />
                                  ) : (
                                    <Square
                                      size={13}
                                      className="shrink-0 text-muted-foreground/50 mt-[1px]"
                                    />
                                  )}
                                  <span
                                    className={`${item.checked ? "line-through opacity-60" : ""} line-clamp-1`}
                                  >
                                    <HighlightText
                                      text={item.text}
                                      search={filters.search}
                                    />
                                  </span>
                                </div>
                              ))}
                              {remaining > 0 && (
                                <div className="text-[10px] font-bold text-muted-foreground/60 pl-5 uppercase tracking-wider">
                                  + {remaining} more checklist item
                                  {remaining !== 1 ? "s" : ""}
                                </div>
                              )}
                            </div>
                          );
                        }
                        return (
                          <p className="text-sm font-bold text-foreground line-clamp-1">
                            <HighlightText
                              text={e.taskDescription || `Task ${e.taskId}`}
                              search={filters.search}
                            />
                          </p>
                        );
                      })()}

                      {/* Content — parses checklist JSON if applicable */}
                      <div className="text-xs text-muted-foreground mt-1">
                        <ContentDisplay
                          content={e.content}
                          search={filters.search}
                        />
                      </div>

                      {/* Footer: author avatar + status pill — matches property-pill style */}
                      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        {/* Author — matches LogTaskHeader dept initial badge */}
                        <div className="flex items-center gap-1.5">
                          <Avatar
                            name={e.authorName || "System"}
                            src={avatarMap.get(e.authorId)}
                            size="xxs"
                            className="bg-mauve-4 text-mauve-12  shadow-sm"
                          />
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            {e.authorName || "System"}
                          </span>
                        </div>

                        {/* Status — matches .property-pill */}
                        <StatusBadge status={e.taskStatus} />
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
          <div className="flex items-center justify-center gap-3 pt-3 border-t border-border/40">
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
    </ProtectedRoute>
  );
}
