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
  Image as ImageIcon,
  X,
  Maximize2,
} from "lucide-react";
import { storageService } from "../../../../services/storageService";

export function ChecklistItem({
  data,
  index,
  onToggle,
  disabledUI,
  isAdminView,
  settings,
  highlightId,
  onView,
}) {
  const isDone = data.status === "DONE" || data.status === "APPROVED";
  const isPendingApproval = data.status === "PENDING";
  const isHighlighted = data.id === highlightId;
  const isLost = data.sales_outcome === "LOST";
  const isWon = data.sales_outcome === "COMPLETED";
  const [details, setDetails] = useState(data.details_daily || "");
  const [isEditing, setIsEditing] = useState(false);
  const [justChecked, setJustChecked] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
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

  const handleCheck = async () => {
    if (disabledUI || isUploading) return;
    
    let attachmentsArray = [];
    if (selectedImages && selectedImages.length > 0) {
      if (selectedImages.length > 10) {
        toast.error("Max 10 images");
        return;
      }
      setIsUploading(true);
      try {
        const uploadPromises = Array.from(selectedImages).map(file => storageService.uploadToCloudinary(file));
        attachmentsArray = await Promise.all(uploadPromises);
      } catch (err) {
        toast.error("Failed to attach image: " + err.message);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    setJustChecked(true);
    setTimeout(() => setJustChecked(false), 600);
    onToggle(data.id, details, attachmentsArray);
  };

  return (
    <div
      ref={itemRef}
      className={`p-4 flex gap-4 border-l-4 transition-all duration-500 ${justChecked ? "animate-check-flash" : ""} ${
        isHighlighted
          ? "border-l-indigo-500 bg-[color:var(--violet-2)]/60"
          : isLost
            ? "border-l-destructive/60"
            : isWon
              ? "border-l-green-8/60"
              : isPendingApproval
                ? "border-l-amber-400/60"
                : "border-l-transparent"
      } ${isDone || isPendingApproval ? "opacity-60 hover:opacity-100" : "hover:bg-muted/40"}`}
    >
      <button
        disabled={isDone || isPendingApproval || disabledUI}
        onClick={handleCheck}
        className="mt-1 shrink-0 transition-transform active:scale-75 disabled:cursor-not-allowed"
      >
        {isUploading ? (
          <Loader2 size={24} className="text-primary animate-spin" />
        ) : isDone ? (
          <CheckCircle2
            key={justChecked ? "pop" : "idle"}
            size={24}
            className={`text-green-9 ${justChecked ? "animate-success-pop" : ""}`}
          />
        ) : isPendingApproval ? (
          <div className="relative">
            <CheckCircle2 size={24} className="text-[color:var(--amber-9)] opacity-50" />
            <Clock
              size={12}
              className="text-[color:var(--amber-10)] absolute -right-1 -bottom-1 bg-card rounded-full shadow-sm"
            />
          </div>
        ) : (
          <Circle
            size={24}
            className={`text-muted-foreground transition-transform ${justChecked ? "scale-110" : ""}`}
          />
        )}
      </button>

      {/* Index Numbering */}
      <div className="mt-1 shrink-0">
        <span className={`flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-black border transition-all ${
          isDone || isPendingApproval
            ? "bg-muted text-mauve-4 border-mauve-4"
            : "bg-[color:var(--violet-2)] text-[color:var(--violet-10)] border-mauve-5"
        }`}>
          {index}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div
          onClick={() => onView(data)}
          className={`font-bold text-base cursor-pointer hover:text-[color:var(--violet-10)] transition-all flex items-center flex-wrap gap-2 ${isDone || isPendingApproval ? "line-through text-muted-foreground" : "text-foreground"}`}
        >
          <span>{data.account_name}</span>
          {data.is_unplanned && (
            <span className="text-[10px] bg-[color:var(--blue-9)]/10 text-[color:var(--blue-9)] px-2 py-0.5 rounded-full not-italic no-underline border border-blue-500/20">
              EXTRA
            </span>
          )}
          {isLate && (
            <span className="text-[10px] bg-orange-500/10 text-orange-600 px-2 py-0.5 rounded-full not-italic no-underline font-black tracking-widest border border-orange-500/20">
              LATE
            </span>
          )}
          {isPendingApproval && (
            <span className="text-[10px] bg-warning/10 text-[color:var(--amber-10)] px-2 py-0.5 rounded-full not-italic font-black tracking-widest border border-amber-500/20">
              PENDING APPROVAL
            </span>
          )}
        </div>
        {!isDone && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {data.activity_type} · {data.contact_person || "No Contact"}
          </p>
        )}

        {(data.reference_number || data.expense_amount) && (
          <div className="flex flex-wrap gap-2 mt-1.5">
            {data.reference_number && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-warning/10 text-[color:var(--amber-10)] border border-amber-500/25 px-2 py-0.5 rounded-full">
                {data.reference_number}
              </span>
            )}
            {data.expense_amount && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-green-9/10 text-green-10 border border-green-9/25 px-2 py-0.5 rounded-full">
                {Number(data.expense_amount).toLocaleString()}
              </span>
            )}
            {isAdminView && isWon && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-green-9/10 text-green-10 border border-green-500/25 px-2 py-0.5 rounded-full">
                ✅ WON
              </span>
            )}
            {isAdminView && isLost && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-destructive/10 text-destructive border border-red-500/25 px-2 py-0.5 rounded-full">
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-9/10 hover:bg-green-9/20 text-green-10 rounded-lg text-xs font-bold transition-all border border-green-9/20 shadow-sm disabled:opacity-50"
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
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">
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
              className="text-[10px] font-black uppercase bg-card border border-border rounded-lg px-2 py-1 outline-none focus:border-indigo-400 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <option value="">Pending</option>
              <option value="COMPLETED"> WON</option>
              <option value="LOST"> LOST</option>
            </select>
            {outcomeMutation.isPending && (
              <Loader2 size={12} className="animate-spin text-muted-foreground" />
            )}
          </div>
        )}

        {!isDone && isEditing ? (
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Optional execution remarks..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="flex-1 bg-muted/40 border border-border rounded-xl p-2 text-xs text-foreground font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                autoFocus
              />
              <button 
                onClick={() => setIsEditing(false)} 
                className="text-[10px] uppercase font-black text-muted-foreground hover:text-foreground bg-muted px-2.5 py-1.5 rounded-lg border border-border transition-colors"
              >
                Close
              </button>
            </div>
            {/* Attachment Uploader */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black text-muted-foreground hover:text-foreground bg-muted px-3 py-1.5 rounded-xl cursor-pointer border border-border flex items-center gap-1.5 transition-all hover:border-indigo-300">
                <ImageIcon size={12} /> {selectedImages.length > 0 ? `${selectedImages.length} Photo(s)` : 'Attach Photos'}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  multiple
                  onChange={(e) => setSelectedImages(Array.from(e.target.files))}
                />
              </label>
              {selectedImages.length > 0 && (
                <button 
                  onClick={() => setSelectedImages([])}
                  className="text-destructive hover:bg-destructive/10 p-1 rounded"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        ) : !isDone ? (
          <button
            onClick={() => setIsEditing(true)}
           className="mt-1 text-[10px] font-black text-muted-foreground hover:text-[color:var(--violet-10)] uppercase tracking-widest transition-colors"
          >
            {details ? `Note: ${details}` : "+ Add Note (Optional)"}
          </button>
        ) : (
          data.details_daily && (
            <p className="text-xs text-muted-foreground/60 mt-1 line-through truncate italic">
              {data.details_daily}
            </p>
          )
        )}
      </div>

      <button
        onClick={() => onView(data)}
        className="mt-1 shrink-0 text-muted-foreground hover:text-[color:var(--violet-9)] transition-colors p-1 rounded-lg hover:bg-[color:var(--violet-2)]"
        title="View Details"
      >
        <Maximize2 size={18} />
      </button>
    </div>
  );
}
