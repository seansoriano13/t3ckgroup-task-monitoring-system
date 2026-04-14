import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "../../../../services/salesService";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Clock,
  ThumbsUp,
} from "lucide-react";

export function ChecklistItem({
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
  const isWon = data.sales_outcome === "COMPLETED";
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
    // Tolerance: Allow same day completion
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
            {isAdminView && isWon && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-green-500/10 text-green-600 border border-green-500/25 px-2 py-0.5 rounded-full">
                ✅ WON
              </span>
            )}
            {isAdminView && isLost && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-600 border border-red-500/25 px-2 py-0.5 rounded-full">
                🚫 LOST
              </span>
            )}
          </div>
        )}

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
              <option value="COMPLETED"> WON</option>
              <option value="LOST"> LOST</option>
            </select>
            {outcomeMutation.isPending && (
              <Loader2 size={12} className="animate-spin text-gray-9" />
            )}
          </div>
        )}

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
