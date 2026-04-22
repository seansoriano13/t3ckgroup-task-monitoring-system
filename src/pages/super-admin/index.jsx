import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { salesService } from "../../services/salesService";
import ProtectedRoute from "../../components/ProtectedRoute.jsx";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import {
  Loader2,
  CheckCheck,
  PhilippinePeso,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";
import { storageService } from "../../services/storageService";
import EmployeePipelineMatrix from "../../components/EmployeePipelineMatrix.jsx";
import ExpenseApprovalQueue from "../../components/ExpenseApprovalQueue.jsx";
import FloatingMonthPicker from "../../components/FloatingMonthPicker.jsx";
import SystemUpdateBanner from "../../components/SystemUpdateBanner.jsx";
import SystemUpdateManager from "../../components/SystemUpdateManager.jsx";
import SalesPerformanceMetrics from "../../components/SalesPerformanceMetrics.jsx";
import QuotaManagementModule from "../../components/quota-management/QuotaManagementModule.jsx";

const EMPTY_ARRAY = [];

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const currentDate = new Date();
  const currentMonthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-01`;
  const initialEndDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()}`;

  const [selectedRange, setSelectedRange] = useState({
    mode: "MONTHLY",
    label: new Date().toLocaleString("default", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
    startDate: currentMonthYear,
    endDate: initialEndDate,
    monthKeys: [currentMonthYear],
  });

  const [resolvedAvatars, setResolvedAvatars] = useState({});

  const HTTP_URL_RE = /^https?:\/\//i;

  // 1. Fetch Sales Employees
  const { data: salesEmployees = EMPTY_ARRAY, isLoading: loadingEmps } =
    useQuery({
      queryKey: ["salesEmployees"],
      queryFn: () => salesService.getSalesEmployees(),
    });

  // 2. Fetch Quotas for the Selected Range
  const { data: quotas = EMPTY_ARRAY, isLoading: loadingQuotas } = useQuery({
    queryKey: ["quotas", selectedRange],
    queryFn: () => {
      const keys =
        selectedRange?.monthKeys?.length > 0
          ? selectedRange.monthKeys
          : [selectedRange.startDate];
      return salesService.getQuotasByMonths
        ? salesService.getQuotasByMonths(keys)
        : salesService.getQuotasByMonth(selectedRange.startDate);
    },
  });

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
          const signedResults =
            await storageService.getSignedUrls(supabasePaths);
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

  return (
    <ProtectedRoute requireSuperAdmin={true}>
      {loadingEmps || loadingQuotas ? (
        <div className="flex h-[80vh] items-center justify-center space-x-2 text-muted-foreground">
          <Loader2 className="animate-spin text-indigo-500" />
          <p className="font-black uppercase tracking-widest text-sm">
            Syncing Super Admin Metrics...
          </p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto space-y-6 pb-10 px-4 sm:px-6 lg:px-8">
          <SystemUpdateBanner />
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
            <div>
              <h1 className="text-4xl font-black text-foreground tracking-tight flex items-center gap-2">
                Admin Control
              </h1>
              <p className="text-muted-foreground mt-1.5 font-medium text-sm uppercase tracking-[0.15em]">
                Manage Sales Quotas, configure tracking rules, and review
                department activities.
              </p>
            </div>

            {/* Inline range label — quick overview, FAB for full picker */}
            <div className="flex items-center gap-2">
              <FloatingMonthPicker
                selectedRange={selectedRange}
                onChange={setSelectedRange}
              />
            </div>
          </div>

          <SystemUpdateManager />

          <ExpenseApprovalQueue isSuperAdmin={true} />

          <div className="pt-2 pb-6">
            <QuotaManagementModule
              salesEmployees={salesEmployees}
              quotas={quotas}
              selectedRange={selectedRange}
              resolvedAvatars={resolvedAvatars}
              currentUser={user}
            />
          </div>

          <div className="pt-6">
            <EmployeePipelineMatrix selectedRange={selectedRange} />
          </div>

          <SalesPerformanceMetrics
            selectedMonth={selectedRange.startDate}
            selectedLabel={selectedRange.label}
          />
        </div>
      )}
    </ProtectedRoute>
  );
}
