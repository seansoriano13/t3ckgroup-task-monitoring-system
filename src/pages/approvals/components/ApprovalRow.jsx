import { useState, useMemo, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Maximize2, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { formatDate } from "../../../utils/formatDate.js";
import { formatTaskPreview } from "../../../utils/taskFormatters";
import ImageAttachment from "../../../components/ImageAttachment.jsx";
import ChecklistTaskRenderer from "../../../components/ChecklistTaskRenderer.jsx";
import { TASK_STATUS } from "../../../constants/status.js";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Avatar from "../../../components/Avatar";

export function ApprovalRow({
  task,
  isHr,
  onProcess,
  isSubmitting,
  currentUserId,
  defaultExpanded,
  onViewDetails,
  appSettings,
  isSelected,
  onToggleSelection,
  isVerifiedTab,
}) {
  const [expanded, setExpanded] = useState(!!defaultExpanded);
  const [grade, setGrade] = useState(task.grade || null);
  const [remarks, setRemarks] = useState(task.remarks || "");
  const [hrRemarks, setHrRemarks] = useState(task.hrRemarks || "");
  const rowRef = useRef(null);

  useEffect(() => {
    if (defaultExpanded) {
      queueMicrotask(() => setExpanded(true));
    }
  }, [defaultExpanded]);

  useEffect(() => {
    if (expanded && rowRef.current) {
      // Small timeout ensures the container is fully rendered before focusing
      setTimeout(() => rowRef.current.focus({ preventScroll: true }), 50);
    }
  }, [expanded]);

  const handleKeyDown = (e) => {
    if (!expanded || isSubmitting || isVerifiedTab) return;

    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
      return;
    }

    if (!isHr) {
      const keyMap = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };
      if (keyMap[e.key]) {
        e.preventDefault();
        const num = keyMap[e.key];
        setGrade(num);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (grade !== null) {
          handleHeadApprove();
        } else {
          toast.error("Select a grade (1-5) before pressing Enter to approve");
        }
      } else if (e.key.toLowerCase() === "x") {
        e.preventDefault();
        if (!remarks) {
          toast.error("Evaluation remarks required to reject task");
          return;
        }
        handleHeadReject();
      }
    } else {
      if (e.key.toLowerCase() === "v" || e.key === "Enter") {
        e.preventDefault();
        handleHrVerify();
      } else if (e.key.toLowerCase() === "x") {
        e.preventDefault();
        if (!hrRemarks) {
          toast.error("HR verification notes required to reject task");
          return;
        }
        handleHrReject();
      }
    }
  };

  const isDelayed = useMemo(() => {
    if (!task?.createdAt) return false;
    const hrs = (new Date() - new Date(task.createdAt)) / (1000 * 60 * 60);
    return hrs >= 48;
  }, [task.createdAt]);

  const handleHeadApprove = async () => {
    const toastId = toast.loading("Approving task...");
    try {
      await onProcess({
        id: task.id,
        status: TASK_STATUS.COMPLETE,
        grade: grade,
        remarks: remarks,
        endAt: new Date().toISOString(),
        evaluatedBy: currentUserId,
        editedBy: currentUserId,
        hrVerified: false,
        hrRemarks: "",
      });
      toast.success("Task approved!", { id: toastId });
    } catch {
      toast.error("Failed to approve task", { id: toastId });
    }
  };

  const handleHeadReject = async () => {
    const toastId = toast.loading("Rejecting task...");
    try {
      await onProcess({
        id: task.id,
        status: "NOT APPROVED",
        grade: 0,
        remarks: remarks,
        evaluatedBy: currentUserId,
        editedBy: currentUserId,
        hrVerified: false,
        hrRemarks: "",
      });
      toast.success("Task rejected!", { id: toastId });
    } catch {
      toast.error("Failed to reject task", { id: toastId });
    }
  };

  const handleHrVerify = async () => {
    const toastId = toast.loading("Verifying task...");
    try {
      await onProcess({
        id: task.id,
        status: TASK_STATUS.COMPLETE,
        hrVerified: true,
        hrVerifiedAt: new Date().toISOString(),
        hrRemarks: hrRemarks,
        editedBy: currentUserId,
      });
      toast.success("Task verified!", { id: toastId });
    } catch {
      toast.error("Failed to verify task", { id: toastId });
    }
  };

  const handleHrReject = async () => {
    const toastId = toast.loading("Rejecting task...");
    try {
      await onProcess({
        id: task.id,
        status: "NOT APPROVED",
        hrVerified: false,
        hrVerifiedAt: null,
        hrRemarks: hrRemarks,
        editedBy: currentUserId,
      });
      toast.success("Task rejected!", { id: toastId });
    } catch {
      toast.error("Failed to reject task", { id: toastId });
    }
  };

  return (
    <div
      ref={rowRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`outline-none border transition-all duration-300 rounded-xl focus-visible:ring-2 focus-visible:ring-mauve-6 focus-visible:border-mauve-6 ${
        isSelected
          ? "border-mauve-8 shadow-[0_0_15px_rgba(79,70,229,0.15)] bg-mauve-4"
          : expanded
            ? "bg-card border-border"
            : "border-border bg-card shadow-sm hover:border-mauve-8"
      }`}
    >
      {/* COMPACT ROW */}
      <div
        className="p-3 md:p-4 flex items-center justify-between cursor-pointer gap-2"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
          <Avatar
            name={task.loggedByName}
            size="lg"
            isSelected={isSelected}
            showCheckOnSelect={true}
            className={!isSelected ? " shadow-inner" : "shadow-inner"}
            onClick={
              appSettings?.enable_bulk_approval && onToggleSelection
                ? (e) => {
                    e.stopPropagation();
                    onToggleSelection(task.id);
                  }
                : undefined
            }
            title={
              appSettings?.enable_bulk_approval && onToggleSelection
                ? isSelected
                  ? "Deselect task"
                  : "Select for bulk approval"
                : undefined
            }
          />
          <div className="min-w-0 flex-1 md:flex-none md:w-40 lg:w-56 shrink-0">
            <h3 className="font-bold text-foreground text-xs md:text-sm truncate">
              {task.loggedByName}
            </h3>
            <p className="text-[9px] md:text-[10px] text-muted-foreground font-bold uppercase tracking-widest truncate">
              {task.categoryId}
            </p>
          </div>

          <div className="hidden md:flex flex-1 min-w-0 ml-4 pl-4 border-l border-border items-center">
            <p className="text-sm font-semibold text-muted-foreground line-clamp-1 max-w-md">
              {formatTaskPreview(task.taskDescription)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <div className="flex flex-col items-end leading-tight">
            <span className="text-[10px] md:text-xs font-bold text-muted-foreground">
              {formatDate(task.createdAt)}
            </span>
            {task.editedAt && (
              <span
                className="text-[9px] md:text-[10px] text-muted-foreground font-bold uppercase tracking-widest"
                title={`Last modified ${formatDate(task.editedAt)}${task.editedByName ? ` by ${task.editedByName}` : ""}`}
              >
                Mod: {formatDate(task.editedAt)}
              </span>
            )}
          </div>

          {appSettings?.enable_visual_shaming && isDelayed && (
            <span className="px-2 py-1 rounded bg-orange-400/20 text-[color:var(--amber-10)] text-[9px] font-black uppercase tracking-widest border border-orange-500/30 animate-pulse">
              Delayed
            </span>
          )}

          {task.priority === "HIGH" && (
            <>
              <span className="hidden sm:block px-2 py-1 rounded bg-red-a3 text-red-11 text-[10px] font-black uppercase tracking-widest border border-red-a5">
                High Priority
              </span>
              <div className="sm:hidden w-2 h-2 rounded-full bg-red-9 shadow-[0_0_8px_rgba(229,72,77,0.5)]" />
            </>
          )}

          <button
            className="text-muted-foreground hover:text-primary transition-colors p-1"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(task);
            }}
            title="Open Full Details"
          >
            <Maximize2 size={16} />
          </button>

          <button className="text-muted-foreground hover:text-foreground transition-colors p-1">
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* EXPANDED ACTION AREA */}
      {expanded && (
        <div className="p-4 border-t border-border bg-muted/50 rounded-b-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Col: Full Description */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                Task Description
              </label>
              {task.taskDescription &&
              task.taskDescription.trim().startsWith("[") ? (
                <div className="mt-1">
                  <ChecklistTaskRenderer
                    description={task.taskDescription}
                    isOwner={false}
                    disabled={true}
                  />
                </div>
              ) : (
                <div className="bg-card p-3 md:p-4 rounded-lg border border-border text-xs md:text-sm text-foreground whitespace-pre-wrap leading-relaxed shadow-inner">
                  {formatTaskPreview(task.taskDescription)}
                </div>
              )}

              {task.attachments && task.attachments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                    Screenshots / Attachments
                  </label>
                  <ImageAttachment
                    taskId={task.id}
                    userId={currentUserId}
                    attachments={task.attachments}
                    readOnly={true}
                    onChange={() => {}}
                  />
                </div>
              )}
            </div>

            {/* Right Col: Dynamic UI based on Role */}
            <div className="space-y-4">
              {isHr ? (
                /* --- HR UI --- */
                <>
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      Manager's Evaluation
                    </p>
                    <div className="flex gap-1.5 md:gap-2 pointer-events-none select-none">
                      {[1, 2, 3, 4, 5].map((num) => {
                        const activeColorMap = {
                          1: "bg-destructive text-mauve-1 border-red-500 shadow-red-500/40",
                          2: "bg-orange-500 text-mauve-1 border-orange-500 shadow-orange-500/40",
                          3: "bg-[color:var(--yellow-9)] text-mauve-1 border-yellow-500 shadow-yellow-500/40",
                          4: "bg-lime-500 text-mauve-1 border-lime-500 shadow-lime-500/40",
                          5: "bg-green-9 text-mauve-1 border-green-500 shadow-green-500/40",
                        };
                        const isSelected = task.grade === num;
                        return (
                          <div
                            key={num}
                            className={`flex-1 py-2.5 rounded-lg font-black border text-xs md:text-sm text-center transition-all ${
                              isSelected
                                ? `${activeColorMap[num]} shadow-md scale-[1.05]`
                                : "bg-muted text-muted-foreground/80 border-border opacity-40"
                            }`}
                          >
                            {num}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {task.remarks && (
                    <div className="bg-card border border-border p-3 rounded-xl">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        Manager Remarks
                      </p>
                      <p className="text-xs text-foreground">{task.remarks}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                      HR Verification Notes
                    </label>
                    <Input
                      type="text"
                      value={hrRemarks}
                      onChange={(e) => setHrRemarks(e.target.value)}
                      placeholder={
                        isVerifiedTab ? "No notes provided" : "Audit notes..."
                      }
                      className="w-full bg-background"
                      disabled={isVerifiedTab}
                    />
                  </div>

                  {!isVerifiedTab && (
                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                      <Button
                        variant="outline"
                        onClick={handleHrReject}
                        disabled={!hrRemarks || isSubmitting}
                        className="order-2 sm:order-1 hover:text-destructive hover:border-destructive/50"
                      >
                        Not Approve
                      </Button>
                      <Button
                        onClick={handleHrVerify}
                        disabled={isSubmitting}
                        className="order-1 sm:order-2 bg-green-10 hover:bg-green-11 text-primary-foreground"
                      >
                        Verify & Sign
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                /* --- HEAD UI --- */
                <>
                  <div>
                    <label className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2 block">
                      Assign Grade (1-5)
                    </label>
                    <div className="flex gap-1.5 md:gap-2">
                      {[1, 2, 3, 4, 5].map((num) => {
                        const activeColorMap = {
                          1: "bg-destructive text-mauve-1 hover:bg-destructive border-red-500 shadow-red-500/40",
                          2: "bg-orange-500 text-mauve-1 hover:bg-orange-600 border-orange-500 shadow-orange-500/40",
                          3: "bg-[color:var(--yellow-9)] text-mauve-1 hover:bg-yellow-600 border-yellow-500 shadow-yellow-500/40",
                          4: "bg-lime-500 text-mauve-1 hover:bg-lime-600 border-lime-500 shadow-lime-500/40",
                          5: "bg-green-9 text-mauve-1 hover:bg-green-9 border-green-500 shadow-green-500/40",
                        };

                        return (
                          <button
                            key={num}
                            onClick={() => setGrade(num)}
                            className={`flex-1 py-2.5 rounded-lg font-black transition-all border text-xs md:text-sm ${
                              grade === num
                                ? `${activeColorMap[num]} shadow-md scale-[1.05]`
                                : "bg-muted text-muted-foreground/80 border-border"
                            } ${!isVerifiedTab && "hover:border-mauve-5 hover:bg-mauve-4"}`}
                            disabled={isVerifiedTab}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                      Evaluation Remarks
                    </label>
                    <Input
                      type="text"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder={
                        isVerifiedTab && !remarks
                          ? "No feedback provided"
                          : "Add feedback..."
                      }
                      className="w-full bg-background mt-1"
                      disabled={isVerifiedTab}
                    />
                  </div>

                  {!isVerifiedTab && (
                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                      <Button
                        variant="outline"
                        onClick={handleHeadReject}
                        disabled={!remarks || isSubmitting}
                        className="order-2 sm:order-1 hover:text-destructive hover:border-destructive/50"
                      >
                        Not Approve
                      </Button>
                      <Button
                        onClick={handleHeadApprove}
                        disabled={grade === null || isSubmitting}
                        className="order-1 sm:order-2 bg-green-10 hover:bg-green-11 text-primary-foreground"
                      >
                        Approve Task
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* KEYBOARD SHORTCUTS HINT */}
          {!isVerifiedTab && (
            <div className="mt-6 pt-3 border-t border-border/50 flex justify-center opacity-70">
              <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase flex items-center gap-2">
                Shortcuts:
                {!isHr ? (
                  <>
                    <span className="bg-mauve-4 text-foreground px-1.5 py-0.5 rounded border border-border">
                      1-5
                    </span>{" "}
                    Select Grade
                    <span className="bg-mauve-4 text-foreground px-1.5 py-0.5 rounded border border-border ml-2">
                      Enter
                    </span>{" "}
                    Approve
                    <span className="bg-mauve-4 text-foreground px-1.5 py-0.5 rounded border border-border ml-2">
                      X
                    </span>{" "}
                    Reject
                  </>
                ) : (
                  <>
                    <span className="bg-mauve-4 text-foreground px-1.5 py-0.5 rounded border border-border">
                      V / Enter
                    </span>{" "}
                    Verify
                    <span className="bg-mauve-4 text-foreground px-1.5 py-0.5 rounded border border-border ml-2">
                      X
                    </span>{" "}
                    Reject
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
