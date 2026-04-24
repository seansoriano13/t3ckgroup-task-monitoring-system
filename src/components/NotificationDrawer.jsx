import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "../services/notificationService";
import { useAuth } from "../context/AuthContext";
import {
  Bell,
  X,
  CheckCheck,
  ShieldAlert,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Briefcase,
  TrendingUp,
  Trophy,
  Trash2,
  MessageCircle,
  Target,
  MoreHorizontal,
  MailWarning,
  MailOpen,
} from "lucide-react";
import { useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import Dropdown from "./ui/Dropdown";
import { confirmDeleteToast } from "./ui/CustomToast";
import toast from "react-hot-toast";
import TabGroup from "./ui/TabGroup";

export default function NotificationDrawer({ isOpen, onClose }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("ALL");

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => notificationService.getMyNotifications(user?.id),
    enabled: !!user?.id && isOpen, // Only fetch eagerly if open
  });

  // Real-time subscription hook when Drawer is mounted/User is active
  useEffect(() => {
    if (!user?.id) return;
    const subscription = notificationService.subscribeToNotifications(
      user.id,
      (newNotif) => {
        // Optimistically update the cache when a new notification drops in
        queryClient.setQueryData(["notifications", user.id], (old = []) => [
          newNotif,
          ...old,
        ]);
      },
    );
    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [user?.id, queryClient]);

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationService.markAsRead(id),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["notifications", user?.id], (old = []) =>
        old.map((n) => (n.id === variables ? { ...n, is_read: true } : n)),
      );
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(user?.id),
    onSuccess: () => {
      queryClient.setQueryData(["notifications", user?.id], (old = []) =>
        old.map((n) => ({ ...n, is_read: true })),
      );
    },
  });

  const markAllUnreadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsUnread(user?.id),
    onSuccess: () => {
      queryClient.setQueryData(["notifications", user?.id], (old = []) =>
        old.map((n) => ({ ...n, is_read: false })),
      );
      toast.success("All notifications reset to unread");
    },
    onError: (err) => toast.error(err.message),
  });

  const markUnreadMutation = useMutation({
    mutationFn: (id) => notificationService.markAsUnread(id),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["notifications", user?.id], (old = []) =>
        old.map((n) => (n.id === variables ? { ...n, is_read: false } : n)),
      );
      toast.success("Marked as unread");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteNotifMutation = useMutation({
    mutationFn: (id) => notificationService.deleteNotification(id),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["notifications", user?.id], (old = []) =>
        old.filter((n) => n.id !== variables),
      );
      toast.success("Notification removed");
    },
    onError: (err) => toast.error(err.message),
  });

  const getIconForType = (type) => {
    switch (type) {
      case "TASK_GRADED":
        return <CheckCircle2 size={18} className="text-green-500" />;
      case "TASK_REJECTED":
        return <XCircle size={18} className="text-red-500" />;
      case "TASK_VERIFIED":
        return <ShieldAlert size={18} className="text-primary" />;
      case "TASK_COMPLETED":
        return <Trophy size={18} className="text-green-9" />;
      case "NEW_TASK_SUBMITTED":
        return <Clock size={18} className="text-amber-500" />;
      case "TASK_APPROVED_BY_HEAD":
        return <CheckCircle2 size={18} className="text-amber-600" />;
      case "REVENUE_LOCKED":
        return <ShieldAlert size={18} className="text-green-500" />;
      case "REVENUE_EDIT_REQUESTED":
        return <Clock size={18} className="text-orange-500" />;
      case "REVENUE_EDIT_RESULT":
        return <TrendingUp size={18} className="text-primary" />;
      case "SALES_PLAN_SUBMITTED":
        return <Briefcase size={18} className="text-purple-500" />;
      case "PLAN_AMENDMENT_RESULT":
        return <CheckCircle2 size={18} className="text-blue-600" />;
      case "SALES_DAY_CONQUERED":
        return <CheckCheck size={18} className="text-green-500" />;
      case "SALES_WEEK_CONQUERED":
        return <Trophy size={18} className="text-yellow-500" />;
      case "UNPLANNED_ACTIVITY":
        return <FileText size={18} className="text-primary" />;
      case "DAY_DELETE_REQUESTED":
        return <XCircle size={18} className="text-red-600" />;
      case "DAY_DELETE_RESULT":
        return <Trash2 size={18} className="text-foreground" />;
      case "COMMITTEE_ASSIGNED":
        return <Briefcase size={18} className="text-indigo-500" />;
      case "COMMITTEE_TASK_COMMENT":
        return <MessageCircle size={18} className="text-indigo-500" />;
      case "COMMITTEE_TASK_READY_FOR_HR":
        return <CheckCircle2 size={18} className="text-indigo-600" />;
      case "SALES_QUOTA_PUBLISHED":
        return <Target size={18} className="text-green-9" />;
      case "PLAN_AMENDMENT_REQUESTED":
        return <Clock size={18} className="text-amber-500" />;
      default:
        return <Bell size={18} className="text-gray-9" />;
    }
  };

  const filteredNotifs = useMemo(() => {
    if (activeTab === "ALL") return notifications;
    if (activeTab === "TASKS")
      return notifications.filter(
        (n) => n.type.includes("TASK") || n.type.includes("COMMITTEE"),
      );
    if (activeTab === "SALES")
      return notifications.filter(
        (n) =>
          n.type.includes("SALES") ||
          n.type.includes("REVENUE") ||
          n.type.includes("ACTIVITY"),
      );
    if (activeTab === "UNREAD") return notifications.filter((n) => !n.is_read);
    return notifications;
  }, [notifications, activeTab]);

  const handleNotificationClick = (notif) => {
    if (!notif.is_read) {
      markReadMutation.mutate(notif.id);
    }

    if (!notif.reference_id && !notif.type.includes("CONQUERED")) return; // No deep link unless there is a fallback

    // Deep Routing Logic
    if (notif.type === "COMMITTEE_TASK_COMMENT") {
      // Comment notifications should open the chat, not the detail modal
      navigate("/committee");
      window.dispatchEvent(
        new CustomEvent("OPEN_CHAT_MODAL", {
          detail: {
            entityId: notif.reference_id,
            entityType: "COMMITTEE_TASK",
          },
        }),
      );
    } else if (
      notif.type === "COMMITTEE_ASSIGNED" ||
      notif.type === "COMMITTEE_TASK_READY_FOR_HR"
    ) {
      // Navigate to /committee and open the detail modal
      navigate("/committee");
      window.dispatchEvent(
        new CustomEvent("OPEN_ENTITY_DETAILS", {
          detail: { id: notif.reference_id, type: "COMMITTEE_TASK" },
        }),
      );
    } else if (notif.type.includes("TASK")) {
      // Route to Approvals or Tasks depending on role
      if ((user?.isHead || user?.isHr) && !user?.isSuperAdmin) {
        navigate("/approvals", { state: { openTaskId: notif.reference_id } });
      } else if (user?.isSuperAdmin) {
        navigate("/tasks", { state: { openTaskId: notif.reference_id } });
      } else {
        navigate("/", { state: { openTaskId: notif.reference_id } });
      }
    } else if (notif.type === "SALES_PLAN_SUBMITTED") {
      // Manager/Head: Go to sales approvals page
      if (
        user?.isSuperAdmin ||
        user?.isHead ||
        user?.is_super_admin ||
        user?.is_head
      ) {
        navigate("/approvals/sales", {
          state: { highlightPlanId: notif.reference_id },
        });
      } else {
        // Employee: Go to their schedule
        navigate("/sales/schedule");
      }
    } else if (notif.type === "PLAN_AMENDMENT_REQUESTED") {
      // Manager/Head: Go to sales approvals page
      navigate("/approvals/sales", {
        state: { highlightPlanId: notif.reference_id },
      });
    } else if (notif.type === "SALES_QUOTA_PUBLISHED") {
      // Go to Dashboard to see performance/quota
      navigate("/");
    } else if (notif.type === "PLAN_AMENDMENT_RESULT") {
      // Sales Rep: Go to their schedule to see approved/rejected result
      navigate("/sales/schedule", {
        state: { highlightPlanId: notif.reference_id },
      });
    } else if (notif.type === "UNPLANNED_ACTIVITY") {
      // Go to records and open that activity
      navigate("/sales/records", {
        state: { openActivityId: notif.reference_id },
      });
    } else if (
      notif.type === "SALES_DAY_CONQUERED" ||
      notif.type === "SALES_WEEK_CONQUERED"
    ) {
      const date =
        notif.reference_id ||
        (notif.created_at ? notif.created_at.split("T")[0] : null);
      const isManagement =
        user?.isSuperAdmin ||
        user?.isHead ||
        user?.isHr ||
        user?.is_super_admin ||
        user?.is_head ||
        user?.is_hr;
      if (isManagement) {
        navigate("/sales/records", {
          state: {
            eventType: notif.type,
            fallbackDate: date,
            fallbackEmpId: notif.sender_id,
          },
        });
      } else {
        navigate("/sales/daily", { state: { date } });
      }
    } else if (notif.type.includes("REVENUE")) {
      navigate("/sales/records", {
        state: { openRevenueId: notif.reference_id },
      });
    } else if (notif.type === "SALES_EXPENSE_PENDING") {
      // Admins/Heads: route them to the sales approval queue specialized for activities
      if (
        user?.isSuperAdmin ||
        user?.isHead ||
        user?.is_super_admin ||
        user?.is_head
      ) {
        navigate("/approvals/sales", {
          state: { highlightActivityId: notif.reference_id },
        });
      } else {
        navigate("/approvals", {
          state: { highlightExpenseId: notif.reference_id },
        });
      }
    } else if (notif.type === "SALES_EXPENSE_PROCESSED") {
      // Sales rep: go to their daily execution for that day
      navigate("/sales/daily", {
        state: { highlightActivityId: notif.reference_id },
      });
    } else if (notif.type === "DAY_DELETE_REQUESTED") {
      // Manager: go to approvals and expand deletion queue for that date/emp
      navigate("/approvals/sales", {
        state: { highlightDeletionDate: notif.reference_id },
      });
    } else if (notif.type === "DAY_DELETE_RESULT") {
      // Sales Rep: go to their daily tracker for that day
      navigate("/sales/daily", { state: { date: notif.reference_id } });
    }

    onClose(); // collapse drawer
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99]"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[500px] max-w-full bg-card border-l border-border shadow-2xl z-[9999] transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="p-6 border-b border-border flex justify-between items-center bg-card shrink-0">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Bell size={20} className="text-foreground" /> Notifications
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider font-semibold">
              Your Universal Action Hub
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => markAllReadMutation.mutate()}
              className="text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border border-border px-2 py-1 rounded-md uppercase tracking-tight"
            >
              Mark All Read
            </button>
            <button
              onClick={() => markAllUnreadMutation.mutate()}
              className="text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border border-border px-2 py-1 rounded-md uppercase tracking-tight"
            >
              Mark All Unread
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="p-2 shrink-0">
          <TabGroup
            variant="pill"
            tabs={[
              { value: "ALL", label: "ALL" },
              { value: "UNREAD", label: "UNREAD" },
              ...(user?.has_task_flow || user?.isHr || user?.isSuperAdmin
                ? [{ value: "TASKS", label: "TASKS" }]
                : []),
              ...(user?.has_sales_flow || user?.isHr || user?.isSuperAdmin
                ? [{ value: "SALES", label: "SALES" }]
                : []),
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            fullWidth={true}
          />
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="p-10 text-center text-muted-foreground italic text-sm font-medium animate-pulse">
              Syncing timeline...
            </div>
          ) : filteredNotifs.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center">
              <Bell size={32} className="text-slate-300/50 mb-3" />
              <p className="text-foreground font-bold">You're all caught up!</p>
              <p className="text-muted-foreground text-xs mt-1">
                No alerts for this filter.
              </p>
            </div>
          ) : (
            filteredNotifs.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-6 border-b border-border transition-colors cursor-pointer
                        ${
                          !notif.is_read
                            ? "bg-mauve-4 hover:bg-mauve-5"
                            : "bg-mauve-3 hover:bg-mauve-4"
                        }`}
              >
                <div className="flex gap-4 items-start">
                  <div
                    className={`p-2 rounded-full shrink-0 ${notif.is_read ? "bg-muted" : "bg-primary/10"}`}
                  >
                    {getIconForType(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <h4
                        className={`text-sm font-bold truncate ${notif.is_read ? "text-muted-foreground" : "text-foreground"}`}
                      >
                        {notif.title}
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed font-normal">
                      {notif.message}
                    </p>

                    <div className="mt-1.5 text-[12px] text-muted-foreground flex items-center gap-1.5">
                      {new Date(notif.created_at).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric" },
                      )}
                      {notif.sender && (
                        <>
                          <span>•</span>
                          <span>By {notif.sender.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div
                    className="flex flex-col items-end gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Dropdown
                      placement="bottom-end"
                      popoverClassName="absolute top-full right-0 mt-1.5 bg-card border border-border rounded-xl shadow-2xl z-[110] popover-enter"
                      trigger={({ isOpen }) => (
                        <button
                          className={`p-1.5 rounded-full hover:bg-muted transition-colors ${isOpen ? "bg-muted text-foreground" : "text-muted-foreground"}`}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      )}
                    >
                      {({ close }) => (
                        <div
                          className="p-1 min-w-[160px] flex flex-col bg-card border border-border rounded-lg shadow-xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {!notif.is_read ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markReadMutation.mutate(notif.id);
                                close();
                              }}
                              className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-foreground hover:bg-muted transition-colors text-left"
                            >
                              <MailOpen size={14} /> Mark as read
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markUnreadMutation.mutate(notif.id);
                                close();
                              }}
                              className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-foreground hover:bg-muted transition-colors text-left"
                            >
                              <MailWarning size={14} /> Mark as unread
                            </button>
                          )}
                          <div className="h-px bg-border my-1" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDeleteToast(
                                "Delete Notification?",
                                "This will permanently remove this alert from your hub.",
                                () => deleteNotifMutation.mutate(notif.id),
                              );
                              close();
                            }}
                            className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors text-left"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </Dropdown>
                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary/100 mr-1.5 mt-1" />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
