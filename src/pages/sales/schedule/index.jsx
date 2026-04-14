import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "../../../services/salesService";
import { useAuth } from "../../../context/AuthContext";
import ProtectedRoute from "../../../components/ProtectedRoute.jsx";
import { useNavigate, useLocation } from "react-router";
import toast from "react-hot-toast";
import {
  Calendar as CalendarIcon,
  Save,
  Send,
  Loader2,
  ChevronDown,
  ChevronRight,
  Copy,
  Trash2,
  Settings,
  Plus,
  X,
} from "lucide-react";

// Utility to get the next Monday
function getNextMonday() {
  const date = new Date();
  date.setDate(date.getDate() + ((1 + 7 - date.getDay()) % 7 || 7));
  return date;
}

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

export default function SalesSchedulePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(0); // 0=Mon, 1=Tue...
  const [weekStartDate, setWeekStartDate] = useState(() =>
    formatDateToYMD(getNextMonday()),
  );
  const [includeSaturday, setIncludeSaturday] = useState(false);
  const [includeSunday, setIncludeSunday] = useState(false);

  const { data: planWrapper, isLoading } = useQuery({
    queryKey: ["weeklyPlan", user?.id, weekStartDate],
    queryFn: () => salesService.getWeeklyPlan(user?.id, weekStartDate),
    enabled: !!user?.id,
  });

  const location = useLocation();
  useEffect(() => {
    const fetchHighlightPlan = async () => {
      if (location.state?.highlightPlanId) {
        try {
          const planData = await salesService.getPlanById(
            location.state.highlightPlanId,
          );
          if (planData?.week_start_date) {
            setWeekStartDate(planData.week_start_date);
          }
        } catch (err) {
          console.error("Failed to load highlighted plan:", err);
        }
      }
    };
    fetchHighlightPlan();
  }, [location.state?.highlightPlanId]);

  const plan = planWrapper || { status: "DRAFT", sales_activities: [] };
  const canBypassLock = user?.id === plan.employee_id && (user?.is_head || user?.isHead || user?.isSuperAdmin || user?.is_super_admin);
  const isLocked = !canBypassLock && (plan.status === "SUBMITTED" || plan.status === "APPROVED");
  const planStatus = plan?.status || "DRAFT";
  const isGreen = planStatus === "SUBMITTED" || planStatus === "APPROVED";

  // State to hold form data spanning all days
  const [activitiesData, setActivitiesData] = useState([]);
  const [slotCounts, setSlotCounts] = useState({});

  useEffect(() => {
    if (planWrapper && planWrapper.sales_activities) {
      const bucketCounts = {};
      const reconstructed = planWrapper.sales_activities.map((act) => {
        const key = `${act.scheduled_date}-${act.time_of_day}`;
        if (bucketCounts[key] === undefined) bucketCounts[key] = 0;
        const updated = { ...act, _slot_index: bucketCounts[key] };
        bucketCounts[key]++;
        return updated;
      });

      const newCounts = {};
      Object.entries(bucketCounts).forEach(([k, count]) => {
        newCounts[k] = Math.max(5, count);
      });

      // Avoid synchronous setState in effect warning
      queueMicrotask(() => {
        setActivitiesData(reconstructed);
        setSlotCounts(newCounts);
      });
    } else {
      queueMicrotask(() => {
        setActivitiesData([]);
        setSlotCounts({});
      });
    }
  }, [planWrapper]);

  // Generate the dates of the week
  const weekDates = useMemo(() => {
    const dates = [];
    const [y, m, d] = weekStartDate.split("-").map(Number);
    const start = new Date(y, m - 1, d);
    let totalDays = 5;
    if (includeSaturday) totalDays = 6;
    if (includeSunday) totalDays = 7;
    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(currentDate.getDate() + i);
      dates.push({
        label: currentDate.toLocaleDateString("en-US", { weekday: "long" }),
        dateStr: formatDateToYMD(currentDate),
      });
    }
    return dates;
  }, [weekStartDate, includeSaturday, includeSunday]);


  const { data: dbCategories = [] } = useQuery({
    queryKey: ["salesCategories"],
    queryFn: async () => await salesService.getSalesCategories(),
  });

  const categories = useMemo(() => {
    const defaultCats = ["SALES CALL", "IN-HOUSE"];
    return Array.from(new Set([...defaultCats, ...dbCategories]));
  }, [dbCategories]);

  const getSlotData = (dateStr, timeOfDay, slotIndex) => {
    const existing = activitiesData.find(
      (a) =>
        a.scheduled_date === dateStr &&
        a.time_of_day === timeOfDay &&
        a._slot_index === slotIndex,
    );
    if (existing) return existing;
    return {
      scheduled_date: dateStr,
      time_of_day: timeOfDay,
      _slot_index: slotIndex,
      activity_type: "None",
      account_name: "",
      contact_person: "",
      contact_number: "",
      email_address: "",
      address: "",
      remarks_plan: "",
      reference_number: "",
      expense_amount: "",
    };
  };

  const updateSlotData = (dateStr, timeOfDay, slotIndex, field, value) => {
    setActivitiesData((prev) => {
      const copy = [...prev];
      const idx = copy.findIndex(
        (a) =>
          a.scheduled_date === dateStr &&
          a.time_of_day === timeOfDay &&
          a._slot_index === slotIndex,
      );
      if (idx >= 0) {
        copy[idx] = { ...copy[idx], [field]: value };
      } else {
        const newSlot = getSlotData(dateStr, timeOfDay, slotIndex);
        newSlot[field] = value;
        copy.push(newSlot);
      }
      return copy;
    });
  };

  const handleAddSlot = (dateStr, timeOfDay) => {
    setSlotCounts((prev) => {
      const key = `${dateStr}-${timeOfDay}`;
      const currentCount = prev[key] || 5;
      if (currentCount >= 8) {
        toast.error("Maximum of 8 activities allowed per block.");
        return prev;
      }
      return { ...prev, [key]: currentCount + 1 };
    });
  };

  const handleUsePrevious = (dateStr, timeOfDay, currentSlotIndex) => {
    if (currentSlotIndex === 0) return;
    const prevData = getSlotData(dateStr, timeOfDay, currentSlotIndex - 1);
    if (!prevData || prevData.activity_type === "None") return;

    setActivitiesData((prev) => {
      const copy = [...prev];
      const existingIdx = copy.findIndex(
        (a) =>
          a.scheduled_date === dateStr &&
          a.time_of_day === timeOfDay &&
          a._slot_index === currentSlotIndex,
      );

      const newPayload = {
        ...prevData,
        _slot_index: currentSlotIndex,
        id: undefined,
        plan_id: undefined,
        employee_id: undefined,
      };

      if (existingIdx >= 0) {
        copy[existingIdx] = newPayload;
      } else {
        copy.push(newPayload);
      }
      return copy;
    });
  };

  const handleDeleteSlot = (dateStr, timeOfDay, slotIndex) => {
    setActivitiesData((prev) => {
      let copy = [...prev];
      copy = copy.filter(
        (a) =>
          !(
            a.scheduled_date === dateStr &&
            a.time_of_day === timeOfDay &&
            a._slot_index === slotIndex
          ),
      );
      copy = copy.map((a) => {
        if (
          a.scheduled_date === dateStr &&
          a.time_of_day === timeOfDay &&
          a._slot_index > slotIndex
        ) {
          return { ...a, _slot_index: a._slot_index - 1 };
        }
        return a;
      });
      return copy;
    });

    setSlotCounts((prev) => {
      const key = `${dateStr}-${timeOfDay}`;
      const currentCount = prev[key] || 5;
      if (currentCount > 5) {
        return { ...prev, [key]: currentCount - 1 };
      }
      return prev;
    });
  };

  const handleClearBlock = (dateStr, timeOfDay) => {
    setActivitiesData((prev) =>
      prev.filter(
        (a) => !(a.scheduled_date === dateStr && a.time_of_day === timeOfDay),
      ),
    );
    setSlotCounts((prev) => ({ ...prev, [`${dateStr}-${timeOfDay}`]: 5 }));
  };

  const handleClearDay = (dateStr) => {
    setActivitiesData((prev) =>
      prev.filter((a) => a.scheduled_date !== dateStr),
    );
    setSlotCounts((prev) => ({
      ...prev,
      [`${dateStr}-AM`]: 5,
      [`${dateStr}-PM`]: 5,
    }));
  };

  const handleCloneDayToDate = (sourceDateStr, targetDateStr) => {
    const sourceTasks = activitiesData.filter(
      (a) =>
        a.scheduled_date === sourceDateStr &&
        (a.activity_type !== "None" ||
          (a.account_name && a.account_name.trim() !== "")),
    );

    if (sourceTasks.length === 0) {
      toast.error("Source day is empty.");
      return;
    }

    let maxAm = 0;
    let maxPm = 0;
    sourceTasks.forEach((task) => {
      if (task.time_of_day === "AM")
        maxAm = Math.max(maxAm, task._slot_index + 1);
      if (task.time_of_day === "PM")
        maxPm = Math.max(maxPm, task._slot_index + 1);
    });

    setActivitiesData((prev) => {
      const copy = prev.filter((a) => a.scheduled_date !== targetDateStr);
      sourceTasks.forEach((task) => {
        copy.push({
          ...task,
          scheduled_date: targetDateStr,
          id: undefined,
          plan_id: undefined,
          employee_id: undefined,
        });
      });
      return copy;
    });

    setSlotCounts((sc) => ({
      ...sc,
      [`${targetDateStr}-AM`]: Math.max(5, maxAm),
      [`${targetDateStr}-PM`]: Math.max(5, maxPm),
    }));
  };

  const handleActionSelect = (val, dateStr) => {
    if (!val) return;
    if (val === "clear_am") handleClearBlock(dateStr, "AM");
    else if (val === "clear_pm") handleClearBlock(dateStr, "PM");
    else if (val === "clear_day") handleClearDay(dateStr);
    else if (val.startsWith("clone_")) {
      const targetDate = val.replace("clone_", "");
      handleCloneDayToDate(dateStr, targetDate);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (isSubmit = false) => {
      // 1.
      if (isSubmit) {
        let invalid = false;
        weekDates.forEach((d) => {
          const amCount = activitiesData.filter(
            (a) =>
              a.scheduled_date === d.dateStr &&
              a.time_of_day === "AM" &&
              (a.activity_type !== "None" || (a.account_name && a.account_name.trim() !== ""))
          ).length;
          const pmCount = activitiesData.filter(
            (a) =>
              a.scheduled_date === d.dateStr &&
              a.time_of_day === "PM" &&
              (a.activity_type !== "None" || (a.account_name && a.account_name.trim() !== ""))
          ).length;
          if (amCount < 5 || pmCount < 5) invalid = true;
        });

        if (invalid) {
          toast.error(
            "You must plan at least 5 AM tasks and 5 PM tasks for ALL scheduled days before submitting.",
          );
          throw new Error("Invalid task counts."); // Throw an error to stop the mutation chain
        }

        if (plan?.status === "REVISION") {
          const snapshot = plan.amendment_snapshot || [];
          
          const normalize = (activity) => ({
            scheduled_date: activity.scheduled_date,
            time_of_day: activity.time_of_day,
            activity_type: activity.activity_type,
            account_name: activity.account_name,
            remarks_plan: activity.remarks_plan || "",
            reference_number: activity.reference_number || "",
            expense_amount: activity.expense_amount ? Number(activity.expense_amount) : null,
          });

          const currentNormalized = activitiesData
            .filter((a) => a.activity_type !== "None" || (a.account_name && a.account_name.trim() !== ""))
            .map(normalize)
            .sort((a,b) => (a.scheduled_date+a.time_of_day).localeCompare(b.scheduled_date+b.time_of_day));
          const snapshotNormalized = snapshot.map(normalize).sort((a,b) => (a.scheduled_date+a.time_of_day).localeCompare(b.scheduled_date+b.time_of_day));
          
          if (JSON.stringify(currentNormalized) === JSON.stringify(snapshotNormalized)) {
            toast.error("No changes detected. Please make changes or discard the amendment.");
            throw new Error("No changes made during amendment.");
          }
        }
      }

      let currentPlanId = plan?.id;
      if (!currentPlanId) {
        const newPlan = await salesService.upsertWeeklyPlan(
          user.id,
          weekStartDate,
          "DRAFT",
        );
        currentPlanId = newPlan.id;
      }

      // 2. Prepare activities mapping plan_id and employee_id, filtering out pure blanks
      const toSave = activitiesData
        .filter(
          (a) =>
            a.activity_type !== "None" ||
            (a.account_name && a.account_name.trim() !== ""),
        )
        .map((a) => {
          const payload = {
            ...a,
            plan_id: currentPlanId,
            employee_id: user.id,
          };
          delete payload._slot_index;
          if (!payload.id) {
            delete payload.id;
          }

          if (payload.expense_amount === "") payload.expense_amount = null;
          if (payload.reference_number === "") payload.reference_number = null;

          return payload;
        });

      const newIds = toSave.filter((a) => !!a.id).map((a) => a.id);
      const originalIds = plan?.sales_activities?.map((a) => a.id) || [];
      const idsToDelete = originalIds.filter((id) => !newIds.includes(id));

      if (idsToDelete.length > 0) {
        await salesService.deleteActivities(idsToDelete);
      }

      if (toSave.length > 0) {
        await salesService.bulkUpsertActivities(toSave);
      }
      return currentPlanId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["weeklyPlan", user.id, weekStartDate],
      });
      toast.success("Draft saved successfully!");
    },
    onError: (err) => toast.error(err.message),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const planId = await saveMutation.mutateAsync(true);
      await salesService.submitPlan(planId, user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["weeklyPlan", user.id, weekStartDate],
      });
      toast.success("Schedule Submitted Successfully!");
      // Navigate to daily pointing at the start of the planned week so the
      // user lands on Monday of their submitted plan, not today.
      navigate("/sales/daily", { state: { date: weekStartDate } });
    },
    onError: (err) => toast.error(err.message),
  });

  const deletePlanMutation = useMutation({
    mutationFn: async () => {
      if (!plan?.id) return;
      if (plan.status === 'REVISION') {
        // Discarding an amendment doesn't delete the plan, it reverts to snapshot
        await salesService.resolvePlanAmendment(plan.id, false, user);
      } else {
        // Actually delete the draft plan record
        await salesService.deleteWeeklyPlan(plan.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["weeklyPlan", user.id, weekStartDate],
      });
      const msg = plan.status === 'REVISION' 
        ? "Amendment Discarded. Plan reverted to approved state." 
        : "Draft Plan Successfully Deleted!";
      toast.success(msg);
    },
    onError: (err) => toast.error(err.message),
  });

  const [isRequestingAmendment, setIsRequestingAmendment] = useState(false);
  const [amendmentReason, setAmendmentReason] = useState("");

  const requestAmendmentMutation = useMutation({
    mutationFn: () =>
      salesService.requestPlanAmendment(plan.id, amendmentReason, user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weeklyPlanLoc"] });
      queryClient.invalidateQueries({
        queryKey: ["weeklyPlan", user.id, weekStartDate],
      });
      toast.success(
        "Amendment Request Submitted! Plan is now temporarily mapped as REVISION.",
      );
      setIsRequestingAmendment(false);
      setAmendmentReason("");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <ProtectedRoute excludeSuperAdmin={true}>
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-gray-8" size={32} />
        </div>
      </ProtectedRoute>
    );
  }

  const currentDateObj =
    weekDates[activeTab] || weekDates[weekDates.length - 1];

  const mapDateToBlockCounts = activitiesData.reduce((acc, a) => {
    if (
      a.activity_type !== "None" ||
      (a.account_name && a.account_name.trim() !== "")
    ) {
      if (!acc[a.scheduled_date]) acc[a.scheduled_date] = { AM: 0, PM: 0 };
      if (a.time_of_day === "AM") acc[a.scheduled_date].AM += 1;
      if (a.time_of_day === "PM") acc[a.scheduled_date].PM += 1;
    }
    return acc;
  }, {});
  const allDaysFilled = weekDates.every((d) => {
    const counts = mapDateToBlockCounts[d.dateStr];
    return counts && counts.AM >= 5 && counts.PM >= 5;
  });

  return (
    <ProtectedRoute excludeSuperAdmin={true}>
      <div className="max-w-[1600px] mx-auto space-y-6 pb-10 px-2 sm:px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-4 pb-4">
          <div>
            <h1 className="text-3xl font-black text-gray-12">
              Weekly Coverage Plan
            </h1>
            <p className="text-gray-9 mt-1 font-medium">
              Plan your tasks and sales calls for the upcoming week.
            </p>
          </div>
          <div className="flex gap-4 items-center flex-wrap">
            {!isLocked && (
              <div className="flex gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-gray-10 hover:text-gray-12 bg-gray-2 px-3 py-2 rounded-lg border border-gray-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={includeSaturday}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIncludeSaturday(checked);
                      if (!checked) {
                        setIncludeSunday(false);
                        // Clamp activeTab if we are on Sat/Sun
                        if (activeTab >= 5) {
                          setActiveTab(4); // Back to Friday
                        }
                      }
                    }}
                    className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                  <span>Saturday</span>
                </label>
                <label
                  className={`flex items-center gap-2 cursor-pointer text-sm font-bold text-gray-10 hover:text-gray-12 bg-gray-2 px-3 py-2 rounded-lg border border-gray-4 whitespace-nowrap transition-opacity ${!includeSaturday ? "opacity-40 pointer-events-none" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={includeSunday}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIncludeSunday(checked);
                      if (!checked && activeTab === 6) {
                        setActiveTab(5); // Back to Saturday
                      }
                    }}
                    disabled={!includeSaturday}
                    className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                  <span>Sunday</span>
                </label>
              </div>
            )}
            <div className="bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 flex items-center shadow-inner">
              <CalendarIcon size={16} className="text-gray-8 mr-2" />
              <input
                type="date"
                value={weekStartDate}
                onChange={(e) => {
                  const pickedDate = new Date(e.target.value);
                  const startOfWeek = getStartOfWeek(e.target.value);
                  setWeekStartDate(formatDateToYMD(startOfWeek));
                  const dayIndex = pickedDate.getDay() - 1; // Mon=0, Fri=4, Sat=5
                  if (dayIndex >= 0 && dayIndex <= 5) {
                    setActiveTab(dayIndex);
                  } else if (pickedDate.getDay() === 0) {
                    setActiveTab(includeSunday ? 6 : 0);
                  }
                }}
                className="bg-transparent text-gray-12 font-bold outline-none cursor-pointer"
              />
              <span className="ml-3 text-xs font-bold px-2 py-1 rounded bg-gray-3 border border-gray-4">
                Status: {plan.status}
              </span>
            </div>
          </div>
        </div>

        {!isLocked && (
          <div className="bg-blue-900/10 border border-blue-900/30 p-4 rounded-xl flex items-center justify-between">
            <p className="text-sm font-bold text-blue-500">
              Remember to submit your schedule by Friday End of Day for the
              following week!
            </p>
            <div className="flex gap-3">
              {plan?.id && (
                <button
                  onClick={() => {
                    const confirmMsg = plan.status === 'REVISION'
                      ? "Are you sure you want to discard your amendment? All current changes will be lost and the plan will revert to its previously approved state."
                      : "Are you sure you want to completely delete this Draft plan and all its activities?";
                    if (window.confirm(confirmMsg)) {
                      deletePlanMutation.mutate();
                    }
                  }}
                  disabled={
                    deletePlanMutation.isPending ||
                    submitMutation.isPending ||
                    saveMutation.isPending
                  }
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-600 rounded-lg font-bold flex items-center gap-2 transition-colors"
                >
                  {deletePlanMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : plan.status === 'REVISION' ? (
                    <X size={16} />
                  ) : (
                    <Trash2 size={16} />
                  )}{" "}
                  {plan.status === 'REVISION' ? 'Discard Amendment' : 'Delete Draft'}
                </button>
              )}
              <button
                onClick={() => saveMutation.mutate()}
                disabled={
                  saveMutation.isPending ||
                  deletePlanMutation.isPending ||
                  submitMutation.isPending
                }
                className="px-4 py-2 bg-gray-2 hover:bg-gray-3 border border-gray-4 text-gray-12 rounded-lg font-bold flex items-center gap-2 transition-colors"
              >
                {saveMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}{" "}
                Save Draft
              </button>
              <button
                onClick={() => submitMutation.mutate()}
                disabled={
                  saveMutation.isPending ||
                  submitMutation.isPending ||
                  !allDaysFilled
                }
                title={
                  !allDaysFilled
                    ? "Please plan at least 5 AM tasks and 5 PM tasks for ALL days of the week to unlock submission."
                    : ""
                }
                className={`px-4 py-2 ${allDaysFilled ? "bg-green-600 hover:bg-green-700 shadow-green-900/20 shadow-lg cursor-pointer" : "bg-green-900/50 text-white/50 cursor-not-allowed"} text-white rounded-lg font-bold flex items-center gap-2 transition-colors`}
              >
                <Send size={16} /> Submit Plan
              </button>
            </div>
          </div>
        )}

        {isLocked && plan.status !== "REVISION" && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-amber-600 font-black flex items-center gap-2">
                Plan is Locked
              </h3>
              <p className="text-sm font-bold text-amber-600/80 mt-1">
                This plan has already been submitted or approved. To make
                changes, you must request an amendment.
              </p>
            </div>
            <div>
              {!isRequestingAmendment ? (
                <button
                  onClick={() => setIsRequestingAmendment(true)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 shadow shadow-amber-500/20 text-white rounded-lg font-bold flex items-center gap-2 transition-all"
                >
                  Request Amendment
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={amendmentReason}
                    onChange={(e) => setAmendmentReason(e.target.value)}
                    placeholder="Reason for amendment..."
                    className="text-sm p-2 rounded border border-amber-500/30 outline-none w-[250px] bg-white dark:bg-gray-3 text-gray-12"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setIsRequestingAmendment(false)}
                      className="text-xs font-bold text-gray-8 hover:text-gray-11"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => requestAmendmentMutation.mutate()}
                      disabled={
                        !amendmentReason.trim() ||
                        requestAmendmentMutation.isPending
                      }
                      className="px-3 py-1.5 text-xs font-bold bg-amber-500 text-white rounded disabled:opacity-50"
                    >
                      {requestAmendmentMutation.isPending
                        ? "Submitting..."
                        : "Submit Request"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {plan.status === "REVISION" && (
          <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-blue-500 flex items-center gap-2">
                Revision Mode Active
              </p>
              <p className="text-xs text-blue-600 mt-1">
                You can now edit your plan. Click "Submit Amendments" when
                finished.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || submitMutation.isPending}
                className="px-4 py-2 bg-gray-2 hover:bg-gray-3 border border-gray-4 text-gray-12 rounded-lg font-bold transition-colors"
              >
                Save Draft
              </button>
              <button
                onClick={() => submitMutation.mutate()}
                disabled={
                  saveMutation.isPending ||
                  submitMutation.isPending ||
                  !allDaysFilled
                }
                title={
                  !allDaysFilled
                    ? "Please plan at least 5 AM tasks and 5 PM tasks for ALL days of the week to unlock submission."
                    : ""
                }
                className={`px-4 py-2 ${allDaysFilled ? "bg-blue-600 hover:bg-blue-700 shadow-blue-900/20 shadow-lg cursor-pointer" : "bg-blue-900/50 text-white/50 cursor-not-allowed"} text-white rounded-lg font-bold flex items-center gap-2 transition-colors`}
              >
                <Send size={16} /> Submit Amendments
              </button>
            </div>
          </div>
        )}

        {/* The Days Tabs */}
        <div className="flex gap-2 border-b border-gray-4 pb-0 overflow-x-auto">
          {weekDates.map((d, idx) => {
            const hasTasks = activitiesData.some(
              (a) =>
                a.scheduled_date === d.dateStr &&
                (a.activity_type !== "None" ||
                  (a.account_name && a.account_name.trim() !== "")),
            );
            return (
              <button
                key={d.dateStr}
                onClick={() => setActiveTab(idx)}
                className={`px-6 py-3 font-bold text-sm tracking-wide border-b-2 transition-colors whitespace-nowrap ${activeTab === idx ? "border-gray-a3  bg-gray-a3" : "border-transparent text-gray-9 hover:text-gray-12 hover:bg-gray-2"}`}
              >
                {d.label}{" "}
                {hasTasks && (
                  <span
                    className={`w-2 h-2 rounded-full ${isGreen ? "bg-green-500" : "bg-yellow-500"} inline-block ml-1 mb-0.5 shadow-sm`}
                  ></span>
                )}
                <span className="text-xs font-normal text-gray-8 block">
                  {d.dateStr}
                </span>
              </button>
            );
          })}
        </div>

        {/* 2-Column Grid for the Active Day */}
        <div className="flex justify-between items-center mt-6 mb-2 border-b border-gray-4 pb-2">
          <h2 className="text-xl font-black text-gray-12">
            {currentDateObj.label} Schedule
          </h2>
          {!isLocked && (
            <div className="relative">
              <select
                className="appearance-none bg-gray-2 hover:bg-gray-3 border border-gray-4 text-gray-12 text-xs font-bold uppercase tracking-wider px-3 py-2 pr-8 rounded-lg outline-none cursor-pointer transition-colors shadow-sm"
                value=""
                onChange={(e) =>
                  handleActionSelect(e.target.value, currentDateObj.dateStr)
                }
              >
                <option value="" disabled>
                  Advanced Actions...
                </option>
                <option value="clear_am">Clear AM Block</option>
                <option value="clear_pm">Clear PM Block</option>
                <option value="clear_day">Wipe Entire Day</option>
                <option disabled>──────────</option>
                {weekDates
                  .filter((d) => d.dateStr !== currentDateObj.dateStr)
                  .map((d) => (
                    <option
                      key={`clone_${d.dateStr}`}
                      value={`clone_${d.dateStr}`}
                    >
                      Clone Day To {d.label}
                    </option>
                  ))}
              </select>
              <Settings
                size={14}
                className="absolute right-2.5 top-2.5 text-gray-8 pointer-events-none"
              />
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* AM COLUMN */}
          <div className="space-y-4">
            <div className="bg-gray-2 border border-gray-4 rounded-t-xl p-3 border-b-0">
              <h3 className="font-black text-gray-12 tracking-widest uppercase text-center">
                MORNING (AM)
              </h3>
            </div>
            {Array.from({
              length: slotCounts[`${currentDateObj.dateStr}-AM`] || 5,
            }).map((_, slotIdx) => {
              const currentData = getSlotData(
                currentDateObj.dateStr,
                "AM",
                slotIdx,
              );
              const prevData =
                slotIdx > 0
                  ? getSlotData(currentDateObj.dateStr, "AM", slotIdx - 1)
                  : null;
              const prevIsFilled =
                prevData &&
                (prevData.activity_type !== "None" || !!prevData.account_name);
              const isCurrentEmpty =
                (!currentData.activity_type ||
                  currentData.activity_type === "None") &&
                (!currentData.account_name ||
                  currentData.account_name.trim() === "");

              return (
                <ActivitySlotBox
                  key={`AM-${slotIdx}`}
                  data={currentData}
                  onChange={(field, val) =>
                    updateSlotData(
                      currentDateObj.dateStr,
                      "AM",
                      slotIdx,
                      field,
                      val,
                    )
                  }
                  onDelete={() =>
                    handleDeleteSlot(currentDateObj.dateStr, "AM", slotIdx)
                  }
                  onUsePrevious={() =>
                    handleUsePrevious(currentDateObj.dateStr, "AM", slotIdx)
                  }
                  showUsePrevious={
                    slotIdx > 0 && prevIsFilled && isCurrentEmpty
                  }
                  canDelete={slotIdx >= 5}
                  disabled={isLocked}
                  slotNum={slotIdx + 1}
                  availableCategories={categories}
                />
              );
            })}
            {!isLocked &&
              (slotCounts[`${currentDateObj.dateStr}-AM`] || 5) < 8 && (
                <button
                  onClick={() => handleAddSlot(currentDateObj.dateStr, "AM")}
                  className="w-full py-3 mt-2 border-2 border-dashed border-gray-4 hover:border-primary hover:text-primary hover:bg-primary/5 text-gray-9 font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Add Extra Schedule Item
                </button>
              )}
          </div>

          {/* PM COLUMN */}
          <div className="space-y-4">
            <div className="bg-gray-2 border border-gray-4 rounded-t-xl p-3 border-b-0">
              <h3 className="font-black text-gray-12 tracking-widest uppercase text-center">
                AFTERNOON (PM)
              </h3>
            </div>
            {Array.from({
              length: slotCounts[`${currentDateObj.dateStr}-PM`] || 5,
            }).map((_, slotIdx) => {
              const currentData = getSlotData(
                currentDateObj.dateStr,
                "PM",
                slotIdx,
              );
              const prevData =
                slotIdx > 0
                  ? getSlotData(currentDateObj.dateStr, "PM", slotIdx - 1)
                  : null;
              const prevIsFilled =
                prevData &&
                (prevData.activity_type !== "None" || !!prevData.account_name);
              const isCurrentEmpty =
                (!currentData.activity_type ||
                  currentData.activity_type === "None") &&
                (!currentData.account_name ||
                  currentData.account_name.trim() === "");

              return (
                <ActivitySlotBox
                  key={`PM-${slotIdx}`}
                  data={currentData}
                  onChange={(field, val) =>
                    updateSlotData(
                      currentDateObj.dateStr,
                      "PM",
                      slotIdx,
                      field,
                      val,
                    )
                  }
                  onDelete={() =>
                    handleDeleteSlot(currentDateObj.dateStr, "PM", slotIdx)
                  }
                  onUsePrevious={() =>
                    handleUsePrevious(currentDateObj.dateStr, "PM", slotIdx)
                  }
                  showUsePrevious={
                    slotIdx > 0 && prevIsFilled && isCurrentEmpty
                  }
                  canDelete={slotIdx >= 5}
                  disabled={isLocked}
                  slotNum={slotIdx + 1}
                  availableCategories={categories}
                />
              );
            })}
            {!isLocked &&
              (slotCounts[`${currentDateObj.dateStr}-PM`] || 5) < 8 && (
                <button
                  onClick={() => handleAddSlot(currentDateObj.dateStr, "PM")}
                  className="w-full py-3 mt-2 border-2 border-dashed border-gray-4 hover:border-primary hover:text-primary hover:bg-primary/5 text-gray-9 font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Add Extra Schedule Item
                </button>
              )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function ActivitySlotBox({
  data,
  onChange,
  onDelete,
  onUsePrevious,
  showUsePrevious,
  canDelete,
  disabled,
  slotNum,
  availableCategories = [],
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isFilled = data.activity_type !== "None" || !!data.account_name;

  return (
    <div
      className={`bg-gray-1 border ${isFilled ? "border-gray-6 shadow-md" : "border-gray-4"} rounded-xl overflow-hidden transition-all delay-75`}
    >
      {/* Accordion Header */}
      <div
        onClick={() => !disabled && setIsExpanded(!isExpanded)}
        className={`p-3 flex items-center justify-between cursor-pointer hover:bg-gray-2 transition-colors ${disabled && "cursor-not-allowed opacity-80"}`}
      >
        <div className="flex gap-3 items-center flex-1 max-w-[65%] pr-2">
          <span className="bg-gray-3 text-gray-10 font-bold w-6 h-6 flex items-center justify-center rounded-full text-xs shrink-0">
            {slotNum}
          </span>
          <div className="max-w-[150px] w-full shrink-0">
            <select
              value={data.activity_type}
              onChange={(e) => onChange("activity_type", e.target.value)}
              disabled={disabled}
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent font-bold text-sm text-gray-12 outline-none w-full cursor-pointer disabled:cursor-not-allowed"
            >
              <option value="None">No Activity</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          {isFilled && (
            <span className="text-sm text-gray-12 font-medium truncate hidden sm:block flex-1">
              {data.account_name || (
                <span className="text-gray-8 italic">Unnamed Account</span>
              )}
            </span>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {showUsePrevious && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUsePrevious();
              }}
              className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 rounded shadow-sm transition-all"
              title="Use Previous Item Details"
            >
              <Copy size={12} />{" "}
              <span className="hidden lg:inline">Copy Prev</span>
            </button>
          )}
          {!disabled && canDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 text-gray-9 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
              title="Remove Extra Added Slot"
            >
              <Trash2 size={16} />
            </button>
          )}
          <ChevronDown
            size={20}
            className={`text-gray-8 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {/* Form Body - Auto expanding if filled and disabled so they can read it, or if toggled */}
      {(isExpanded || (disabled && isFilled)) && (
        <div className="p-4 pt-0 border-t border-gray-3 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 mt-4">
            <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">
              Account
            </label>
            <input
              type="text"
              disabled={disabled}
              value={data.account_name}
              onChange={(e) => onChange("account_name", e.target.value)}
              className="w-full bg-gray-2 border border-gray-4 rounded px-3 py-1.5 text-sm text-gray-12 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">
              Contact Person
            </label>
            <input
              type="text"
              disabled={disabled}
              value={data.contact_person}
              onChange={(e) => onChange("contact_person", e.target.value)}
              className="w-full bg-gray-2 border border-gray-4 rounded px-3 py-1.5 text-sm text-gray-12 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">
              Contact Number
            </label>
            <input
              type="text"
              disabled={disabled}
              value={data.contact_number}
              onChange={(e) => onChange("contact_number", e.target.value)}
              className="w-full bg-gray-2 border border-gray-4 rounded px-3 py-1.5 text-sm text-gray-12 outline-none focus:border-primary"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">
              Email Address
            </label>
            <input
              type="email"
              disabled={disabled}
              value={data.email_address}
              onChange={(e) => onChange("email_address", e.target.value)}
              className="w-full bg-gray-2 border border-gray-4 rounded px-3 py-1.5 text-sm text-gray-12 outline-none focus:border-primary"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">
              Address
            </label>
            <input
              type="text"
              disabled={disabled}
              value={data.address}
              onChange={(e) => onChange("address", e.target.value)}
              className="w-full bg-gray-2 border border-gray-4 rounded px-3 py-1.5 text-sm text-gray-12 outline-none focus:border-primary"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">
              Details (Plan)
            </label>
            <textarea
              disabled={disabled}
              value={data.remarks_plan}
              onChange={(e) => onChange("remarks_plan", e.target.value)}
              className="w-full bg-gray-2 border border-gray-4 rounded px-3 py-1.5 text-sm text-gray-12 outline-none focus:border-primary resize-none h-20"
            />
          </div>
          {/* === EXPENSE & REFERENCE FIELDS === */}
          <div className="sm:col-span-2 border-t border-gray-4 pt-3 mt-1">
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              Fund Request &amp; Reference
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">
                  Reference No. (SQ/TRM)
                </label>
                <input
                  type="text"
                  disabled={disabled}
                  value={data.reference_number || ""}
                  onChange={(e) => onChange("reference_number", e.target.value)}
                  placeholder="e.g. SQ-2026-001"
                  className="w-full bg-gray-2 border border-gray-4 rounded px-3 py-1.5 text-sm text-gray-12 outline-none focus:border-amber-500 placeholder:text-gray-7"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">
                  Est. Expense (₱)
                </label>
                <input
                  type="number"
                  disabled={disabled}
                  value={data.expense_amount || ""}
                  onChange={(e) =>
                    onChange(
                      "expense_amount",
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full bg-gray-2 border border-gray-4 rounded px-3 py-1.5 text-sm text-gray-12 outline-none focus:border-amber-500 placeholder:text-gray-7"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
