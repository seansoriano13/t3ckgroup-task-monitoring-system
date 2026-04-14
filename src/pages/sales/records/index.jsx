import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "../../../services/salesService";
import { useAuth } from "../../../context/AuthContext";
import { useLocation, useNavigate } from "react-router";
import ProtectedRoute from "../../../components/ProtectedRoute.jsx";
import {
  Search,
  Briefcase,
  FileText,
  CheckCircle2,
  Circle,
  XCircle,
  AlertCircle,
  DollarSign,
  LayoutList,
  Table2,
  Columns,
  Users,
  Edit,
  X,
  Lock,
  Unlock,
  MessageSquare,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import SalesTaskDetailsModal from "../../../components/SalesTaskDetailsModal.jsx";
import SalesFilters from "../../../components/SalesFilters.jsx";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Clock } from "lucide-react";
import { REVENUE_STATUS, RECORD_TYPE } from "../../../constants/status";
import { useRef } from "react";

export default function SalesRecordsPage() {
  const { user } = useAuth();
  const isMasterHead =
    (user?.is_head || user?.isHead) &&
    !user?.sub_department &&
    !user?.subDepartment;
  const canViewAllSales = user?.isSuperAdmin || user?.isHr || isMasterHead;
  const [activeTab, setActiveTab] = useState("ACTIVITIES"); // ACTIVITIES or REVENUE
  const [viewMode, setViewMode] = useState("BOARD");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterEmp, setFilterEmp] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [filterRecordType, setFilterRecordType] = useState("ALL");
  const [timeframe, setTimeframe] = useState("MONTHLY");
  const [selectedDateFilter, setSelectedDateFilter] = useState("");
  const [sortBy, setSortBy] = useState("NEWEST");

  const [selectedActivity, setSelectedActivity] = useState(null);
  const [editingRevenue, setEditingRevenue] = useState(null);

  // --- PAGINATION STATES ---
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [revenuePage, setRevenuePage] = useState(1);
  const itemsPerPage = 15;

  const queryClient = useQueryClient();
  const { data: appSettings } = useQuery({
    queryKey: ["appSettings"],
    queryFn: () => salesService.getAppSettings(),
    enabled: !!user?.id,
  });

  const updateRevMutation = useMutation({
    mutationFn: ({ id, payload }) => salesService.updateRevenueLog(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allRevenueLogs"] });
      toast.success("Revenue record updated successfully!");
      setEditingRevenue(null);
    },
    onError: (err) => toast.error(err.message),
  });

  // Super Admin only — soft-delete a revenue log (sets is_deleted=true in DB)
  const deleteRevenueMutation = useMutation({
    mutationFn: (id) => salesService.softDeleteRevenueLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allRevenueLogs"] });
      toast.success("Revenue log removed.");
    },
    onError: (err) => toast.error(err.message),
  });

  const location = useLocation();
  const navigate = useNavigate();

  const initializedRef = useRef(false);
  useEffect(() => {
    // Wait until the user object is ready and we haven't initialized yet
    if (user?.id && !initializedRef.current) {
      initializedRef.current = true; // Lock it down so it only runs once
      // Stop here if they came from a notification (let the deep link hook handle it)

      if (location.state?.eventType || location.state?.openRevenueId) {
        return;
      }

      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, "0");
      const d = String(today.getDate()).padStart(2, "0");

      queueMicrotask(() => {
        if (canViewAllSales) {
          // HR, Admins & Master Heads: Default to current Month & Year
          setTimeframe("MONTHLY");
          setSelectedDateFilter(`${y}-${m}`);
        } else {
          // Standard Employees: Default to strictly Today
          setTimeframe("DAILY");
          setSelectedDateFilter(`${y}-${m}-${d}`);
        }
      });
    }
  }, [user, canViewAllSales, location.state]);

  // Fetch all activities
  const { data: rawActivities = [], isLoading: isActLoading } = useQuery({
    queryKey: ["allSalesActivities"],
    queryFn: () => salesService.getAllSalesActivities(),
    enabled: !!user?.id,
  });

  // Fetch all revenue logs
  const { data: rawRevenue = [], isLoading: isRevLoading } = useQuery({
    queryKey: ["allRevenueLogs"],
    queryFn: () => salesService.getAllRevenueLogs(),
    enabled: !!user?.id,
  });

  const isVerificationEnforced =
    appSettings?.require_revenue_verification === true;

  // 🔥 DEEP LINKING NOTIFICATION HOOK
  useEffect(() => {
    if (location.state?.openRevenueId && rawRevenue.length > 0) {
      const targetRev = rawRevenue.find(
        (r) => r.id === location.state.openRevenueId,
      );
      if (targetRev) {
        queueMicrotask(() => {
          setActiveTab("REVENUE");
          setEditingRevenue(targetRev);
          // Clear state to prevent re-firing down the line
          navigate(location.pathname, { replace: true, state: {} });
        });
      }
    } else if (
      (location.state?.eventType || location.state?.openActivityId) &&
      rawActivities.length > 0
    ) {
      const eventType = location.state.eventType;
      const activityId =
        location.state.openActivityId || location.state.openEventId;

      let targetAct = null;
      if (eventType === "SALES_PLAN_SUBMITTED") {
        targetAct = rawActivities.find(
          (a) => String(a.plan_id) === String(activityId),
        );
      } else {
        targetAct = activityId
          ? rawActivities.find((a) => String(a.id) === String(activityId))
          : null;
      }

      const targetEmp = location.state.fallbackEmpId || targetAct?.employee_id;
      const targetDate = targetAct
        ? targetAct.scheduled_date
        : location.state.fallbackDate;

      if (targetEmp && targetDate) {
        queueMicrotask(() => {
          setActiveTab("ACTIVITIES");
          setViewMode("BOARD");
          setTimeframe(
            eventType === "SALES_PLAN_SUBMITTED" ? "WEEKLY" : "DAILY",
          );
          setSelectedDateFilter(targetDate);
          setFilterEmp(targetEmp);

          // Pop open the detailed view modal if a specific activity was targeted
          if (targetAct && eventType !== "SALES_PLAN_SUBMITTED") {
            setSelectedActivity(targetAct);
          }

          navigate(location.pathname, { replace: true, state: {} });
        });
      }
    }
  }, [location.state, rawRevenue, rawActivities, navigate, location.pathname]);

  // Extract unique employees for dropdown (merging both sets for consistency)
  const uniqueEmployees = useMemo(() => {
    const map = new Map();

    // Helper to check if employee should be included
    const isValidEmployee = (emp) => {
      if (!emp) return false;
      if (emp.is_super_admin) return false;
      return emp.department?.toLowerCase().includes("sales");
    };

    rawActivities.forEach((act) => {
      if (
        act.employees?.name &&
        !map.has(act.employee_id) &&
        isValidEmployee(act.employees)
      ) {
        map.set(act.employee_id, act.employees.name);
      }
    });
    rawRevenue.forEach((rev) => {
      if (
        rev.employees?.name &&
        !map.has(rev.employee_id) &&
        isValidEmployee(rev.employees)
      ) {
        map.set(rev.employee_id, rev.employees.name);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rawActivities, rawRevenue]);

  // Access lists
  const allowedActivities = useMemo(() => {
    if (canViewAllSales) return rawActivities;
    return rawActivities.filter((a) => a.employee_id === user?.id);
  }, [rawActivities, canViewAllSales, user?.id]);

  const allowedRevenue = useMemo(() => {
    if (canViewAllSales) return rawRevenue;
    return rawRevenue.filter((a) => a.employee_id === user?.id);
  }, [rawRevenue, canViewAllSales, user?.id]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    let filtered = allowedActivities;
    if (filterEmp !== "ALL")
      filtered = filtered.filter((a) => a.employee_id === filterEmp);
    if (filterStatus !== "ALL") {
      if (filterStatus === "APPROVED" || filterStatus === "DONE") {
        // "Completed" means APPROVED or DONE status
        filtered = filtered.filter(
          (a) => a.status === "APPROVED" || a.status === "DONE",
        );
      } else if (filterStatus === "PENDING") {
        // "Pending Expense" — waiting for expense approval
        filtered = filtered.filter((a) => a.status === "PENDING");
      } else if (filterStatus === "INCOMPLETE") {
        // "Planned / Incomplete" — not yet executed
        filtered = filtered.filter(
          (a) => a.status === "INCOMPLETE" || a.status === "REJECTED",
        );
      } else {
        filtered = filtered.filter((a) => a.status === filterStatus);
      }
    }
    if (filterType !== "ALL")
      filtered = filtered.filter((a) => {
        const aType = (a.activity_type || "")
          .replace(/[-_]/g, " ")
          .toUpperCase();
        const fType = filterType.replace(/[-_]/g, " ").toUpperCase();
        return aType === fType;
      });
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          (a.account_name && a.account_name.toLowerCase().includes(lower)) ||
          (a.employees?.name &&
            a.employees.name.toLowerCase().includes(lower)) ||
          (a.details_daily && a.details_daily.toLowerCase().includes(lower)) ||
          (a.reference_number &&
            a.reference_number.toLowerCase().includes(lower)),
      );
    }

    // Timeframe specific date filter
    if (selectedDateFilter) {
      filtered = filtered.filter((a) => {
        if (!a.scheduled_date) return false;

        if (timeframe === "DAILY") {
          return a.scheduled_date === selectedDateFilter;
        }
        if (timeframe === "MONTHLY") {
          return a.scheduled_date.startsWith(selectedDateFilter);
        }
        if (timeframe === "YEARLY") {
          return a.scheduled_date.startsWith(selectedDateFilter);
        }
        if (timeframe === "WEEKLY") {
          const [y, m, d] = selectedDateFilter.split("-").map(Number);
          const selectedD = new Date(y, m - 1, d);
          const day = selectedD.getDay();
          const diff = selectedD.getDate() - day + (day === 0 ? -6 : 1);
          const startOfWeek = new Date(selectedD);
          startOfWeek.setDate(diff);

          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);

          const startStr = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, "0")}-${String(startOfWeek.getDate()).padStart(2, "0")}`;
          const endStr = `${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth() + 1).padStart(2, "0")}-${String(endOfWeek.getDate()).padStart(2, "0")}`;

          return a.scheduled_date >= startStr && a.scheduled_date <= endStr;
        }
        return true;
      });
    }
    // Sort
    if (sortBy === "NEWEST") {
      filtered.sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date));
    } else if (sortBy === "OLDEST") {
      filtered.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
    } else if (sortBy === "NAME") {
      filtered.sort((a, b) => (a.employees?.name || "").localeCompare(b.employees?.name || ""));
    }

    return filtered;
  }, [
    allowedActivities,
    filterEmp,
    filterStatus,
    filterType,
    searchTerm,
    selectedDateFilter,
    timeframe,
    sortBy,
  ]);

  // Filter revenue logs
  const filteredRevenue = useMemo(() => {
    let filtered = allowedRevenue;

    // A. Role/Employee Filter
    if (filterEmp !== "ALL")
      filtered = filtered.filter((a) => a.employee_id === filterEmp);

    // A2. Record Type Filter
    if (filterRecordType !== "ALL")
      filtered = filtered.filter(
        (a) =>
          a.record_type === filterRecordType ||
          (filterRecordType === RECORD_TYPE.SALES_ORDER && !a.record_type),
      ); // fallback legacy data to SO

    // B. Status Filter
    if (filterStatus !== "ALL") {
      // Map the common filtering dropdown to Revenue exact terms
      if (filterStatus === "APPROVED" || filterStatus === "DONE")
        filtered = filtered.filter(
          (a) =>
            (a.status === REVENUE_STATUS.COMPLETED ||
              a.status === REVENUE_STATUS.APPROVED) &&
            (!isVerificationEnforced || a.is_verified !== false),
        );
      if (filterStatus === "INCOMPLETE")
        filtered = filtered.filter(
          (a) =>
            a.status === REVENUE_STATUS.LOST ||
            a.status === REVENUE_STATUS.REJECTED,
        );
      if (filterStatus === "UNVERIFIED")
        filtered = filtered.filter((a) => a.is_verified === false);
    }

    // C. Date Filter (Sync with Board)
    if (selectedDateFilter) {
      filtered = filtered.filter((a) => {
        if (!a.date) return false;

        if (timeframe === "DAILY") {
          return a.date === selectedDateFilter;
        } else if (timeframe === "MONTHLY") {
          return a.date.startsWith(selectedDateFilter);
        } else if (timeframe === "YEARLY") {
          return a.date.startsWith(selectedDateFilter);
        } else if (timeframe === "WEEKLY") {
          const [y, m, d] = selectedDateFilter.split("-").map(Number);
          const selectedD = new Date(y, m - 1, d);
          const day = selectedD.getDay();
          const diff = selectedD.getDate() - day + (day === 0 ? -6 : 1);
          const startOfWeek = new Date(selectedD);
          startOfWeek.setDate(diff);

          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);

          const startStr = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, "0")}-${String(startOfWeek.getDate()).padStart(2, "0")}`;
          const endStr = `${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth() + 1).padStart(2, "0")}-${String(endOfWeek.getDate()).padStart(2, "0")}`;

          return a.date >= startStr && a.date <= endStr;
        }
        return true;
      });
    }

    // D. Search Term
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          (a.account && a.account.toLowerCase().includes(lower)) ||
          (a.product_item_sold &&
            a.product_item_sold.toLowerCase().includes(lower)) ||
          (a.employees?.name && a.employees.name.toLowerCase().includes(lower)) ||
          (a.so_number && a.so_number.toLowerCase().includes(lower)) ||
          (a.quotation_number && a.quotation_number.toLowerCase().includes(lower))
      );
    }
    // Sort
    if (sortBy === "NEWEST") {
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (sortBy === "OLDEST") {
      filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (sortBy === "NAME") {
      filtered.sort((a, b) => (a.employees?.name || "").localeCompare(b.employees?.name || ""));
    }

    return filtered;
  }, [
    allowedRevenue,
    filterEmp,
    filterStatus,
    searchTerm,
    selectedDateFilter,
    timeframe,
    filterRecordType,
    isVerificationEnforced,
    sortBy,
  ]);

  // --- WRAP SETTERS TO RESET PAGINATION ---
  const wrapFilter = (setter) => (val) => {
    setter(val);
    setActivitiesPage(1);
    setRevenuePage(1);
  };

  // Group activities for BOARD view: (Employee) -> (Date/Month/Year) -> AM/PM/All
  const boardData = useMemo(() => {
    if (activeTab !== "ACTIVITIES" || viewMode !== "BOARD") return [];

    // 1. Group by employee
    const byEmp = {};
    filteredActivities.forEach((act) => {
      const empName = act.employees?.name || "Unknown Employee";
      if (!byEmp[empName]) byEmp[empName] = {};

      let dateStr = act.scheduled_date;
      if (timeframe === "MONTHLY")
        dateStr = act.scheduled_date.substring(0, 7); // YYYY-MM
      else if (timeframe === "YEARLY")
        dateStr = act.scheduled_date.substring(0, 4); // YYYY
      else if (timeframe === "WEEKLY") {
        // Calculate start of week for strict weekly grouping
        const d = new Date(act.scheduled_date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        dateStr = `Week of ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
      }

      if (!byEmp[empName][dateStr])
        byEmp[empName][dateStr] = { AM: [], PM: [], all: [] };

      byEmp[empName][dateStr].all.push(act);
      if (act.time_of_day === "AM") {
        byEmp[empName][dateStr].AM.push(act);
      } else {
        byEmp[empName][dateStr].PM.push(act);
      }
    });

    // 2. Convert to array
    return Object.entries(byEmp)
      .map(([empName, datesMap]) => {
        const sortedDates = Object.entries(datesMap)
          .sort(([d1], [d2]) => d1.localeCompare(d2))
          .map(([dateStr, blocks]) => ({
            dateStr,
            AM: blocks.AM,
            PM: blocks.PM,
            all: blocks.all,
          }));
        return { employeeName: empName, dates: sortedDates };
      })
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [filteredActivities, activeTab, viewMode, timeframe]);

  return (
    <ProtectedRoute>
      <div className="max-w-[1600px] mx-auto space-y-6 pb-10 px-2 sm:px-4">
        {/* HEADER & TABS */}
        <div className="border-b border-gray-4 pb-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-black text-gray-12 flex items-center gap-3 tracking-tight">
                Sales Records
              </h1>
              <p className="text-gray-9 mt-1 font-medium text-sm">
                Comprehensive filtering view for Sales Activities and Logged
                Revenue.
              </p>
            </div>
            <div className="text-right flex items-center gap-3 flex-wrap justify-end">
              {activeTab === "ACTIVITIES" && (
                <div className="flex bg-gray-2 border border-gray-4 rounded-xl p-1 shadow-inner">
                  <button
                    onClick={() => setViewMode("TABLE")}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 ${viewMode === "TABLE" ? "bg-gray-10 text-white shadow" : "text-gray-9 hover:text-gray-12"}`}
                  >
                    <Table2 size={14} /> Table
                  </button>
                  <button
                    onClick={() => setViewMode("BOARD")}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 ${viewMode === "BOARD" ? "bg-gray-10 text-white shadow" : "text-gray-9 hover:text-gray-12"}`}
                  >
                    <Columns size={14} /> Board
                  </button>
                </div>
              )}
              <div className="flex bg-gray-2 border border-gray-4 rounded-xl p-1 shadow-inner">
                <button
                  onClick={() => setActiveTab("ACTIVITIES")}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${activeTab === "ACTIVITIES" ? "bg-primary text-white shadow" : "text-gray-9 hover:text-gray-12"}`}
                >
                  <LayoutList size={14} /> Activities
                </button>
                <button
                  onClick={() => setActiveTab("REVENUE")}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${activeTab === "REVENUE" ? "bg-green-600 text-white shadow" : "text-gray-9 hover:text-gray-12"}`}
                >
                  <DollarSign size={14} /> Revenue
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm font-bold text-gray-11 w-full justify-end">
            <FileText size={16} />{" "}
            {activeTab === "ACTIVITIES"
              ? filteredActivities.length
              : filteredRevenue.length}{" "}
            Records Found
          </div>
        </div>

        <SalesFilters
          activeTab={activeTab}
          viewMode={viewMode}
          searchTerm={searchTerm}
          setSearchTerm={wrapFilter(setSearchTerm)}
          timeframe={timeframe}
          setTimeframe={wrapFilter(setTimeframe)}
          selectedDateFilter={selectedDateFilter}
          setSelectedDateFilter={wrapFilter(setSelectedDateFilter)}
          filterEmp={filterEmp}
          setFilterEmp={wrapFilter(setFilterEmp)}
          filterStatus={filterStatus}
          setFilterStatus={wrapFilter(setFilterStatus)}
          filterType={filterType}
          setFilterType={wrapFilter(setFilterType)}
          filterRecordType={filterRecordType}
          setFilterRecordType={wrapFilter(setFilterRecordType)}
          canViewAllSales={canViewAllSales}
          user={user}
          uniqueEmployees={uniqueEmployees}
          isVerificationEnforced={isVerificationEnforced}
          showDateFilter={true}
          sortBy={sortBy}
          setSortBy={wrapFilter(setSortBy)}
        />

        {/* TABLE BODY (ACTIVITIES) */}
        {activeTab === "ACTIVITIES" && viewMode === "TABLE" && (
          <div className="bg-gray-1 border border-gray-4 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-2 border-b border-gray-4">
                    <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">
                      Activity
                    </th>
                    <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">
                      Ref # / Expense
                    </th>
                    <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider text-center">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-4">
                  {isActLoading ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="p-10 text-center text-gray-9 font-bold"
                      >
                        Loading Activities...
                      </td>
                    </tr>
                  ) : filteredActivities.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="p-10 text-center text-gray-9 font-bold flex justify-center gap-2 items-center"
                      >
                        <AlertCircle /> No activities match the filters.
                      </td>
                    </tr>
                  ) : (
                    filteredActivities
                      .slice(
                        (activitiesPage - 1) * itemsPerPage,
                        activitiesPage * itemsPerPage,
                      )
                      .map((act) => {
                        const isDone = act.status === "DONE" || act.status === "APPROVED";
                        const showApprovedStatus = act.expense_amount > 0 && !appSettings?.sales_self_approve_expenses;

                        return (
                          <tr
                            key={act.id}
                            onClick={() => setSelectedActivity(act)}
                            className="hover:bg-gray-3/50 cursor-pointer transition-colors"
                          >
                            <td className="p-4 flex flex-col items-start gap-1">
                              <span className="font-mono text-sm font-bold text-gray-12">
                                {act.scheduled_date}
                              </span>
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-[10px] bg-gray-4 px-2 py-0.5 rounded uppercase tracking-widest text-gray-11 font-black">
                                  {act.time_of_day}
                                </span>
                                {act.sales_weekly_plans?.status === "DRAFT" && !act.is_unplanned && (!isDone || showApprovedStatus) && (
                                  <span
                                    className="text-[10px] bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded uppercase tracking-widest font-black"
                                    title="Draft Plan"
                                  >
                                    DRAFT
                                  </span>
                                )}
                                {act.sales_weekly_plans?.status === "SUBMITTED" && !act.is_unplanned && (!isDone || showApprovedStatus) && (
                                  <span
                                    className="text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded uppercase tracking-widest font-black"
                                    title="Submitted Plan"
                                  >
                                    SUBMITTED
                                  </span>
                                )}
                                {act.sales_weekly_plans?.status === "APPROVED" && !act.is_unplanned && (!isDone || showApprovedStatus) && (
                                  <span
                                    className="text-[10px] bg-green-500/10 text-green-600 border border-green-500/30 px-2 py-0.5 rounded uppercase tracking-widest font-black"
                                    title="Approved Plan"
                                  >
                                    APPROVED
                                  </span>
                                )}
                                {(act.is_unplanned || !act.sales_weekly_plans?.status) && (
                                  <span
                                    className="text-[10px] bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded uppercase tracking-widest font-black"
                                    title="Unplanned Injection"
                                  >
                                    UNPLANNED
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="font-bold text-sm text-gray-12">
                                {act.employees?.name || "Unknown"}
                              </p>
                              <p className="text-[10px] font-bold text-gray-9 uppercase tracking-wider">
                                {act.employees?.department}
                              </p>
                            </td>
                            <td
                              className="p-4 font-bold text-sm text-gray-12 max-w-[200px] truncate"
                              title={act.account_name}
                            >
                              {act.account_name || (
                                <span className="text-gray-8 italic font-normal">
                                  No Account
                                </span>
                              )}
                            </td>
                            <td className="p-4">
                              <span className="text-xs font-semibold text-gray-11">
                                {act.activity_type}
                              </span>
                              {(act.is_unplanned || !act.sales_weekly_plans?.status) && (
                                <span className="block mt-1 text-[10px] text-blue-500 bg-blue-500/10 w-max px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">
                                  Unplanned
                                </span>
                              )}
                            </td>
                            <td
                              className="p-4 text-xs text-gray-11 max-w-[250px] truncate"
                              title={act.details_daily}
                            >
                              {act.details_daily || act.remarks_plan || (
                                <span className="text-gray-7 italic">Blank</span>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col gap-1">
                                {act.reference_number && (
                                  <span className="text-[10px] font-black text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full w-max">
                                    {act.reference_number}
                                  </span>
                                )}
                                {act.expense_amount && (
                                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full w-max">
                                    ₱{" "}
                                    {Number(act.expense_amount).toLocaleString()}
                                  </span>
                                )}
                                {act.sales_outcome === "COMPLETED" && (
                                  <span className="text-[10px] font-black text-green-600 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full w-max">
                                    WON
                                  </span>
                                )}
                                {act.sales_outcome === "LOST" && (
                                  <span className="text-[10px] font-black text-red-600 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full w-max">
                                    LOST
                                  </span>
                                )}
                                {!act.reference_number &&
                                  !act.expense_amount &&
                                  !act.sales_outcome && (
                                    <span className="text-gray-7 italic text-[10px]">
                                      —
                                    </span>
                                  )}
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              {act.status === "APPROVED" ? (
                                <div className="flex flex-col items-center gap-1 text-green-500">
                                  <CheckCircle2 size={18} />
                                  {showApprovedStatus && (
                                    <span className="text-[10px] font-black uppercase tracking-widest bg-green-500/10 px-2 py-0.5 rounded">
                                      APPROVED
                                    </span>
                                  )}
                                </div>
                              ) : act.status === "PENDING" ? (
                                <div className="flex flex-col items-center gap-1 text-amber-500">
                                  <Clock size={18} />
                                  <span className="text-[10px] font-black uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded">
                                    PENDING
                                  </span>
                                </div>
                              ) : act.status === "REJECTED" ? (
                                <div className="flex flex-col items-center gap-1 text-red-500">
                                  <XCircle size={18} />
                                  <span className="text-[10px] font-black uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded">
                                    REJECTED
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-1 text-gray-8">
                                  <Circle size={18} />
                                  <span className="text-[10px] font-bold uppercase tracking-widest">
                                    Incomplete
                                  </span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>

            {/* ACTIVITIES PAGINATION */}
            {filteredActivities.length > itemsPerPage && (
              <div className="p-4 border-t border-gray-4 bg-gray-2 flex items-center justify-center gap-4">
                <button
                  disabled={activitiesPage === 1}
                  onClick={() => setActivitiesPage((p) => p - 1)}
                  className="px-4 py-1.5 bg-gray-1 border border-gray-4 rounded-lg text-xs font-bold text-gray-11 disabled:opacity-30 hover:bg-gray-3 transition-colors uppercase tracking-widest"
                >
                  Prev
                </button>
                <span className="text-xs font-black text-gray-12 uppercase tracking-tighter">
                  Page {activitiesPage} of{" "}
                  {Math.ceil(filteredActivities.length / itemsPerPage)}
                </span>
                <button
                  disabled={
                    activitiesPage ===
                    Math.ceil(filteredActivities.length / itemsPerPage)
                  }
                  onClick={() => setActivitiesPage((p) => p + 1)}
                  className="px-4 py-1.5 bg-gray-1 border border-gray-4 rounded-lg text-xs font-bold text-gray-11 disabled:opacity-30 hover:bg-gray-3 transition-colors uppercase tracking-widest"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* BOARD BODY (ACTIVITIES) */}
        {activeTab === "ACTIVITIES" && viewMode === "BOARD" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {boardData.length === 0 ? (
              <div className="p-10 text-center text-gray-9 font-bold bg-gray-1 rounded-2xl border border-gray-4">
                <AlertCircle className="mx-auto mb-2 text-gray-8" />
                No activities match the filters.
              </div>
            ) : (
              boardData.map((empGroup) => (
                <div
                  key={empGroup.employeeName}
                  className="bg-gray-1 border border-gray-4 rounded-2xl p-4 sm:p-6 shadow-sm"
                >
                  <h2 className="text-xl font-black text-gray-12 mb-4 border-b border-gray-4 pb-2 flex items-center gap-2">
                    <Users size={20} /> {empGroup.employeeName}
                  </h2>
                  <div className="flex overflow-x-auto gap-4 sm:gap-6 pb-4 custom-scrollbar snap-x items-start">
                    {empGroup.dates.map((dateBlock) => {
                      if (timeframe !== "DAILY") {
                        return (
                          <ExpandableSummaryCard
                            key={dateBlock.dateStr}
                            dateBlock={dateBlock}
                            appSettings={appSettings}
                            label={
                              timeframe === "MONTHLY"
                                ? new Date(
                                  dateBlock.dateStr + "-01",
                                ).toLocaleDateString("en-US", {
                                  month: "long",
                                  year: "numeric",
                                })
                                : dateBlock.dateStr
                            }
                            onActivityClick={(act) => setSelectedActivity(act)}
                          />
                        );
                      }

                      return (
                        <div
                          key={dateBlock.dateStr}
                          className="min-w-[280px] sm:min-w-[320px] w-[280px] sm:w-[320px] shrink-0 bg-gray-2 rounded-xl border border-gray-4 p-4 flex flex-col snap-start"
                        >
                          <h3
                            className="font-bold text-gray-12 mb-3 bg-gray-3 px-3 py-1.5 rounded-lg text-center font-mono text-sm tracking-wide truncate"
                            title={dateBlock.dateStr}
                          >
                            {timeframe === "WEEKLY"
                              ? dateBlock.dateStr
                              : `${new Date(dateBlock.dateStr).toLocaleDateString("en-US", { weekday: "long" })} - ${dateBlock.dateStr}`}
                          </h3>

                          <div className="space-y-4 flex-1 flex flex-col">
                            <div className="flex-1 bg-white dark:bg-gray-3 rounded-lg border border-gray-4 p-3 h-full">
                              <h4 className="flex items-center gap-2 text-[10px] font-black text-gray-10 uppercase tracking-widest mb-2 border-b border-gray-4 pb-1">
                                AM Block
                              </h4>
                              <div className="space-y-2">
                                {dateBlock.AM.length === 0 && (
                                  <p className="text-xs text-gray-8 italic text-center py-2">
                                    No AM Tasks
                                  </p>
                                )}
                                {dateBlock.AM.map((act) => (
                                  <BoardActivityCard
                                    key={act.id}
                                    act={act}
                                    onClick={() => setSelectedActivity(act)}
                                    appSettings={appSettings}
                                  />
                                ))}
                              </div>
                            </div>

                            <div className="flex-1 bg-white dark:bg-gray-3 rounded-lg border border-gray-4 p-3 h-full">
                              <h4 className="flex items-center gap-2 text-[10px] font-black text-gray-10 uppercase tracking-widest mb-2 border-b border-gray-4 pb-1">
                                PM Block
                              </h4>
                              <div className="space-y-2">
                                {dateBlock.PM.length === 0 && (
                                  <p className="text-xs text-gray-8 italic text-center py-2">
                                    No PM Tasks
                                  </p>
                                )}
                                {dateBlock.PM.map((act) => (
                                  <BoardActivityCard
                                    key={act.id}
                                    act={act}
                                    onClick={() => setSelectedActivity(act)}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TABLE BODY (REVENUE) */}
        {activeTab === "REVENUE" && (
          <div className="space-y-4">
            {/* Record Type Sub-filter */}
            <div className="flex gap-2 bg-gray-2 p-1 rounded-lg border border-gray-4 shadow-inner overflow-x-auto w-max mb-2">
              {["ALL", "SALES_ORDER", "SALES_QUOTATION"].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterRecordType(type)}
                  className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-md transition-all whitespace-nowrap ${filterRecordType === type
                    ? type === "SALES_QUOTATION"
                      ? "bg-blue-600 text-white shadow"
                      : "bg-gray-12 text-gray-1 shadow"
                    : "text-gray-9 hover:text-gray-12 hover:bg-gray-3"
                    }`}
                >
                  {type === "ALL"
                    ? "ALL LOGS"
                    : type === "SALES_ORDER"
                      ? "SALES ORDERS"
                      : "QUOTATIONS"}
                </button>
              ))}
            </div>

            <div className="bg-gray-1 border border-gray-4 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-2 border-b border-gray-4">
                      <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">
                        Sales Rep
                      </th>
                      <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">
                        Account
                      </th>
                      <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">
                        Product Sold
                      </th>
                      <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">
                        Record #
                      </th>
                      <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider text-right">
                        {filterRecordType === "SALES_ORDER"
                          ? "Revenue (₱)"
                          : filterRecordType === "SALES_QUOTATION"
                            ? "Quotation (₱)"
                            : "Value (₱)"}
                      </th>
                      <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider text-center">
                        Status
                      </th>
                      {user?.isSuperAdmin && (
                        <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider text-center w-12"></th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-4">
                    {isRevLoading ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="p-10 text-center text-gray-9 font-bold"
                        >
                          Loading Revenue Logs...
                        </td>
                      </tr>
                    ) : filteredRevenue.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="p-10 text-center text-gray-9 font-bold flex justify-center gap-2 items-center"
                        >
                          <AlertCircle /> No log entries match the filters.
                        </td>
                      </tr>
                    ) : (
                      filteredRevenue
                        .slice(
                          (revenuePage - 1) * itemsPerPage,
                          revenuePage * itemsPerPage,
                        )
                        .map((log) => (
                          <tr
                            key={log.id}
                            onClick={() => setEditingRevenue(log)}
                            className="hover:bg-gray-3/50 cursor-pointer transition-colors"
                          >
                            <td className="p-4">
                              <span className="font-mono text-sm font-bold text-gray-12">
                                {log.date}
                              </span>
                            </td>
                            <td className="p-4 text-sm">
                              <p className="font-bold text-gray-12">
                                {log.employees?.name || "Unknown"}
                              </p>
                              <p className="text-[10px] font-bold text-gray-9 uppercase">
                                {log.employees?.sub_department || log.employees?.department || "No Dept"}
                              </p>
                            </td>
                            <td className="p-4 font-bold text-sm text-gray-12">
                              {log.account}
                            </td>
                            <td className="p-4 text-xs font-semibold text-gray-11">
                              {log.product_item_sold}
                            </td>
                            <td className="p-4 text-center">
                              {log.record_type === "SALES_QUOTATION" ? (
                                <span
                                  className="bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest"
                                  title="Sales Quotation"
                                >
                                  QN
                                </span>
                              ) : (
                                <span
                                  className="bg-green-500/10 text-green-600 border border-green-500/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest"
                                  title="Sales Order"
                                >
                                  SO
                                </span>
                              )}
                            </td>
                            <td className="">
                              <p className="text-[10px] font-black text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full w-max">{log.record_type === "SALES_QUOTATION"
                                ? (log.quotation_number || "—")
                                : (log.so_number || "—")}</p>
                            </td>
                            <td
                              className={`p-4 text-right font-black ${log.record_type === "SALES_QUOTATION" ? "text-blue-600" : "text-green-600"}`}
                            >
                              ₱{log.revenue_amount?.toLocaleString() || "0"}
                            </td>
                            <td className="p-4 text-center">
                              {isVerificationEnforced &&
                                log.record_type !== "SALES_QUOTATION" &&
                                log.is_verified === false ? (
                                <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">
                                  PENDING
                                </span>
                              ) : log.status
                                ?.toUpperCase()
                                .includes("COMPLETED") ||
                                log.status
                                  ?.toUpperCase()
                                  .includes("SUBMITTED") ? (
                                <span
                                  className={`${log.record_type === "SALES_QUOTATION" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-green-500/10 text-green-500 border-green-500/20"} border px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest`}
                                >
                                  {log.record_type === "SALES_QUOTATION"
                                    ? "SUBMITTED"
                                    : "COMPLETED"}
                                </span>
                              ) : (
                                <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">
                                  LOST
                                </span>
                              )}
                            </td>
                            <td
                              className="p-4 text-center flex items-center justify-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Convert to SO Button for Quotations */}
                              {log.record_type === "SALES_QUOTATION" && (
                                <button
                                  title="Convert to Sales Order"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate("/sales/log-sales", {
                                      state: {
                                        prefill: {
                                          ...log,
                                          record_type: "SALES_ORDER",
                                          date: new Date()
                                            .toISOString()
                                            .split("T")[0],
                                        },
                                      },
                                    });
                                  }}
                                  className="flex-center gap-1 p-1.5 rounded-lg text-blue-600 hover:bg-blue-500/10 transition-colors"
                                >
                                  <p className="font-bold text-sm uppercase">
                                    Convert
                                  </p>{" "}
                                  <Briefcase size={14} />
                                </button>
                              )}

                              {/* Super Admin soft-delete button */}
                              {user?.isSuperAdmin && (
                                <button
                                  title="Remove log"
                                  disabled={deleteRevenueMutation.isPending}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (
                                      window.confirm(
                                        `Delete this ${log.record_type === "SALES_QUOTATION" ? "quotation" : "sales order"} (₱${Number(log.revenue_amount).toLocaleString()} – ${log.account})? This is a soft-delete and can be recovered from the database if needed.`,
                                      )
                                    ) {
                                      deleteRevenueMutation.mutate(log.id);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg transition-colors text-gray-8 hover:text-red-500 hover:bg-red-500/10"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* REVENUE PAGINATION */}
              {filteredRevenue.length > itemsPerPage && (
                <div className="p-4 border-t border-gray-4 bg-gray-2 flex items-center justify-center gap-4">
                  <button
                    disabled={revenuePage === 1}
                    onClick={() => setRevenuePage((p) => p - 1)}
                    className="px-4 py-1.5 bg-gray-1 border border-gray-4 rounded-lg text-xs font-bold text-gray-11 disabled:opacity-30 hover:bg-gray-3 transition-colors uppercase tracking-widest"
                  >
                    Prev
                  </button>
                  <span className="text-xs font-black text-gray-12 uppercase tracking-tighter">
                    Page {revenuePage} of{" "}
                    {Math.ceil(filteredRevenue.length / itemsPerPage)}
                  </span>
                  <button
                    disabled={
                      revenuePage ===
                      Math.ceil(filteredRevenue.length / itemsPerPage)
                    }
                    onClick={() => setRevenuePage((p) => p + 1)}
                    className="px-4 py-1.5 bg-gray-1 border border-gray-4 rounded-lg text-xs font-bold text-gray-11 disabled:opacity-30 hover:bg-gray-3 transition-colors uppercase tracking-widest"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* INJECT MODAL */}
      <SalesTaskDetailsModal
        isOpen={!!selectedActivity}
        onClose={() => setSelectedActivity(null)}
        activity={selectedActivity}
        appSettings={appSettings}
      />
      <EditRevenueModal
        key={editingRevenue?.id}
        isOpen={!!editingRevenue}
        onClose={() => setEditingRevenue(null)}
        log={editingRevenue}
        onSave={(id, payload) => updateRevMutation.mutate({ id, payload })}
        isSaving={updateRevMutation.isPending}
        currentUser={user}
        isVerificationEnforced={isVerificationEnforced}
      />
    </ProtectedRoute>
  );
}

function ExpandableSummaryCard({ dateBlock, label, onActivityClick, appSettings }) {
  const [expanded, setExpanded] = useState(false);
  const total = dateBlock.all.length;
  const done = dateBlock.all.filter(
    (a) => a.status === "DONE" || a.status === "APPROVED",
  ).length;
  const pending = dateBlock.all.filter(
    (a) => a.status === "PENDING_APPROVAL" || a.status === "PENDING",
  ).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const pctColor =
    pct >= 80
      ? "text-green-600 bg-green-500/10 border-green-500/20"
      : pct >= 50
        ? "text-yellow-600 bg-yellow-500/10 border-yellow-500/20"
        : "text-red-600 bg-red-500/10 border-red-500/20";

  // Group activities by actual date for a much better UX
  const activitiesByDate = useMemo(() => {
    return dateBlock.all.reduce((acc, act) => {
      const d = act.scheduled_date;
      if (!acc[d]) acc[d] = { AM: [], PM: [] };
      if (act.time_of_day === "AM") acc[d].AM.push(act);
      else acc[d].PM.push(act);
      return acc;
    }, {});
  }, [dateBlock]);

  const datesSorted = Object.keys(activitiesByDate).sort();

  return (
    <div className="min-w-[300px] shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm snap-start flex flex-col overflow-hidden transition-all">
      {/* Summary header — entire row is clickable */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5 truncate">
            {label}
          </p>
          <p className="text-2xl font-black text-gray-800 leading-tight">
            {total}
            <span className="text-xs font-semibold text-gray-400 ml-1.5">
              activities
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pending > 0 && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              {pending} pending
            </span>
          )}
          <span
            className={`text-xs font-black px-2.5 py-1 rounded-full border ${pctColor}`}
          >
            {pct}%
          </span>
          <span
            className={`text-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </div>
      </button>

      {/* Completion bar */}
      <div className="h-1 bg-gray-100 mx-4 rounded-full mb-1">
        <div
          className={`h-1 rounded-full transition-all duration-500 ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-400" : "bg-red-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Expandable body */}
      {expanded && (
        <div className="bg-gray-50 border-t border-gray-100 p-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {datesSorted.length === 0 ? (
            <p className="text-xs text-gray-400 italic text-center py-2">
              No activities
            </p>
          ) : (
            datesSorted.map((d) => (
              <div
                key={d}
                className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
              >
                <h4 className="text-xs font-bold text-gray-800 mb-3 border-b border-gray-100 pb-1 flex justify-between items-center">
                  {new Date(d).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                  <span className="text-[10px] text-gray-500 font-normal bg-gray-100 px-1.5 py-0.5 rounded text-center">
                    {activitiesByDate[d].AM.length +
                      activitiesByDate[d].PM.length}{" "}
                    tasks
                  </span>
                </h4>
                <div className="space-y-3">
                  {activitiesByDate[d].AM.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <Clock size={10} /> AM Block
                      </p>
                      <div className="space-y-1.5">
                        {activitiesByDate[d].AM.map((act) => (
                          <BoardActivityCard
                            key={act.id}
                            act={act}
                            onClick={() => onActivityClick(act)}
                            appSettings={appSettings}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {activitiesByDate[d].PM.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black text-purple-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 mt-2">
                        <Clock size={10} /> PM Block
                      </p>
                      <div className="space-y-1.5">
                        {activitiesByDate[d].PM.map((act) => (
                          <BoardActivityCard
                            key={act.id}
                            act={act}
                            onClick={() => onActivityClick(act)}
                            appSettings={appSettings}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function BoardActivityCard({ act, onClick, appSettings }) {
  const isDone = act.status === "DONE" || act.status === "APPROVED";
  const isLost = act.sales_outcome === "LOST";
  const isWon = act.sales_outcome === "COMPLETED";
  return (
    <div
      onClick={onClick}
      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all hover:-translate-y-0.5 shadow-sm
        ${isLost
          ? "bg-red-500/5 border-red-500/30"
          : isWon
            ? "bg-green-500/10 border-green-500/20"
            : isDone
              ? "bg-gray-2 border-gray-4"
              : "bg-gray-1 border-gray-3 hover:border-gray-5"
        }
        ${act.is_unplanned && "bg-gray-a2! border-0"}
      `}
    >
      <p
        className={`text-[13px] font-bold truncate ${isDone ? "text-gray-9 line-through" : "text-gray-12"}`}
        title={act.account_name}
      >
        {act.account_name || (
          <span className="text-gray-8 italic">No Account</span>
        )}
      </p>
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1 overflow-hidden">
          <span className="text-[9px] uppercase font-bold text-gray-10 truncate max-w-[80px]">
            {act.activity_type}
          </span>
          {act.sales_weekly_plans?.status === "DRAFT" && !act.is_unplanned && (!isDone || (act.expense_amount > 0 && !appSettings?.sales_self_approve_expenses)) && (
            <span className="shrink-0 text-[8px] bg-yellow-500/10 text-yellow-600 px-1 py-0.5 rounded uppercase tracking-widest font-black">
              DRAFT
            </span>
          )}
          {act.sales_weekly_plans?.status === "SUBMITTED" && !act.is_unplanned && (!isDone || (act.expense_amount > 0 && !appSettings?.sales_self_approve_expenses)) && (
            <span className="shrink-0 text-[8px] bg-green-500/10 text-green-600 px-1 py-0.5 rounded uppercase tracking-widest font-black">
              SUBMITTED
            </span>
          )}
          {act.sales_weekly_plans?.status === "APPROVED" && !act.is_unplanned && (!isDone || (act.expense_amount > 0 && !appSettings?.sales_self_approve_expenses)) && (
            <span className="shrink-0 text-[8px] bg-green-500/10 text-green-600 px-1 py-0.5 rounded uppercase tracking-widest font-black">
              APPROVED
            </span>
          )}
          {(act.is_unplanned || !act.sales_weekly_plans?.status) && (
            <span className="shrink-0 text-[8px] bg-blue-500/10 text-blue-600 px-1 py-0.5 rounded uppercase tracking-widest font-black">
              UNPLANNED
            </span>
          )}
        </div>
        {isDone ? (
          <CheckCircle2 size={12} className="text-green-500 shrink-0" />
        ) : (
          <Circle size={12} className="text-gray-7 shrink-0" />
        )}
      </div>
      {/* Metadata badges */}
      {(act.reference_number || act.expense_amount || act.sales_outcome) && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {act.reference_number && (
            <span className="text-[8px] font-black text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20 truncate max-w-[80px]">
              {act.reference_number}
            </span>
          )}
          {act.expense_amount && (
            <span className="text-[8px] font-black text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
              ₱{Number(act.expense_amount).toLocaleString()}
            </span>
          )}
          {isWon && (
            <span className="text-[8px] font-black text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded-full border border-green-500/20">
              WON
            </span>
          )}
          {isLost && (
            <span className="text-[8px] font-black text-red-600 bg-red-500/10 px-1.5 py-0.5 rounded-full border border-red-500/20">
              LOST
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const EditRevenueModal = ({
  isOpen,
  onClose,
  log,
  onSave,
  isSaving,
  currentUser,
  isVerificationEnforced,
}) => {
  // --- HOOKS MUST BE AT TOP LEVEL ---
  const [requestMode, setRequestMode] = useState(false);
  const [requestData, setRequestData] = useState({
    amount: log?.revenue_amount || "",
    reason: "",
  });
  const [formData, setFormData] = useState({
    account: log?.account || "",
    product_item_sold: log?.product_item_sold || "",
    revenue_amount: log?.revenue_amount || "",
    status: log?.status || "COMPLETED SALES",
    remarks: log?.remarks || "",
    date: log?.date || "",
    so_number: log?.so_number || "",
    quotation_number: log?.quotation_number || "",
    is_verified: log?.is_verified !== false,
  });

  const queryClient = useQueryClient();

  const requestMutation = useMutation({
    mutationFn: (payload) =>
      salesService.requestRevenueEdit(
        log?.id,
        payload.amount,
        payload.reason,
        currentUser.id,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allRevenueLogs"] });
      toast.success("Edit Request sent to Super Admin!");
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ isApproved }) =>
      salesService.resolveEditRequest(
        log?.id,
        isApproved,
        log?.edit_request_amount,
        currentUser.id,
      ),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["allRevenueLogs"] });
      toast.success(
        variables.isApproved
          ? "Change Approved & Applied!"
          : "Request Rejected",
      );
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  // --- HOOKS REMOVAL: State is now synced via remounting (key={log?.id}) ---

  // --- CONDITIONAL RETURN AFTER HOOKS ---
  if (!isOpen || !log) return null;

  const isOwnLog = log.employee_id === currentUser?.id;
  const isHeadOfSubordinate =
    ((currentUser?.is_head || currentUser?.isHead) && currentUser?.department === log.employees?.department && !isOwnLog);

  const canEditDirectly = currentUser?.isSuperAdmin || isHeadOfSubordinate;

  const isVerifiedAndLocked =
    isVerificationEnforced &&
    log.is_verified === true &&
    !canEditDirectly;

  const hasPendingRequest =
    isVerificationEnforced && log.edit_request_status === "PENDING";

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = parseFloat(formData.revenue_amount);
    if (isNaN(num)) return toast.error("Invalid amount");
    onSave(log.id, {
      ...formData,
      revenue_amount: num,
      last_edited_by: currentUser?.id,
      last_edited_at: new Date().toISOString(),
    });
  };

  const handleRequestSubmit = (e) => {
    e.preventDefault();
    const num = parseFloat(requestData.amount);
    if (isNaN(num)) return toast.error("Invalid proposed amount");
    if (!requestData.reason.trim()) return toast.error("Reason is required");
    requestMutation.mutate({ amount: num, reason: requestData.reason });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="bg-gray-1 border border-gray-4 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-4 flex justify-between items-center bg-gray-2 shrink-0">
          <h2 className="text-xl font-black text-gray-12 flex items-center gap-2">
            {isVerifiedAndLocked ? (
              <Lock size={20} className="text-primary" />
            ) : (
              <Edit size={20} className="text-green-500" />
            )}
            {isVerifiedAndLocked ? "Locked Log" : "Edit Revenue"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-gray-3 hover:bg-gray-4 rounded-full text-gray-10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {/* ADMIN OVERSIGHT NOTIFICATION FOR PENDING REQUESTS */}
          {canEditDirectly && hasPendingRequest && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 shadow-sm mb-2">
              <div className="flex items-start gap-3">
                <div className="bg-blue-500/20 p-2 rounded-lg text-blue-500 mt-0.5">
                  <MessageSquare size={16} />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">
                    Edit Request Pending
                  </h4>
                  <p className="text-sm text-gray-12 bg-white dark:bg-gray-3 p-2 rounded-lg border border-gray-4 font-medium italic my-2">
                    "{log.edit_request_reason}"
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] uppercase font-bold text-gray-9">
                      Proposed Override:
                    </span>
                    <span className="text-sm font-black text-blue-600 line-through opacity-60">
                      ₱{Number(log.revenue_amount).toLocaleString()}
                    </span>
                    <span className="text-xs font-black text-gray-9">→</span>
                    <span className="text-sm font-black text-green-600 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                      ₱{Number(log.edit_request_amount).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-blue-500/20">
                <button
                  onClick={() => resolveMutation.mutate({ isApproved: false })}
                  disabled={resolveMutation.isPending}
                  className="flex-1 bg-gray-3 hover:bg-red-500/10 hover:text-red-500 text-gray-11 font-bold text-xs py-2 rounded-lg transition-colors"
                >
                  Reject Request
                </button>
                <button
                  onClick={() => resolveMutation.mutate({ isApproved: true })}
                  disabled={resolveMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-2 rounded-lg shadow-md transition-colors"
                >
                  Approve & Apply Overlay
                </button>
              </div>
            </div>
          )}

          {/* SALES REP REQUEST OVERLAY */}
          {isVerifiedAndLocked && !requestMode && !hasPendingRequest && (
            <div className="bg-primary/5 border focus:border-gray-6 rounded-xl p-4 text-center mb-6 shadow-sm">
              <Lock
                size={28}
                className="mx-auto text-primary mb-2 opacity-80"
              />
              <p className="text-sm font-bold text-gray-12">
                This log has been audited and locked by a Super Admin.
              </p>
              <p className="text-xs text-gray-9 mt-1 mb-4">
                Direct edits are disabled to protect dashboard integrity. If you
                made an error, you must submit an Edit Request.
              </p>
              <button
                onClick={() => setRequestMode(true)}
                className="bg-primary hover:bg-primary/90 text-white font-black text-xs px-6 py-2.5 rounded-lg uppercase tracking-widest shadow-md transition-transform active:scale-95"
              >
                Request Changes
              </button>
            </div>
          )}

          {isVerifiedAndLocked && hasPendingRequest && (
            <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 text-center mb-6">
              <Clock
                size={28}
                className="mx-auto text-orange-500 mb-2 opacity-80"
              />
              <p className="text-sm font-bold text-orange-600">
                Edit Request Pending Review...
              </p>
              <p className="text-xs text-gray-9 mt-1">
                A Super Admin has been notified of your proposed change to{" "}
                <strong className="text-gray-12">
                  ₱{Number(log.edit_request_amount).toLocaleString()}
                </strong>
                .
              </p>
            </div>
          )}

          {isVerifiedAndLocked && requestMode && (
            <form
              onSubmit={handleRequestSubmit}
              className="bg-gray-2 border border-blue-500/30 rounded-xl p-5 mb-6 animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="flex items-center justify-between mb-4 border-b border-gray-4 pb-2">
                <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                  <MessageSquare size={14} /> Submit Request
                </h4>
                <button
                  type="button"
                  onClick={() => setRequestMode(false)}
                  className="text-[10px] font-bold text-gray-9 hover:text-gray-12 uppercase"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-9 uppercase mb-1 block">
                    Proposed New Amount (PHP)
                  </label>
                  <div className="relative">
                    <DollarSign
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-9"
                    />
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={requestData.amount}
                      onChange={(e) =>
                        setRequestData({
                          ...requestData,
                          amount: e.target.value,
                        })
                      }
                      className="w-full bg-white dark:bg-gray-3 border border-blue-500/40 rounded-lg pl-8 pr-3 py-2 text-sm font-black text-blue-600 outline-none focus:border-blue-500 shadow-inner"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-9 uppercase mb-1 block">
                    Reason for Edit <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    placeholder="e.g. Typographical error during data entry, actual amount should be..."
                    value={requestData.reason}
                    onChange={(e) =>
                      setRequestData({ ...requestData, reason: e.target.value })
                    }
                    className="w-full bg-white dark:bg-gray-3 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus:border-blue-500 resize-none h-20"
                  />
                </div>
                <button
                  disabled={requestMutation.isPending}
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 text-sm rounded-lg shadow-md transition-colors disabled:opacity-50"
                >
                  {requestMutation.isPending
                    ? "Submitting..."
                    : "Send Request to Admin"}
                </button>
              </div>
            </form>
          )}

          <form
            id="standard-edit-form"
            onSubmit={handleSubmit}
            className={`space-y-4 ${isVerifiedAndLocked ? "opacity-50 pointer-events-none grayscale-[50%]" : ""}`}
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-9 uppercase mb-1 block">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="w-full bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus:focus:border-gray-6 font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-9 uppercase mb-1 block">
                  Status
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus:focus:border-gray-6 font-bold"
                >
                  <option value={REVENUE_STATUS.COMPLETED}>COMPLETED</option>
                  <option value={REVENUE_STATUS.LOST}>LOST</option>
                </select>
              </div>
            </div>

            {log.record_type === "SALES_QUOTATION" ? (
              <div>
                <label className="text-[10px] font-bold text-gray-9 uppercase mb-1 block">
                  Quotation Number
                </label>
                <input
                  type="text"
                  value={formData.quotation_number}
                  onChange={(e) =>
                    setFormData({ ...formData, quotation_number: e.target.value })
                  }
                  className="w-full bg-gray-2 border border-blue-500/30 rounded-lg px-3 py-2 text-sm font-mono text-gray-12 outline-none focus:border-blue-500"
                />
              </div>
            ) : (
              <div>
                <label className="text-[10px] font-bold text-gray-9 uppercase mb-1 block">
                  Sales Order (SO) Number
                </label>
                <input
                  type="text"
                  value={formData.so_number}
                  onChange={(e) =>
                    setFormData({ ...formData, so_number: e.target.value })
                  }
                  className="w-full bg-gray-2 border border-green-500/30 rounded-lg px-3 py-2 text-sm font-mono text-gray-12 outline-none focus:border-green-500"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-gray-9 uppercase mb-1 block">
                Account
              </label>
              <input
                type="text"
                required
                value={formData.account}
                onChange={(e) =>
                  setFormData({ ...formData, account: e.target.value })
                }
                className="w-full bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus:focus:border-gray-6"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-9 uppercase mb-1 block">
                Product Sold
              </label>
              <input
                type="text"
                required
                value={formData.product_item_sold}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    product_item_sold: e.target.value,
                  })
                }
                className="w-full bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus:focus:border-gray-6"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-9 uppercase mb-1 block">
                Revenue Amount
              </label>
              <div className="relative">
                <DollarSign
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-9"
                />
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.revenue_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, revenue_amount: e.target.value })
                  }
                  className={`w-full bg-gray-2 border border-gray-4 rounded-lg pl-8 pr-3 py-2 text-sm font-black outline-none focus:border-green-500 shadow-inner ${isVerifiedAndLocked ? "text-gray-12" : "text-green-600"}`}
                />
              </div>
            </div>

            {canEditDirectly &&
              isVerificationEnforced &&
              log.is_verified === false &&
              !hasPendingRequest && (
                <div
                  className={`border rounded-xl p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between transition-colors ${formData.is_verified ? "bg-green-500/10 border-green-500/30" : "bg-orange-500/5 border-orange-500/20"}`}
                >
                  <div>
                    <p
                      className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${formData.is_verified ? "text-green-600" : "text-orange-500"}`}
                    >
                      {formData.is_verified
                        ? "Audit Complete"
                        : "Pending Verification"}
                    </p>
                    <p className="text-xs text-gray-9 mt-0.5 font-bold max-w-sm leading-tight">
                      This log is trapped and requires a Super Admin stamp to be
                      globally applied to Dashboard metrics.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        is_verified: !formData.is_verified,
                      })
                    }
                    className={`px-4 py-2 font-black text-xs uppercase tracking-widest rounded-lg transition-transform active:scale-95 whitespace-nowrap ${formData.is_verified ? "bg-green-600 text-white shadow-md" : "bg-orange-500 hover:bg-orange-600 text-white"}`}
                  >
                    {formData.is_verified ? "Verified ✓" : "Verify Log"}
                  </button>
                </div>
              )}

            {canEditDirectly &&
              isVerificationEnforced &&
              log.is_verified === true &&
              !hasPendingRequest && (
                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 flex sm:items-center justify-between gap-3">
                  <span className="text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Verified & Locked
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, is_verified: false })
                    }
                    className="px-3 py-1.5 font-bold text-[10px] uppercase tracking-widest rounded-md bg-gray-3 hover:bg-orange-500/20 hover:text-orange-500 text-gray-11 transition-colors flex items-center gap-1"
                  >
                    <Unlock size={12} /> Unverify
                  </button>
                </div>
              )}

            <div>
              <label className="text-[10px] font-bold text-gray-9 uppercase mb-1 block">
                Remarks
              </label>
              <textarea
                disabled={isSaving}
                value={formData.remarks}
                onChange={(e) =>
                  setFormData({ ...formData, remarks: e.target.value })
                }
                className="w-full bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus:focus:border-gray-6 resize-none h-20 placeholder:text-gray-7"
                placeholder="Add optional details..."
              />
            </div>

            {log.editor?.name && (
              <div className="bg-gray-3/50 px-3 py-2 rounded-lg border border-gray-4 mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-[10px] font-black uppercase text-gray-10 tracking-widest inline-flex items-center gap-1.5">
                  <Edit size={12} /> AUDIT LOG
                </span>
                <span className="text-[11px] font-mono text-gray-11">
                  <span className="font-bold text-gray-12">
                    {log.editor.name}
                  </span>{" "}
                  @{" "}
                  {new Date(log.last_edited_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
          </form>
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-gray-4 bg-gray-2 shrink-0">
          {!isVerifiedAndLocked ? (
            <button
              type="submit"
              form="standard-edit-form"
              disabled={isSaving}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transform active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Update Details"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-gray-4 hover:bg-gray-5 text-gray-12 font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              Close View
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
