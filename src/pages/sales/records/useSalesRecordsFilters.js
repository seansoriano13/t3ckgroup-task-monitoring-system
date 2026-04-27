import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "../../../services/salesService";
import { REVENUE_STATUS } from "../../../constants/status";
import toast from "react-hot-toast";
import { uxMetricsService } from "../../../services/uxMetricsService";

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

  // ── Filters (Activities) ───────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEmp, setFilterEmp] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [timeframe, setTimeframe] = useState("MONTHLY");
  const [selectedDateFilter, setSelectedDateFilter] = useState("");
  const [sortBy, setSortBy] = useState("NEWEST");
  const [activePreset, setActivePreset] = useState("custom");
  const [activeRevPreset, setActiveRevPreset] = useState("custom");

  // ── Filters (Revenue — independent) ─────────────────────────────────
  const [revSearchTerm, setRevSearchTerm] = useState("");
  const [revFilterEmp, setRevFilterEmp] = useState("ALL");
  const [revFilterStatus, setRevFilterStatus] = useState("ALL");
  const [revFilterRecordType, setRevFilterRecordType] = useState("ALL");
  const [revTimeframe, setRevTimeframe] = useState("MONTHLY");
  const [revSelectedDateFilter, setRevSelectedDateFilter] = useState("");
  const [revSortBy, setRevSortBy] = useState("NEWEST");

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

  useEffect(() => {
    uxMetricsService.trackEvent("salesRecords.filterChanged", {
      activeTab,
      timeframe: activeTab === "ACTIVITIES" ? timeframe : revTimeframe,
      filterStatus: activeTab === "ACTIVITIES" ? filterStatus : revFilterStatus,
      filterType,
      filterRecordType: revFilterRecordType,
      sortBy: activeTab === "ACTIVITIES" ? sortBy : revSortBy,
      activePreset,
    });
    uxMetricsService.incrementCounter("salesRecords.filterChangeCount");
  }, [
    activeTab,
    timeframe,
    filterStatus,
    filterType,
    revFilterRecordType,
    sortBy,
    activePreset,
    revTimeframe,
    revFilterStatus,
    revSortBy,
  ]);

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
      // salesPlanSubmitted deep-link skips the default date initialisation
      if (
        location.state?.eventType ||
        location.state?.openRevenueId ||
        location.state?.salesPlanSubmitted
      )
        return;

      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, "0");
      const d = String(today.getDate()).padStart(2, "0");

      queueMicrotask(() => {
        if (canViewAllSales) {
          setTimeframe("MONTHLY");
          setSelectedDateFilter(`${y}-${m}`);
          setRevTimeframe("MONTHLY");
          setRevSelectedDateFilter(`${y}-${m}`);
        } else {
          setTimeframe("DAILY");
          setSelectedDateFilter(`${y}-${m}-${d}`);
          setRevTimeframe("DAILY");
          setRevSelectedDateFilter(`${y}-${m}-${d}`);
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
    } else if (location.state?.salesPlanSubmitted) {
      // ── "Sales Plan Submitted" notification deep-link ─────────────────
      // Apply: Daily | submission date | submitter employee | Incomplete
      const { submitterEmpId, submissionDate } = location.state;
      if (submissionDate) {
        queueMicrotask(() => {
          setActiveTab("ACTIVITIES");
          setViewMode("BOARD");
          setTimeframe("DAILY");
          setSelectedDateFilter(submissionDate);
          if (submitterEmpId) setFilterEmp(submitterEmpId);
          setFilterStatus("INCOMPLETE");
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
      if (
        eventType === "SALES_PLAN_SUBMITTED" ||
        eventType === "SALES_WEEK_CONQUERED"
      ) {
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
            eventType === "SALES_PLAN_SUBMITTED" ||
              eventType === "SALES_WEEK_CONQUERED"
              ? "WEEKLY"
              : "DAILY",
          );
          setSelectedDateFilter(targetDate);
          setFilterEmp(targetEmp);

          if (
            targetAct &&
            eventType !== "SALES_PLAN_SUBMITTED" &&
            eventType !== "SALES_WEEK_CONQUERED"
          ) {
            setSelectedActivity(targetAct);
          }

          navigate(location.pathname, { replace: true, state: {} });
        });
      }
    } else if (location.state?.filterEmployeeId) {
      // ── "Performance Card" navigation deep-link ───────────────────
      const { filterEmployeeId, timeframe: t, dateFilter } = location.state;
      queueMicrotask(() => {
        setActiveTab("ACTIVITIES");
        setViewMode("BOARD");
        if (filterEmployeeId) setFilterEmp(filterEmployeeId);
        if (t) setTimeframe(t);
        if (dateFilter) {
          // If monthly, ensure we only use YYYY-MM
          if (t === "MONTHLY") {
            setSelectedDateFilter(dateFilter.slice(0, 7));
          } else {
            setSelectedDateFilter(dateFilter);
          }
        }
        navigate(location.pathname, { replace: true, state: {} });
      });
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

  // ── Helper: date-range filter for activities ──────────────────────────
  const matchesDateFilter = useCallback(
    (dateValue) => {
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
    },
    [selectedDateFilter, timeframe],
  );

  // ── Helper: date-range filter for revenue (uses rev-prefixed state) ───
  const matchesRevDateFilter = useCallback(
    (dateValue) => {
      if (!revSelectedDateFilter || !dateValue) return !revSelectedDateFilter;
      if (revTimeframe === "DAILY") return dateValue === revSelectedDateFilter;
      if (revTimeframe === "MONTHLY" || revTimeframe === "YEARLY")
        return dateValue.startsWith(revSelectedDateFilter);
      if (revTimeframe === "WEEKLY") {
        const [y, m, d] = revSelectedDateFilter.split("-").map(Number);
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
    },
    [revSelectedDateFilter, revTimeframe],
  );

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
    if (activePreset === "unplannedThisWeek") {
      filtered = filtered.filter((a) => a.is_unplanned === true);
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
    activePreset,
    sortBy,
    matchesDateFilter,
  ]);

  // ── Filtered revenue (uses rev-prefixed filters) ──────────────────────
  const filteredRevenue = useMemo(() => {
    let filtered = allowedRevenue;
    if (revFilterEmp !== "ALL")
      filtered = filtered.filter((a) => a.employee_id === revFilterEmp);
    if (revFilterRecordType !== "ALL")
      filtered = filtered.filter(
        (a) =>
          a.record_type === revFilterRecordType ||
          (revFilterRecordType === "SALES_ORDER" && !a.record_type),
      );
    if (revFilterStatus !== "ALL") {
      if (revFilterStatus === "APPROVED") {
        filtered = filtered.filter(
          (a) =>
            (a.status === REVENUE_STATUS.COMPLETED ||
              a.status === REVENUE_STATUS.APPROVED) &&
            a.is_verified,
        );
      } else if (revFilterStatus === "INCOMPLETE") {
        filtered = filtered.filter(
          (a) => a.status === "LOST" || a.status === "REJECTED",
        );
      } else if (revFilterStatus === "UNVERIFIED") {
        filtered = filtered.filter((a) => !a.is_verified);
      } else if (revFilterStatus === "LOST_REJECTED") {
        filtered = filtered.filter(
          (a) => a.status === "LOST" || a.status === "REJECTED",
        );
      }
    }
    if (revSelectedDateFilter) {
      filtered = filtered.filter((a) => matchesRevDateFilter(a.date));
    }
    if (revSearchTerm) {
      const lower = revSearchTerm.toLowerCase();
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
    if (revSortBy === "NEWEST") {
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (revSortBy === "OLDEST") {
      filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (revSortBy === "NAME") {
      filtered.sort((a, b) =>
        (a.employees?.name || "").localeCompare(b.employees?.name || ""),
      );
    }
    return filtered;
  }, [
    allowedRevenue,
    revFilterEmp,
    revFilterStatus,
    revSearchTerm,
    revSelectedDateFilter,
    revFilterRecordType,
    revSortBy,
    matchesRevDateFilter,
  ]);

  // ── Board data (grouped activities) ───────────────────────────────────
  const boardData = useMemo(() => {
    if (activeTab !== "ACTIVITIES" || viewMode !== "BOARD") return [];

    const byEmp = {};
    filteredActivities.forEach((act) => {
      const empName = act.employees?.name || "Unknown Employee";
      if (!byEmp[empName]) byEmp[empName] = {};

      let dateStr = act.scheduled_date;
      if (timeframe === "MONTHLY") dateStr = act.scheduled_date.substring(0, 7);
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

  const recordsSummary = useMemo(() => {
    const source =
      activeTab === "ACTIVITIES" ? filteredActivities : filteredRevenue;
    if (activeTab === "ACTIVITIES") {
      const completed = filteredActivities.filter(
        (a) => a.status === "APPROVED" || a.status === "DONE",
      ).length;
      const unplanned = filteredActivities.filter((a) => a.is_unplanned).length;
      const pendingExpense = filteredActivities.filter(
        (a) => Number(a.expense_amount) > 0 && a.status === "PENDING",
      ).length;
      return {
        total: source.length,
        completedPct: source.length
          ? Math.round((completed / source.length) * 100)
          : 0,
        unplannedPct: source.length
          ? Math.round((unplanned / source.length) * 100)
          : 0,
        pendingExpense,
      };
    }

    const approved = filteredRevenue.filter(
      (r) =>
        r.status === REVENUE_STATUS.APPROVED ||
        r.status === REVENUE_STATUS.COMPLETED,
    ).length;
    const unverified = filteredRevenue.filter(
      (r) => r.is_verified === false,
    ).length;
    return {
      total: source.length,
      completedPct: source.length
        ? Math.round((approved / source.length) * 100)
        : 0,
      unplannedPct: 0,
      pendingExpense: unverified,
    };
  }, [activeTab, filteredActivities, filteredRevenue]);

  const planVariance = useMemo(() => {
    const planned = filteredActivities.filter((a) => !a.is_unplanned).length;
    const completed = filteredActivities.filter(
      (a) => a.status === "APPROVED" || a.status === "DONE",
    ).length;
    const delta = completed - planned;
    return {
      planned,
      completed,
      delta,
      direction: delta > 0 ? "over" : delta < 0 ? "under" : "balanced",
    };
  }, [filteredActivities]);

  const employeeInsights = useMemo(() => {
    if (!canViewAllSales) return [];
    const byEmp = new Map();
    allowedActivities.forEach((act) => {
      const key = act.employee_id || "unknown";
      if (!byEmp.has(key)) {
        byEmp.set(key, {
          employeeId: key,
          employeeName: act.employees?.name || "Unknown",
          planned: 0,
          completed: 0,
          unplanned: 0,
        });
      }
      const row = byEmp.get(key);
      if (!act.is_unplanned) row.planned += 1;
      if (act.is_unplanned) row.unplanned += 1;
      if (act.status === "APPROVED" || act.status === "DONE")
        row.completed += 1;
    });

    return Array.from(byEmp.values())
      .map((row) => {
        const completionRate =
          row.planned > 0 ? Math.round((row.completed / row.planned) * 100) : 0;
        const unplannedRate =
          row.planned + row.unplanned > 0
            ? Math.round((row.unplanned / (row.planned + row.unplanned)) * 100)
            : 0;
        const consistencyScore = Math.max(
          0,
          Math.min(
            100,
            Math.round(completionRate * 0.7 + (100 - unplannedRate) * 0.3),
          ),
        );
        const riskScore = 100 - consistencyScore;
        return {
          ...row,
          completionRate,
          unplannedRate,
          consistencyScore,
          riskScore,
        };
      })
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [allowedActivities, canViewAllSales]);

  const presetOptions = useMemo(
    () => [
      { id: "custom", label: "Custom View" },
      { id: "myPendingToday", label: "My Pending Today" },
      { id: "unplannedThisWeek", label: "Unplanned This Week" },
      { id: "missingOutcomes", label: "Missing Outcomes" },
    ],
    [],
  );

  const revPresetOptions = useMemo(
    () => [
      { id: "custom", label: "All Records" },
      { id: "unverified", label: "Unverified" },
      { id: "salesOrders", label: "Sales Orders" },
      { id: "quotations", label: "Quotations" },
      { id: "lostRejected", label: "Lost / Rejected" },
    ],
    [],
  );

  const applyRevPreset = useCallback((presetId) => {
    setActiveRevPreset(presetId);
    // Reset to clean state first
    setRevFilterRecordType("ALL");
    setRevFilterStatus("ALL");
    setRevFilterEmp("ALL");
    setRevSearchTerm("");

    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");

    if (presetId === "custom") {
      // Reset to current month view
      setRevTimeframe("MONTHLY");
      setRevSelectedDateFilter(`${y}-${m}`);
      return;
    }
    if (presetId === "unverified") {
      setRevFilterStatus("UNVERIFIED");
      setRevTimeframe("MONTHLY");
      setRevSelectedDateFilter(`${y}-${m}`);
    }
    if (presetId === "salesOrders") {
      setRevFilterRecordType("SALES_ORDER");
      setRevTimeframe("MONTHLY");
      setRevSelectedDateFilter(`${y}-${m}`);
    }
    if (presetId === "quotations") {
      setRevFilterRecordType("SALES_QUOTATION");
      setRevTimeframe("MONTHLY");
      setRevSelectedDateFilter(`${y}-${m}`);
    }
    if (presetId === "lostRejected") {
      setRevFilterStatus("LOST_REJECTED");
      setRevTimeframe("MONTHLY");
      setRevSelectedDateFilter(`${y}-${m}`);
    }
  }, []);

  const applyPreset = useCallback(
    (presetId) => {
      setActivePreset(presetId);
      if (presetId === "custom") return;

      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, "0");
      const d = String(today.getDate()).padStart(2, "0");
      const todayYmd = `${y}-${m}-${d}`;

      if (presetId === "myPendingToday") {
        setActiveTab("ACTIVITIES");
        setViewMode("TABLE");
        setFilterEmp(user?.id || "ALL");
        setFilterStatus("PENDING");
        setFilterType("ALL");
        setTimeframe("DAILY");
        setSelectedDateFilter(todayYmd);
      }

      if (presetId === "unplannedThisWeek") {
        setActiveTab("ACTIVITIES");
        setViewMode("BOARD");
        setFilterEmp("ALL");
        setFilterStatus("ALL");
        setFilterType("ALL");
        setTimeframe("WEEKLY");
        setSelectedDateFilter(todayYmd);
        setSearchTerm("");
      }

      if (presetId === "missingOutcomes") {
        setActiveTab("ACTIVITIES");
        setViewMode("TABLE");
        setFilterStatus("INCOMPLETE");
        setTimeframe("MONTHLY");
        setSelectedDateFilter(`${y}-${m}`);
      }
    },
    [user?.id],
  );

  // ── Pagination-resetting wrappers ─────────────────────────────────────
  const wrapActFilter = (setter) => (val) => {
    setter(val);
    setActivitiesPage(1);
  };
  const wrapRevFilter = (setter) => (val) => {
    setter(val);
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
    // filters (activities)
    searchTerm,
    setSearchTerm: wrapActFilter(setSearchTerm),
    filterEmp,
    setFilterEmp: wrapActFilter(setFilterEmp),
    filterStatus,
    setFilterStatus: wrapActFilter(setFilterStatus),
    filterType,
    setFilterType: wrapActFilter(setFilterType),
    timeframe,
    setTimeframe: wrapActFilter(setTimeframe),
    selectedDateFilter,
    setSelectedDateFilter: wrapActFilter(setSelectedDateFilter),
    sortBy,
    setSortBy: wrapActFilter(setSortBy),
    activePreset,
    presetOptions,
    applyPreset,
    activeRevPreset,
    revPresetOptions,
    applyRevPreset,
    // filters (revenue — independent)
    revSearchTerm,
    setRevSearchTerm: wrapRevFilter(setRevSearchTerm),
    revFilterEmp,
    setRevFilterEmp: wrapRevFilter(setRevFilterEmp),
    revFilterStatus,
    setRevFilterStatus: wrapRevFilter(setRevFilterStatus),
    revFilterRecordType,
    setRevFilterRecordType: wrapRevFilter(setRevFilterRecordType),
    revTimeframe,
    setRevTimeframe: wrapRevFilter(setRevTimeframe),
    revSelectedDateFilter,
    setRevSelectedDateFilter: wrapRevFilter(setRevSelectedDateFilter),
    revSortBy,
    setRevSortBy: wrapRevFilter(setRevSortBy),
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
    recordsSummary,
    planVariance,
    employeeInsights,
    // mutations
    updateRevMutation,
    deleteRevenueMutation,
  };
}
