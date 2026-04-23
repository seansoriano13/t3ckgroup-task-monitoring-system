import { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "../../../services/salesService";
import { useAuth } from "../../../context/AuthContext";
import ProtectedRoute from "../../../components/ProtectedRoute.jsx";
import toast from "react-hot-toast";
import { Loader2, Calendar as CalendarIcon, AlertCircle, Trash2 } from "lucide-react";
import SalesTaskDetailsModal from "../../../components/SalesTaskDetailsModal.jsx";
import DayManagementModal from "../../../components/DayManagementModal.jsx";
import { REVENUE_STATUS } from "../../../constants/status"; // #11 Constant import
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import PageHeader from "../../../components/ui/PageHeader";
import PageContainer from "../../../components/ui/PageContainer";

import { DailyCoverageTabs } from "./components/DailyCoverageTabs";
import { DailyTaskMatrix } from "./components/DailyTaskMatrix";
import { getStartOfWeek, formatDateToYMD } from "./utils";

export default function DailyExecutionPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdminView =
    user?.isSuperAdmin ||
    user?.is_super_admin ||
    user?.isHr ||
    user?.is_hr ||
    user?.is_head ||
    user?.isHead;

  const location = useLocation();
  const [currentDateObj, setCurrentDateObj] = useState(() => {
    // If routed from a notification with a specific date, use it
    if (location.state?.date) return new Date(location.state.date);
    return new Date();
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    if (location.state?.date) return location.state.date;
    return formatDateToYMD(new Date());
  });

  const [viewActivity, setViewActivity] = useState(null);
  const highlightActivityId = location.state?.highlightActivityId || null;

  // Pull weekly plan so we know which days actually have tasks for the dot indicator
  const weekStartStr = formatDateToYMD(getStartOfWeek(currentDateObj));
  const { data: planWrapper } = useQuery({
    queryKey: ["weeklyPlanLoc", user?.id, weekStartStr],
    queryFn: () => salesService.getWeeklyPlan(user?.id, weekStartStr),
    enabled: !!user?.id,
  });
  const weeklyActivities = useMemo(
    () => planWrapper?.sales_activities || [],
    [planWrapper],
  );
  const planStatus = planWrapper?.status || "DRAFT";
  const isGreen = planStatus === "SUBMITTED" || planStatus === "APPROVED";

  const { data: dbCategories = [] } = useQuery({
    queryKey: ["salesCategories"],
    queryFn: async () => await salesService.getSalesCategories(),
  });

  const { data: appSettings } = useQuery({
    queryKey: ["appSettings"],
    queryFn: () => salesService.getAppSettings(),
    enabled: !!user?.id,
  });

  const categories = useMemo(() => {
    const defaultCats = ["SALES CALL", "IN-HOUSE"];
    return Array.from(new Set([...defaultCats, ...dbCategories]));
  }, [dbCategories]);

  // Future week lock
  const currentWeekStart = formatDateToYMD(getStartOfWeek(new Date()));
  const isFutureWeek = weekStartStr > currentWeekStart;
  const isLockedUI = isFutureWeek || planStatus === "DRAFT";

  const hasTasksOnSaturday = useMemo(() => {
    return weeklyActivities.some((a) => {
      const d = new Date(a.scheduled_date);
      // getDay() === 6 is Saturday
      return (
        d.getDay() === 6 &&
        (a.activity_type !== "None" ||
          (a.account_name && a.account_name.trim() !== ""))
      );
    });
  }, [weeklyActivities]);

  const hasTasksOnSunday = useMemo(() => {
    return weeklyActivities.some((a) => {
      const d = new Date(a.scheduled_date);
      // getDay() === 0 is Sunday
      return (
        d.getDay() === 0 &&
        (a.activity_type !== "None" ||
          (a.account_name && a.account_name.trim() !== ""))
      );
    });
  }, [weeklyActivities]);

  const daysToShow = hasTasksOnSunday ? 7 : hasTasksOnSaturday ? 6 : 5;

  // Calculate the dates for the week (Mon-Sat or Mon-Fri)
  const weekDates = useMemo(() => {
    const start = getStartOfWeek(currentDateObj);
    const dates = [];
    for (let i = 0; i < daysToShow; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push({
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        dateStr: formatDateToYMD(d),
      });
    }
    return dates;
  }, [currentDateObj, daysToShow]);

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["dailyActivities", user?.id, selectedDate],
    queryFn: () => salesService.getDailyActivities(user.id, selectedDate),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (highlightActivityId && activities.length > 0) {
      const found = activities.find((a) => a.id === highlightActivityId);
      if (found) {
        queueMicrotask(() => setViewActivity(found));
      }
    }
  }, [highlightActivityId, activities]);

  const plannedAM = useMemo(
    () => activities.filter((a) => !a.is_unplanned && a.time_of_day === "AM"),
    [activities],
  );
  const plannedPM = useMemo(
    () => activities.filter((a) => !a.is_unplanned && a.time_of_day === "PM"),
    [activities],
  );
  const unplannedAM = useMemo(
    () => activities.filter((a) => a.is_unplanned && a.time_of_day === "AM"),
    [activities],
  );
  const unplannedPM = useMemo(
    () => activities.filter((a) => a.is_unplanned && a.time_of_day === "PM"),
    [activities],
  );

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, details, attachments }) =>
      salesService.markActivityDone(id, details, attachments),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["dailyActivities", user?.id, selectedDate],
      });
      queryClient.invalidateQueries({
        queryKey: ["weeklyPlanLoc", user?.id, weekStartStr],
      });
      toast.success("Task Checked!");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleToggleDone = (id, currentDetails, attachments) => {
    toggleStatusMutation.mutate({
      id,
      details: currentDetails || "Completed without remarks",
      attachments: attachments || [],
    });
  };

  const addUnplannedMutation = useMutation({
    mutationFn: (payload) => salesService.bulkUpsertActivities([payload]),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["dailyActivities", user?.id, selectedDate],
      });
      queryClient.invalidateQueries({
        queryKey: ["weeklyPlanLoc", user?.id, weekStartStr],
      });
      toast.success("Unplanned task added!");
    },
    onError: (err) => toast.error(err.message),
  });

  const [isDayManagementOpen, setIsDayManagementOpen] = useState(false);


  const handleAddUnplanned = (payload) => {
    const hasExpense = Number(payload.expense_amount) > 0;
    const needsApproval =
      hasExpense && !appSettings?.sales_self_approve_expenses;

    addUnplannedMutation.mutate({
      ...payload,
      employee_id: user.id,
      plan_id: planWrapper?.id || null,
      scheduled_date: selectedDate,
      status: needsApproval ? REVENUE_STATUS.PENDING : REVENUE_STATUS.APPROVED, // #11
      is_unplanned: true,
      completed_at: needsApproval ? null : new Date().toISOString(),
    });
  };

  if (isLoading || !user?.id) {
    return (
      <ProtectedRoute excludeSuperAdmin={true}>
        <div className="flex justify-center items-center h-[80vh] text-muted-foreground gap-3 font-bold">
          <Loader2 className="animate-spin text-indigo-500" /> Fetching Daily Checklist...
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute excludeSuperAdmin={true}>
      <PageContainer maxWidth="6xl" className="pt-4">
        {/* HEADER & DATE PICKER */}
        <PageHeader
          title="Daily Checklist"
          description="Tap the circles to cross off your planned calls and execution targets."
        >
          <div className="bg-card border border-border rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-sm hover:border-indigo-300 transition-colors">
            <CalendarIcon size={16} className="text-indigo-500" />
            <DatePicker
              selected={currentDateObj}
              onChange={(date) => {
                if (!date) return;
                setCurrentDateObj(date);
                setSelectedDate(formatDateToYMD(date));
              }}
              dateFormat="MMM d, yyyy"
              portalId="root"
              className="bg-transparent text-foreground font-bold outline-none cursor-pointer text-sm w-[120px]"
            />
          </div>

          {weeklyActivities.length > 0 && !isAdminView && (
            <button
              onClick={() => setIsDayManagementOpen(true)}
              className="px-4 py-2.5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-xl text-xs font-bold transition-all border border-destructive/20 flex items-center gap-2"
            >
              <Trash2 size={14} /> Manage Schedule
            </button>
          )}
        </PageHeader>

        {/* WEEK VIEW TABS (Mon-Sat) */}
        <DailyCoverageTabs
          weekDates={weekDates}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          weeklyActivities={weeklyActivities}
          isGreen={isGreen}
        />

        {/* ALERTS */}
        {isFutureWeek && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 text-center mt-4 shadow-sm mb-4">
            <h2 className="text-base font-black text-indigo-700 mb-1 flex items-center justify-center gap-2">
              <AlertCircle size={18} /> Future Week Locked
            </h2>
            <p className="text-muted-foreground font-medium text-sm">
              Execution is currently locked because this week hasn't officially
              begun. The schedule is viewed in read-only mode.
            </p>
          </div>
        )}
        {planStatus === "DRAFT" && !isFutureWeek && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center mt-4 shadow-sm mb-4">
            <h2 className="text-base font-black text-amber-700 mb-1 flex items-center justify-center gap-2">
              <AlertCircle size={18} /> Plan Execution Locked
            </h2>
            <p className="text-muted-foreground font-medium text-sm">
              Your schedule for this week is still in <strong>DRAFT</strong>{" "}
              mode. Submit your plan to enable execution triggers.
            </p>
          </div>
        )}

        <DailyTaskMatrix
          plannedAM={plannedAM}
          plannedPM={plannedPM}
          unplannedAM={unplannedAM}
          unplannedPM={unplannedPM}
          appSettings={appSettings}
          handleToggleDone={handleToggleDone}
          isLockedUI={isLockedUI}
          isAdminView={isAdminView}
          highlightActivityId={highlightActivityId}
          handleAddUnplanned={handleAddUnplanned}
          categories={categories}
          onView={setViewActivity}
        />
      </PageContainer>

      <SalesTaskDetailsModal
        isOpen={!!viewActivity}
        onClose={() => setViewActivity(null)}
        activity={viewActivity}
      />

      <DayManagementModal
        isOpen={isDayManagementOpen}
        onClose={() => setIsDayManagementOpen(false)}
        weekDates={weekDates}
        weeklyActivities={weeklyActivities}
      />
    </ProtectedRoute>
  );
}
