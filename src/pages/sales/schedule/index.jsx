import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "../../../services/salesService";
import { useAuth } from "../../../context/AuthContext";
import ProtectedRoute from "../../../components/ProtectedRoute.jsx";
import { useNavigate, useLocation } from "react-router";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { uxMetricsService } from "../../../services/uxMetricsService";
import PageContainer from "../../../components/ui/PageContainer";

import { ScheduleHeader } from "./components/ScheduleHeader";
import { ScheduleTabs } from "./components/ScheduleTabs";
import { ScheduleDayView } from "./components/ScheduleDayView";
import { SaveTemplateModal, ManageTemplatesModal } from "./components/TemplateModals";
import { getNextMonday, formatDateToYMD } from "./utils";

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
  const [compactMode, setCompactMode] = useState(true);
  const [planningStartedAt, setPlanningStartedAt] = useState(() => Date.now());

  const { data: planWrapper, isLoading } = useQuery({
    queryKey: ["weeklyPlan", user?.id, weekStartDate],
    queryFn: () => salesService.getWeeklyPlan(user?.id, weekStartDate),
    enabled: !!user?.id,
  });

  const { data: customTemplates = [], refetch: refetchCustomTemplates } = useQuery({
    queryKey: ["salesCustomTemplates", user?.id],
    queryFn: () => salesService.getCustomTemplates(user?.id),
    enabled: !!user?.id,
  });

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [slotToSave, setSlotToSave] = useState(null);

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
        newCounts[k] = count;
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
      const currentCount = prev[key] || 0;
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

  const scheduleTemplates = [
    {
      id: "followup",
      label: "Follow-up Call",
      payload: {
        activity_type: "SALES CALL",
        remarks_plan: "Follow up on prior proposal and next-step commitment.",
      },
    },
    {
      id: "newLead",
      label: "New Lead Intro",
      payload: {
        activity_type: "SALES CALL",
        remarks_plan: "Initial discovery call and qualification.",
      },
    },
    {
      id: "inhouse",
      label: "In-House Visit",
      payload: {
        activity_type: "IN-HOUSE",
        remarks_plan: "In-person consultation and product walkthrough.",
      },
    },
  ];

  const handleApplyTemplate = (dateStr, timeOfDay, slotIndex, templateId) => {
    const template = scheduleTemplates.find((t) => t.id === templateId);
    if (!template) return;
    Object.entries(template.payload).forEach(([field, value]) => {
      updateSlotData(dateStr, timeOfDay, slotIndex, field, value);
    });
  };

  const handleUseSmartSuggestion = (dateStr, timeOfDay, currentSlotIndex) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const currentDate = new Date(year, month - 1, day);
    const prevDay = new Date(currentDate);
    prevDay.setDate(currentDate.getDate() - 1);
    const prevWeek = new Date(currentDate);
    prevWeek.setDate(currentDate.getDate() - 7);

    const toYmd = (dt) =>
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;

    const candidates = [
      { date: toYmd(prevDay), slot: currentSlotIndex },
      { date: toYmd(prevWeek), slot: currentSlotIndex },
      { date: dateStr, slot: currentSlotIndex - 1 },
    ];

    const source = candidates
      .map((c) =>
        activitiesData.find(
          (a) =>
            a.scheduled_date === c.date &&
            a.time_of_day === timeOfDay &&
            a._slot_index === c.slot &&
            (a.activity_type !== "None" ||
              (a.account_name && a.account_name.trim() !== "")),
        ),
      )
      .find(Boolean);

    if (!source) {
      toast.error("No smart suggestion found from previous entries.");
      return;
    }

    const payload = {
      ...source,
      _slot_index: currentSlotIndex,
      id: undefined,
      plan_id: undefined,
      employee_id: undefined,
      scheduled_date: dateStr,
      time_of_day: timeOfDay,
    };

    setActivitiesData((prev) => {
      const copy = [...prev];
      const existingIdx = copy.findIndex(
        (a) =>
          a.scheduled_date === dateStr &&
          a.time_of_day === timeOfDay &&
          a._slot_index === currentSlotIndex,
      );
      if (existingIdx >= 0) copy[existingIdx] = payload;
      else copy.push(payload);
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
      const currentCount = prev[key] || 0;
      if (currentCount > 0) {
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
    setSlotCounts((prev) => ({ ...prev, [`${dateStr}-${timeOfDay}`]: 0 }));
  };

  const handleClearSlot = (dateStr, timeOfDay, slotIndex) => {
    setActivitiesData((prev) => {
      const copy = [...prev];
      const idx = copy.findIndex(
        (a) =>
          a.scheduled_date === dateStr &&
          a.time_of_day === timeOfDay &&
          a._slot_index === slotIndex,
      );
      if (idx >= 0) {
        copy[idx] = getSlotData(dateStr, timeOfDay, slotIndex);
      }
      return copy;
    });
  };

  const handleDuplicateSlot = (dateStr, timeOfDay, slotIndex) => {
    const existing = activitiesData.find(
      (a) =>
        a.scheduled_date === dateStr &&
        a.time_of_day === timeOfDay &&
        a._slot_index === slotIndex
    );
    if (!existing) return;

    setSlotCounts((prev) => {
      const key = `${dateStr}-${timeOfDay}`;
      const count = prev[key] || 0;
      if (count >= 8) {
        toast.error("Maximum 8 activities allowed per block.");
        return prev;
      }
      
      const newIndex = count;
      setTimeout(() => {
        setActivitiesData(curr => {
          const c = [...curr];
          const idx = c.findIndex(a => a.scheduled_date === dateStr && a.time_of_day === timeOfDay && a._slot_index === newIndex);
          const duplicated = { 
            ...existing, 
            _slot_index: newIndex, 
            id: undefined, 
            plan_id: undefined, 
            employee_id: undefined 
          };
          if (idx >= 0) {
             c[idx] = duplicated;
          } else {
             c.push(duplicated);
          }
          return c;
        });
      }, 0);
      return { ...prev, [key]: count + 1 };
    });
  };

  const handleClearDay = (dateStr) => {
    setActivitiesData((prev) =>
      prev.filter((a) => a.scheduled_date !== dateStr),
    );
    setSlotCounts((prev) => ({
      ...prev,
      [`${dateStr}-AM`]: 0,
      [`${dateStr}-PM`]: 0,
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
      [`${targetDateStr}-AM`]: maxAm,
      [`${targetDateStr}-PM`]: maxPm,
    }));
  };

  const handleActionSelect = (val, dateStr) => {
    if (!val) return;
    if (val === "manage_templates") setIsManageModalOpen(true);
    else if (val === "clear_am") handleClearBlock(dateStr, "AM");
    else if (val === "clear_pm") handleClearBlock(dateStr, "PM");
    else if (val === "clear_day") handleClearDay(dateStr);
    else if (val.startsWith("clone_")) {
      const targetDate = val.replace("clone_", "");
      handleCloneDayToDate(dateStr, targetDate);
    }
  };

  const saveTemplateMutation = useMutation({
    mutationFn: async (name) => {
      if (!slotToSave) return;
      await salesService.saveCustomTemplate(user.id, name, {
        activity_type: slotToSave.activity_type,
        account_name: slotToSave.account_name,
        contact_person: slotToSave.contact_person,
        contact_number: slotToSave.contact_number,
        email_address: slotToSave.email_address,
        address: slotToSave.address,
        remarks_plan: slotToSave.remarks_plan,
        reference_number: slotToSave.reference_number,
        expense_amount: slotToSave.expense_amount,
      });
    },
    onSuccess: () => {
      toast.success("Custom template saved!");
      refetchCustomTemplates();
      setIsSaveModalOpen(false);
      setSlotToSave(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId) => {
      await salesService.deleteCustomTemplate(templateId);
    },
    onSuccess: () => {
      refetchCustomTemplates();
    },
    onError: (err) => toast.error(err.message),
  });

  const saveMutation = useMutation({
    mutationFn: async (isSubmit = false) => {
      // 1.
      if (isSubmit) {
        let invalid = false;
        weekDates.forEach((d) => {
          const totalCount = activitiesData.filter(
            (a) =>
              a.scheduled_date === d.dateStr &&
              (a.activity_type !== "None" || (a.account_name && a.account_name.trim() !== ""))
          ).length;

          // Sunday is optional; Mon-Sat require at least 1 activity
          if (d.label !== "Sunday") {
            if (totalCount < 1) invalid = true;
          }
        });

        if (invalid) {
          uxMetricsService.incrementCounter("salesPlanning.submitValidationErrors");
          toast.error(
            "You must plan at least 1 activity for ALL scheduled days before submitting.",
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
            plan_id: currentPlanId,
            employee_id: user.id,
            scheduled_date: a.scheduled_date,
            time_of_day: a.time_of_day,
            activity_type: a.activity_type,
            account_name: a.account_name,
            contact_person: a.contact_person,
            contact_number: a.contact_number,
            email_address: a.email_address,
            address: a.address,
            remarks_plan: a.remarks_plan,
            reference_number: a.reference_number === "" ? null : a.reference_number,
            expense_amount: a.expense_amount === "" ? null : a.expense_amount,
          };

          if (a.id) {
            payload.id = a.id;
          }

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
      uxMetricsService.trackEvent("salesPlanning.draftSaved", {
        weekStartDate,
      });
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
      const elapsedMs = Math.max(0, Date.now() - planningStartedAt);
      uxMetricsService.trackEvent("salesPlanning.submitted", {
        weekStartDate,
        elapsedMs,
      });
      uxMetricsService.setGauge(
        "salesPlanning.lastCompletionMinutes",
        Math.round(elapsedMs / 60000),
      );
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
    // Sunday is optional; Mon-Sat require at least 1 activity
    if (d.label === "Sunday") return true;
    const counts = mapDateToBlockCounts[d.dateStr];
    return counts && (counts.AM + counts.PM) >= 1;
  });

  const dayProgress = weekDates.map((d) => {
    const counts = mapDateToBlockCounts[d.dateStr] || { AM: 0, PM: 0 };
    return {
      ...d,
      amCount: counts.AM,
      pmCount: counts.PM,
      isReady: d.label === "Sunday" ? true : (counts.AM + counts.PM) >= 1,
    };
  });

  const weekSummary = dayProgress.reduce(
    (acc, day) => {
      if (day.isReady) acc.daysReady += 1;
      // Sunday is optional, don't count it towards "missing" requirements
      if (day.label !== "Sunday") {
        if ((day.amCount + day.pmCount) < 1) acc.missingDays += 1;
      }
      return acc;
    },
    { daysReady: 0, missingDays: 0 },
  );

  const unplannedCount = activitiesData.filter(
    (a) => a.activity_type !== "None" && !a.account_name?.trim(),
  ).length;
  const plannedCount = activitiesData.filter(
    (a) => a.activity_type !== "None" || a.account_name?.trim(),
  ).length;
  const unplannedRatio = plannedCount > 0 ? Math.round((unplannedCount / plannedCount) * 100) : 0;

  useEffect(() => {
    uxMetricsService.setGauge("salesPlanning.unplannedRatio", unplannedRatio);
  }, [unplannedRatio]);

  useEffect(() => {
    setPlanningStartedAt(Date.now());
  }, [weekStartDate]);

  if (isLoading) {
    return (
      <ProtectedRoute excludeSuperAdmin={true}>
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-gray-8" size={32} />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute excludeSuperAdmin={true}>
      <PageContainer maxWidth="full" className="pt-4">
        
        <ScheduleHeader
          compactMode={compactMode}
          setCompactMode={setCompactMode}
          weekSummary={weekSummary}
          dayProgress={dayProgress}
          unplannedRatio={unplannedRatio}
          isLocked={isLocked}
          plan={plan}
          includeSaturday={includeSaturday}
          setIncludeSaturday={setIncludeSaturday}
          includeSunday={includeSunday}
          setIncludeSunday={setIncludeSunday}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          weekStartDate={weekStartDate}
          setWeekStartDate={setWeekStartDate}
          deletePlanMutation={deletePlanMutation}
          submitMutation={submitMutation}
          saveMutation={saveMutation}
          allDaysFilled={allDaysFilled}
          isRequestingAmendment={isRequestingAmendment}
          setIsRequestingAmendment={setIsRequestingAmendment}
          amendmentReason={amendmentReason}
          setAmendmentReason={setAmendmentReason}
          requestAmendmentMutation={requestAmendmentMutation}
        />

        <ScheduleTabs
          weekDates={weekDates}
          dayProgress={dayProgress}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activitiesData={activitiesData}
          isGreen={isGreen}
        />

        <ScheduleDayView
          currentDateObj={currentDateObj}
          weekDates={weekDates}
          slotCounts={slotCounts}
          categories={categories}
          compactMode={compactMode}
          scheduleTemplates={scheduleTemplates}
          customTemplates={customTemplates}
          isLocked={isLocked}
          getSlotData={getSlotData}
          updateSlotData={updateSlotData}
          handleDeleteSlot={handleDeleteSlot}
          handleClearSlot={handleClearSlot}
          handleDuplicateSlot={handleDuplicateSlot}
          handleUseSmartSuggestion={handleUseSmartSuggestion}
          handleApplyTemplate={handleApplyTemplate}
          handleAddSlot={handleAddSlot}
          handleActionSelect={handleActionSelect}
          openSaveModal={(slotData) => {
            setSlotToSave(slotData);
            setIsSaveModalOpen(true);
          }}
        />

        <SaveTemplateModal 
          isOpen={isSaveModalOpen} 
          onClose={() => setIsSaveModalOpen(false)}
          onSave={(name) => saveTemplateMutation.mutate(name)}
          isSaving={saveTemplateMutation.isPending}
        />

        <ManageTemplatesModal 
          isOpen={isManageModalOpen}
          onClose={() => setIsManageModalOpen(false)}
          customTemplates={customTemplates}
          onDelete={(id) => deleteTemplateMutation.mutate(id)}
          isDeletingId={deleteTemplateMutation.isPending ? deleteTemplateMutation.variables : null}
        />

      </PageContainer>
    </ProtectedRoute>
  );
}
