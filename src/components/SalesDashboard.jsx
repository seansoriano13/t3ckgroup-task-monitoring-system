import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { salesService } from "../services/salesService";
import { REVENUE_STATUS } from "../constants/status";
import { formatDateToYMD } from "../utils/dateUtils";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Download,
  AlertCircle,
  FileText,
  LayoutDashboard,
  PieChart,
  Calendar,
  Package,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "./StatusBadge.jsx";

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

  // Sync with prop if provided, otherwise use internal
  const rawMonth = propMonth || internalMonth;
  // Standardize to YYYY-MM and YYYY-MM-01
  const selectedMonth =
    rawMonth?.length > 7 ? rawMonth.slice(0, 7) : rawMonth || currentMonthYear;

  // === ANALYTICS STATE ===
  const [startDate, setStartDate] = useState(
    formatDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
    ),
  ); // default this month
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
      const isWon = log.status?.toUpperCase().includes(REVENUE_STATUS.COMPLETED);

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
          {/* OVERVIEW FILTER */}
          <div className="flex justify-end mb-6 print:hidden">
            <div className="flex gap-4 items-center">
              {/* <div className="bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 flex items-center shadow-inner">
                <span className="text-xs font-bold text-gray-9 mr-3 uppercase tracking-wider">
                  Target Month:
                </span>
                <DatePicker
                  selected={new Date(selectedMonth)}
                  onChange={(date) => {
                    if (date) {
                      const m = String(date.getMonth() + 1).padStart(2, "0");
                      setSelectedMonth(`${date.getFullYear()}-${m}`);
                    }
                  }}
                  showMonthYearPicker
                  dateFormat="MMMM yyyy"
                  className="bg-transparent text-gray-12 font-bold outline-none cursor-pointer flex-1 min-w-[120px] w-full"
                />
              </div> */}
              <button
                onClick={printMonthlyReport}
                className="bg-red-9 hover:bg-red-10 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm  shadow-blue-500/20"
              >
                <Download size={16} /> Export PDF
              </button>
            </div>
          </div>

          {/* DEPARTMENT AGGREGATES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-1 border border-gray-4 p-6 rounded-2xl  border-b-4 transition-transform hover:-translate-y-1">
              <h3 className="text-xs font-bold text-gray-9 uppercase tracking-widest flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-green-500" /> Total
                Completed Sales
              </h3>
              <p className="text-4xl font-black text-gray-12">
                ₱{totalWon.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-1 border border-gray-4 p-6 rounded-2xl  border-b-4 transition-transform hover:-translate-y-1">
              <h3 className="text-xs font-bold text-gray-9 uppercase tracking-widest flex items-center gap-2 mb-2">
                <TrendingDown size={14} className="text-red-500" /> Total Lost
                Sales
              </h3>
              <p className="text-4xl font-black text-gray-12">
                ₱{totalLost.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-1 border border-gray-4 p-6 rounded-2xl  border-b-4 relative overflow-hidden transition-transform hover:-translate-y-1">
              <h3 className="text-xs font-bold text-gray-9 uppercase tracking-widest flex items-center gap-2 mb-2">
                <Trophy size={14} className="text-blue-500" /> Quota Percentage
              </h3>
              <p className="text-4xl font-black text-gray-12">{companyPct}%</p>
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            </div>
          </div>

          {/* THE LEADERBOARD */}
          <div className="bg-gray-1 border border-gray-4 rounded-2xl overflow-hidden mt-8">
            <div className="bg-gray-2 border-b border-gray-4 p-4 flex justify-between items-center">
              <h2 className="font-black text-gray-12 text-sm uppercase tracking-wider">
                Employee Rankings [{selectedMonth}]
              </h2>
              {isLdrLoading && (
                <span className="text-[10px] uppercase font-bold text-primary flex items-center gap-1 animate-pulse">
                  <TrendingUp size={12} /> Syncing...
                </span>
              )}
            </div>
            {leaderboard.length === 0 ? (
              <div className="p-10 text-center text-gray-9 flex flex-col items-center">
                <AlertCircle size={32} className="mb-2 opacity-50" />
                <p className="font-medium">
                  No sales quotas have been distributed for this month yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-2 text-xs font-bold text-gray-9 uppercase tracking-widest border-b border-gray-4">
                      <th className="p-4 w-12 text-center">Rank</th>
                      <th className="p-4">Employee</th>
                      <th className="p-4 text-right">Quota Target</th>
                      <th className="p-4 text-right">Completed Sales</th>
                      <th className="p-4 text-right">Lost Sales</th>
                      <th className="p-4 text-center">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-4">
                    {leaderboard.map((emp, idx) => {
                      const pct =
                        emp.quota > 0
                          ? Math.round((emp.revenueWon / emp.quota) * 100)
                          : 0;
                      const isTop = idx === 0 && pct > 0;
                      const isSelf = user?.id === emp.employee_id;
                      const canSeeNumbers = user?.isSuperAdmin || user?.is_super_admin || isSelf;

                      return (
                        <tr
                          key={emp.name}
                          className={`hover:bg-gray-3 transition-colors ${isTop ? "bg-yellow-500/5" : ""}`}
                        >
                          <td className="p-4 text-center font-black">
                            {isTop ? (
                              <Trophy
                                size={18}
                                className="mx-auto drop-shadow"
                              />
                            ) : (
                              <span className="text-gray-9">#{idx + 1}</span>
                            )}
                          </td>
                          <td className="p-4 font-bold text-gray-12 text-sm">
                            {emp.name}{" "}
                            {isSelf && (
                              <span className="ml-2 text-[10px] bg-gray-12 text-gray-1 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                You
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right font-mono text-gray-11 text-sm">
                            {canSeeNumbers ? (
                              `₱${Number(emp.quota).toLocaleString()}`
                            ) : (
                              <span className="text-gray-8 italic font-sans">
                                {pct}% Quota
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right font-mono text-green-400 font-black text-sm">
                            {canSeeNumbers ? (
                              `₱${emp.revenueWon.toLocaleString()}`
                            ) : (
                              <span className="text-green-900 font-sans">
                                {pct}% Achieved
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right font-mono text-red-400 font-bold text-sm">
                            {canSeeNumbers ? (
                              `₱${emp.revenueLost.toLocaleString()}`
                            ) : (
                              <span className="text-gray-6 italic font-sans">
                                N/A
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2 w-max mx-auto">
                              <div className="w-24 h-2 bg-gray-4 rounded-full overflow-hidden flex-shrink-0 shadow-inner">
                                <div
                                  className={`h-full ${pct >= 100 ? "transition-all duration-1000 bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : pct >= 50 ? "transition-all duration-1000 bg-yellow-500" : "transition-all duration-1000 bg-red-500"}`}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-xs font-bold text-gray-12 w-8">
                                {pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* REVENUE LOGS SECTION */}
          {isVerificationEnforced && (
            <div className="bg-gray-1 border border-gray-4 rounded-2xl p-6 shadow-xl overflow-hidden mt-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-gray-12 flex items-center gap-2">
                    <FileText className="text-primary" size={16} /> Approved
                    Sales Logs
                  </h2>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-4">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-2 text-xs font-bold text-gray-9 uppercase tracking-widest border-b border-gray-4">
                      <th className="p-3">Date</th>
                      <th className="p-3">Sales Rep</th>
                      <th className="p-3">Account</th>
                      <th className="p-3">Product</th>
                      <th className="p-3 text-right">Value (₱)</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-4">
                    {overviewLogs.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="p-6 text-center text-gray-9 py-10 font-medium"
                        >
                          No sales logged for this month view.
                        </td>
                      </tr>
                    ) : (
                      overviewLogs.map((log) => (
                        <tr
                          key={log.id}
                          className="hover:bg-gray-2 transition-colors"
                        >
                          <td className="p-3 font-mono text-xs text-gray-11 whitespace-nowrap">
                            {log.date}
                          </td>
                          <td className="p-3 font-bold text-[13px] text-gray-12">
                            {log.employees?.name}
                          </td>
                          <td
                            className="p-3 text-[13px] text-gray-12 font-medium truncate max-w-[200px]"
                            title={log.account}
                          >
                            {log.account}
                          </td>
                          <td className="p-3 text-[13px] text-gray-11 truncate max-w-[200px]">
                            {log.product_item_sold}
                          </td>
                          <td className="p-3 font-mono text-sm text-right font-black text-gray-12">
                            {Number(log.revenue_amount).toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            <StatusBadge status={log.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "ANALYTICS" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          {/* DATE FILTERS */}
          <div className="bg-gray-1 border border-gray-4 rounded-2xl p-6 shadow-sm print:hidden">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-10 mb-4 flex items-center gap-2">
              <Calendar size={14} /> Date Range
            </h2>

            <div className="flex flex-col lg:flex-row gap-6 lg:items-end justify-between">
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="text-[10px] font-bold text-gray-8 uppercase tracking-wider block mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setActivePreset(null);
                    }}
                    className="bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 font-bold outline-none focus:border-blue-500 w-[140px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-8 uppercase tracking-wider block mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setActivePreset(null);
                    }}
                    className="bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 font-bold outline-none focus:border-blue-500 w-[140px]"
                  />
                </div>
              </div>

              <div className="flex gap-1 bg-gray-2 p-1 rounded-xl border border-gray-4 max-w-full overflow-x-auto">
                <button
                  onClick={() => handleAnalyticPreset("TODAY")}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap rounded-lg transition-colors ${activePreset === "TODAY" ? "bg-gray-4 text-gray-12 shadow-sm" : "text-gray-9 hover:text-gray-12 hover:bg-gray-3"}`}
                >
                  Today
                </button>
                <button
                  onClick={() => handleAnalyticPreset("THIS_WEEK")}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap rounded-lg transition-colors ${activePreset === "THIS_WEEK" ? "bg-gray-4 text-gray-12 shadow-sm" : "text-gray-9 hover:text-gray-12 hover:bg-gray-3"}`}
                >
                  This Week
                </button>
                <button
                  onClick={() => handleAnalyticPreset("THIS_MONTH")}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap rounded-lg transition-colors ${activePreset === "THIS_MONTH" ? "bg-gray-4 text-gray-12 shadow-sm" : "text-gray-9 hover:text-gray-12 hover:bg-gray-3"}`}
                >
                  This Month
                </button>
                <button
                  onClick={() => handleAnalyticPreset("THIS_YEAR")}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap rounded-lg transition-colors ${activePreset === "THIS_YEAR" ? "bg-gray-4 text-gray-12 shadow-sm" : "text-gray-9 hover:text-gray-12 hover:bg-gray-3"}`}
                >
                  This Year
                </button>
              </div>

              <button
                onClick={printMonthlyReport}
                className="bg-red-9 hover:bg-red-10 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm  shadow-blue-500/20 whitespace-nowrap"
              >
                <Download size={16} /> Export View
              </button>
            </div>
          </div>

          {/* ANALYTICS AGGREGATES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-4 p-8 rounded-2xl  flex flex-col justify-center">
              <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-2 ">
                <TrendingUp className="text-green-600" size={16} /> Period
                Closed Revenue
              </h3>
              <p className="text-5xl font-black text-gray-12">
                ₱{anAggs.won.toLocaleString()}
              </p>
            </div>
            <div className="border border-gray-4 p-8 rounded-2xl  flex flex-col justify-center">
              <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-2">
                <TrendingDown size={14} className="text-red-500" /> Period Lost
                Revenue
              </h3>
              <p className="text-4xl font-black text-gray-11">
                ₱{anAggs.lost.toLocaleString()}
              </p>
              <span className="text-xs text-gray-8 mt-2 block italic">
                Lost opportunities inside query boundary.
              </span>
            </div>
          </div>

          {/* DETAILS GRIDS */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* By REP */}
            <div className="bg-gray-1 border border-gray-4 rounded-2xl p-6 ">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-12 flex items-center gap-2 border-b border-gray-4 pb-4 mb-4">
                <Trophy size={16} /> Representative Payouts
              </h3>
              <div className="space-y-4">
                {anAggs.empArr.length === 0 ? (
                  <p className="text-sm text-gray-8 text-center py-4 italic">
                    No revenue recorded in this exact date range.
                  </p>
                ) : (
                  anAggs.empArr.map((emp, i) => (
                    <div
                      key={emp.name}
                      className="flex justify-between items-center bg-gray-2 p-3 rounded-xl border border-gray-3 hover:border-gray-4 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${i === 0 ? "bg-yellow-500/20 text-yellow-600" : "bg-gray-4 text-gray-10"}`}
                        >
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-black text-gray-12">
                            {emp.name}
                          </p>
                          <p className="text-[10px] uppercase font-bold text-gray-8 tracking-wider">
                            Lost: ₱{emp.lost.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-black  text-lg">
                          ₱{emp.won.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* By PRODUCT */}
            <div className="bg-gray-1 border border-gray-4 rounded-2xl p-6 ">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-12 flex items-center gap-2 border-b border-gray-4 pb-4 mb-4">
                <Package size={16} className="" /> Top{" "}
              </h3>
              <div className="space-y-4">
                {anAggs.prodArr.length === 0 ? (
                  <p className="text-sm text-gray-8 text-center py-4 italic">
                    No products matched query.
                  </p>
                ) : (
                  anAggs.prodArr.map((prod) => (
                    <div
                      key={prod.name}
                      className="bg-gray-2 p-4 rounded-xl border border-gray-3 transition-transform hover:-translate-y-0.5 shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p
                          className="text-sm font-bold text-gray-12 truncate block pr-2"
                          title={prod.name}
                        >
                          {prod.name}
                        </p>
                        <span className="text-[10px] bg-gray-4 text-gray-11 px-2 py-0.5 rounded font-black tracking-widest uppercase shrink-0">
                          Qty: {prod.count}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-mono font-black">
                        <span className="">
                          Completed Sales: ₱{prod.won.toLocaleString()}
                        </span>
                        <span className="">
                          Lost Sales: ₱{prod.lost.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
