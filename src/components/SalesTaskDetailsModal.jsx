import {
  DollarSign,
  AlertTriangle,
  Trash2,
  Tag,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "../services/salesService";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import SalesActivityTimeline from "./SalesActivityTimeline";
import { activeChatService } from "../services/tasks/activeChatService";
import CloudinaryImageAttachment from "./CloudinaryImageAttachment";
import SalesHeader from "./SalesHeader";
import { FieldBox } from "./FieldBox";

export default function SalesTaskDetailsModal({ isOpen, onClose, activity, appSettings }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const modalRef = useRef(null);

  const [localOutcome, setLocalOutcome] = useState(
    activity?.sales_outcome || "",
  );

  const isActivityCompleted =
    activity?.status === "DONE" ||
    activity?.status === "APPROVED" ||
    !!activity?.details_daily;

  // Sync local state whenever the opened activity changes
  useEffect(() => {
    if (activity?.id) {
      queueMicrotask(() => {
        setLocalOutcome(activity.sales_outcome || "");
      });
    }
  }, [activity?.id, activity?.sales_outcome]);

  // Mark as read & focus panel when open
  useEffect(() => {
    if (isOpen && activity?.id && user?.id) {
      activeChatService.markAsRead(user.id, "SALES", activity.id);
    }
    if (isOpen) {
      setTimeout(() => modalRef.current?.focus({ preventScroll: true }), 100);
    }
  }, [isOpen, activity?.id, user?.id]);

  const outcomeMutation = useMutation({
    mutationFn: ({ id, outcome }) =>
      salesService.updateActivityOutcome(id, outcome),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allSalesActivities"] });
      queryClient.invalidateQueries({ queryKey: ["dailyActivities"] });
      toast.success("Outcome saved!");
    },
    onError: (err) => toast.error(err.message),
  });

  if (!activity) return null;

  const isAdminView =
    user?.isSuperAdmin ||
    user?.isHr ||
    user?.is_hr ||
    user?.is_head ||
    user?.isHead;

  const handleOutcomeChange = (val) => {
    setLocalOutcome(val);
    outcomeMutation.mutate({ id: activity.id, outcome: val || null });
  };

  return createPortal(
    <>
      <div
        className={`dropdown-backdrop z-[9998] transition-all duration-300 ${isOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}
        onClick={onClose}
      />
      <div
        ref={modalRef}
        tabIndex={0}
        className={`fixed top-0 right-0 h-full w-full max-w-[720px] bg-card border-l border-border shadow-2xl z-[9999] transform transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col outline-none ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <SalesHeader
          onClose={onClose}
          onOpenChat={() => {
            window.dispatchEvent(
              new CustomEvent("OPEN_CHAT_MODAL", {
                detail: { entityId: activity?.id, entityType: "SALES" },
              }),
            );
          }}
        />

        {/* Scrollable Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6 custom-scrollbar bg-card">


          {/* Deletion banner */}
          {activity?.is_deleted && (
            <div className="bg-destructive/5 border border-destructive/30 rounded-xl p-4 flex items-center gap-3 text-destructive shadow-sm">
              <div className="bg-red-100 p-2 rounded-lg">
                <Trash2 size={20} className="text-destructive" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-tight">Activity Deleted</p>
                <p className="text-xs font-bold opacity-80">
                  This activity has been soft-deleted and is hidden from regular views.
                </p>
              </div>
            </div>
          )}

          {/* Pending wipe banner */}
          {!activity?.is_deleted && activity?.delete_requested_by && (
            <div className="bg-[color:var(--amber-2)] border border-[color:var(--amber-6)] rounded-xl p-4 flex items-center gap-3 text-[color:var(--amber-11)] shadow-sm transition-all duration-300 animate-pulse">
              <div className="bg-[color:var(--amber-3)] p-2 rounded-lg">
                <AlertTriangle size={20} className="text-[color:var(--amber-10)]" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-tight">Pending Wipe Request</p>
                <p className="text-xs font-bold opacity-80">
                  A deletion request has been submitted for this activity and is awaiting approval.
                </p>
              </div>
            </div>
          )}

          {/* ── Representative ─────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 bg-muted/30 p-4 rounded-2xl border border-border">
            <div className="col-span-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Representative
            </div>

            <FieldBox label="Name" isEditing={false}>
              <p className="px-3 text-sm font-bold text-foreground">
                {activity.employees?.name || "N/A"}
              </p>
            </FieldBox>

            <FieldBox label="Department" isEditing={false}>
              <p className="px-3 text-sm font-semibold text-foreground">
                {activity.employees?.department || "N/A"}
              </p>
            </FieldBox>

            <FieldBox label="Status" isEditing={false}>
              <div className="px-3 flex items-center gap-1.5 flex-wrap">
                <span
                  className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                    activity?.status === "DONE" || activity?.status === "APPROVED"
                      ? "bg-green-9/10 text-green-9"
                      : activity?.status === "PENDING"
                        ? "bg-warning/10 text-[color:var(--amber-9)]"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {activity?.status === "PENDING" &&
                  !appSettings?.sales_self_approve_expenses
                    ? "PENDING"
                    : activity?.status === "APPROVED"
                      ? "DONE"
                      : activity?.status}
                </span>
                {(activity?.is_unplanned || !activity?.sales_weekly_plans?.status) && (
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-[color:var(--blue-9)]/10 text-[color:var(--blue-9)] border border-blue-500/30">
                    UNPLANNED
                  </span>
                )}
                {localOutcome === "COMPLETED" && (
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-green-9/10 text-green-9 border border-green-500/30">
                    WON
                  </span>
                )}
                {localOutcome === "LOST" && (
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-destructive/10 text-destructive border border-red-500/30">
                    LOST
                  </span>
                )}
              </div>
            </FieldBox>

            <FieldBox label="Scheduled Date" isEditing={false}>
              <p className="px-3 text-sm font-semibold text-foreground">
                {activity?.scheduled_date
                  ? `${activity.scheduled_date}${activity?.time_of_day ? ` (${activity.time_of_day})` : ""}`
                  : "N/A"}
              </p>
            </FieldBox>
          </div>

          {/* ── Client & Prospect Info ──────────────────────── */}
          <div className="grid grid-cols-2 gap-3 bg-muted/30 p-4 rounded-2xl border border-border">
            <div className="col-span-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Client &amp; Prospect Info
            </div>

            <div className="col-span-2">
              <FieldBox label="Account / Client Name" isEditing={false}>
                <p className="px-3 text-sm font-semibold text-foreground">
                  {activity.account_name || "N/A"}
                </p>
              </FieldBox>
            </div>

            <FieldBox label="Contact Person" isEditing={false}>
              <p className="px-3 text-sm font-semibold text-foreground">
                {activity.contact_person || "N/A"}
              </p>
            </FieldBox>

            <FieldBox label="Contact Number" isEditing={false}>
              <p className="px-3 text-sm font-semibold text-foreground">
                {activity.contact_number || "N/A"}
              </p>
            </FieldBox>

            <div className="col-span-2">
              <FieldBox label="Email Address" isEditing={false}>
                <p className="px-3 text-sm font-semibold text-foreground">
                  {activity.email_address || "N/A"}
                </p>
              </FieldBox>
            </div>

            <div className="col-span-2">
              <FieldBox label="Address" isEditing={false}>
                <p className="px-3 text-sm font-semibold text-foreground">
                  {activity.address || "N/A"}
                </p>
              </FieldBox>
            </div>
          </div>

          {/* ── Execution Remarks ───────────────────────────── */}
          <div className="grid grid-cols-1 gap-3 bg-muted/30 p-4 rounded-2xl border border-border">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Execution Remarks
            </div>

            <FieldBox label="Planned Activity Type" isEditing={false}>
              <p className="px-3 text-sm font-semibold text-foreground">
                {activity.activity_type || "N/A"}
              </p>
            </FieldBox>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                Initial Plan Remarks
              </label>
              <div className="bg-muted/30 p-4 rounded-xl border border-border text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {activity.remarks_plan || "No remarks provided."}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                Actual Execution Details
              </label>
              <div className="bg-muted/30 p-6 rounded-2xl border border-border text-foreground text-[15px] whitespace-pre-wrap leading-relaxed shadow-sm">
                {activity.details_daily || "Not executed yet."}
              </div>
            </div>

            {/* Attachments */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-border mt-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                Attachments
              </label>
              <CloudinaryImageAttachment
                activityId={activity.id}
                attachments={activity.attachments || []}
                onChange={(newUrls) => {
                  salesService
                    .updateActivityAttachments(activity.id, newUrls)
                    .then(() => {
                      queryClient.invalidateQueries({ queryKey: ["dailyActivities"] });
                      queryClient.invalidateQueries({ queryKey: ["allSalesActivities"] });
                      toast.success("Attachments updated!");
                    })
                    .catch((e) =>
                      toast.error("Failed to update attachments: " + e.message),
                    );
                }}
                readOnly={
                  isAdminView ||
                  activity.status === "NOT_APPROVED" ||
                  activity.status === "APPROVED" ||
                  user?.id !== activity.employee_id
                }
              />
            </div>
          </div>

          {/* ── Financial & Reference ───────────────────────── */}
          {(activity?.reference_number ||
            activity?.so_number ||
            activity?.expense_amount) && (
            <div className="grid grid-cols-2 gap-3 bg-muted/30 p-4 rounded-2xl border border-border">
              <div className="col-span-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Fund Request &amp; Reference
              </div>

              <FieldBox label="Reference No. (SQ/TRM)" isEditing={false}>
                <p className="px-3 text-sm font-black text-[color:var(--amber-10)] flex items-center gap-2">
                  <Tag size={13} className="shrink-0" />
                  {activity?.reference_number || (
                    <span className="text-muted-foreground italic font-normal text-xs">
                      Not set (Generic BizDev)
                    </span>
                  )}
                </p>
              </FieldBox>

              <FieldBox label="SO Number" isEditing={false}>
                <p className="px-3 text-sm font-black text-[color:var(--blue-9)] flex items-center gap-2">
                  <Tag size={13} className="shrink-0" />
                  {activity?.so_number || (
                    <span className="text-muted-foreground italic font-normal text-xs">
                      Not provided
                    </span>
                  )}
                </p>
              </FieldBox>

              <div className="col-span-2">
                <FieldBox label="Est. Expense (₱)" isEditing={false}>
                  <p className="px-3 text-sm font-black text-green-10 flex items-center gap-2">
                    <DollarSign size={13} className="shrink-0" />
                    {activity?.expense_amount
                      ? `₱ ${Number(activity?.expense_amount).toLocaleString()}`
                      : (
                        <span className="text-muted-foreground italic font-normal text-xs">
                          No amount declared
                        </span>
                      )}
                  </p>
                </FieldBox>
              </div>
            </div>
          )}

          {/* ── Sales Outcome ───────────────────────────────── */}
          <div className="flex flex-col gap-1.5 pt-2">
            <div className="flex items-center justify-between pl-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Sales Outcome
              </label>
              {activity.is_deleted || activity.delete_requested_by ? (
                <span className="text-[10px] font-bold text-destructive bg-destructive/5 px-2 py-0.5 rounded-full uppercase tracking-widest border border-red-100">
                  Locked — {activity.is_deleted ? "Deleted" : "Pending Wipe"}
                </span>
              ) : (
                !isActivityCompleted && (
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full uppercase tracking-widest">
                    Locked — Not executed yet
                  </span>
                )
              )}
            </div>
            <div className="flex gap-3 mt-1">
              {["", "COMPLETED", "LOST"].map((opt) => (
                <button
                  key={opt}
                  onClick={() =>
                    isActivityCompleted &&
                    !activity.is_deleted &&
                    !activity.delete_requested_by &&
                    handleOutcomeChange(opt)
                  }
                  disabled={
                    outcomeMutation.isPending ||
                    !isActivityCompleted ||
                    !!activity.is_deleted ||
                    !!activity.delete_requested_by
                  }
                  title={
                    activity.is_deleted
                      ? "Task is deleted"
                      : activity.delete_requested_by
                      ? "Wipe request pending"
                      : !isActivityCompleted
                      ? "Activity must be completed first"
                      : undefined
                  }
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all ${
                    localOutcome === opt
                      ? opt === "COMPLETED"
                        ? "bg-green-9 text-primary-foreground border-green-500 shadow-green-500/25 shadow-lg"
                        : opt === "LOST"
                        ? "bg-destructive text-primary-foreground border-red-500 shadow-red-500/25 shadow-lg"
                        : "bg-muted text-foreground border-border"
                      : "bg-card text-muted-foreground border-border"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {opt === "" ? "Pending" : opt === "COMPLETED" ? "WON" : "LOST"}
                </button>
              ))}
            </div>
          </div>

          {/* ── Timeline ────────────────────────────────────── */}
          <div className="pt-2 border-t border-border mt-2">
            <SalesActivityTimeline
              salesActivityId={activity?.id}
              legacyHeadRemarks={activity?.head_remarks}
              headVerifiedByName={activity?.head_verified_by_name}
              disabled={!activity?.id}
            />
          </div>

        </div>
      </div>
    </>,
    document.body,
  );
}
