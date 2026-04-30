import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { salesService } from "../services/salesService";
import { REVENUE_STATUS } from "../constants/status";
import { Download } from "lucide-react";
import { useAuth } from "../context/AuthContext";

import { SummaryMetrics } from "./sales-dashboard/SummaryMetrics";
import { EmployeeRankingsTable } from "./sales-dashboard/EmployeeRankingsTable";
import { RevenueLogsTable } from "./sales-dashboard/RevenueLogsTable";
import SalesPerformanceMetrics from "./SalesPerformanceMetrics";
import {
  RepRevenueChart,
  ProductBreakdownChart,
  WinRateGauge,
  RevenueTrendChart,
} from "./sales-dashboard/SalesCharts";
import PageHeader from "./ui/PageHeader";

export default function SalesDashboard({ globalRange }) {
  const { user } = useAuth();
  const isAdmin =
    user?.isSuperAdmin ||
    user?.is_super_admin ||
    user?.isHr ||
    user?.is_hr ||
    user?.isHead ||
    user?.is_head;

  // === DATA QUERIES ===
  const startDate = globalRange?.startDate;
  const endDate = globalRange?.endDate;
  const rangeLabel = globalRange?.label || "";
  const rangeMode = globalRange?.mode || "MONTHLY";
  const monthKeys = globalRange?.monthKeys || [];
  const isMonthly = rangeMode === "MONTHLY";
  const { data: leaderboardData, isLoading: isLdrLoading } = useQuery({
    queryFn: () =>
      salesService.getLeaderboardData(startDate, endDate, monthKeys),
    enabled: !!startDate && !!endDate,
    refetchInterval: false,
  });

  const leaderboard = leaderboardData?.rankings || [];
  const summary = leaderboardData?.summary || {
    totalWon: 0,
    totalLost: 0,
    companyPct: 0,
    teamWinRate: null,
  };

  const { data: appSettings } = useQuery({
    queryKey: ["appSettings"],
    queryFn: () => salesService.getAppSettings(),
  });
  const isVerificationEnforced =
    appSettings?.require_revenue_verification === true;

  // Revenue logs for the audit table (only in monthly mode)
  const { data: overviewLogs = [] } = useQuery({
    queryKey: ["salesRevenueLogs", startDate, endDate],
    queryFn: () => salesService.getRevenueLogsByMonth(startDate?.slice(0, 7)),
    enabled: isMonthly && isVerificationEnforced && !!startDate,
    refetchInterval: false,
  });

  // Raw revenue for product analysis
  const { data: revenueLogs = [] } = useQuery({
    queryKey: ["salesRevenueAnalysis", startDate, endDate],
    queryFn: () => salesService.getRevenueAnalysis(startDate, endDate),
    enabled: !!startDate && !!endDate,
    refetchInterval: false,
  });

  // // Activities for SWOT & execution metrics (admin only)
  // const { data: activities = [] } = useQuery({
  //   queryKey: ["salesActivitiesRange", startDate, endDate],
  //   queryFn: () => salesService.getSalesActivitiesByRange(startDate, endDate),
  //   enabled: isAdmin && !!startDate && !!endDate,
  //   refetchInterval: 30000,
  // });

  // === COMPUTED AGGREGATES ===
  const { totalWon, totalLost, companyPct, teamWinRate } = summary;

  // Product breakdown
  const productData = useMemo(() => {
    const byProd = {};
    revenueLogs.forEach((log) => {
      const val = Number(log.revenue_amount) || 0;
      const prod = log.product_item_sold || "Unknown Product";
      const isWon =
        log.status === REVENUE_STATUS.COMPLETED ||
        log.status === REVENUE_STATUS.APPROVED;
      if (!byProd[prod])
        byProd[prod] = { name: prod, won: 0, lost: 0, count: 0 };
      byProd[prod].count++;
      if (isWon) byProd[prod].won += val;
      else byProd[prod].lost += val;
    });
    return Object.values(byProd).sort((a, b) => b.won - a.won);
  }, [revenueLogs]);

  const printReport = () => window.print();

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-6 px-2 sm:px-0">
      {/* HEADER */}
      <div className="flex flex-col gap-4 border-b border-mauve-4 pb-4 print:hidden">
        <PageHeader
          title="Sales Accomplishment Report"
          description="Revenue performance, quota tracking, and strategic analytics."
        />
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          {/* <div>
            <h1 className="text-2xl font-black text-foreground flex items-center uppercase">
              Sales Accomplishment Report
              {rangeLabel && (
                <span className="text-mauve-11 font-bold px-3 py-1 bg-mauve-2 border border-mauve-4 rounded-xl text-lg ml-3 shadow-sm lowercase">
                  — {rangeLabel}
                </span>
              )}
            </h1>
            <p className="text-muted-foreground mt-1 font-medium text-sm">
              Revenue performance, quota tracking, and strategic analytics.
            </p>
          </div> */}

          {/* <button
            onClick={printReport}
            className="bg-card hover:bg-mauve-2 text-foreground font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm border border-mauve-4 shrink-0 print:hidden"
          >
            <Download size={16} className="text-muted-foreground" /> Export PDF
          </button> */}
        </div>
      </div>

      {/* PRINT HEADER */}
      <div className="hidden print:block mb-8 border-b-2 border-gray-12 pb-4">
        <h1 className="text-2xl font-black">
          Sales Department Report ({rangeLabel})
        </h1>
      </div>

      {/* KPI SUMMARY */}
      <SummaryMetrics
        totalWon={totalWon}
        totalLost={totalLost}
        companyPct={companyPct}
        winRate={teamWinRate}
        showQuota={true}
      />

      {/* EMPLOYEE RANKINGS TABLE */}
      <EmployeeRankingsTable
        leaderboard={leaderboard}
        label={rangeLabel}
        isLoading={isLdrLoading}
        currentUser={user}
        showQuota={true}
      />

      {/* CHARTS — visible to admins */}
      {isAdmin && leaderboard.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <RevenueTrendChart revenueLogs={revenueLogs} />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <RepRevenueChart leaderboard={leaderboard} />
            <WinRateGauge leaderboard={leaderboard} />
            {productData.length > 0 && (
              <ProductBreakdownChart productData={productData} />
            )}
          </div>
        </div>
      )}

      {/* REVENUE AUDIT LOG — conditional, monthly only */}
      {isMonthly && isVerificationEnforced && (
        <RevenueLogsTable logs={overviewLogs} />
      )}

      {/* DETAILED PERFORMANCE METRICS (Execution rates, pipelines, financial ROI) */}
      <div className="mt-8 border-t border-mauve-4 pt-8">
        <SalesPerformanceMetrics globalRange={globalRange} />
      </div>
    </div>
  );
}
