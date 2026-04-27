import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { salesQuotaService } from "../../services/sales/salesQuotaService";
import toast from "react-hot-toast";
import {
  Loader2,
  CheckCheck,
  PhilippinePeso,
  History,
  Search,
  LayoutGrid,
  List as ListIcon,
  Filter,
  AlertCircle,
  UploadCloud,
} from "lucide-react";
import QuotaHistoryModal from "./QuotaHistoryModal";

export default function QuotaManagementModule({
  salesEmployees = [],
  quotas = [],
  selectedRange,
  resolvedAvatars = {},
  currentUser,
}) {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState("LIST"); // LIST | GRID
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | DRAFT | PUBLISHED | MISSING

  const [draftInputs, setDraftInputs] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const [historyModalState, setHistoryModalState] = useState({
    isOpen: false,
    quotaId: null,
    employeeName: "",
  });

  // Map employee_id -> latest quota object (for the selected month/range)
  // If multiple months, we sum the amount_target, but what about status?
  // Usually quota assignment is per month. Let's assume the first month's status represents it,
  // or if any is DRAFT, it's DRAFT.
  const quotaMap = useMemo(() => {
    const map = {};
    quotas.forEach((q) => {
      if (!map[q.employee_id]) {
        map[q.employee_id] = { ...q, amount_target: 0 };
      }
      map[q.employee_id].amount_target += parseFloat(q.amount_target) || 0;
      // If any is draft, mark as draft
      if (q.status === "DRAFT") map[q.employee_id].status = "DRAFT";
    });
    return map;
  }, [quotas]);

  // Sync draftInputs with server quotas when quotas change
  useEffect(() => {
    if (salesEmployees.length === 0) return;
    const freshDrafts = {};
    salesEmployees.forEach((emp) => {
      freshDrafts[emp.id] = String(quotaMap[emp.id]?.amount_target ?? 0);
    });
    setDraftInputs(freshDrafts);
  }, [quotaMap, salesEmployees]);

  // Derived metrics
  const metrics = useMemo(() => {
    let totalPublished = 0;
    let totalDraft = 0;
    let missingCount = 0;

    salesEmployees.forEach((emp) => {
      const q = quotaMap[emp.id];
      if (!q) missingCount++;
      else if (q.status === "PUBLISHED") totalPublished += q.amount_target;
      else if (q.status === "DRAFT") totalDraft += q.amount_target;
    });

    return { totalPublished, totalDraft, missingCount };
  }, [quotaMap, salesEmployees]);

  const hasPendingEdits = useMemo(() => {
    return salesEmployees.some((emp) => {
      const draftVal = parseFloat(draftInputs[emp.id]) || 0;
      const serverVal = quotaMap[emp.id]?.amount_target ?? 0;
      return draftVal !== serverVal;
    });
  }, [draftInputs, quotaMap, salesEmployees]);

  const draftQuotaIds = useMemo(() => {
    return quotas.filter((q) => q.status === "DRAFT").map((q) => q.id);
  }, [quotas]);

  // Filtering
  const filteredEmployees = useMemo(() => {
    return salesEmployees.filter((emp) => {
      const q = quotaMap[emp.id];
      const matchSearch =
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.role &&
          emp.role.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchStatus = true;
      if (statusFilter === "DRAFT") matchStatus = q?.status === "DRAFT";
      if (statusFilter === "PUBLISHED") matchStatus = q?.status === "PUBLISHED";
      if (statusFilter === "MISSING") matchStatus = !q;

      return matchSearch && matchStatus;
    });
  }, [salesEmployees, quotaMap, searchQuery, statusFilter]);

  const handleSaveDrafts = async () => {
    const changed = salesEmployees
      .map((emp) => ({
        employeeId: emp.id,
        amount: parseFloat(draftInputs[emp.id]) || 0,
        oldAmount: quotaMap[emp.id]?.amount_target ?? 0,
      }))
      .filter(({ amount, oldAmount }) => amount !== oldAmount);

    if (changed.length === 0) return;

    setIsSaving(true);
    try {
      const keys =
        selectedRange.monthKeys?.length > 0
          ? selectedRange.monthKeys
          : [selectedRange.startDate];
      const numMonths = keys.length;
      const promises = [];

      changed.forEach(({ employeeId, amount }) => {
        const perMonth = amount / numMonths;
        keys.forEach((monthKey) => {
          // Save as DRAFT
          promises.push(
            salesQuotaService.upsertQuota(
              employeeId,
              Math.round(perMonth * 100) / 100,
              monthKey,
              "DRAFT",
              currentUser?.id,
            ),
          );
        });
      });

      await Promise.all(promises);
      queryClient.invalidateQueries({ queryKey: ["quotas", selectedRange] });
      toast.success(`Saved ${changed.length} quota draft(s)!`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishAll = async () => {
    if (draftQuotaIds.length === 0) {
      toast("No drafts to publish.", { icon: "ℹ️" });
      return;
    }

    setIsPublishing(true);
    try {
      await salesQuotaService.publishQuotas(draftQuotaIds, currentUser?.id);
      queryClient.invalidateQueries({ queryKey: ["quotas", selectedRange] });
      toast.success(`Published ${draftQuotaIds.length} quotas!`);
    } catch (err) {
      toast.error("Failed to publish quotas: " + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const openHistory = (empId) => {
    const q = quotaMap[empId];
    if (q && q.id) {
      setHistoryModalState({
        isOpen: true,
        quotaId: q.id,
        employeeName: salesEmployees.find((e) => e.id === empId)?.name,
      });
    } else {
      toast("No quota history yet.");
    }
  };

  return (
    <div className="bg-card border border-mauve-4 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      {/* Module Header & Metrics */}
      <div className="p-6 border-b border-mauve-3 bg-mauve-2 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-black text-foreground flex items-center gap-2">
            Quota Management
          </h2>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            Assign and publish sales targets. Edits are saved as Drafts until
            Published.
          </p>
        </div>

        <div className="flex gap-4">
          <MetricBadge
            label="Published Target"
            value={metrics.totalPublished}
          />
          <MetricBadge label="Draft Target" value={metrics.totalDraft} />
          <MetricBadge label="Missing" value={metrics.missingCount} isCount />
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 border-b border-mauve-3 flex flex-col md:flex-row gap-4 items-center justify-between bg-card">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-mauve-2 border border-mauve-4 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all outline-none"
            />
          </div>

          <div className="relative shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-9 pr-8 py-2 bg-mauve-2 border border-mauve-4 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="MISSING">Missing</option>
            </select>
            <Filter
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={14}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex bg-mauve-3 p-1 rounded-lg mr-2 shrink-0">
            <button
              onClick={() => setViewMode("LIST")}
              className={`p-1.5 rounded-md transition-all ${viewMode === "LIST" ? "bg-card shadow-sm text-[color:var(--violet-10)]" : "text-muted-foreground hover:text-foreground"}`}
              title="List View"
            >
              <ListIcon size={16} />
            </button>
            <button
              onClick={() => setViewMode("GRID")}
              className={`p-1.5 rounded-md transition-all ${viewMode === "GRID" ? "bg-card shadow-sm text-[color:var(--violet-10)]" : "text-muted-foreground hover:text-foreground"}`}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          <button
            onClick={handleSaveDrafts}
            disabled={isSaving || !hasPendingEdits}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all shrink-0 bg-mauve-12 hover:bg-mauve-12 text-primary-foreground disabled:bg-mauve-4 disabled:text-muted-foreground disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCheck size={14} />
            )}
            Save Drafts
          </button>

          <button
            onClick={handlePublishAll}
            disabled={isPublishing || draftQuotaIds.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all shrink-0 bg-primary hover:bg-primary-hover text-primary-foreground shadow-md shadow-primary/15 disabled:bg-mauve-5 disabled:shadow-none disabled:cursor-not-allowed"
          >
            {isPublishing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <UploadCloud size={14} />
            )}
            Publish All Drafts
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6 bg-card min-h-[400px]">
        {filteredEmployees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <AlertCircle size={32} className="mb-3 text-mauve-7" />
            <p className="font-medium text-sm">
              No employees match your filters.
            </p>
          </div>
        ) : viewMode === "LIST" ? (
          <div className="overflow-x-auto rounded-xl border border-mauve-4">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-mauve-2 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Target Amount</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmployees.map((emp) => (
                  <QuotaTableRow
                    key={emp.id}
                    employee={emp}
                    quota={quotaMap[emp.id]}
                    draftValue={draftInputs[emp.id] ?? "0"}
                    avatarUrl={resolvedAvatars[emp.id]}
                    onChange={(val) =>
                      setDraftInputs((prev) => ({ ...prev, [emp.id]: val }))
                    }
                    onViewHistory={() => openHistory(emp.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((emp) => (
              <QuotaGridCard
                key={emp.id}
                employee={emp}
                quota={quotaMap[emp.id]}
                draftValue={draftInputs[emp.id] ?? "0"}
                avatarUrl={resolvedAvatars[emp.id]}
                onChange={(val) =>
                  setDraftInputs((prev) => ({ ...prev, [emp.id]: val }))
                }
                onViewHistory={() => openHistory(emp.id)}
              />
            ))}
          </div>
        )}
      </div>

      <QuotaHistoryModal
        isOpen={historyModalState.isOpen}
        onClose={() =>
          setHistoryModalState({
            isOpen: false,
            quotaId: null,
            employeeName: "",
          })
        }
        quotaId={historyModalState.quotaId}
        employeeName={historyModalState.employeeName}
      />
    </div>
  );
}

// ----------------------------------------------------------------------

function MetricBadge({ label, value, color, isCount = false }) {
  const colorMap = {
    indigo: "text-[color:var(--violet-10)] bg-[color:var(--violet-2)] border-indigo-100",
    orange: "text-orange-600 bg-orange-50 border-orange-100",
    red: "text-destructive bg-destructive/5 border-red-100",
  };

  return (
    <div
      className={`px-4 py-2 rounded-xl border flex flex-col justify-center ${colorMap[color]}`}
    >
      <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">
        {label}
      </span>
      <span className="text-lg font-black mt-0.5">
        {!isCount && "₱"}
        {isCount ? value : Number(value || 0).toLocaleString()}
      </span>
    </div>
  );
}

// ----------------------------------------------------------------------

function QuotaTableRow({
  employee,
  quota,
  draftValue,
  avatarUrl,
  onChange,
  onViewHistory,
}) {
  const serverValue = quota?.amount_target ?? 0;
  const isDirty = (parseFloat(draftValue) || 0) !== serverValue;
  const status = isDirty ? "UNSAVED" : quota?.status || "MISSING";

  return (
    <tr
      className={`group transition-colors ${isDirty ? "bg-[color:var(--amber-2)]/30" : "hover:bg-mauve-2/50"}`}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <img
            src={avatarUrl || "/default-avatar.png"}
            alt={employee.name}
            className="w-8 h-8 rounded-full border border-mauve-4 object-cover bg-mauve-3"
            onError={(e) => {
              e.target.src = "/default-avatar.png";
            }}
          />
          <div>
            <p className="font-bold text-foreground">{employee.name}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              {employee.role || "Sales Rep"}
            </p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <QuotaInput value={draftValue} onChange={onChange} isDirty={isDirty} />
      </td>
      <td className="px-6 py-4 text-center">
        <StatusBadge status={status} />
      </td>
      <td className="px-6 py-4 text-right">
        <button
          onClick={onViewHistory}
          disabled={!quota}
          className="p-2 rounded-lg text-muted-foreground hover:text-[color:var(--violet-10)] hover:bg-[color:var(--violet-2)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="View History"
        >
          <History size={16} />
        </button>
      </td>
    </tr>
  );
}

// ----------------------------------------------------------------------

function QuotaGridCard({
  employee,
  quota,
  draftValue,
  avatarUrl,
  onChange,
  onViewHistory,
}) {
  const serverValue = quota?.amount_target ?? 0;
  const isDirty = (parseFloat(draftValue) || 0) !== serverValue;
  const status = isDirty ? "UNSAVED" : quota?.status || "MISSING";

  return (
    <div
      className={`bg-card border rounded-2xl p-5 flex flex-col justify-between transition-all ${isDirty ? "border-amber-300 shadow-md shadow-amber-50" : "border-mauve-4 hover:border-mauve-5"}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={avatarUrl || "/default-avatar.png"}
            alt={employee.name}
            className="w-10 h-10 rounded-xl border border-mauve-4 object-cover shadow-sm bg-mauve-3 shrink-0"
            onError={(e) => {
              e.target.src = "/default-avatar.png";
            }}
          />
          <div className="min-w-0">
            <p className="font-bold text-foreground text-sm truncate">
              {employee.name}
            </p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest truncate">
              {employee.role || "Sales Rep"}
            </p>
          </div>
        </div>
        <button
          onClick={onViewHistory}
          disabled={!quota}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-[color:var(--violet-10)] hover:bg-[color:var(--violet-2)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
        >
          <History size={14} />
        </button>
      </div>

      <div className="mb-3 flex justify-between items-center">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          Target
        </span>
        <StatusBadge status={status} />
      </div>

      <QuotaInput
        value={draftValue}
        onChange={onChange}
        isDirty={isDirty}
        fullWidth
      />
    </div>
  );
}

// ----------------------------------------------------------------------

function QuotaInput({ value, onChange, isDirty, fullWidth = false }) {
  const inputRef = useRef(null);

  const displayValue = useMemo(() => {
    if (!value || value === "0") return "";
    const clean = value.toString().replace(/,/g, "");
    const parts = clean.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }, [value]);

  const handleChange = (e) => {
    const rawValue = e.target.value;
    const oldSelectionStart = e.target.selectionStart;
    const filteredValue = rawValue.replace(/[^0-9.]/g, "");
    const parts = filteredValue.split(".");
    const cleanValue = parts[0] + (parts.length > 1 ? "." + parts[1] : "");

    onChange(cleanValue);

    requestAnimationFrame(() => {
      if (inputRef.current) {
        const diff = inputRef.current.value.length - rawValue.length;
        const newPos = Math.max(0, oldSelectionStart + diff);
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    });
  };

  return (
    <div className={`relative ${fullWidth ? "w-full" : "w-48"}`}>
      <PhilippinePeso
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        placeholder="0"
        value={displayValue}
        onChange={handleChange}
        className={`w-full bg-mauve-2 border text-foreground rounded-lg pl-7 pr-3 py-2 text-sm font-bold outline-none transition-all ${
          isDirty
            ? "border-[color:var(--amber-8)] focus:border-amber-500 focus:ring-2 focus:ring-amber-100 bg-[color:var(--amber-2)]/30"
            : "border-mauve-4 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        }`}
      />
    </div>
  );
}

// ----------------------------------------------------------------------

function StatusBadge({ status }) {
  switch (status) {
    case "PUBLISHED":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-green-2 text-green-10 border border-green-3">
          Published
        </span>
      );
    case "DRAFT":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-orange-50 text-orange-600 border border-orange-100">
          Draft
        </span>
      );
    case "UNSAVED":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-[color:var(--amber-2)] text-[color:var(--amber-10)] border border-[color:var(--amber-6)] shadow-sm shadow-amber-100">
          Unsaved Edit
        </span>
      );
    case "MISSING":
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-mauve-3 text-muted-foreground border border-mauve-4">
          Missing
        </span>
      );
  }
}
