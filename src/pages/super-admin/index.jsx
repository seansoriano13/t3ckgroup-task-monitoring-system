import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { salesService } from "../../services/salesService";
import ProtectedRoute from "../../components/ProtectedRoute.jsx";
import { useAuth } from "../../context/AuthContext";

import Spinner from "@/components/ui/Spinner";
import { storageService } from "../../services/storageService";
import EmployeePipelineMatrix from "../../components/EmployeePipelineMatrix.jsx";
import ExpenseApprovalQueue from "../../components/ExpenseApprovalQueue.jsx";
import FloatingMonthPicker from "../../components/FloatingMonthPicker.jsx";
import SystemUpdateBanner from "../../components/SystemUpdateBanner.jsx";
import SystemUpdateManager from "../../components/SystemUpdateManager.jsx";
import SalesPerformanceMetrics from "../../components/SalesPerformanceMetrics.jsx";
import QuotaManagementModule from "../../components/quota-management/QuotaManagementModule.jsx";
import PageHeader from "../../components/ui/PageHeader";
import PageContainer from "../../components/ui/PageContainer";
import { useEmployeeAvatarMap } from "../../hooks/useEmployeeAvatarMap";
import { useMemo } from "react";

const EMPTY_ARRAY = [];

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  // const queryClient = useQueryClient();

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

  const avatarMap = useEmployeeAvatarMap();
  const resolvedAvatars = useMemo(
    () => Object.fromEntries(avatarMap),
    [avatarMap],
  );

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

  return (
    <ProtectedRoute requireSuperAdmin={true}>
      {loadingEmps || loadingQuotas ? (
        <div className="flex h-[80vh] items-center justify-center space-x-2 text-muted-foreground">
          <Spinner size="sm" />
          <p className="font-black uppercase tracking-widest text-sm">
            Syncing Super Admin Metrics...
          </p>
        </div>
      ) : (
        <PageContainer className="pt-4">
          <PageHeader
            title="Admin Control"
            description="Manage Sales Quotas, configure tracking rules, and review department activities."
          >
            <FloatingMonthPicker
              selectedRange={selectedRange}
              onChange={setSelectedRange}
            />
          </PageHeader>

          <SystemUpdateBanner />

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

          {/* <div className="pt-6">
            <EmployeePipelineMatrix selectedRange={selectedRange} />
          </div>

          <SalesPerformanceMetrics
            selectedMonth={selectedRange.startDate}
            selectedLabel={selectedRange.label}
          /> */}
        </PageContainer>
      )}
    </ProtectedRoute>
  );
}
