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
  AlertCircle,
  DollarSign,
  LayoutList,
  Table2,
  Columns,
  Users,
  Edit,
  X,
  Save,
  Lock,
  Unlock,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";
import SalesTaskDetailsModal from "../../../components/SalesTaskDetailsModal.jsx";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Clock } from "lucide-react";

export default function SalesRecordsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("ACTIVITIES"); // ACTIVITIES or REVENUE
  const [viewMode, setViewMode] = useState("BOARD");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterEmp, setFilterEmp] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [timeframe, setTimeframe] = useState("DAILY");
  const [selectedDateFilter, setSelectedDateFilter] = useState("");

  const [selectedActivity, setSelectedActivity] = useState(null);
  const [editingRevenue, setEditingRevenue] = useState(null);

  // --- PAGINATION STATES ---
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [revenuePage, setRevenuePage] = useState(1);
  const itemsPerPage = 15;

  const queryClient = useQueryClient();

  const updateRevMutation = useMutation({
    mutationFn: ({ id, payload }) => salesService.updateRevenueLog(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allRevenueLogs"] });
      toast.success("Revenue record updated successfully!");
      setEditingRevenue(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const location = useLocation();
  const navigate = useNavigate();

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

  const { data: appSettings } = useQuery({
    queryKey: ["appSettings"],
    queryFn: () => salesService.getAppSettings(),
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
        setActiveTab("REVENUE");
        setEditingRevenue(targetRev);
        // Clear state to prevent re-firing down the line
        navigate(location.pathname, { replace: true, state: {} });
      }
    } else if (location.state?.eventType && rawActivities.length > 0) {
      const eventType = location.state.eventType;

      let targetAct = null;
      if (eventType === "SALES_PLAN_SUBMITTED") {
        targetAct = rawActivities.find(
          (a) => String(a.plan_id) === String(location.state.openEventId),
        );
      } else {
        targetAct = location.state.openEventId
          ? rawActivities.find(
              (a) => String(a.id) === String(location.state.openEventId),
            )
          : null;
      }

      const targetEmp = location.state.fallbackEmpId || targetAct?.employee_id;
      const targetDate = targetAct
        ? targetAct.scheduled_date
        : location.state.fallbackDate;

      if (targetEmp && targetDate) {
        setActiveTab("ACTIVITIES");
        setViewMode("BOARD");
        setTimeframe(eventType === "SALES_PLAN_SUBMITTED" ? "WEEKLY" : "DAILY");
        setSelectedDateFilter(targetDate);
        setFilterEmp(targetEmp);

        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, rawRevenue, rawActivities, navigate, location.pathname]);

  // Extract unique employees for dropdown (merging both sets for consistency)
  const uniqueEmployees = useMemo(() => {
    const map = new Map();
    rawActivities.forEach((act) => {
      if (act.employees?.name && !map.has(act.employee_id)) {
        map.set(act.employee_id, act.employees.name);
      }
    });
    rawRevenue.forEach((rev) => {
      if (rev.employees?.name && !map.has(rev.employee_id)) {
        map.set(rev.employee_id, rev.employees.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [rawActivities, rawRevenue]);

  // Access lists
  const allowedActivities = useMemo(() => {
    if (user?.isSuperAdmin || user?.isHr) return rawActivities;
    return rawActivities.filter((a) => a.employee_id === user?.id);
  }, [rawActivities, user?.isSuperAdmin, user?.isHr, user?.id]);

  const allowedRevenue = useMemo(() => {
    if (user?.isSuperAdmin || user?.isHr) return rawRevenue;
    return rawRevenue.filter((a) => a.employee_id === user?.id);
  }, [rawRevenue, user?.isSuperAdmin, user?.isHr, user?.id]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    let filtered = allowedActivities;
    if (filterEmp !== "ALL")
      filtered = filtered.filter((a) => a.employee_id === filterEmp);
    if (filterStatus !== "ALL")
      filtered = filtered.filter((a) => a.status === filterStatus);
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
          (a.details_daily && a.details_daily.toLowerCase().includes(lower)),
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
          const selectedD = new Date(selectedDateFilter);
          const day = selectedD.getDay();
          const diff = selectedD.getDate() - day + (day === 0 ? -6 : 1);
          const startOfWeek = new Date(selectedD);
          startOfWeek.setDate(diff);
          startOfWeek.setHours(0, 0, 0, 0);

          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);

          const actDate = new Date(a.scheduled_date);
          return actDate >= startOfWeek && actDate <= endOfWeek;
        }
        return true;
      });
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
  ]);

  // Filter revenue logs
  const filteredRevenue = useMemo(() => {
    let filtered = allowedRevenue;
    if (filterEmp !== "ALL")
      filtered = filtered.filter((a) => a.employee_id === filterEmp);
    if (filterStatus !== "ALL") {
      // Map the common filtering dropdown to Revenue exact terms
      if (filterStatus === "DONE")
        filtered = filtered.filter(
          (a) =>
            (a.status.includes("COMPLETED") || a.status === "Won") &&
            (!isVerificationEnforced || a.is_verified !== false),
        );
      if (filterStatus === "INCOMPLETE")
        filtered = filtered.filter(
          (a) => a.status.includes("LOST") || a.status === "Lost",
        );
      if (filterStatus === "UNVERIFIED")
        filtered = filtered.filter((a) => a.is_verified === false);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          (a.account && a.account.toLowerCase().includes(lower)) ||
          (a.product_item_sold &&
            a.product_item_sold.toLowerCase().includes(lower)) ||
          (a.employees?.name && a.employees.name.toLowerCase().includes(lower)),
      );
    }
    return filtered;
  }, [allowedRevenue, filterEmp, filterStatus, searchTerm]);

  // --- PAGINATION RESETS ---
  useEffect(() => {
    setActivitiesPage(1);
    setRevenuePage(1);
  }, [searchTerm, filterEmp, filterStatus, filterType, selectedDateFilter]);

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

        {/* FILTERS */}
        <div className="bg-gray-1 border border-gray-4 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-9"
            />
            <input
              type="text"
              placeholder={
                activeTab === "ACTIVITIES"
                  ? "Search accounts, names, or remarks..."
                  : "Search accounts, products, or reps..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-2 border border-gray-4 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-12 outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            {viewMode === "BOARD" && activeTab === "ACTIVITIES" && (
              <div className="flex bg-gray-2 border border-gray-4 rounded-lg overflow-hidden flex-1 sm:flex-none shadow-sm focus-within:border-primary transition-colors">
                <select
                  value={timeframe}
                  onChange={(e) => {
                    setTimeframe(e.target.value);
                    setSelectedDateFilter(""); // Reset date when switching granularities
                  }}
                  className="px-3 py-2 text-sm text-gray-12 outline-none font-semibold bg-transparent border-r border-gray-4 cursor-pointer"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
                <DatePicker
                  selected={
                    selectedDateFilter ? new Date(selectedDateFilter) : null
                  }
                  onChange={(date) => {
                    if (!date) {
                      setSelectedDateFilter("");
                      return;
                    }
                    if (timeframe === "YEARLY") {
                      setSelectedDateFilter(date.getFullYear().toString());
                    } else if (timeframe === "MONTHLY") {
                      const m = String(date.getMonth() + 1).padStart(2, "0");
                      setSelectedDateFilter(`${date.getFullYear()}-${m}`);
                    } else {
                      const y = date.getFullYear();
                      const m = String(date.getMonth() + 1).padStart(2, "0");
                      const d = String(date.getDate()).padStart(2, "0");
                      setSelectedDateFilter(`${y}-${m}-${d}`);
                    }
                  }}
                  showMonthYearPicker={timeframe === "MONTHLY"}
                  showYearPicker={timeframe === "YEARLY"}
                  dateFormat={
                    timeframe === "YEARLY"
                      ? "yyyy"
                      : timeframe === "MONTHLY"
                        ? "MMMM yyyy"
                        : "MMM d, yyyy"
                  }
                  isClearable={true}
                  placeholderText={
                    timeframe === "YEARLY"
                      ? "Select Year..."
                      : timeframe === "MONTHLY"
                        ? "Select Month..."
                        : "Select Date..."
                  }
                  className="px-3 py-2 text-sm text-gray-12 outline-none font-bold bg-transparent w-full min-w-[140px] cursor-pointer"
                />
              </div>
            )}

            <select
              value={user?.isSuperAdmin ? filterEmp : user?.id}
              onChange={(e) => setFilterEmp(e.target.value)}
              disabled={!user?.isSuperAdmin}
              className={`bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus:border-primary font-semibold flex-1 sm:flex-none ${!user?.isSuperAdmin ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {user?.isSuperAdmin ? (
                <option value="ALL">All Representatives</option>
              ) : (
                <option value={user?.id}>My Records</option>
              )}
              {user?.isSuperAdmin &&
                uniqueEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus:border-primary font-semibold flex-1 sm:flex-none"
            >
              <option value="ALL">All Statuses</option>
              {activeTab === "ACTIVITIES" ? (
                <>
                  <option value="INCOMPLETE">Planned / Incomplete</option>
                  <option value="DONE">Completed / Done</option>
                </>
              ) : (
                <>
                  <option value="DONE">Completed Sales</option>
                  <option value="INCOMPLETE">Lost Sales</option>
                  {isVerificationEnforced && (
                    <option value="UNVERIFIED">Pending Verification</option>
                  )}
                </>
              )}
            </select>

            {activeTab === "ACTIVITIES" && (
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus:border-primary font-semibold flex-1 sm:flex-none"
              >
                <option value="ALL">All Types</option>
                <option value="Sales Call">Sales Call</option>
                <option value="In-House">In-House</option>
                <option value="None">Blank / None</option>
              </select>
            )}
          </div>
        </div>

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
                    <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider text-center">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-4">
                  {isActLoading ? (
                    <tr>
                      <td colSpan="6" className="p-10 text-center text-gray-9 font-bold">
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
                      .map((act) => (
                        <tr
                          key={act.id}
                          onClick={() => setSelectedActivity(act)}
                          className="hover:bg-gray-3/50 cursor-pointer transition-colors"
                        >
                          <td className="p-4 flex flex-col items-start gap-1">
                            <span className="font-mono text-sm font-bold text-gray-12">
                              {act.scheduled_date}
                            </span>
                            <span className="text-[10px] bg-gray-4 px-2 py-0.5 rounded uppercase tracking-widest text-gray-11 font-black">
                              {act.time_of_day}
                            </span>
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
                            {act.is_unplanned && (
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
                          <td className="p-4 text-center">
                            {act.status === "DONE" ? (
                              <div className="flex flex-col items-center gap-1 text-green-500">
                                <CheckCircle2 size={18} />
                                <span className="text-[10px] font-black uppercase tracking-widest bg-green-500/10 px-2 py-0.5 rounded">
                                  DONE
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
                      ))
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
                  Page {activitiesPage} of {Math.ceil(filteredActivities.length / itemsPerPage)}
                </span>
                <button
                  disabled={activitiesPage === Math.ceil(filteredActivities.length / itemsPerPage)}
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
                  <div className="flex overflow-x-auto gap-4 sm:gap-6 pb-4 custom-scrollbar snap-x">
                    {empGroup.dates.map((dateBlock) => {
                      if (timeframe === "MONTHLY" || timeframe === "YEARLY") {
                        const total = dateBlock.all.length;
                        const done = dateBlock.all.filter(
                          (a) => a.status === "DONE",
                        ).length;
                        const pct =
                          total > 0 ? Math.round((done / total) * 100) : 0;
                        const label =
                          timeframe === "MONTHLY"
                            ? new Date(
                                dateBlock.dateStr + "-01",
                              ).toLocaleDateString("en-US", {
                                month: "long",
                                year: "numeric",
                              })
                            : dateBlock.dateStr;

                        return (
                          <div
                            key={dateBlock.dateStr}
                            className="min-w-[200px] shrink-0 bg-gray-2 rounded-xl border border-gray-4 p-5 snap-start shadow-sm flex flex-col justify-center text-center transition-transform hover:-translate-y-1"
                          >
                            <h3
                              className="font-black text-gray-12 mb-2 bg-gray-3 px-3 py-1.5 rounded-lg text-sm uppercase tracking-widest truncate"
                              title={label}
                            >
                              {label}
                            </h3>
                            <p className="text-4xl font-black my-3">
                              {total}{" "}
                              <span className="text-[10px] text-gray-9 uppercase tracking-widest block font-bold mt-1">
                                Total Operations
                              </span>
                            </p>
                            <div className="mt-auto pt-4 border-t border-gray-4 flex justify-between items-center w-full px-2">
                              <span className="text-xs font-bold text-gray-10 uppercase">
                                Completed
                              </span>
                              <span
                                className={`text-sm font-black text-white px-2 py-0.5 rounded-full ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                              >
                                {pct}%
                              </span>
                            </div>
                          </div>
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
                    <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider text-right">
                      Value (₱)
                    </th>
                    <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider text-center">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-4">
                  {isRevLoading ? (
                    <tr>
                      <td colSpan="6" className="p-10 text-center text-gray-9 font-bold">
                        Loading Revenue Logs...
                      </td>
                    </tr>
                  ) : filteredRevenue.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-10 text-center text-gray-9 font-bold flex justify-center gap-2 items-center">
                        <AlertCircle /> No log entries match the filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRevenue
                      .slice((revenuePage - 1) * itemsPerPage, revenuePage * itemsPerPage)
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
                              {log.creator_sub_dept}
                            </p>
                          </td>
                          <td className="p-4 font-bold text-sm text-gray-12">
                            {log.account}
                          </td>
                          <td className="p-4 text-xs font-semibold text-gray-11">
                            {log.product_item_sold}
                          </td>
                          <td className="p-4 text-right font-black text-green-600">
                            ₱{log.revenue_amount?.toLocaleString() || "0"}
                          </td>
                          <td className="p-4 text-center">
                            {isVerificationEnforced && log.is_verified === false ? (
                              <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">
                                PENDING
                              </span>
                            ) : log.status === "COMPLETED SALES" || log.status === "Won" ? (
                              <span className="bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">
                                COMPLETED
                              </span>
                            ) : (
                              <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">
                                LOST
                              </span>
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
                  Page {revenuePage} of {Math.ceil(filteredRevenue.length / itemsPerPage)}
                </span>
                <button
                  disabled={revenuePage === Math.ceil(filteredRevenue.length / itemsPerPage)}
                  onClick={() => setRevenuePage((p) => p + 1)}
                  className="px-4 py-1.5 bg-gray-1 border border-gray-4 rounded-lg text-xs font-bold text-gray-11 disabled:opacity-30 hover:bg-gray-3 transition-colors uppercase tracking-widest"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* INJECT MODAL */}
      <SalesTaskDetailsModal
        isOpen={!!selectedActivity}
        onClose={() => setSelectedActivity(null)}
        activity={selectedActivity}
      />
      <EditRevenueModal
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

function BoardActivityCard({ act, onClick }) {
  const isDone = act.status === "DONE";
  return (
    <div
      onClick={onClick}
      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all hover:-translate-y-0.5 shadow-sm
        ${isDone ? "bg-green-500/10 border-green-500/20" : "bg-gray-2 border-gray-4 hover:border-gray-6"}
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
        <span className="text-[9px] uppercase font-bold text-gray-10 truncate max-w-[120px]">
          {act.activity_type}
        </span>
        {isDone ? (
          <CheckCircle2 size={12} className="text-green-500 shrink-0" />
        ) : (
          <Circle size={12} className="text-gray-7 shrink-0" />
        )}
      </div>
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
  if (!isOpen || !log) return null;

  const isVerifiedAndLocked =
    isVerificationEnforced &&
    log.is_verified === true &&
    !currentUser?.isSuperAdmin;
  const hasPendingRequest =
    isVerificationEnforced && log.edit_request_status === "PENDING";

  // Request Edit State
  const [requestMode, setRequestMode] = useState(false);
  const [requestData, setRequestData] = useState({
    amount: log.revenue_amount || "",
    reason: "",
  });

  const queryClient = useQueryClient();

  const requestMutation = useMutation({
    mutationFn: (payload) =>
      salesService.requestRevenueEdit(
        log.id,
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
        log.id,
        isApproved,
        log.edit_request_amount,
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

  const [formData, setFormData] = useState({
    account: log.account || "",
    product_item_sold: log.product_item_sold || "",
    revenue_amount: log.revenue_amount || "",
    status: log.status || "COMPLETED SALES",
    remarks: log.remarks || "",
    date: log.date || "",
    is_verified: log.is_verified !== false,
  });

  useEffect(() => {
    if (log) {
      setFormData({
        account: log.account || "",
        product_item_sold: log.product_item_sold || "",
        revenue_amount: log.revenue_amount || "",
        status: log.status || "COMPLETED SALES",
        remarks: log.remarks || "",
        date: log.date || "",
        is_verified: log.is_verified !== false,
      });
      setRequestData({
        amount: log.revenue_amount || "",
        reason: "",
      });
      setRequestMode(false);
    }
  }, [log]);

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
          {currentUser?.isSuperAdmin && hasPendingRequest && (
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
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center mb-6 shadow-sm">
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
                  className="w-full bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus:border-primary font-bold"
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
                  className="w-full bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus:border-primary font-bold"
                >
                  <option value="COMPLETED SALES">COMPLETED SALES</option>
                  <option value="LOST SALES">LOST SALES</option>
                </select>
              </div>
            </div>

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
                className="w-full bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus:border-primary"
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
                className="w-full bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus:border-primary"
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

            {currentUser?.isSuperAdmin &&
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

            {currentUser?.isSuperAdmin &&
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
                className="w-full bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus:border-primary resize-none h-20 placeholder:text-gray-7"
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
