import { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../context/AuthContext";
import { salesService } from "../../../services/salesService";
import ProtectedRoute from "../../../components/ProtectedRoute";
import {
  CheckCircle2,
  Search,
  MessageSquare,
  Clock,
  CalendarDays,
  User,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Undo2,
  History,
} from "lucide-react";
import toast from "react-hot-toast";
import SalesFilters from "../../../components/SalesFilters.jsx";
import SalesTaskDetailsModal from "../../../components/SalesTaskDetailsModal.jsx";
import PlanAmendmentApprovalQueue from "../../../components/PlanAmendmentApprovalQueue.jsx";
import DayDeletionApprovalQueue from "../../../components/DayDeletionApprovalQueue.jsx";

export default function SalesHeadApprovalsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("PENDING"); // "PENDING" | "VERIFIED"
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEmp, setFilterEmp] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [timeframe, setTimeframe] = useState("MONTHLY");
  const [selectedDateFilter, setSelectedDateFilter] = useState("");
  const [viewActivity, setViewActivity] = useState(null);
  const [sortBy, setSortBy] = useState("NEWEST");

  // ── Pending activities query ──
  const { data: rawPending = [], isLoading } = useQuery({
    queryKey: ["salesHeadPending"],
    queryFn: () => salesService.getHeadPendingActivities(),
  });

  // ── Verified activities query (only fetched when tab is active) ──
  const { data: rawVerified = [], isLoading: isLoadingVerified } = useQuery({
    queryKey: ["salesHeadVerified", user?.id],
    queryFn: () => salesService.getVerifiedActivities(user?.id),
    enabled: !!user?.id,
  });

  const location = useLocation();
  useEffect(() => {
    if (location.state?.highlightActivityId && rawPending.length > 0) {
      const found = rawPending.find(
        (a) => a.id === location.state.highlightActivityId,
      );
      if (found) {
        queueMicrotask(() => setViewActivity(found));
      }
    }
  }, [location.state?.highlightActivityId, rawPending]);

  // ── Unique employees for filters (from whichever tab is active) ──
  const activeRawData = activeTab === "PENDING" ? rawPending : rawVerified;

  const uniqueEmployees = useMemo(() => {
    const map = new Map();
    activeRawData.forEach((act) => {
      if (act.employees?.name && !map.has(act.employee_id)) {
        map.set(act.employee_id, act.employees.name);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeRawData]);

  // ── Shared filtering logic ──
  const processedActivities = useMemo(() => {
    let list = [...activeRawData];

    // Head filter: master heads (no sub-department) see everything.
    // Sub-department heads see only their sub-department's activities.
    // Department heads with a sub-department see their entire department.
    if (!user?.is_super_admin && !user?.isSuperAdmin) {
      const userSubDept = user?.sub_department || user?.subDepartment;
      const userDept = user?.department;
      const isMasterHead = !userSubDept; // No sub-department = oversees entire org

      list = list.filter((act) => {
        if (act.employee_id === user?.id) return false; // Don't verify own activities

        // Master heads see all activities
        if (isMasterHead) return true;

        const ts = act.employees?.sub_department || "";
        const td = act.employees?.department || "";

        if (userSubDept) {
          return ts === userSubDept;
        } else if (userDept) {
          return td === userDept;
        }
        return false;
      });
    }

    // Helper to check if employee has completed the activity
    const isActDone = (s) => s === "APPROVED" || s === "PENDING";

    // Search filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          (a.employees?.name || "").toLowerCase().includes(q) ||
          (a.account_name || "").toLowerCase().includes(q) ||
          (a.details_daily || "").toLowerCase().includes(q) ||
          (a.activity_type || "").toLowerCase().includes(q)
      );
    }

    if (filterEmp !== "ALL") list = list.filter((a) => a.employee_id === filterEmp);

    // Status filter only applies to the pending tab
    if (activeTab === "PENDING") {
      if (filterStatus === "ALL") {
        // By default, only show tasks that the employee has actually completed.
        list = list.filter((act) => isActDone(act.status));
      } else {
        if (filterStatus === "APPROVED" || filterStatus === "DONE") {
          list = list.filter((a) => a.status === "APPROVED" || a.status === "DONE");
        } else if (filterStatus === "PENDING") {
          list = list.filter((a) => a.status === "PENDING" || a.status === "AWAITING APPROVAL");
        } else if (filterStatus === "INCOMPLETE") {
          // Show tasks not yet completed, or explicitly rejected
          list = list.filter((a) => !isActDone(a.status) || a.status === "REJECTED");
        } else {
          list = list.filter((a) => a.status === filterStatus);
        }
      }
    }

    if (filterType !== "ALL") {
      list = list.filter((a) => {
        const aType = (a.activity_type || "").replace(/[-_]/g, " ").toUpperCase();
        const fType = filterType.replace(/[-_]/g, " ").toUpperCase();
        return aType === fType;
      });
    }

    if (selectedDateFilter) {
      list = list.filter((a) => {
        if (!a.scheduled_date) return false;
        if (timeframe === "DAILY") return a.scheduled_date === selectedDateFilter;
        if (timeframe === "MONTHLY") return a.scheduled_date.startsWith(selectedDateFilter);
        if (timeframe === "YEARLY") return a.scheduled_date.startsWith(selectedDateFilter);
        if (timeframe === "WEEKLY") {
          const selectedD = new Date(selectedDateFilter + "T00:00:00");
          const day = selectedD.getDay();
          const diff = selectedD.getDate() - day + (day === 0 ? -6 : 1);
          const startOfWeek = new Date(selectedD);
          startOfWeek.setDate(diff);
          startOfWeek.setHours(0, 0, 0, 0);

          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);

          const actDate = new Date(a.scheduled_date + "T00:00:00");
          return actDate >= startOfWeek && actDate <= endOfWeek;
        }
        return true;
      });
    }
    // Sort
    if (activeTab === "VERIFIED") {
      // Default sort for verified: most recently verified first
      list.sort((a, b) => new Date(b.head_verified_at) - new Date(a.head_verified_at));
    } else if (sortBy === "NEWEST") {
      list.sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date));
    } else if (sortBy === "OLDEST") {
      list.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
    } else if (sortBy === "NAME") {
      list.sort((a, b) => (a.employees?.name || "").localeCompare(b.employees?.name || ""));
    }

    return list;
  }, [activeRawData, activeTab, user, searchQuery, filterEmp, filterStatus, filterType, timeframe, selectedDateFilter, sortBy]);

  // Group by Employee -> Date
  const groupedData = useMemo(() => {
    const map = new Map();
    processedActivities.forEach((act) => {
      const empName = act.employees?.name || "Unknown Employee";
      if (!map.has(empName)) map.set(empName, new Map());
      
      const dateMap = map.get(empName);
      const date = act.scheduled_date || "Unknown Date";
      if (!dateMap.has(date)) dateMap.set(date, []);
      dateMap.get(date).push(act);
    });

    const result = [];
    for (const [empName, dateMap] of map.entries()) {
      const dates = [];
      for (const [dateStr, activities] of dateMap.entries()) {
        dates.push({ date: dateStr, activities });
      }
      // Sort dates newest first
      dates.sort((a, b) => new Date(b.date) - new Date(a.date));
      result.push({ employeeName: empName, dates });
    }
    // Sort employees alphabetical
    result.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
    return result;
  }, [processedActivities]);

  // ── Mutations ──
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["salesHeadPending"] });
    queryClient.invalidateQueries({ queryKey: ["salesHeadVerified"] });
  };

  const verifyMutation = useMutation({
    mutationFn: ({ activityId, remarks }) =>
      salesService.verifyActivity(activityId, remarks, user?.id),
    onSuccess: () => {
      invalidateAll();
      toast.success("Activity verified successfully!");
    },
    onError: (err) => toast.error(err.message),
  });

  const bulkVerifyMutation = useMutation({
    mutationFn: ({ activityIds, remarks }) =>
      salesService.bulkVerifyActivities(activityIds, remarks, user?.id),
    onSuccess: (_, variables) => {
      invalidateAll();
      const count = variables.activityIds.length;
      const ids = variables.activityIds;

      // Persistent toast with undo button (5 seconds)
      toast(
        (t) => (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              Verified {count} {count === 1 ? "activity" : "activities"}
            </span>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                bulkUnverifyMutation.mutate({ activityIds: ids });
              }}
              className="flex items-center gap-1 bg-gray-12 text-white text-xs font-bold px-3 py-1.5 rounded-md hover:bg-black transition-colors active:scale-95"
            >
              <Undo2 size={12} /> Undo
            </button>
          </div>
        ),
        {
          duration: 5000,
          icon: <CheckCircle2 size={18} className="text-green-500" />,
          style: {
            background: "var(--gray-1, #fff)",
            border: "1px solid var(--gray-4, #e5e5e5)",
            color: "var(--gray-12, #171717)",
          },
        }
      );
    },
    onError: (err) => toast.error(err.message),
  });

  const unverifyMutation = useMutation({
    mutationFn: ({ activityId }) =>
      salesService.unverifyActivity(activityId),
    onSuccess: () => {
      invalidateAll();
      toast.success("Verification undone — activity moved back to pending.");
    },
    onError: (err) => toast.error(err.message),
  });

  const bulkUnverifyMutation = useMutation({
    mutationFn: ({ activityIds }) =>
      salesService.bulkUnverifyActivities(activityIds),
    onSuccess: (_, variables) => {
      invalidateAll();
      toast.success(`Undid verification for ${variables.activityIds.length} activities.`);
    },
    onError: (err) => toast.error(err.message),
  });

  const isLoadingCurrent = activeTab === "PENDING" ? isLoading : isLoadingVerified;

  if (isLoadingCurrent) {
    return (
      <div className="py-20 text-center text-gray-9 font-bold flex flex-col items-center gap-4">
        <Activity size={32} className="animate-pulse text-primary" />
        <p>Loading Sales Action Queue...</p>
      </div>
    );
  }

  return (
    <ProtectedRoute requireHead={true}>
      <div className="max-w-6xl mx-auto space-y-8 pb-12 px-4 sm:px-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-4 pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-12 tracking-tight">
              Sales Verification Queue
            </h1>
            <p className="text-gray-9 mt-1 text-sm font-medium">
              Review and verify actual daily activities logged by your team.
            </p>
          </div>
          <div className="bg-primary/10 border border-primary/20 px-4 py-2.5 rounded-xl flex items-center gap-3 shadow-inner">
            <Layers size={18} className="text-primary" />
            <span className="text-primary font-bold text-sm">
              {activeTab === "PENDING"
                ? `${processedActivities.length} Pending Actions`
                : `${processedActivities.length} Verified`}
            </span>
          </div>
        </div>

        {/* TAB TOGGLE */}
        <div className="flex items-center gap-1 bg-gray-2 border border-gray-4 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg transition-all ${
              activeTab === "PENDING"
                ? "bg-white text-gray-12 shadow-sm border border-gray-4"
                : "text-gray-9 hover:text-gray-11 hover:bg-gray-3"
            }`}
          >
            <CheckCircle2 size={14} />
            Pending Verification
            {rawPending.length > 0 && (
              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                activeTab === "PENDING"
                  ? "bg-primary/10 text-primary"
                  : "bg-gray-4 text-gray-8"
              }`}>
                {rawPending.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("VERIFIED")}
            className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg transition-all ${
              activeTab === "VERIFIED"
                ? "bg-white text-gray-12 shadow-sm border border-gray-4"
                : "text-gray-9 hover:text-gray-11 hover:bg-gray-3"
            }`}
          >
            <History size={14} />
            Recently Verified
            {rawVerified.length > 0 && (
              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                activeTab === "VERIFIED"
                  ? "bg-primary/10 text-primary"
                  : "bg-gray-4 text-gray-8"
              }`}>
                {rawVerified.length}
              </span>
            )}
          </button>
        </div>

        {/* SEARCH & FILTERS */}
        {activeRawData.length > 0 && (
          <SalesFilters
            activeTab="ACTIVITIES"
            viewMode="BOARD"
            showDateFilter={true}
            searchTerm={searchQuery}
            setSearchTerm={setSearchQuery}
            timeframe={timeframe}
            setTimeframe={setTimeframe}
            selectedDateFilter={selectedDateFilter}
            setSelectedDateFilter={setSelectedDateFilter}
            filterEmp={filterEmp}
            setFilterEmp={setFilterEmp}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterType={filterType}
            setFilterType={setFilterType}
            canViewAllSales={true}
            user={user}
            uniqueEmployees={uniqueEmployees}
            isVerificationEnforced={false}
            sortBy={sortBy}
            setSortBy={setSortBy}
          />
        )}

        {/* APPROVAL QUEUES (only show on pending tab) */}
        {activeTab === "PENDING" && (
          <div className="space-y-6">
             <PlanAmendmentApprovalQueue initialExpandedId={location.state?.highlightPlanId} />
             <DayDeletionApprovalQueue initialHighlightDate={location.state?.highlightDeletionDate} />
          </div>
        )}

        {/* EMPTY STATE */}
        {groupedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-gray-1 border border-gray-4 border-dashed rounded-2xl shadow-sm">
            <div className={`w-20 h-20 rounded-full mb-6 flex items-center justify-center shadow-inner ${
              activeTab === "PENDING"
                ? "bg-green-500/10 text-green-500"
                : "bg-gray-3 text-gray-8"
            }`}>
              {activeTab === "PENDING" ? <CheckCircle2 size={40} /> : <History size={40} />}
            </div>
            <h3 className="text-2xl font-black text-gray-12 mb-2">
              {activeTab === "PENDING" ? "Inbox Zero!" : "No Verified Activities"}
            </h3>
            <p className="text-gray-9 text-sm text-center max-w-sm">
              {activeTab === "PENDING"
                ? "All sales activities for your department have been verified. Great job!"
                : "Activities you've verified will appear here so you can undo if needed."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedData.map((empGroup) => (
              <EmployeeBlock
                key={empGroup.employeeName}
                empGroup={empGroup}
                mode={activeTab}
                verifyMutation={verifyMutation}
                bulkVerifyMutation={bulkVerifyMutation}
                unverifyMutation={unverifyMutation}
                bulkUnverifyMutation={bulkUnverifyMutation}
                onViewDetails={setViewActivity}
              />
            ))}
          </div>
        )}
      </div>

      <SalesTaskDetailsModal 
        isOpen={!!viewActivity} 
        onClose={() => setViewActivity(null)} 
        activity={viewActivity} 
      />
    </ProtectedRoute>
  );
}

function EmployeeBlock({ empGroup, mode, verifyMutation, bulkVerifyMutation, unverifyMutation, bulkUnverifyMutation, onViewDetails }) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-gray-1 border border-gray-4 rounded-2xl overflow-hidden shadow-sm transition-all">
      <div 
        className="bg-gray-3/50 p-4 border-b border-gray-4 flex items-center justify-between cursor-pointer hover:bg-gray-3 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black border border-primary/20 shadow-inner">
            {empGroup.employeeName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-12 leading-tight">
              {empGroup.employeeName}
            </h2>
            <p className="text-xs text-gray-9 font-semibold uppercase tracking-widest mt-0.5">
              {empGroup.dates.reduce((acc, d) => acc + d.activities.length, 0)}{" "}
              {mode === "PENDING" ? "Items Pending" : "Items Verified"}
            </p>
          </div>
        </div>
        <button className="p-2 text-gray-8 hover:text-gray-12 hover:bg-gray-4 rounded-full transition-colors">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {isExpanded && (
        <div className="divide-y divide-gray-4">
          {empGroup.dates.map((dateGroup) => (
            <DateGroupBlock
              key={dateGroup.date}
              dateGroup={dateGroup}
              mode={mode}
              verifyMutation={verifyMutation}
              bulkVerifyMutation={bulkVerifyMutation}
              unverifyMutation={unverifyMutation}
              bulkUnverifyMutation={bulkUnverifyMutation}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DateGroupBlock({ dateGroup, mode, verifyMutation, bulkVerifyMutation, unverifyMutation, bulkUnverifyMutation, onViewDetails }) {
  const [dayRemarks, setDayRemarks] = useState("");
  const isSubmittingBulk = mode === "PENDING" ? bulkVerifyMutation.isPending : bulkUnverifyMutation.isPending;

  const handleVerifyDay = () => {
    const ids = dateGroup.activities.map((a) => a.id);
    bulkVerifyMutation.mutate({ activityIds: ids, remarks: dayRemarks });
  };

  const handleUnverifyDay = () => {
    const ids = dateGroup.activities.map((a) => a.id);
    bulkUnverifyMutation.mutate({ activityIds: ids });
  };

  return (
    <div className="p-4 sm:p-6 bg-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 text-gray-11 font-black text-sm">
          <CalendarDays size={18} className="text-primary" />
          <span className="uppercase tracking-widest">{dateGroup.date}</span>
          <span className="bg-gray-2 text-gray-9 border border-gray-4 px-2 py-0.5 rounded-md text-[10px] ml-2">
            {dateGroup.activities.length} Logs
          </span>
        </div>

        {mode === "PENDING" ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <MessageSquare size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-8" />
              <input
                type="text"
                placeholder="Remarks for entire day..."
                value={dayRemarks}
                onChange={(e) => setDayRemarks(e.target.value)}
                className="w-full bg-gray-1 text-xs text-gray-12 border border-gray-4 rounded-lg pl-9 pr-3 py-2 outline-none focus:border-primary transition-colors"
              />
            </div>
            <button
              onClick={handleVerifyDay}
              disabled={isSubmittingBulk}
              className="flex items-center justify-center gap-2 bg-gray-12 hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md transition-all active:scale-95 disabled:opacity-70 whitespace-nowrap"
            >
              <CheckCircle2 size={16} /> Verify Entire Day
            </button>
          </div>
        ) : (
          <button
            onClick={handleUnverifyDay}
            disabled={isSubmittingBulk}
            className="flex items-center justify-center gap-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-70 whitespace-nowrap"
          >
            <Undo2 size={16} /> Undo Entire Day
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {dateGroup.activities.map((act) =>
          mode === "PENDING" ? (
            <ActivityCard key={act.id} activity={act} verifyMutation={verifyMutation} onViewDetails={onViewDetails} />
          ) : (
            <VerifiedActivityCard key={act.id} activity={act} unverifyMutation={unverifyMutation} onViewDetails={onViewDetails} />
          )
        )}
      </div>
    </div>
  );
}

function ActivityCard({ activity, verifyMutation, onViewDetails }) {
  const [remarks, setRemarks] = useState("");
  const isSubmitting = verifyMutation.isPending;

  const handleVerify = () => {
    verifyMutation.mutate({ activityId: activity.id, remarks });
  };

  return (
    <div className="bg-gray-1 border border-gray-4 rounded-xl p-4 flex flex-col hover:border-gray-6 hover:shadow-md transition-all group">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="text-sm font-bold text-gray-12 line-clamp-1" title={activity.account_name}>
            {activity.account_name || "No Account Specify"}
          </h4>
          <span className="inline-block mt-1 text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-black tracking-widest uppercase">
            {activity.activity_type}
          </span>
        </div>
        <div className="flex gap-2 text-[10px] font-black tracking-widest uppercase items-center">
          <span className="text-gray-9 bg-gray-3 px-2 py-1 rounded-md flex items-center gap-1 border border-gray-4">
            <Clock size={12} /> {activity.time_of_day}
          </span>
          {activity.is_unplanned && (
            <span className="text-blue-600 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-md">
              Unplanned
            </span>
          )}
          <button 
            className="text-gray-8 hover:text-primary transition-colors p-1 ml-1 cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onViewDetails(activity); }}
            title="Open Full Details"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-11 flex-1 leading-relaxed mb-4 line-clamp-3" title={activity.details_daily}>
        <span className="font-bold text-gray-12">Details:</span> {activity.details_daily || "-"}
      </p>

      {/* FOOTER ACTIONS */}
      <div className="pt-3 border-t border-gray-4 flex flex-col xl:flex-row gap-3">
        <div className="flex-1 relative">
          <MessageSquare size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-8" />
          <input
            type="text"
            placeholder="Feedback..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full bg-white text-[11px] text-gray-12 border border-gray-4 rounded-md pl-8 pr-2 py-1.5 outline-none focus:border-primary transition-colors"
          />
        </div>
        <button
          onClick={handleVerify}
          disabled={isSubmitting}
          className="flex items-center justify-center gap-1.5 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border border-green-200 text-[11px] font-black uppercase tracking-widest px-4 py-1.5 rounded-md transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
        >
          <CheckCircle2 size={14} /> Verify Activity
        </button>
      </div>
    </div>
  );
}

function VerifiedActivityCard({ activity, unverifyMutation, onViewDetails }) {
  const isSubmitting = unverifyMutation.isPending;

  const verifiedAtFormatted = activity.head_verified_at
    ? new Date(activity.head_verified_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "—";

  return (
    <div className="bg-gray-1 border border-gray-4 rounded-xl p-4 flex flex-col hover:border-gray-6 hover:shadow-md transition-all group">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="text-sm font-bold text-gray-12 line-clamp-1" title={activity.account_name}>
            {activity.account_name || "No Account Specify"}
          </h4>
          <span className="inline-block mt-1 text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-black tracking-widest uppercase">
            {activity.activity_type}
          </span>
        </div>
        <div className="flex gap-2 text-[10px] font-black tracking-widest uppercase items-center">
          <span className="text-gray-9 bg-gray-3 px-2 py-1 rounded-md flex items-center gap-1 border border-gray-4">
            <Clock size={12} /> {activity.time_of_day}
          </span>
          {activity.is_unplanned && (
            <span className="text-blue-600 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-md">
              Unplanned
            </span>
          )}
          <button 
            className="text-gray-8 hover:text-primary transition-colors p-1 ml-1 cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onViewDetails(activity); }}
            title="Open Full Details"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-11 flex-1 leading-relaxed mb-2 line-clamp-3" title={activity.details_daily}>
        <span className="font-bold text-gray-12">Details:</span> {activity.details_daily || "-"}
      </p>

      {/* Verification metadata */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-[10px]">
        <span className="text-gray-8 flex items-center gap-1">
          <CheckCircle2 size={10} className="text-green-500" />
          Verified: <span className="text-gray-11 font-semibold">{verifiedAtFormatted}</span>
        </span>
        {activity.head_remarks && (
          <span className="text-gray-8 flex items-center gap-1">
            <MessageSquare size={10} />
            Remarks: <span className="text-gray-11 font-semibold italic">"{activity.head_remarks}"</span>
          </span>
        )}
      </div>

      {/* FOOTER ACTIONS */}
      <div className="pt-3 border-t border-gray-4 flex justify-end">
        <button
          onClick={() => unverifyMutation.mutate({ activityId: activity.id })}
          disabled={isSubmitting}
          className="flex items-center justify-center gap-1.5 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border border-red-200 text-[11px] font-black uppercase tracking-widest px-4 py-1.5 rounded-md transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
        >
          <Undo2 size={14} /> Undo Verify
        </button>
      </div>
    </div>
  );
}
