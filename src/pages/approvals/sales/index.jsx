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
import { supabase } from "../../../lib/supabase";
import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";
import TabGroup from "@/components/ui/TabGroup";
import { Button } from "@/components/ui/button";
import Avatar from "../../../components/Avatar";
import HighlightText from "../../../components/HighlightText";
import Spinner from "../../../components/ui/Spinner";


export default function SalesHeadApprovalsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("PENDING"); // "PENDING" | "VERIFIED" | "REQUESTS"
  const [requestsSubTab, setRequestsSubTab] = useState("AMENDMENTS"); // "AMENDMENTS" | "DELETIONS"
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEmp, setFilterEmp] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [timeframe, setTimeframe] = useState("DAILY");
  const [selectedDateFilter, setSelectedDateFilter] = useState(() => {
    const today = new Date();
    return (
      today.getFullYear() +
      "-" +
      String(today.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(today.getDate()).padStart(2, "0")
    );
  });
  const [viewActivity, setViewActivity] = useState(null);
  const [sortBy, setSortBy] = useState("NEWEST");
  const [selectedActivities, setSelectedActivities] = useState(new Set());
  const [bulkRemarks, setBulkRemarks] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleToggleSelection = (id) => {
    setSelectedActivities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleDaySelection = (activityIds, isSelected) => {
    setSelectedActivities((prev) => {
      const next = new Set(prev);
      activityIds.forEach((id) => {
        if (isSelected) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  const handleDeselectAll = () => {
    setSelectedActivities(new Set());
    setBulkRemarks("");
  };

  const handleBulkAction = () => {
    if (selectedActivities.size === 0) return;
    const activityIds = Array.from(selectedActivities);
    if (activeTab === "PENDING") {
      bulkVerifyMutation.mutate({ activityIds, remarks: bulkRemarks });
    } else {
      bulkUnverifyMutation.mutate({ activityIds });
    }
  };

  // Clear selections on tab change
  useEffect(() => {
    handleDeselectAll();
  }, [activeTab]);

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

  // ── Requests counts (for badges) ──
  const isSuperAdmin = user?.is_super_admin || user?.isSuperAdmin;
  const { data: deletionRequests = [] } = useQuery({
    queryKey: ["dayDeletionRequests", user?.department],
    queryFn: async () => {
      let query = supabase
        .from("sales_activities")
        .select(
          `id, employee_id, scheduled_date, employees!sales_activities_employee_id_fkey!inner(department)`,
        )
        .not("delete_requested_by", "is", null)
        .neq("is_deleted", true);

      if (!isSuperAdmin && user?.department) {
        query = query.eq("employees.department", user.department);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by Employee + Date to match the badge logic
      const grouped = new Set();
      data.forEach((act) => {
        grouped.add(`${act.employee_id}_${act.scheduled_date}`);
      });
      return Array.from(grouped);
    },
    enabled: !!user?.id,
  });

  const { data: amendmentRequests = [] } = useQuery({
    queryKey: ["planAmendments", user?.department],
    queryFn: async () => {
      let query = supabase
        .from("sales_weekly_plans")
        .select(
          `id, employees!sales_weekly_plans_employee_id_fkey!inner(department)`,
        )
        .eq("status", "SUBMITTED")
        .not("amendment_snapshot", "is", null);

      if (!isSuperAdmin && user?.department) {
        query = query.eq("employees.department", user.department);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const totalRequestsCount = deletionRequests.length + amendmentRequests.length;

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
          (a.activity_type || "").toLowerCase().includes(q),
      );
    }

    if (filterEmp !== "ALL")
      list = list.filter((a) => a.employee_id === filterEmp);

    // Status filter only applies to the pending tab
    if (activeTab === "PENDING") {
      if (filterStatus === "ALL") {
        // By default, only show tasks that the employee has actually completed.
        list = list.filter((act) => isActDone(act.status));
      } else {
        if (filterStatus === "APPROVED" || filterStatus === "DONE") {
          list = list.filter(
            (a) => a.status === "APPROVED" || a.status === "DONE",
          );
        } else if (filterStatus === "PENDING") {
          list = list.filter(
            (a) => a.status === "PENDING" || a.status === "AWAITING APPROVAL",
          );
        } else if (filterStatus === "INCOMPLETE") {
          // Show tasks not yet completed, or explicitly rejected
          list = list.filter(
            (a) => !isActDone(a.status) || a.status === "REJECTED",
          );
        } else {
          list = list.filter((a) => a.status === filterStatus);
        }
      }
    }

    if (filterType !== "ALL") {
      list = list.filter((a) => {
        const aType = (a.activity_type || "")
          .replace(/[-_]/g, " ")
          .toUpperCase();
        const fType = filterType.replace(/[-_]/g, " ").toUpperCase();
        return aType === fType;
      });
    }

    if (selectedDateFilter) {
      list = list.filter((a) => {
        if (!a.scheduled_date) return false;
        if (timeframe === "DAILY")
          return a.scheduled_date === selectedDateFilter;
        if (timeframe === "MONTHLY")
          return a.scheduled_date.startsWith(selectedDateFilter);
        if (timeframe === "YEARLY")
          return a.scheduled_date.startsWith(selectedDateFilter);
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
      list.sort(
        (a, b) => new Date(b.head_verified_at) - new Date(a.head_verified_at),
      );
    } else if (sortBy === "NEWEST") {
      list.sort(
        (a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date),
      );
    } else if (sortBy === "OLDEST") {
      list.sort(
        (a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date),
      );
    } else if (sortBy === "NAME") {
      list.sort((a, b) =>
        (a.employees?.name || "").localeCompare(b.employees?.name || ""),
      );
    }

    return list;
  }, [
    activeRawData,
    activeTab,
    user,
    searchQuery,
    filterEmp,
    filterStatus,
    filterType,
    timeframe,
    selectedDateFilter,
    sortBy,
  ]);

  // Group by Employee -> Date
  const groupedData = useMemo(() => {
    const map = new Map();
    processedActivities.forEach((act) => {
      const empName = act.employees?.name || "Unknown Employee";
      const empAvatar = act.employees?.avatar_path || null;
      if (!map.has(empName)) {
        map.set(empName, {
          dates: new Map(),
          avatarPath: empAvatar
        });
      }

      const entry = map.get(empName);
      const dateMap = entry.dates;
      const date = act.scheduled_date || "Unknown Date";
      if (!dateMap.has(date)) dateMap.set(date, []);
      dateMap.get(date).push(act);
    });

    const result = [];
    for (const [empName, entry] of map.entries()) {
      const dates = [];
      for (const [dateStr, activities] of entry.dates.entries()) {
        dates.push({ date: dateStr, activities });
      }
      // Sort dates newest first
      dates.sort((a, b) => new Date(b.date) - new Date(a.date));
      result.push({ employeeName: empName, avatarPath: entry.avatarPath, dates });
    }
    // Sort employees by risk first on pending tab, otherwise alphabetical.
    if (activeTab === "PENDING") {
      const getRiskScore = (group) => {
        const allActs = group.dates.flatMap((d) => d.activities);
        const pendingCount = allActs.filter(
          (a) => a.status === "PENDING" || a.status === "AWAITING APPROVAL",
        ).length;
        const rejectedCount = allActs.filter(
          (a) => a.status === "REJECTED",
        ).length;
        const unplannedCount = allActs.filter((a) => a.is_unplanned).length;
        const total = allActs.length || 1;
        const consistencyPenalty = Math.round((unplannedCount / total) * 100);
        return pendingCount * 3 + rejectedCount * 4 + consistencyPenalty;
      };
      result.sort((a, b) => getRiskScore(b) - getRiskScore(a));
    } else {
      result.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
    }
    return result;
  }, [processedActivities, activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterEmp, filterStatus, filterType, timeframe, selectedDateFilter, sortBy, activeTab]);

  const paginatedGroupedData = useMemo(() => {
    return groupedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [groupedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(groupedData.length / itemsPerPage);

  // ── Mutations ──
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["salesHeadPending"] });
    queryClient.invalidateQueries({ queryKey: ["salesHeadVerified"] });
  };

  const verifyMutation = useMutation({
    mutationFn: ({ activityId, remarks }) =>
      salesService.verifyActivity(activityId, remarks, user?.id, user),
    onSuccess: () => {
      invalidateAll();
      toast.success("Activity verified successfully!");
    },
    onError: (err) => toast.error(err.message),
  });

  const bulkVerifyMutation = useMutation({
    mutationFn: ({ activityIds, remarks }) =>
      salesService.bulkVerifyActivities(activityIds, remarks, user?.id, user),
    onSuccess: (_, variables) => {
      invalidateAll();
      handleDeselectAll();
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
              className="flex items-center gap-1 bg-foreground text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-md hover:bg-mauve-12 transition-colors active:scale-95"
            >
              <Undo2 size={12} /> Undo
            </button>
          </div>
        ),
        {
          duration: 5000,
          icon: <CheckCircle2 size={18} className="text-green-9" />,
          style: {
            background: "var(--gray-1, #fff)",
            border: "1px solid var(--gray-4, #e5e5e5)",
            color: "var(--gray-12, #171717)",
          },
        },
      );
    },
    onError: (err) => toast.error(err.message),
  });

  const unverifyMutation = useMutation({
    mutationFn: ({ activityId }) => salesService.unverifyActivity(activityId),
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
      handleDeselectAll();
      toast.success(
        `Undid verification for ${variables.activityIds.length} activities.`,
      );
    },
    onError: (err) => toast.error(err.message),
  });

  const isLoadingCurrent =
    activeTab === "PENDING" ? isLoading : isLoadingVerified;

  if (isLoadingCurrent) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size="md" text="Loading Sales Action Queue" />
      </div>
    );
  }

  return (
    <ProtectedRoute requireHead={true}>
      <PageContainer maxWidth="7xl" className="pt-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6 ">
          <PageHeader
            title={"Sales Verification"}
            description={
              "Review and verify actual daily activities logged by your team."
            }
          />

          <div className="bg-card border border-border px-4 py-2.5 rounded-lg flex items-center gap-2.5 shadow-[0_4px_20px_-2px_rgba(79,70,229,0.1)]">
            <Layers size={16} className="text-primary" />
            <span className="text-foreground font-bold text-sm tracking-tight">
              {activeTab === "PENDING"
                ? `${processedActivities.length} Pending Actions`
                : `${processedActivities.length} Verified`}
            </span>
          </div>
        </div>

        {/* TAB TOGGLE & BULK ACTIONS */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/50 pb-4">
          <TabGroup
            tabs={[
              { value: "PENDING", label: "Pending Verification", icon: CheckCircle2, badge: rawPending.length || undefined },
              { value: "VERIFIED", label: "Recently Verified", icon: History, badge: rawVerified.length || undefined },
              { value: "REQUESTS", label: "Requests", icon: MessageSquare, badge: totalRequestsCount || undefined },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            size="md"
          />

          {/* BULK ACTION BAR */}
          {selectedActivities.size > 0 && (
            <div className="flex flex-col sm:flex-row items-center gap-3 animate-in fade-in slide-in-from-right-2 duration-200 w-full lg:w-auto">
              <span className="text-sm font-bold text-foreground bg-mauve-3 px-3 py-1.5 rounded-lg border border-mauve-5 whitespace-nowrap w-full sm:w-auto text-center sm:text-left">
                {selectedActivities.size} Selected
              </span>

              <button
                onClick={handleDeselectAll}
                className="text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-border cursor-pointer whitespace-nowrap w-full sm:w-auto"
              >
                Deselect All
              </button>

              {activeTab === "PENDING" && (
                <div className="relative w-full sm:w-auto">
                  <MessageSquare
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="text"
                    placeholder="Remarks"
                    value={bulkRemarks}
                    onChange={(e) => setBulkRemarks(e.target.value)}
                    className="w-full sm:w-56 bg-background text-xs text-foreground border border-input focus-visible:ring-1 focus-visible:ring-ring rounded-lg pl-8 pr-3 py-1.5 outline-none transition-all"
                  />
                </div>
              )}

              <button
                onClick={handleBulkAction}
                disabled={
                  activeTab === "PENDING"
                    ? bulkVerifyMutation.isPending
                    : bulkUnverifyMutation.isPending
                }
                className={`flex items-center justify-center gap-2 text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-70 whitespace-nowrap cursor-pointer w-full sm:w-auto ${
                  activeTab === "PENDING"
                    ? "bg-green-9 hover:bg-green-10"
                    : "bg-destructive/80 hover:bg-destructive text-destructive-foreground border border-destructive/20"
                }`}
              >
                {activeTab === "PENDING" ? (
                  <>
                    <CheckCircle2 size={16} /> Verify Selected
                  </>
                ) : (
                  <>
                    <Undo2 size={16} /> Undo Selected
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* SEARCH & FILTERS */}
        {activeTab !== "REQUESTS" && activeRawData.length > 0 && (
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

        {/* APPROVAL QUEUES (dedicated Requests tab) */}
        {activeTab === "REQUESTS" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sub-tabs */}
            <TabGroup
              tabs={[
                { value: "AMENDMENTS", label: "Schedule Modifications", badge: amendmentRequests.length || undefined },
                { value: "DELETIONS", label: "Day Data Management", badge: deletionRequests.length || undefined },
              ]}
              activeTab={requestsSubTab}
              onChange={setRequestsSubTab}
              size="md"
            />

            {requestsSubTab === "AMENDMENTS" && (
              <PlanAmendmentApprovalQueue
                initialExpandedId={location.state?.highlightPlanId}
              />
            )}

            {requestsSubTab === "DELETIONS" && (
              <DayDeletionApprovalQueue
                initialHighlightDate={location.state?.highlightDeletionDate}
              />
            )}

            {totalRequestsCount === 0 && (
              <div className="flex flex-col items-center justify-center py-24 bg-card border border-border border-dashed rounded-2xl text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
                  <MessageSquare size={32} />
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  No Pending Requests
                </h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  {" "}
                  There are no active plan amendments or deletion requests for
                  your department.
                </p>
              </div>
            )}
          </div>
        )}

        {/* EMPTY STATE (Verification Tabs) */}
        {activeTab !== "REQUESTS" && groupedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-card border border-border rounded-xl shadow-[0_4px_20px_-2px_rgba(79,70,229,0.1)] text-center relative overflow-hidden group">
            {/* Soft blob decoration inside empty state */}
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-[3000ms]"></div>

            <div
              className={`relative inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 shadow-sm ring-4 ${
                activeTab === "PENDING"
                  ? "bg-green-3/50 text-green-10 ring-green-2"
                  : "bg-muted text-muted-foreground ring-muted/50"
              }`}
            >
              {activeTab === "PENDING" ? (
                <CheckCircle2 size={32} />
              ) : (
                <History size={32} />
              )}
            </div>
            <h3 className="text-foreground font-bold text-2xl tracking-tight relative">
              {activeTab === "PENDING"
                ? "Inbox Zero!"
                : "No Verified Activities"}
            </h3>
            <p className="text-muted-foreground mt-2 relative font-medium max-w-sm">
              {activeTab === "PENDING"
                ? "All sales activities for your department have been verified. Great job!"
                : "Activities you've verified will appear here so you can undo if needed."}
            </p>
          </div>
        ) : activeTab !== "REQUESTS" ? (
          <div className="space-y-8">
            {paginatedGroupedData.map((empGroup) => (
              <EmployeeBlock
                key={empGroup.employeeName}
                empGroup={empGroup}
                mode={activeTab}
                verifyMutation={verifyMutation}
                bulkVerifyMutation={bulkVerifyMutation}
                unverifyMutation={unverifyMutation}
                bulkUnverifyMutation={bulkUnverifyMutation}
                onViewDetails={setViewActivity}
                selectedActivities={selectedActivities}
                onToggleSelection={handleToggleSelection}
                onToggleDaySelection={handleToggleDaySelection}
                searchTerm={searchQuery}
              />
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border pt-6 mt-4">
                <span className="text-sm font-semibold text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage((prev) => Math.max(1, prev - 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </PageContainer>

      <SalesTaskDetailsModal
        isOpen={!!viewActivity}
        onClose={() => setViewActivity(null)}
        activity={viewActivity}
      />
    </ProtectedRoute>
  );
}

function EmployeeBlock({
  empGroup,
  mode,
  verifyMutation,
  bulkVerifyMutation,
  unverifyMutation,
  bulkUnverifyMutation,
  onViewDetails,
  selectedActivities,
  onToggleSelection,
  onToggleDaySelection,
  searchTerm,
}) {

  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm transition-all">
      <div
        className="bg-muted/30 p-4 border-b border-border flex items-center justify-between cursor-pointer hover:bg-muted/60 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <Avatar name={empGroup.employeeName} src={empGroup.avatarPath} size="lg" className="bg-primary/10 text-primary border-primary/20 shadow-inner" />
          <div>
            <h2 className="text-lg font-bold text-foreground leading-tight">
              <HighlightText text={empGroup.employeeName} search={searchTerm} />
            </h2>

            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mt-0.5">
              {empGroup.dates.reduce((acc, d) => acc + d.activities.length, 0)}{" "}
              {mode === "PENDING" ? "Items Pending" : "Items Verified"}
            </p>
          </div>
        </div>
        <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {isExpanded && (
        <div className="divide-y divide-border">
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
              selectedActivities={selectedActivities}
              onToggleSelection={onToggleSelection}
              onToggleDaySelection={onToggleDaySelection}
              searchTerm={searchTerm}
            />

          ))}
        </div>
      )}
    </div>
  );
}

function DateGroupBlock({
  dateGroup,
  mode,
  verifyMutation,
  bulkVerifyMutation,
  unverifyMutation,
  bulkUnverifyMutation,
  onViewDetails,
  selectedActivities,
  onToggleSelection,
  onToggleDaySelection,
  searchTerm,
}) {

  const allIds = dateGroup.activities.map((a) => a.id);
  const isAllSelected =
    dateGroup.activities.length > 0 &&
    allIds.every((id) => selectedActivities.has(id));
  const isSomeSelected =
    !isAllSelected && allIds.some((id) => selectedActivities.has(id));

  const handleDaySelectAll = () => {
    onToggleDaySelection(allIds, !isAllSelected);
  };

  return (
    <div className="p-4 sm:p-6 bg-card">
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2 text-foreground font-black text-sm">
          <div
            className="shrink-0 flex items-center pr-2 border-r border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={(input) => {
                if (input) input.indeterminate = isSomeSelected;
              }}
              onChange={handleDaySelectAll}
              className="w-4 h-4 rounded border-input text-mauve-9 accent-mauve-9 transition-all cursor-pointer shadow-sm focus-visible:ring-1 focus-visible:ring-ring"
              title={
                isAllSelected ? "Deselect all for date" : "Select all for date"
              }
            />
          </div>
          <CalendarDays size={18} className="text-primary ml-1" />
          <span className="uppercase tracking-widest">{dateGroup.date}</span>
          <span className="bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-md text-[10px] ml-2">
            {dateGroup.activities.length} Logs
          </span>
        </div>
      </div>

      {(() => {
        const amActivities = dateGroup.activities.filter(
          (a) => (a.time_of_day || "").toUpperCase() === "AM",
        );
        const pmActivities = dateGroup.activities.filter(
          (a) => (a.time_of_day || "").toUpperCase() === "PM",
        );
        const otherActivities = dateGroup.activities.filter((a) => {
          const t = (a.time_of_day || "").toUpperCase();
          return t !== "AM" && t !== "PM";
        });

        const renderCard = (act) =>
          mode === "PENDING" ? (
            <ActivityCard
              key={act.id}
              activity={act}
              onViewDetails={onViewDetails}
              isSelected={selectedActivities.has(act.id)}
              onToggleSelection={() => onToggleSelection(act.id)}
              searchTerm={searchTerm}
            />
          ) : (
            <VerifiedActivityCard
              key={act.id}
              activity={act}
              onViewDetails={onViewDetails}
              isSelected={selectedActivities.has(act.id)}
              onToggleSelection={() => onToggleSelection(act.id)}
              searchTerm={searchTerm}
            />
          );


        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AM Column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-11 bg-amber-2 border border-amber-6 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                  <Clock size={11} /> AM — {amActivities.length}{" "}
                  {amActivities.length === 1 ? "Log" : "Logs"}
                </span>
              </div>
              {amActivities.length > 0 ? (
                amActivities.map(renderCard)
              ) : (
                <div className="text-xs text-muted-foreground italic bg-muted border border-dashed border-border rounded-lg py-4 text-center">
                  No AM activities
                </div>
              )}
            </div>

            {/* PM Column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-violet-11 bg-violet-2 border border-mauve-5 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                  <Clock size={11} /> PM — {pmActivities.length}{" "}
                  {pmActivities.length === 1 ? "Log" : "Logs"}
                </span>
              </div>
              {pmActivities.length > 0 ? (
                pmActivities.map(renderCard)
              ) : (
                <div className="text-xs text-muted-foreground italic bg-muted border border-dashed border-border rounded-lg py-4 text-center">
                  No PM activities
                </div>
              )}
            </div>

            {/* Other (if any activities have no AM/PM set) */}
            {otherActivities.length > 0 && (
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground bg-muted border border-border px-2.5 py-1 rounded-md flex items-center gap-1.5">
                    <Clock size={11} /> Unspecified — {otherActivities.length}{" "}
                    {otherActivities.length === 1 ? "Log" : "Logs"}
                  </span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {otherActivities.map(renderCard)}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function ActivityCard({
  activity,
  onViewDetails,
  isSelected,
  onToggleSelection,
  searchTerm,
}) {

  return (
    <div
      className={`bg-card border rounded-xl p-4 flex flex-col hover:shadow-md transition-all group ${
        isSelected
          ? "border-mauve-8 shadow-sm bg-mauve-2"
          : "border-border hover:border-mauve-5"
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelection}
              className="w-4 h-4 rounded border-input text-mauve-9 accent-mauve-9 transition-all cursor-pointer shadow-sm focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div>
            <h4
              className="text-sm font-bold text-foreground line-clamp-1"
              title={activity.account_name}
            >
              <HighlightText text={activity.account_name || "No Account Specified"} search={searchTerm} />
            </h4>

            <span className="inline-block mt-1 text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-black tracking-widest uppercase">
              <HighlightText text={activity.activity_type} search={searchTerm} />
            </span>

          </div>
        </div>
        <div className="flex gap-2 text-[10px] font-black tracking-widest uppercase items-center">
          <span className="text-muted-foreground bg-muted px-2 py-1 rounded-md flex items-center gap-1 border border-border">
            <Clock size={12} /> {activity.time_of_day}
          </span>
          {activity.is_unplanned && (
            <span className="text-blue-10 bg-blue-9/10 border border-blue-500/20 px-2 py-1 rounded-md">
              Unplanned
            </span>
          )}
          <button
            className="text-muted-foreground hover:text-primary transition-colors p-1 ml-1 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(activity);
            }}
            title="Open Full Details"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      <p
        className="text-xs text-muted-foreground flex-1 leading-relaxed line-clamp-3"
        title={activity.details_daily}
      >
        <span className="font-bold text-foreground">Details:</span>{" "}
        <HighlightText text={activity.details_daily || "-"} search={searchTerm} />
      </p>

    </div>
  );
}

function VerifiedActivityCard({
  activity,
  onViewDetails,
  isSelected,
  onToggleSelection,
  searchTerm,
}) {

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
    <div
      className={`bg-card border rounded-xl p-4 flex flex-col hover:shadow-md transition-all group ${
        isSelected
          ? "border-mauve-8 shadow-sm bg-mauve-2"
          : "border-border hover:border-mauve-5"
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelection}
              className="w-4 h-4 rounded border-input text-mauve-9 accent-mauve-9 transition-all cursor-pointer shadow-sm focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div>
            <h4
              className="text-sm font-bold text-foreground line-clamp-1"
              title={activity.account_name}
            >
              <HighlightText text={activity.account_name || "No Account Specified"} search={searchTerm} />
            </h4>

            <span className="inline-block mt-1 text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-black tracking-widest uppercase">
              <HighlightText text={activity.activity_type} search={searchTerm} />
            </span>

          </div>
        </div>
        <div className="flex gap-2 text-[10px] font-black tracking-widest uppercase items-center">
          <span className="text-muted-foreground bg-muted px-2 py-1 rounded-md flex items-center gap-1 border border-border">
            <Clock size={12} /> {activity.time_of_day}
          </span>
          {activity.is_unplanned && (
            <span className="text-blue-10 bg-blue-9/10 border border-blue-500/20 px-2 py-1 rounded-md">
              Unplanned
            </span>
          )}
          <button
            className="text-muted-foreground hover:text-primary transition-colors p-1 ml-1 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(activity);
            }}
            title="Open Full Details"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      <p
        className="text-xs text-muted-foreground flex-1 leading-relaxed mb-2 line-clamp-3"
        title={activity.details_daily}
      >
        <span className="font-bold text-foreground">Details:</span>{" "}
        <HighlightText text={activity.details_daily || "-"} search={searchTerm} />
      </p>


      {/* Verification metadata */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[10px]">
        <span className="text-muted-foreground flex items-center gap-1">
          <CheckCircle2 size={10} className="text-green-9" />
          Verified:{" "}
          <span className="text-foreground font-semibold">
            {verifiedAtFormatted}
          </span>
        </span>
        {activity.head_remarks && (
          <span className="text-muted-foreground flex items-center gap-1">
            <MessageSquare size={10} />
            Remarks:{" "}
            <span className="text-foreground font-semibold italic">
              "{activity.head_remarks}"
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
