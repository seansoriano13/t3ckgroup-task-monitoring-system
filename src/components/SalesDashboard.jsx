import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { salesService } from "../services/salesService";
import { REVENUE_STATUS } from "../constants/status";
import { formatDateToYMD } from "../utils/dateUtils";
import {
  Download,
  LayoutDashboard,
  PieChart,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

import { SummaryMetrics } from "./sales-dashboard/SummaryMetrics";
import { EmployeeRankingsTable } from "./sales-dashboard/EmployeeRankingsTable";
import { RevenueLogsTable } from "./sales-dashboard/RevenueLogsTable";
import { AnalyticsView } from "./sales-dashboard/AnalyticsView";

function formatDate(date) {
  return formatDateToYMD(date);
}

export default function SalesDashboard({ selectedMonth: propMonth }) {
  const { user } = useAuth();

  // === TAB STATE ===
  const [activeTab, setActiveTab] = useState("OVERVIEW"); // OVERVIEW | ANALYTICS

  // === OVERVIEW STATE ===
  const currentDate = new Date();
  const currentMonthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
  // eslint-disable-next-line no-unused-vars
  const [internalMonth, setInternalMonth] = useState(currentMonthYear);

  const rawMonth = propMonth || internalMonth;
  const selectedMonth =
    rawMonth?.length > 7 ? rawMonth.slice(0, 7) : rawMonth || currentMonthYear;

  // === ANALYTICS STATE ===
  const [startDate, setStartDate] = useState(
    formatDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
    ),
  );
  const [endDate, setEndDate] = useState(formatDate(currentDate));
  const [activePreset, setActivePreset] = useState("THIS_MONTH");

  const handleAnalyticPreset = (preset) => {
    setActivePreset(preset);
    const today = new Date();
    if (preset === "TODAY") {
      setStartDate(formatDate(today));
      setEndDate(formatDate(today));
    } else if (preset === "THIS_WEEK") {
      const start = new Date(today);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      setStartDate(formatDate(start));
      setEndDate(formatDate(today));
    } else if (preset === "THIS_MONTH") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(formatDate(start));
      setEndDate(formatDate(today));
    } else if (preset === "THIS_YEAR") {
      const start = new Date(today.getFullYear(), 0, 1);
      setStartDate(formatDate(start));
      setEndDate(formatDate(today));
    }
  };

  // === FETCH OVERVIEW QUERIES ===
  const { data: leaderboard = [], isLoading: isLdrLoading } = useQuery({
    queryKey: ["salesLeaderboard", selectedMonth],
    queryFn: () => salesService.getLeaderboardData(selectedMonth),
    refetchInterval: 15000,
  });

  const { data: appSettings } = useQuery({
    queryKey: ["appSettings"],
    queryFn: () => salesService.getAppSettings(),
  });
  const isVerificationEnforced =
    appSettings?.require_revenue_verification === true;

  const { data: overviewLogs = [] } =
    useQuery({
      queryKey: ["salesRevenueLogs", selectedMonth],
      queryFn: () => salesService.getRevenueLogsByMonth(selectedMonth),
      refetchInterval: 15000,
    });

  // === FETCH ANALYTICS QUERIES ===
  const { data: analyticsLogs = [] } = useQuery({
    queryKey: ["salesAnalytics", startDate, endDate],
    queryFn: () => salesService.getRevenueAnalysis(startDate, endDate),
    enabled: activeTab === "ANALYTICS" && !!startDate && !!endDate,
    refetchInterval: 15000,
  });

  // Calculate Overview Aggregates
  const totalWon = leaderboard.reduce((acc, l) => acc + l.revenueWon, 0);
  const totalLost = leaderboard.reduce((acc, l) => acc + l.revenueLost, 0);
  const totalQuota = leaderboard.reduce((acc, l) => acc + Number(l.quota), 0);
  const companyPct =
    totalQuota > 0 ? Math.round((totalWon / totalQuota) * 100) : 0;

  // Calculate Analytics Aggregates
  const anAggs = useMemo(() => {
    let won = 0;
    let lost = 0;
    const byEmp = {};
    const byProd = {};

    analyticsLogs.forEach((log) => {
      const val = Number(log.revenue_amount) || 0;
      const isWon = log.status === REVENUE_STATUS.COMPLETED || log.status === REVENUE_STATUS.APPROVED;

      if (isWon) won += val;
      else lost += val;

      // Employee logic
      const empName = log.employees?.name || "Unknown Rep";
      if (!byEmp[empName]) byEmp[empName] = { won: 0, lost: 0 };
      if (isWon) byEmp[empName].won += val;
      else byEmp[empName].lost += val;

      // Product logic
      const prod = log.product_item_sold || "Unknown Product";
      if (!byProd[prod]) byProd[prod] = { won: 0, lost: 0, count: 0 };
      byProd[prod].count += 1;
      if (isWon) byProd[prod].won += val;
      else byProd[prod].lost += val;
    });

    const empArr = Object.entries(byEmp)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.won - a.won);
    const prodArr = Object.entries(byProd)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.won - a.won);

    return { won, lost, empArr, prodArr };
  }, [analyticsLogs]);

  const printMonthlyReport = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10 px-2 sm:px-0">
      {/* HEADER & TABS */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-4 pb-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-gray-12 flex items-center gap-3 uppercase">
            Monthly Accomplishment Report
          </h1>
          <p className="text-gray-9 mt-1 font-medium text-sm">
            Monitor real-time pipeline, quotas, and granular date-ranged
            analytics.
          </p>
        </div>

        <div className="flex bg-gray-2 border border-gray-4 rounded-xl p-1 shadow-inner w-max">
          <button
            onClick={() => setActiveTab("OVERVIEW")}
            className={`px-6 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${activeTab === "OVERVIEW" ? "bg-primary text-white shadow" : "text-gray-9 hover:text-gray-12"}`}
          >
            <LayoutDashboard size={16} /> Monthly Overview
          </button>
          <button
            onClick={() => setActiveTab("ANALYTICS")}
            className={`px-6 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${activeTab === "ANALYTICS" ? "bg-red-9 text-white shadow" : "text-gray-9 hover:text-gray-12"}`}
          >
            <PieChart size={16} /> Analytics
          </button>
        </div>
      </div>

      {/* PRINT HEADER */}
      <div className="hidden print:block mb-8 border-b-2 border-gray-12 pb-4">
        <h1 className="text-2xl font-black">
          Sales Department Report (
          {activeTab === "OVERVIEW"
            ? selectedMonth
            : `${startDate} to ${endDate}`}
          )
        </h1>
      </div>

      {activeTab === "OVERVIEW" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-end mb-6 print:hidden">
            <button
              onClick={printMonthlyReport}
              className="bg-red-9 hover:bg-red-10 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm shadow-blue-500/20"
            >
              <Download size={16} /> Export PDF
            </button>
          </div>

          <SummaryMetrics
            totalWon={totalWon}
            totalLost={totalLost}
            companyPct={companyPct}
          />

          <EmployeeRankingsTable
            leaderboard={leaderboard}
            selectedMonth={selectedMonth}
            isLoading={isLdrLoading}
            currentUser={user}
          />

          {isVerificationEnforced && (
            <RevenueLogsTable logs={overviewLogs} />
          )}
        </div>
      )}

      {activeTab === "ANALYTICS" && (
        <AnalyticsView
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          activePreset={activePreset}
          handleAnalyticPreset={handleAnalyticPreset}
          printMonthlyReport={printMonthlyReport}
          anAggs={anAggs}
        />
      )}
    </div>
  );
}
