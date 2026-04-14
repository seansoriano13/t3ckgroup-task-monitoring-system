import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "../../../services/salesService";
import toast from "react-hot-toast";

/**
 * Encapsulates ALL filter/sort/pagination state, data-fetching, deep-linking,
 * and derived filtered lists for the Sales Records page.
 */
export function useSalesRecordsFilters(user) {
  const isMasterHead =
    (user?.is_head || user?.isHead) &&
    !user?.sub_department &&
    !user?.subDepartment;
  const canViewAllSales = user?.isSuperAdmin || user?.isHr || isMasterHead;

  // ── Tab & view ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("ACTIVITIES");
  const [viewMode, setViewMode] = useState("BOARD");

  // ── Filters ───────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEmp, setFilterEmp] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [filterRecordType, setFilterRecordType] = useState("ALL");
  const [timeframe, setTimeframe] = useState("MONTHLY");
  const [selectedDateFilter, setSelectedDateFilter] = useState("");
  const [sortBy, setSortBy] = useState("NEWEST");

  // ── Selected / editing ────────────────────────────────────────────────
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [editingRevenue, setEditingRevenue] = useState(null);

  // ── Pagination ────────────────────────────────────────────────────────
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [revenuePage, setRevenuePage] = useState(1);
  const itemsPerPage = 15;

  // ── Data fetching ─────────────────────────────────────────────────────
  const queryClient = useQueryClient();

  const { data: appSettings } = useQuery({
    queryKey: ["appSettings"],
    queryFn: () => salesService.getAppSettings(),
    enabled: !!user?.id,
  });

  const { data: rawActivities = [], isLoading: isActLoading } = useQuery({
    queryKey: ["allSalesActivities"],
    queryFn: () => salesService.getAllSalesActivities(),
    enabled: !!user?.id,
  });

  const { data: rawRevenue = [], isLoading: isRevLoading } = useQuery({
    queryKey: ["allRevenueLogs"],
    queryFn: () => salesService.getAllRevenueLogs(),
    enabled: !!user?.id,
  });

  const isVerificationEnforced =
    appSettings?.require_revenue_verification === true;

  // ── Mutations ─────────────────────────────────────────────────────────
  const updateRevMutation = useMutation({
    mutationFn: ({ id, payload }) => salesService.updateRevenueLog(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allRevenueLogs"] });
      toast.success("Revenue record updated successfully!");
      setEditingRevenue(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteRevenueMutation = useMutation({
    mutationFn: (id) => salesService.softDeleteRevenueLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allRevenueLogs"] });
      toast.success("Revenue log removed.");
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Initial date defaults (runs once) ─────────────────────────────────
  const location = useLocation();
  const navigate = useNavigate();

  const initializedRef = useRef(false);
  useEffect(() => {
    if (user?.id && !initializedRef.current) {
      initializedRef.current = true;
      if (location.state?.eventType || location.state?.openRevenueId) return;

      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, "0");
      const d = String(today.getDate()).padStart(2, "0");

      queueMicrotask(() => {
        if (canViewAllSales) {
          setTimeframe("MONTHLY");
          setSelectedDateFilter(`${y}-${m}`);
        } else {
          setTimeframe("DAILY");
          setSelectedDateFilter(`${y}-${m}-${d}`);
        }
      });
    }
  }, [user, canViewAllSales, location.state]);

  // ── Deep-link notification hook ───────────────────────────────────────
  useEffect(() => {
    if (location.state?.openRevenueId && rawRevenue.length > 0) {
      const targetRev = rawRevenue.find(
        (r) => r.id === location.state.openRevenueId,
      );
      if (targetRev) {
        queueMicrotask(() => {
          setActiveTab("REVENUE");
          setEditingRevenue(targetRev);
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
      if (eventType === "SALES_PLAN_SUBMITTED" || eventType === "SALES_WEEK_CONQUERED") {
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
            (eventType === "SALES_PLAN_SUBMITTED" || eventType === "SALES_WEEK_CONQUERED") ? "WEEKLY" : "DAILY",
          );
          setSelectedDateFilter(targetDate);
          setFilterEmp(targetEmp);

          if (targetAct && eventType !== "SALES_PLAN_SUBMITTED" && eventType !== "SALES_WEEK_CONQUERED") {
            setSelectedActivity(targetAct);
          }

          navigate(location.pathname, { replace: true, state: {} });
        });
      }
    }
  }, [location.state, rawRevenue, rawActivities, navigate, location.pathname]);

  // ── Employee list (merged from both data sets) ────────────────────────
  const uniqueEmployees = useMemo(() => {
    const map = new Map();
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

  // ── Access-scoped lists ───────────────────────────────────────────────
  const allowedActivities = useMemo(() => {
    if (canViewAllSales) return rawActivities;
    return rawActivities.filter((a) => a.employee_id === user?.id);
  }, [rawActivities, canViewAllSales, user?.id]);

  const allowedRevenue = useMemo(() => {
    if (canViewAllSales) return rawRevenue;
    return rawRevenue.filter((a) => a.employee_id === user?.id);
  }, [rawRevenue, canViewAllSales, user?.id]);

  // ── Helper: date-range filter (shared between activities & revenue) ───
  const matchesDateFilter = (dateValue) => {
    if (!selectedDateFilter || !dateValue) return !selectedDateFilter;
    if (timeframe === "DAILY") return dateValue === selectedDateFilter;
    if (timeframe === "MONTHLY" || timeframe === "YEARLY")
      return dateValue.startsWith(selectedDateFilter);
    if (timeframe === "WEEKLY") {
      const [y, m, d] = selectedDateFilter.split("-").map(Number);
      const selectedD = new Date(y, m - 1, d);
      const day = selectedD.getDay();
      const diff = selectedD.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(selectedD);
      startOfWeek.setDate(diff);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const fmt = (dt) =>
        `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      return dateValue >= fmt(startOfWeek) && dateValue <= fmt(endOfWeek);
    }
    return true;
  };

  // ── Filtered activities ───────────────────────────────────────────────
  const filteredActivities = useMemo(() => {
    let filtered = allowedActivities;
    if (filterEmp !== "ALL")
      filtered = filtered.filter((a) => a.employee_id === filterEmp);
    if (filterStatus !== "ALL") {
      if (filterStatus === "APPROVED" || filterStatus === "DONE") {
        filtered = filtered.filter(
          (a) => a.status === "APPROVED" || a.status === "DONE",
        );
      } else if (filterStatus === "PENDING") {
        filtered = filtered.filter((a) => a.status === "PENDING");
      } else if (filterStatus === "INCOMPLETE") {
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
    if (selectedDateFilter) {
      filtered = filtered.filter((a) => matchesDateFilter(a.scheduled_date));
    }
    if (sortBy === "NEWEST") {
      filtered.sort(
        (a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date),
      );
    } else if (sortBy === "OLDEST") {
      filtered.sort(
        (a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date),
      );
    } else if (sortBy === "NAME") {
      filtered.sort((a, b) =>
        (a.employees?.name || "").localeCompare(b.employees?.name || ""),
      );
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

  // ── Filtered revenue ──────────────────────────────────────────────────
  const filteredRevenue = useMemo(() => {
    let filtered = allowedRevenue;
    if (filterEmp !== "ALL")
      filtered = filtered.filter((a) => a.employee_id === filterEmp);
    if (filterRecordType !== "ALL")
      filtered = filtered.filter(
        (a) =>
          a.record_type === filterRecordType ||
          (filterRecordType === "SALES_ORDER" && !a.record_type),
      );
    if (filterStatus !== "ALL") {
      if (filterStatus === "APPROVED" || filterStatus === "DONE")
        filtered = filtered.filter(
          (a) =>
            (a.status === "COMPLETED SALES" || a.status === "APPROVED") &&
            (!isVerificationEnforced || a.is_verified !== false),
        );
      if (filterStatus === "INCOMPLETE")
        filtered = filtered.filter(
          (a) => a.status === "LOST" || a.status === "REJECTED",
        );
      if (filterStatus === "UNVERIFIED")
        filtered = filtered.filter((a) => a.is_verified === false);
    }
    if (selectedDateFilter) {
      filtered = filtered.filter((a) => matchesDateFilter(a.date));
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          (a.account && a.account.toLowerCase().includes(lower)) ||
          (a.product_item_sold &&
            a.product_item_sold.toLowerCase().includes(lower)) ||
          (a.employees?.name &&
            a.employees.name.toLowerCase().includes(lower)) ||
          (a.so_number && a.so_number.toLowerCase().includes(lower)) ||
          (a.quotation_number &&
            a.quotation_number.toLowerCase().includes(lower)),
      );
    }
    if (sortBy === "NEWEST") {
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (sortBy === "OLDEST") {
      filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (sortBy === "NAME") {
      filtered.sort((a, b) =>
        (a.employees?.name || "").localeCompare(b.employees?.name || ""),
      );
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

  // ── Board data (grouped activities) ───────────────────────────────────
  const boardData = useMemo(() => {
    if (activeTab !== "ACTIVITIES" || viewMode !== "BOARD") return [];

    const byEmp = {};
    filteredActivities.forEach((act) => {
      const empName = act.employees?.name || "Unknown Employee";
      if (!byEmp[empName]) byEmp[empName] = {};

      let dateStr = act.scheduled_date;
      if (timeframe === "MONTHLY")
        dateStr = act.scheduled_date.substring(0, 7);
      else if (timeframe === "YEARLY")
        dateStr = act.scheduled_date.substring(0, 4);
      else if (timeframe === "WEEKLY") {
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

  // ── Pagination-resetting wrapper ──────────────────────────────────────
  const wrapFilter = (setter) => (val) => {
    setter(val);
    setActivitiesPage(1);
    setRevenuePage(1);
  };

  return {
    // identity
    canViewAllSales,
    // tab / view
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    // filters
    searchTerm,
    setSearchTerm: wrapFilter(setSearchTerm),
    filterEmp,
    setFilterEmp: wrapFilter(setFilterEmp),
    filterStatus,
    setFilterStatus: wrapFilter(setFilterStatus),
    filterType,
    setFilterType: wrapFilter(setFilterType),
    filterRecordType,
    setFilterRecordType: wrapFilter(setFilterRecordType),
    timeframe,
    setTimeframe: wrapFilter(setTimeframe),
    selectedDateFilter,
    setSelectedDateFilter: wrapFilter(setSelectedDateFilter),
    sortBy,
    setSortBy: wrapFilter(setSortBy),
    // selection
    selectedActivity,
    setSelectedActivity,
    editingRevenue,
    setEditingRevenue,
    // pagination
    activitiesPage,
    setActivitiesPage,
    revenuePage,
    setRevenuePage,
    itemsPerPage,
    // data
    appSettings,
    isActLoading,
    isRevLoading,
    isVerificationEnforced,
    uniqueEmployees,
    filteredActivities,
    filteredRevenue,
    boardData,
    // mutations
    updateRevMutation,
    deleteRevenueMutation,
  };
}
