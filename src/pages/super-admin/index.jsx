import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { salesService } from "../../services/salesService";
import ProtectedRoute from "../../components/ProtectedRoute.jsx";
import toast from "react-hot-toast";
import { Loader2, CheckCheck, PhilippinePeso, ChevronLeft, ChevronRight, User } from "lucide-react";
import { storageService } from "../../services/storageService";
import EmployeePipelineMatrix from "../../components/EmployeePipelineMatrix.jsx";
import ExpenseApprovalQueue from "../../components/ExpenseApprovalQueue.jsx";
import FloatingMonthPicker from "../../components/FloatingMonthPicker.jsx";
import SystemUpdateBanner from "../../components/SystemUpdateBanner.jsx";
import SystemUpdateManager from "../../components/SystemUpdateManager.jsx";

const EMPTY_ARRAY = [];

export default function SuperAdminDashboard() {
  const queryClient = useQueryClient();

  const currentDate = new Date();
  const currentMonthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-01`;
  const initialEndDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()}`;

  const [selectedRange, setSelectedRange] = useState({
    mode: "MONTHLY",
    label: new Date().toLocaleString("default", { month: "long", year: "numeric", timeZone: "UTC" }),
    startDate: currentMonthYear,
    endDate: initialEndDate,
    monthKeys: [currentMonthYear]
  });

  // Draft quotas: map of employeeId -> value string (tracks unsaved edits)
  const [draftQuotas, setDraftQuotas] = useState({});
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [resolvedAvatars, setResolvedAvatars] = useState({});

  const HTTP_URL_RE = /^https?:\/\//i;

  // 1. Fetch Sales Employees
  const { data: salesEmployees = EMPTY_ARRAY, isLoading: loadingEmps } = useQuery({
    queryKey: ["salesEmployees"],
    queryFn: () => salesService.getSalesEmployees(),
  });

  // 2. Fetch Quotas for the Selected Range
  const { data: quotas = EMPTY_ARRAY, isLoading: loadingQuotas } = useQuery({
    queryKey: ["quotas", selectedRange],
    queryFn: () => {
      const keys = selectedRange?.monthKeys?.length > 0 ? selectedRange.monthKeys : [selectedRange.startDate];
      return salesService.getQuotasByMonths ? salesService.getQuotasByMonths(keys) : salesService.getQuotasByMonth(selectedRange.startDate);
    },
  });


  // Derive server quota map (summing all months if yearly/quarterly)
  const quotaMap = useMemo(() => {
    return quotas.reduce((acc, q) => {
      if (!acc[q.employee_id]) acc[q.employee_id] = 0;
      acc[q.employee_id] += (parseFloat(q.amount_target) || 0);
      return acc;
    }, {});
  }, [quotas]);

  // Sync draft state whenever fetched quotas change — fixes stale state on month navigation
  useEffect(() => {
    if (salesEmployees.length === 0) return;
    const freshDraft = {};
    salesEmployees
      .forEach((emp) => {
        freshDraft[emp.id] = String(quotaMap[emp.id] ?? 0);
      });
    setDraftQuotas(freshDraft);
  }, [quotaMap, salesEmployees]);

  // Batch resolve avatars
  useEffect(() => {
    if (salesEmployees.length === 0) return;

    const resolveAvatars = async () => {
      const supabasePaths = [];
      const newResolved = { ...resolvedAvatars };

      salesEmployees.forEach((emp) => {
        if (emp.avatarPath) {
          if (HTTP_URL_RE.test(emp.avatarPath)) {
            newResolved[emp.id] = emp.avatarPath;
          } else {
            supabasePaths.push(emp.avatarPath);
          }
        }
      });

      if (supabasePaths.length > 0) {
        try {
          const signedResults = await storageService.getSignedUrls(supabasePaths);
          signedResults.forEach((res) => {
            const emp = salesEmployees.find((e) => e.avatarPath === res.path);
            if (emp) {
              newResolved[emp.id] = res.signedUrl;
            }
          });
        } catch (error) {
          console.error("Failed to batch resolve avatars:", error);
        }
      }

      setResolvedAvatars(newResolved);
    };

    resolveAvatars();
  }, [salesEmployees]);

  // Check if any draft differs from server value
  const hasPendingChanges = useMemo(() => {
    return salesEmployees
      .some((emp) => {
        const draft = parseFloat(draftQuotas[emp.id]) || 0;
        const server = quotaMap[emp.id] ?? 0;
        return draft !== server;
      });
  }, [draftQuotas, quotaMap, salesEmployees]);

  const handleSaveAll = async () => {
    const changed = salesEmployees
      .map((emp) => ({
        employeeId: emp.id,
        amount: parseFloat(draftQuotas[emp.id]) || 0,
      }))
      .filter(({ employeeId, amount }) => amount !== (quotaMap[employeeId] ?? 0));

    if (changed.length === 0) {
      toast("No changes to save.", { icon: "ℹ️" });
      return;
    }

    setIsSavingAll(true);
    try {
      const keys = selectedRange.monthKeys?.length > 0 ? selectedRange.monthKeys : [selectedRange.startDate];
      const numMonths = keys.length;
      
      const promises = [];
      changed.forEach(({ employeeId, amount }) => {
        const perMonth = amount / numMonths;
        keys.forEach(monthKey => {
           // Round to 2 decimals to avoid floating point issues
           promises.push(salesService.upsertQuota(employeeId, Math.round(perMonth * 100) / 100, monthKey));
        });
      });

      await Promise.all(promises);
      queryClient.invalidateQueries({ queryKey: ["quotas", selectedRange] });
      toast.success(`${changed.length} quota${changed.length > 1 ? "s" : ""} saved!`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSavingAll(false);
    }
  };

  return (
    <ProtectedRoute requireSuperAdmin={true}>
      {loadingEmps || loadingQuotas ? (
        <div className="flex h-[80vh] items-center justify-center space-x-2 text-gray-9">
          <Loader2 className="animate-spin" />
          <p className="font-bold">Syncing Super Admin Metrics...</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto space-y-6 pb-10 px-4 sm:px-6 lg:px-8">
        <SystemUpdateBanner />
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-4 pb-4">
          <div>
            <h1 className="text-3xl font-black text-gray-12 flex items-center gap-2">
              Admin Control
            </h1>
            <p className="text-gray-9 mt-1 font-medium">
              Manage Sales Quotas, configure tracking rules, and review
              department activities.
            </p>
          </div>

          {/* Inline range label — quick overview, FAB for full picker */}
          <div className="flex items-center gap-1 bg-gray-2 border border-gray-4 rounded-lg shadow-inner py-1.5 px-4 h-fit">
            <span className="text-xs font-bold text-gray-11 uppercase tracking-wider select-none text-center min-w-[110px]">
              {selectedRange?.label || "Loading Range"}
            </span>
          </div>
        </div>

        <SystemUpdateManager />

        <ExpenseApprovalQueue isSuperAdmin={true} />
        <div className="bg-gray-1 border border-gray-4 p-4 sm:p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-gray-12">Set Sales Quotas</h2>
              <p className="text-xs text-gray-9 mt-0.5">
                Edit any quotas below, then hit <strong>Save All</strong> to commit changes.
              </p>
            </div>
            <button
              onClick={handleSaveAll}
              disabled={isSavingAll || !hasPendingChanges}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-all shrink-0
                bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/20
                disabled:bg-gray-4 disabled:text-gray-8 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {isSavingAll ? (
                <><Loader2 size={16} className="animate-spin" /> Saving...</>
              ) : (
                <><CheckCheck size={16} /> Save All</>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {salesEmployees.map((emp) => (
              <QuotaCard
                key={emp.id}
                employee={emp}
                value={draftQuotas[emp.id] ?? "0"}
                serverValue={quotaMap[emp.id] ?? 0}
                avatarUrl={resolvedAvatars[emp.id]}
                onChange={(val) =>
                  setDraftQuotas((prev) => ({ ...prev, [emp.id]: val }))
                }
              />
            ))}
          </div>
          {salesEmployees.length === 0 && (
            <p className="text-gray-9 italic">
              No employees found matching 'Sales' department criteria.
            </p>
          )}
        </div>

        <div className="pt-6">
          <EmployeePipelineMatrix selectedRange={selectedRange} />
        </div>
      </div>
      )}

      <FloatingMonthPicker
        selectedRange={selectedRange}
        onChange={setSelectedRange}
      />
    </ProtectedRoute>
  );
}

function QuotaCard({ employee, value, serverValue, avatarUrl, onChange }) {
  const isDirty = (parseFloat(value) || 0) !== serverValue;
  const inputRef = useRef(null);

  // Format the raw numeric string into a comma-separated display string
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

    // Only allow digits and one decimal point
    const filteredValue = rawValue.replace(/[^0-9.]/g, "");
    
    // Ensure only one decimal point exists
    const parts = filteredValue.split(".");
    const cleanValue = parts[0] + (parts.length > 1 ? "." + parts[1] : "");
    
    onChange(cleanValue);

    // Smart caret repositioning
    requestAnimationFrame(() => {
      if (inputRef.current) {
        const diff = inputRef.current.value.length - rawValue.length;
        const newPos = Math.max(0, oldSelectionStart + diff);
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    });
  };

  return (
    <div
      className={`bg-gray-2 border rounded-xl p-4 flex flex-col justify-between transition-all ${
        isDirty ? "border-purple-500/50 shadow-sm shadow-purple-500/10" : "border-gray-4"
      }`}
    >
      <div className="flex items-start gap-4 mb-4">
        <img
          src={avatarUrl || "/default-avatar.png"}
          alt={employee.name}
          className="w-12 h-12 rounded-xl border border-gray-4 object-cover shadow-sm bg-gray-3 shrink-0"
          onError={(e) => {
            e.target.src = "/default-avatar.png";
          }}
        />
        <div className="min-w-0">
          <p className="font-bold text-gray-12 text-lg truncate">{employee.name}</p>
          <p className="text-[10px] text-gray-9 font-black uppercase tracking-widest truncate">
            {employee.role || employee.sub_department || "Sales Rep"}
          </p>
        </div>
      </div>

      <div className="relative">
        <PhilippinePeso
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-8"
        />
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          placeholder="0"
          value={displayValue}
          onChange={handleChange}
          className={`w-full bg-gray-1 border text-gray-12 rounded-lg pl-8 pr-14 py-2 text-sm font-bold outline-none transition-colors ${
            isDirty
              ? "border-purple-500 focus:border-purple-400"
              : "border-gray-4 focus:border-purple-500"
          }`}
        />
        {isDirty && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-purple-400 uppercase tracking-widest pointer-events-none">
            edited
          </span>
        )}
      </div>
    </div>
  );
}
