import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "../../services/salesService";
import { useAuth } from "../../context/AuthContext";
import ProtectedRoute from "../../components/ProtectedRoute.jsx";
import toast from "react-hot-toast";
import { Loader2, CheckCheck, PhilippinePeso, ChevronLeft, ChevronRight } from "lucide-react";
import SalesPerformanceMetrics from "../../components/SalesPerformanceMetrics.jsx";
import EmployeePipelineMatrix from "../../components/EmployeePipelineMatrix.jsx";
import ExpenseApprovalQueue from "../../components/ExpenseApprovalQueue.jsx";
import FloatingMonthPicker from "../../components/FloatingMonthPicker.jsx";
import SuperAdminSettings from "../../components/SuperAdminSettings.jsx";

const EMPTY_ARRAY = [];

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const currentDate = new Date();
  const currentMonthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-01`;

  const [selectedMonth, setSelectedMonth] = useState(currentMonthYear);

  // Draft quotas: map of employeeId -> value string (tracks unsaved edits)
  const [draftQuotas, setDraftQuotas] = useState({});
  const [isSavingAll, setIsSavingAll] = useState(false);

  // 1. Fetch Sales Employees
  const { data: salesEmployees = EMPTY_ARRAY, isLoading: loadingEmps } = useQuery({
    queryKey: ["salesEmployees"],
    queryFn: () => salesService.getSalesEmployees(),
  });

  // 2. Fetch Quotas for the Selected Month
  const { data: quotas = EMPTY_ARRAY, isLoading: loadingQuotas } = useQuery({
    queryKey: ["quotas", selectedMonth],
    queryFn: () => salesService.getQuotasByMonth(selectedMonth),
  });

  // 3. Fetch all activities for Stats
  const { data: allActivities = EMPTY_ARRAY, isLoading: loadingAct } = useQuery({
    queryKey: ["allSalesActivitiesAdmin"],
    queryFn: () => salesService.getAllSalesActivities(),
  });

  // Derive server quota map
  const quotaMap = useMemo(() => {
    return quotas.reduce((acc, q) => {
      acc[q.employee_id] = q.amount_target;
      return acc;
    }, {});
  }, [quotas]);

  // Sync draft state whenever fetched quotas change — fixes stale state on month navigation
  useEffect(() => {
    if (salesEmployees.length === 0) return;
    const freshDraft = {};
    salesEmployees
      .filter((e) => !e.is_super_admin)
      .forEach((emp) => {
        freshDraft[emp.id] = String(quotaMap[emp.id] ?? 0);
      });
    setDraftQuotas(freshDraft);
  }, [quotas, salesEmployees]);

  // Check if any draft differs from server value
  const hasPendingChanges = useMemo(() => {
    return salesEmployees
      .filter((e) => !e.is_super_admin)
      .some((emp) => {
        const draft = parseFloat(draftQuotas[emp.id]) || 0;
        const server = quotaMap[emp.id] ?? 0;
        return draft !== server;
      });
  }, [draftQuotas, quotaMap, salesEmployees]);

  const handleSaveAll = async () => {
    const changed = salesEmployees
      .filter((e) => !e.is_super_admin)
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
      await Promise.all(
        changed.map(({ employeeId, amount }) =>
          salesService.upsertQuota(employeeId, amount, selectedMonth)
        )
      );
      queryClient.invalidateQueries({ queryKey: ["quotas", selectedMonth] });
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

          {/* Inline month navigator — arrows for quick prev/next, FAB for full picker */}
          <div className="flex items-center gap-1 bg-gray-2 border border-gray-4 rounded-lg shadow-inner">
            <button
              onClick={() => {
                const parts = selectedMonth.split('-');
                let y = parseInt(parts[0], 10);
                let m = parseInt(parts[1], 10);
                m -= 1;
                if (m < 1) { m = 12; y -= 1; }
                setSelectedMonth(`${y}-${String(m).padStart(2, '0')}-01`);
              }}
              className="p-2 hover:bg-gray-3 rounded-l-lg text-gray-9 hover:text-gray-12 transition-colors"
              title="Previous month"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="px-2 text-xs font-bold text-gray-11 uppercase tracking-wider select-none min-w-[110px] text-center">
              {new Date(selectedMonth).toLocaleString("default", { month: "long", year: "numeric", timeZone: "UTC" })}
            </span>
            <button
              onClick={() => {
                const parts = selectedMonth.split('-');
                let y = parseInt(parts[0], 10);
                let m = parseInt(parts[1], 10);
                m += 1;
                if (m > 12) { m = 1; y += 1; }
                setSelectedMonth(`${y}-${String(m).padStart(2, '0')}-01`);
              }}
              disabled={selectedMonth >= currentMonthYear}
              className={`p-2 rounded-r-lg transition-colors ${selectedMonth >= currentMonthYear ? "text-gray-4 cursor-not-allowed" : "hover:bg-gray-3 text-gray-9 hover:text-gray-12"}`}
              title="Next month"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        <ExpenseApprovalQueue isSuperAdmin={true} />

        <SuperAdminSettings />

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
            {salesEmployees.filter((emp) => !emp.is_super_admin).map((emp) => (
              <QuotaCard
                key={emp.id}
                employee={emp}
                value={draftQuotas[emp.id] ?? "0"}
                serverValue={quotaMap[emp.id] ?? 0}
                onChange={(val) =>
                  setDraftQuotas((prev) => ({ ...prev, [emp.id]: val }))
                }
              />
            ))}
          </div>
          {salesEmployees.filter((emp) => !emp.is_super_admin).length === 0 && (
            <p className="text-gray-9 italic">
              No employees found matching 'Sales' department criteria.
            </p>
          )}
        </div>

        <SalesPerformanceMetrics selectedMonth={selectedMonth} />
        <div className="pt-6">
          <EmployeePipelineMatrix selectedMonth={selectedMonth} />
        </div>
      </div>
      )}

      <FloatingMonthPicker
        selectedMonth={selectedMonth}
        onChange={setSelectedMonth}
      />
    </ProtectedRoute>
  );
}

function QuotaCard({ employee, value, serverValue, onChange }) {
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
      <div>
        <p className="font-bold text-gray-12 text-lg truncate">{employee.name}</p>
        <p className="text-xs text-gray-9 font-bold uppercase tracking-wide mb-4 truncate">
          {employee.role || employee.sub_department || "Sales Rep"}
        </p>
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
