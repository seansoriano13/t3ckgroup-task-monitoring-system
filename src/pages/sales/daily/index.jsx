import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "../../../services/salesService";
import { useAuth } from "../../../context/AuthContext";
import ProtectedRoute from "../../../components/ProtectedRoute.jsx";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Plus,
  Calendar as CalendarIcon,
  AlertCircle,
  Clock,
  ThumbsUp,
} from "lucide-react";
import StatusBadge from "../../../components/StatusBadge.jsx";

function getStartOfWeek(date) {
  let d;
  if (typeof date === "string") {
    const [y, m, day] = date.split("-").map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(date);
  }
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

function formatDateToYMD(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

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
  const highlightActivityId = location.state?.highlightActivityId || null;

  // Pull weekly plan so we know which days actually have tasks for the dot indicator
  const weekStartStr = formatDateToYMD(getStartOfWeek(currentDateObj));
  const { data: planWrapper } = useQuery({
    queryKey: ["weeklyPlanLoc", user?.id, weekStartStr],
    queryFn: () => salesService.getWeeklyPlan(user?.id, weekStartStr),
    enabled: !!user?.id,
  });
  const weeklyActivities = planWrapper?.sales_activities || [];
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
    mutationFn: ({ id, details }) => salesService.markActivityDone(id, details),
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

  const handleToggleDone = (id, currentDetails) => {
    // If it's already done this allows it but DB just overwrites DONE. If they need to un-check, we'd need a backend un-done function.
    toggleStatusMutation.mutate({
      id,
      details: currentDetails || "Completed without remarks",
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

  const [isRequestingDayDelete, setIsRequestingDayDelete] = useState(false);
  const [dayDeleteReason, setDayDeleteReason] = useState("");

  const requestDayDeleteMutation = useMutation({
    mutationFn: () =>
      salesService.requestDayDeletion(
        user.id,
        selectedDate,
        dayDeleteReason,
        user.id,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["dailyActivities", user?.id, selectedDate],
      });
      toast.success("Day deletion request submitted!");
      setIsRequestingDayDelete(false);
      setDayDeleteReason("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAddUnplanned = (payload) => {
    const hasExpense = Number(payload.expense_amount) > 0;
    const needsApproval =
      hasExpense && !appSettings?.sales_self_approve_expenses;

    addUnplannedMutation.mutate({
      ...payload,
      employee_id: user.id,
      plan_id: planWrapper?.id || null,
      scheduled_date: selectedDate,
      status: needsApproval ? "PENDING" : "APPROVED",
      is_unplanned: true,
      completed_at: needsApproval ? null : new Date().toISOString(),
    });
  };

  if (isLoading || !user?.id) {
    return (
      <ProtectedRoute excludeSuperAdmin={true}>
        <div className="flex justify-center items-center h-[80vh] text-gray-9 gap-3 font-bold">
          <Loader2 className="animate-spin" /> Fetching Daily Checklist...
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute excludeSuperAdmin={true}>
      <div className="max-w-6xl mx-auto space-y-6 pb-10 px-2 sm:px-4">
        {/* HEADER & DATE PICKER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-4 pb-4">
          <div>
            <h1 className="text-3xl font-black text-gray-12 flex items-center gap-3 tracking-tight">
              Daily Checklist
            </h1>
            <p className="text-gray-9 mt-1 font-medium text-sm">
              Tap the circles to cross off your planned calls and execution
              targets.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 flex items-center shadow-inner">
              <CalendarIcon size={16} className="text-gray-8 mr-2" />
              <input
                type="date"
                value={formatDateToYMD(currentDateObj)}
                onChange={(e) => {
                  const d = new Date(e.target.value);
                  setCurrentDateObj(d);
                  setSelectedDate(formatDateToYMD(d));
                }}
                className="bg-transparent text-gray-12 font-bold outline-none cursor-pointer text-sm"
              />
            </div>

            {activities.length > 0 && !isAdminView && (
              <div className="relative">
                {!isRequestingDayDelete ? (
                  <button
                    onClick={() => setIsRequestingDayDelete(true)}
                    className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 rounded-lg text-xs font-bold transition-all border border-red-500/20"
                  >
                    Request Deletion
                  </button>
                ) : (
                  <div className="absolute right-0 top-12 z-50 bg-white border border-red-500/30 rounded-xl shadow-xl p-4 w-[300px] animate-in slide-in-from-right-2">
                    <label className="text-[10px] font-bold text-red-600 uppercase tracking-widest block mb-1">
                      Reason for Deleting this day?
                    </label>
                    <textarea
                      autoFocus
                      value={dayDeleteReason}
                      onChange={(e) => setDayDeleteReason(e.target.value)}
                      placeholder="E.g. Public holiday, system error..."
                      className="w-full bg-gray-1 border border-red-500/20 rounded-lg p-3 text-sm text-gray-12 outline-none focus:border-red-500 mb-3"
                      rows={2}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setIsRequestingDayDelete(false)}
                        className="px-3 py-1.5 text-xs text-gray-8 font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => requestDayDeleteMutation.mutate()}
                        disabled={
                          !dayDeleteReason.trim() ||
                          requestDayDeleteMutation.isPending
                        }
                        className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
                      >
                        {requestDayDeleteMutation.isPending
                          ? "Submitting..."
                          : "Submit Request"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* WEEK VIEW TABS (Mon-Sat) */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {weekDates.map((wd) => {
            const todaysTasks = weeklyActivities.filter(
              (a) =>
                a.scheduled_date === wd.dateStr &&
                (a.activity_type !== "None" ||
                  (a.account_name && a.account_name.trim() !== "")),
            );
            const hasTasks = todaysTasks.length > 0;
            const allTasksDone =
              hasTasks &&
              todaysTasks.every(
                (a) =>
                  a.status === "DONE" ||
                  a.status === "APPROVED" ||
                  a.status === "PENDING" ||
                  a.status === "PENDING_APPROVAL",
              );

            return (
              <button
                key={wd.dateStr}
                onClick={() => setSelectedDate(wd.dateStr)}
                className={`flex flex-col items-center justify-center min-w-[64px] h-16 rounded-2xl border transition-all ${
                  selectedDate === wd.dateStr
                    ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105"
                    : allTasksDone
                      ? "bg-green-500/10 border-green-500/30 text-green-700 hover:bg-green-500/20 shadow-sm"
                      : "bg-gray-1 border-gray-4 text-gray-10 hover:border-gray-6"
                }`}
              >
                <span
                  className={`text-[10px] items-center justify-center flex font-bold uppercase tracking-widest ${selectedDate === wd.dateStr ? "text-white/80" : allTasksDone ? "text-green-600/80" : "text-gray-8"}`}
                >
                  {wd.label}{" "}
                  {hasTasks && !allTasksDone && (
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${isGreen ? "bg-green-500" : "bg-yellow-500 shadow-yellow-500/50"} inline-block mb-1 ml-1 shadow-sm`}
                    />
                  )}
                </span>
                <span className="text-xl font-black">
                  {wd.dateStr.split("-")[2]}
                </span>
              </button>
            );
          })}
        </div>

        {/* IPHONE NOTES STYLE: 2 COLUMNS AM/PM */}
        {isFutureWeek && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 text-center mt-4 shadow-sm mb-4">
            <h2 className="text-lg font-black text-blue-600 dark:text-blue-500 mb-1 flex items-center justify-center gap-2">
              <AlertCircle size={20} /> Future Week Locked
            </h2>
            <p className="text-gray-10 font-medium text-sm">
              Execution is currently locked because this week hasn't officially
              begun. The schedule is viewed in read-only mode.
            </p>
          </div>
        )}
        {planStatus === "DRAFT" && !isFutureWeek && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 text-center mt-4 shadow-sm mb-4">
            <h2 className="text-lg font-black text-yellow-600 dark:text-yellow-500 mb-1 flex items-center justify-center gap-2">
              <AlertCircle size={20} /> Plan Execution Locked
            </h2>
            <p className="text-gray-10 font-medium text-sm">
              Your schedule for this week is still in <strong>DRAFT</strong>{" "}
              mode. Submit your plan to enable execution triggers.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          {/* AM COLUMN */}
          <div className="bg-gray-1 border border-gray-4 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-gray-2 p-3 border-b border-gray-4">
              <h2 className="font-black text-gray-12 uppercase tracking-widest text-sm">
                AM Block
              </h2>
            </div>
            <div className="divide-y divide-gray-3">
              {plannedAM.length === 0 && unplannedAM.length === 0 && (
                <p className="p-6 text-center text-sm text-gray-8 italic">
                  No morning tasks
                </p>
              )}
              {plannedAM.map((act) => (
                <ChecklistItem
                  key={act.id}
                  data={act}
                  settings={appSettings}
                  onToggle={handleToggleDone}
                  disabledUI={isLockedUI}
                  isAdminView={isAdminView}
                  highlightId={highlightActivityId}
                />
              ))}
              {unplannedAM.map((act) => (
                <ChecklistItem
                  key={act.id}
                  data={act}
                  settings={appSettings}
                  onToggle={handleToggleDone}
                  disabledUI={isLockedUI}
                  isAdminView={isAdminView}
                  highlightId={highlightActivityId}
                />
              ))}
            </div>
            {!isLockedUI && (
              <div className="p-3 bg-gray-2 border-t border-gray-4">
                <AddUnplannedForm
                  timeOfDay="AM"
                  onSave={handleAddUnplanned}
                  categories={categories}
                />
              </div>
            )}
          </div>

          {/* PM COLUMN */}
          <div className="bg-gray-1 border border-gray-4 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-gray-2 p-3 border-b border-gray-4">
              <h2 className="font-black text-gray-12 uppercase tracking-widest text-sm">
                PM Block
              </h2>
            </div>
            <div className="divide-y divide-gray-3">
              {plannedPM.length === 0 && unplannedPM.length === 0 && (
                <p className="p-6 text-center text-sm text-gray-8 italic">
                  No afternoon tasks
                </p>
              )}
              {plannedPM.map((act) => (
                <ChecklistItem
                  key={act.id}
                  data={act}
                  settings={appSettings}
                  onToggle={handleToggleDone}
                  disabledUI={isLockedUI}
                  isAdminView={isAdminView}
                  highlightId={highlightActivityId}
                />
              ))}
              {unplannedPM.map((act) => (
                <ChecklistItem
                  key={act.id}
                  data={act}
                  settings={appSettings}
                  onToggle={handleToggleDone}
                  disabledUI={isLockedUI}
                  isAdminView={isAdminView}
                  highlightId={highlightActivityId}
                />
              ))}
            </div>
            {!isLockedUI && (
              <div className="p-3 bg-gray-2 border-t border-gray-4">
                <AddUnplannedForm
                  timeOfDay="PM"
                  onSave={handleAddUnplanned}
                  categories={categories}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

// Checklist Item mapping to iPhone notes style
function ChecklistItem({
  data,
  onToggle,
  disabledUI,
  isAdminView,
  settings,
  highlightId,
}) {
  const isDone = data.status === "DONE" || data.status === "APPROVED";
  const isPendingApproval =
    data.status === "PENDING_APPROVAL" || data.status === "PENDING";
  const isHighlighted = data.id === highlightId;
  const isLost = data.sales_outcome === "LOST";
  const isWon = data.sales_outcome === "WON";
  const [details, setDetails] = useState(data.details_daily || "");
  const [isEditing, setIsEditing] = useState(false);
  const [justChecked, setJustChecked] = useState(false);
  const queryClient = useQueryClient();
  const itemRef = useRef(null);

  // Scroll into view and briefly pulse when routed from a notification
  useEffect(() => {
    if (isHighlighted && itemRef.current) {
      setTimeout(() => {
        itemRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 400);
    }
  }, [isHighlighted]);

  const selfApproveMutation = useMutation({
    mutationFn: () => salesService.approveExpenseActivity(data.id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyActivities"] });
      queryClient.invalidateQueries({ queryKey: ["weeklyPlanLoc"] });
      toast.success("Self-Approval Processed!");
    },
    onError: (err) => toast.error(err.message),
  });

  const outcomeMutation = useMutation({
    mutationFn: ({ id, outcome }) =>
      salesService.updateActivityOutcome(id, outcome),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyActivities"] });
      queryClient.invalidateQueries({ queryKey: ["allSalesActivities"] });
      toast.success("Outcome updated!");
    },
    onError: (err) => toast.error(err.message),
  });

  let isLate = false;
  if (isDone && data.completed_at) {
    const scheduledDateObj = new Date(data.scheduled_date);
    const completedAtObj = new Date(data.completed_at);
    scheduledDateObj.setDate(scheduledDateObj.getDate() + 1);
    if (completedAtObj > scheduledDateObj) {
      isLate = true;
    }
  }

  const handleCheck = () => {
    if (disabledUI) return;
    setJustChecked(true);
    setTimeout(() => setJustChecked(false), 600);
    onToggle(data.id, details);
  };

  return (
    <div
      ref={itemRef}
      className={`p-4 flex gap-4 border-l-4 transition-all duration-500 ${justChecked ? "animate-check-flash" : ""} ${
        isHighlighted
          ? "border-l-blue-500 bg-blue-50/60"
          : isLost
            ? "border-l-red-400/60"
            : isWon
              ? "border-l-green-400/60"
              : isPendingApproval
                ? "border-l-amber-400/60"
                : "border-l-transparent"
      } ${isDone || isPendingApproval ? "opacity-60 hover:opacity-100" : "hover:bg-gray-2/50"}`}
    >
      <button
        disabled={isDone || isPendingApproval || disabledUI}
        onClick={handleCheck}
        className="mt-1 shrink-0 transition-transform active:scale-75 disabled:cursor-not-allowed"
      >
        {isDone ? (
          <CheckCircle2
            key={justChecked ? "pop" : "idle"}
            size={24}
            className={`text-green-500 ${justChecked ? "animate-success-pop" : ""}`}
          />
        ) : isPendingApproval ? (
          <div className="relative">
            <CheckCircle2 size={24} className="text-amber-500 opacity-50" />
            <Clock
              size={12}
              className="text-amber-600 absolute -right-1 -bottom-1 bg-white rounded-full shadow-sm"
            />
          </div>
        ) : (
          <Circle
            size={24}
            className={`text-gray-6 transition-transform ${justChecked ? "scale-110" : ""}`}
          />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className={`font-bold text-base truncate transition-all flex items-center flex-wrap gap-2 ${isDone || isPendingApproval ? "line-through text-gray-8" : "text-gray-12"}`}
        >
          <span>{data.account_name}</span>
          {data.is_unplanned && (
            <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full not-italic no-underline border border-blue-500/20">
              EXTRA
            </span>
          )}
          {isLate && (
            <span className="text-[10px] bg-orange-500/10 text-orange-600 px-2 py-0.5 rounded-full not-italic no-underline font-black tracking-widest border border-orange-500/20">
              LATE
            </span>
          )}
          {isPendingApproval && (
            <span className="text-[10px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full not-italic font-black tracking-widest border border-amber-500/20">
              PENDING APPROVAL
            </span>
          )}
        </p>
        {!isDone && (
          <p className="text-xs text-gray-9 mt-0.5 truncate">
            {data.activity_type} - {data.contact_person || "No Contact"}
          </p>
        )}

        {/* Reference & Expense Badges */}
        {(data.reference_number || data.expense_amount) && (
          <div className="flex flex-wrap gap-2 mt-1.5">
            {data.reference_number && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-600 border border-amber-500/25 px-2 py-0.5 rounded-full">
                {data.reference_number}
              </span>
            )}
            {data.expense_amount && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                {Number(data.expense_amount).toLocaleString()}
              </span>
            )}
            {/* Sales Outcome Badge (visible to admin/head only) */}
            {isAdminView && isWon && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-green-500/10 text-green-600 border border-green-500/25 px-2 py-0.5 rounded-full">
                âœ… WON
              </span>
            )}
            {isAdminView && isLost && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-600 border border-red-500/25 px-2 py-0.5 rounded-full">
                ðŸš« LOST
              </span>
            )}
          </div>
        )}

        {/* User Self-Approval Fast Track Hook */}
        {isPendingApproval &&
          settings?.sales_self_approve_expenses &&
          !isAdminView && (
            <div className="mt-3">
              <button
                onClick={() => selfApproveMutation.mutate()}
                disabled={selfApproveMutation.isPending || disabledUI}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 rounded-lg text-xs font-bold transition-all border border-emerald-500/20 shadow-sm disabled:opacity-50"
              >
                {selfApproveMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ThumbsUp size={14} />
                )}
                Fast-Track Approval
              </button>
            </div>
          )}

        {/* Admin/Head: Sales Outcome Dropdown (only on DONE activities with reference number context) */}
        {isAdminView && isDone && data.reference_number && (
          <div className="mt-2 flex items-center gap-2">
            <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider shrink-0">
              Outcome:
            </label>
            <select
              value={data.sales_outcome || ""}
              onChange={(e) =>
                outcomeMutation.mutate({
                  id: data.id,
                  outcome: e.target.value || null,
                })
              }
              disabled={outcomeMutation.isPending}
              className="text-[10px] font-bold uppercase bg-gray-2 border border-gray-4 rounded px-2 py-1 outline-none focus:border-primary cursor-pointer disabled:opacity-50"
            >
              <option value="">Pending</option>
              <option value="WON"> WON</option>
              <option value="LOST"> LOST</option>
            </select>
            {outcomeMutation.isPending && (
              <Loader2 size={12} className="animate-spin text-gray-9" />
            )}
          </div>
        )}

        {/* Optional Details Input */}
        {!isDone && isEditing ? (
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              placeholder="Optional execution remarks..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="flex-1 bg-white dark:bg-gray-3 border border-gray-4 rounded p-1.5 text-xs text-gray-12 outline-none focus:border-primary"
              autoFocus
              onBlur={() => setIsEditing(false)}
            />
          </div>
        ) : !isDone ? (
          <button
            onClick={() => setIsEditing(true)}
            className="mt-1 text-[10px] font-bold text-gray-8 hover:text-primary uppercase tracking-wider"
          >
            {details ? `Details: ${details}` : "+ Add Note (Optional)"}
          </button>
        ) : (
          data.details_daily && (
            <p className="text-xs text-gray-8 mt-1 line-through truncate">
              {data.details_daily}
            </p>
          )
        )}
      </div>
    </div>
  );
}

function AddUnplannedForm({
  timeOfDay,
  onSave,
  categories = ["SALES CALL", "IN-HOUSE"],
}) {
  const [isOpen, setIsOpen] = useState(false);

  const getInitialPayload = () => ({
    activity_type: "SALES CALL",
    account_name: "",
    details_daily: "",
    contact_person: "",
    contact_number: "",
    email_address: "",
    address: "",
    reference_number: "",
    expense_amount: "",
  });

  const [payload, setPayload] = useState(getInitialPayload());

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full text-xs font-bold text-gray-9 hover:text-primary transition-colors flex items-center gap-1"
      >
        <Plus size={14} /> NEW UNPLANNED ITEM
      </button>
    );
  }

  const handleSave = () => {
    const finalPayload = { ...payload, time_of_day: timeOfDay };

    // Fix optional numeric fields
    if (finalPayload.expense_amount === "") finalPayload.expense_amount = null;
    if (finalPayload.reference_number === "")
      finalPayload.reference_number = null;

    onSave(finalPayload);
    setIsOpen(false);
    setPayload(getInitialPayload());
  };

  return (
    <div className="animate-in fade-in slide-in-from-top-2 p-4 bg-gray-3 rounded-xl border border-gray-4 mt-2 space-y-4 shadow-sm relative w-full overflow-hidden">
      <div className="flex justify-between items-center border-b border-gray-4 pb-2 mb-2">
        <h4 className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
          <Plus size={14} /> Unplanned Entry
        </h4>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">
              Account &amp; Activity
            </label>
            <div className="flex gap-2">
              <select
                value={payload.activity_type}
                onChange={(e) =>
                  setPayload({ ...payload, activity_type: e.target.value })
                }
                className="bg-gray-1 border border-gray-4 rounded-lg px-2 py-2 text-xs font-bold outline-none cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                autoFocus
                required
                type="text"
                placeholder="Account Name (Required)"
                value={payload.account_name}
                onChange={(e) =>
                  setPayload({ ...payload, account_name: e.target.value })
                }
                className="flex-1 bg-gray-1 border border-gray-4 rounded-lg px-3 py-2 text-sm font-bold text-gray-12 outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">
              Contact Person
            </label>
            <input
              type="text"
              value={payload.contact_person}
              onChange={(e) =>
                setPayload({ ...payload, contact_person: e.target.value })
              }
              className="w-full bg-gray-1 border border-gray-4 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">
              Contact Number
            </label>
            <input
              type="text"
              value={payload.contact_number}
              onChange={(e) =>
                setPayload({ ...payload, contact_number: e.target.value })
              }
              className="w-full bg-gray-1 border border-gray-4 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={payload.email_address}
              onChange={(e) =>
                setPayload({ ...payload, email_address: e.target.value })
              }
              className="w-full bg-gray-1 border border-gray-4 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">
              Address
            </label>
            <input
              type="text"
              value={payload.address}
              onChange={(e) =>
                setPayload({ ...payload, address: e.target.value })
              }
              className="w-full bg-gray-1 border border-gray-4 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1 flex items-center gap-1 w-full justify-between">
              Execution Details
              <span className="text-[9px] font-medium text-gray-8 italic lowercase">
                (optional remarks)
              </span>
            </label>
            <textarea
              placeholder="What occurred?"
              value={payload.details_daily}
              onChange={(e) =>
                setPayload({ ...payload, details_daily: e.target.value })
              }
              className="w-full bg-gray-1 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus:border-primary transition-colors resize-none h-16"
            />
          </div>
        </div>

        <div className="border-t border-gray-4 pt-3 mt-1 sm:col-span-2">
          <label className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block mb-2">
            Fund Request &amp; Reference
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Ref No. (e.g. SQ/TRM)"
              value={payload.reference_number || ""}
              onChange={(e) =>
                setPayload({ ...payload, reference_number: e.target.value })
              }
              className="w-full bg-gray-1 border border-gray-4 rounded-lg px-3 py-1.5 text-xs text-gray-12 outline-none focus:border-amber-500 placeholder:text-gray-7"
            />
            <input
              type="number"
              placeholder="Est. Expense (â‚±)"
              value={payload.expense_amount || ""}
              onChange={(e) =>
                setPayload({
                  ...payload,
                  expense_amount:
                    e.target.value === "" ? "" : Number(e.target.value),
                })
              }
              className="w-full bg-gray-1 border border-gray-4 rounded-lg px-3 py-1.5 text-xs text-gray-12 outline-none focus:border-amber-500 placeholder:text-gray-7"
              min="0"
              step="0.01"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-3 border-t border-gray-4 mt-4">
        <button
          onClick={() => setIsOpen(false)}
          className="flex-1 py-2 text-xs font-bold text-gray-9 hover:text-gray-12 bg-gray-2 rounded-lg border border-gray-4 transition-colors"
        >
          Cancel
        </button>
        <button
          disabled={!payload.account_name}
          onClick={handleSave}
          className="flex-[2] py-2 rounded-lg bg-primary text-white text-xs font-bold shadow-lg shadow-red-a3 disabled:opacity-50 transition-transform active:scale-[0.98]"
        >
          Add Item
        </button>
      </div>
    </div>
  );
}
