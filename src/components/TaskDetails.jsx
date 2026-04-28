import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTaskTopology } from "../hooks/useTaskTopology";
import TaskHeader from "./TaskHeader";
import ManagementSection from "./ManagementSection";
import StandardDetailsSection from "./StandardDetailsSection";
import GradeSelector from "./GradeSelector";
import TaskActivityTimeline from "./TaskActivityTimeline";
import { formatDate, toLocalDatetimeString } from "../utils/formatDate";
import { isCategoryMetadataRemarks } from "../utils/taskFormatters";
import { PencilLine, FolderKanban, Receipt, AlertTriangle, MessageCircle, Clock } from "lucide-react";
import TaskFooter from "./TaskFooter.jsx";
import { TASK_STATUS } from "../constants/status.js";
import ChecklistTaskInput from "./ChecklistTaskInput";
import ChecklistTaskRenderer from "./ChecklistTaskRenderer";
import ImageAttachment from "./ImageAttachment";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase.js";
import { toast } from "react-hot-toast";
import { confirmDeleteToast } from "./ui/CustomToast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { activeChatService } from "../services/tasks/activeChatService";
import { createPortal } from "react-dom";
import HighlightText from "./HighlightText";
import Dot from "./ui/Dot";

export default function TaskDetails({
  isOpen,
  onClose,
  task,
  onUpdateTask,
  onDeleteTask,
  searchTerm,
}) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: appSettings } = useQuery({
    queryKey: ["appSettings"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("*").single();
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 mins — setting rarely changes
  });

  const [approvalGrade, setApprovalGrade] = useState(null);
  const [descriptionType, setDescriptionType] = useState("description");

  // Timeline message ref — used by the approval flow to grab the message
  // from the timeline input box when the head clicks Approve/Reject
  const timelineMessageRef = useRef("");
  const modalRef = useRef(null);

  const [formData, setFormData] = useState({
    department: "",
    subDepartment: "",
    loggedById: "",
    categoryId: "",
    priority: "LOW",
    status: "INCOMPLETE",
    startAt: "",
    endAt: "",
    projectTitle: "",
    taskDescription: "",
    grade: 0,
    remarks: "",
    attachments: [],
    paymentVoucher: "",
  });

  // Pre-hydrate the form data immediately when the modal opens
  useEffect(() => {
    if (isOpen && task) {
      if (user?.id) {
        activeChatService.markAsRead(user.id, "TASK", task.id);
      }

      const taskDept =
        task.creator?.department ||
        task.employees?.department ||
        task.department ||
        "";
      const taskSubDept =
        task.creator?.sub_department ||
        task.employees?.sub_department ||
        task.sub_department ||
        "";

      queueMicrotask(() => {
        setApprovalGrade(null);
        timelineMessageRef.current = "";

        let initialDescriptionType = "description";
        const desc = task.taskDescription;
        if (desc) {
          const trimmed = typeof desc === "string" ? desc.trim() : "";
          if (
            (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
            (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
            Array.isArray(desc)
          ) {
            initialDescriptionType = "checklist";
          }
        }
        setDescriptionType(initialDescriptionType);

        setFormData({
          department: taskDept || user?.department || "",
          subDepartment:
            taskSubDept || user?.sub_department || user?.subDepartment || "",
          loggedById: task.loggedById || "",
          categoryId: task.categoryId || "",
          priority: task.priority || "LOW",
          status: task.status || "INCOMPLETE",
          startAt: task.startAt ? toLocalDatetimeString(task.startAt) : "",
          endAt: task.endAt ? toLocalDatetimeString(task.endAt) : "",
          projectTitle: task.projectTitle || "",
          taskDescription: task.taskDescription || "",
          grade: task.grade || 0,
          remarks: task.remarks || "",
          attachments: task.attachments || [],
          paymentVoucher: task.paymentVoucher || "",
        });
      });
    }
  }, [isOpen, task, user]);

  // Role Checks
  const isHr =
    user?.is_hr === true ||
    user?.isHr === true ||
    user?.is_super_admin === true ||
    user?.isSuperAdmin === true;
  const isHead = user?.is_head === true || user?.isHead === true;
  const isManagement = isHr || isHead;
  const isSuperAdmin =
    user?.is_super_admin === true || user?.isSuperAdmin === true;
  const canEvaluate = isHead || isSuperAdmin;

  // Custom Data Hook
  const topologyData = useTaskTopology(
    isOpen,
    formData,
    task?.categoryId,
    isEditing,
  );

  // Reset states when closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setIsEditing(false);
        setIsSubmitting(false);
      }, 300);
    } else {
      // Focus modal for keyboard shortcuts
      setTimeout(() => modalRef.current?.focus({ preventScroll: true }), 100);
    }
  }, [isOpen]);

  if (!task) return null;

  const isDelayed =
    task?.status === TASK_STATUS.AWAITING_APPROVAL &&
    task?.createdAt &&
    (new Date() - new Date(task.createdAt)) / (1000 * 60 * 60) >= 48;

  // Permissions & Handlers
  const isOwner = user?.id === task.loggedById;
  const isHrRejected =
    task.status === TASK_STATUS.NOT_APPROVED && (task.grade ?? 0) > 0;
  const canEdit =
    isHr ||
    isHead ||
    (isOwner &&
      task.status !== TASK_STATUS.COMPLETE &&
      task.status !== TASK_STATUS.AWAITING_APPROVAL);

  let isChecklistFormat = false;
  let hasUncheckedItems = false;
  if (formData.taskDescription) {
    const trimmed =
      typeof formData.taskDescription === "string"
        ? formData.taskDescription.trim()
        : "";
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          isChecklistFormat = true;
          hasUncheckedItems = parsed.some(
            (item) => item && typeof item === "object" && !item.checked,
          );
        }
      } catch (e) {
        console.error(e);
      }
    } else if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && Array.isArray(parsed.items)) {
          isChecklistFormat = true;
          hasUncheckedItems = parsed.items.some(
            (item) => item && typeof item === "object" && !item.checked,
          );
        }
      } catch (e) {
        console.error(e);
      }
    } else if (Array.isArray(formData.taskDescription)) {
      isChecklistFormat = true;
      hasUncheckedItems = formData.taskDescription.some(
        (item) => item && typeof item === "object" && !item.checked,
      );
    }
  }

  const taskDept = formData.department || user?.department;
  const taskSubDept =
    formData.subDepartment || user?.sub_department || user?.subDepartment;
  const isMarketing =
    taskSubDept?.toUpperCase() === "MARKETING" ||
    taskDept?.toUpperCase() === "MARKETING" ||
    task?.categoryDesc?.toUpperCase()?.includes("MARKETING");

  const isComplete = task.status === TASK_STATUS.COMPLETE;
  const isNotApproved = task.status === TASK_STATUS.NOT_APPROVED;
  const isFinalized = isComplete || isNotApproved;
  const timelineLegacyRemarks = isCategoryMetadataRemarks(task?.remarks)
    ? ""
    : task?.remarks;

  const handleToggleEdit = () => {
    setIsEditing(true);
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleDeptChange = (e) =>
    setFormData({
      ...formData,
      department: e.target.value,
      subDepartment: "",
      loggedById: "",
      categoryId: "",
    });
  const handleSubDeptChange = (e) =>
    setFormData({
      ...formData,
      subDepartment: e.target.value,
      loggedById: "",
      categoryId: "",
    });
  const handleAssigneeChange = (e) =>
    setFormData({ ...formData, loggedById: e.target.value, categoryId: "" });

  const executeUpdate = async (payload, silent = false) => {
    if (!silent) setIsSubmitting(true);
    const toastId = !silent ? toast.loading("Processing...") : undefined;
    try {
      await onUpdateTask(payload);
      if (!silent) {
        toast.success("Task updated!", { id: toastId });
        onClose();
      }
    } catch {
      if (!silent) {
        toast.error("Failed to process task", { id: toastId });
        setIsSubmitting(false);
      }
    }
  };

  const handleSaveEdit = () => {
    // eslint-disable-next-line no-unused-vars
    const { department, subDepartment, status, grade, ...dbPayload } = formData;

    executeUpdate({ id: task.id, ...dbPayload, editedBy: user.id });
  };

  const handleApprove = () => {
    if (approvalGrade === null) {
      toast.error("Select a grade (1-5) before pressing Enter to approve");
      return;
    }
    if (hasUncheckedItems) {
      toast.error("Checklist items must be complete before approval");
      return;
    }
    executeUpdate({
      id: task.id,
      status: TASK_STATUS.COMPLETE,
      endAt: new Date().toISOString(),
      grade: approvalGrade,
      remarks: "",
      activityMessage: timelineMessageRef.current || "",
      evaluatedBy: user.id,
      editedBy: user.id,
      hrVerified: false,
      hrRemarks: "",
    });
  };

  const handleReject = () => {
    if (!timelineMessageRef.current) {
      toast.error("Remarks required to reject task in timeline");
      return;
    }
    executeUpdate({
      id: task.id,
      status: TASK_STATUS.NOT_APPROVED,
      endAt: new Date().toISOString(),
      grade: 0,
      remarks: "",
      activityMessage: timelineMessageRef.current || "",
      evaluatedBy: user.id,
      editedBy: user.id,
      hrVerified: false,
      hrRemarks: "",
    });
  };

  const handleResubmit = () => {
    executeUpdate({
      id: task.id,
      status: TASK_STATUS.INCOMPLETE,
      editedBy: user.id,
    });
  };

  const handleVerify = () => {
    if (task.status !== TASK_STATUS.COMPLETE) {
      toast.error(
        "Security policy limits verification exclusively to fully COMPLETE entries.",
      );
      return;
    }
    executeUpdate({
      id: task.id,
      status: TASK_STATUS.COMPLETE,
      hrVerified: true,
      hrVerifiedAt: new Date().toISOString(),
      editedBy: user.id,
      activityMessage: timelineMessageRef.current || "",
    });
  };

  const handleKeyDown = (e) => {
    if (!isOpen || isSubmitting || isEditing) return;

    if (
      e.target.tagName === "INPUT" ||
      e.target.tagName === "TEXTAREA" ||
      e.target.tagName === "SELECT"
    ) {
      if (e.key !== "Enter") return;
    }

    if (isFinalized || !canEvaluate) return;

    if (!isHr) {
      const keyMap = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };
      if (
        keyMap[e.key] &&
        e.target.tagName !== "INPUT" &&
        e.target.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        setApprovalGrade(keyMap[e.key]);
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleApprove();
      } else if (
        e.key.toLowerCase() === "x" &&
        e.target.tagName !== "INPUT" &&
        e.target.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        handleReject();
      }
    } else {
      if (
        (e.key.toLowerCase() === "v" &&
          e.target.tagName !== "INPUT" &&
          e.target.tagName !== "TEXTAREA") ||
        (e.key === "Enter" &&
          e.target.tagName !== "INPUT" &&
          e.target.tagName !== "TEXTAREA")
      ) {
        e.preventDefault();
        handleVerify();
      } else if (
        e.key.toLowerCase() === "x" &&
        e.target.tagName !== "INPUT" &&
        e.target.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        handleReject();
      }
    }
  };

  const handleDelete = () => {
    confirmDeleteToast(
      "Delete Task?",
      "This will permanently remove the task from all active queues and history.",
      async () => {
        setIsSubmitting(true);
        const loadingToast = toast.loading("Purging task from system...");
        try {
          await onDeleteTask({ id: task.id, userId: user.id });
          toast.success("Task deleted successfully.", { id: loadingToast });
          onClose();
        } catch {
          toast.error("Failed to delete task.", { id: loadingToast });
          setIsSubmitting(false);
        }
      },
    );
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
        onKeyDown={handleKeyDown}
        className={`fixed top-0 right-0 h-full w-full max-w-[720px] bg-card border-l border-border shadow-2xl z-[9999] transform transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col outline-none ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <TaskHeader
          isEditing={isEditing}
          isHrVerified={task.hrVerified}
          onClose={onClose}
          onOpenChat={() => {
            window.dispatchEvent(
              new CustomEvent("OPEN_CHAT_MODAL", {
                detail: { entityId: task.id, entityType: "TASK" },
              }),
            );
          }}
        />

        <div className="p-6 flex-1 overflow-y-auto space-y-6 custom-scrollbar bg-card">
          {task.status === "DELETED" && (
            <div className="bg-destructive/5 border border-destructive/30 rounded-xl p-4 flex items-center gap-3 text-destructive shadow-sm mt-0 -mb-4">
              <div className="bg-red-100 p-2 rounded-lg">
                <AlertTriangle size={20} className="text-destructive" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-tight">
                  Task Deleted
                </p>
                <p className="text-xs font-bold opacity-80">
                  This task has been soft-deleted and is hidden from regular
                  views.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <ManagementSection
              isEditing={isEditing}
              isHr={isHr}
              isHead={isHead}
              task={task}
              formData={formData}
              taskLoggedByName={task.loggedByName}
              reportedToName={task.reportedToName}
              topologyData={topologyData}
              handlers={{
                handleDeptChange,
                handleSubDeptChange,
                handleAssigneeChange,
              }}
            />
            <StandardDetailsSection
              isEditing={isEditing}
              isManagement={isManagement}
              formData={formData}
              handleChange={handleChange}
              topologyData={topologyData}
              task={task}
            />

            {/* --- PROJECT / CAMPAIGN TITLE --- */}
            {(isEditing || formData.projectTitle) && (
              <div className="flex flex-col gap-1.5 pt-2">
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
                  <FolderKanban size={12} /> Project / Campaign Title
                  {isEditing && (
                    <span className="font-normal text-muted-foreground normal-case tracking-normal">
                      (optional)
                    </span>
                  )}
                </label>
                {isEditing ? (
                  <Input
                    type="text"
                    name="projectTitle"
                    value={formData.projectTitle}
                    onChange={handleChange}
                    placeholder="e.g. Q2 Brand Awareness Campaign"
                    className="h-11 shadow-sm"
                  />
                ) : (
                  <div className="bg-muted px-4 py-3 rounded-xl border border-border/50 text-sm font-bold text-violet-10 flex items-center gap-2 shadow-sm">
                    <FolderKanban size={14} />
                    {formData.projectTitle}
                  </div>
                )}
              </div>
            )}

            {/* --- PAYMENT VOUCHER --- */}
            {((isEditing && taskDept?.toUpperCase() === "ADMIN") ||
              formData.paymentVoucher) && (
              <div className="flex flex-col gap-1.5 pt-2">
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
                  <Receipt size={12} /> Payment Voucher
                  {isEditing && (
                    <span className="font-normal text-muted-foreground normal-case tracking-normal">
                      (optional)
                    </span>
                  )}
                </label>
                {isEditing ? (
                  <Input
                    type="text"
                    name="paymentVoucher"
                    value={formData.paymentVoucher || ""}
                    onChange={handleChange}
                    placeholder="e.g. PV-2026-001"
                    className="h-11 shadow-sm"
                  />
                ) : (
                  <div className="bg-muted px-4 py-3 rounded-xl border border-border/50 text-sm font-bold text-foreground flex items-center gap-2 shadow-sm">
                    <Receipt size={14} />
                    {formData.paymentVoucher}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1.5 pt-2">
              {isEditing ? (
                <div className="flex items-center justify-between pl-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Task Details
                  </label>
                  <div className="flex gap-1 bg-muted/50 p-0.5 rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => setDescriptionType("description")}
                      className={`text-[10px] px-3 py-1 rounded-md font-bold transition-all ${
                        descriptionType === "description"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-muted-foreground/80"
                      }`}
                    >
                      Description
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescriptionType("checklist")}
                      className={`text-[10px] px-3 py-1 rounded-md font-bold transition-all ${
                        descriptionType === "checklist"
                          ? "bg-card text-muted-foreground00 shadow-sm"
                          : "text-muted-foreground hover:text-slate-50000"
                      }`}
                    >
                      Checklist
                    </button>
                  </div>
                </div>
              ) : (
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] pl-1 flex items-center gap-2">
                  <Dot />
                  Description
                </label>
              )}

              {isEditing ? (
                descriptionType === "checklist" ? (
                  <ChecklistTaskInput
                    value={formData.taskDescription}
                    onChange={handleChange}
                  />
                ) : (
                  <Textarea
                    name="taskDescription"
                    value={
                      typeof formData.taskDescription === "string" &&
                      (formData.taskDescription.trim().startsWith("[") ||
                        formData.taskDescription.trim().startsWith("{"))
                        ? ""
                        : formData.taskDescription
                    }
                    onChange={handleChange}
                    required
                    className="w-full bg-card border border-border text-foreground rounded-xl p-4 outline-none transition-all h-32 resize-none text-[14px] shadow-sm"
                  />
                )
              ) : isChecklistFormat ? (
                <ChecklistTaskRenderer
                  description={task.taskDescription}
                  isOwner={isOwner}
                  disabled={!canEdit || !isOwner}
                  searchTerm={searchTerm}
                  onInlineCheck={(newDesc) => {
                    setFormData((prev) => ({
                      ...prev,
                      taskDescription: newDesc,
                    }));
                    executeUpdate(
                      {
                        id: task.id,
                        taskDescription: newDesc,
                        editedBy: user.id,
                      },
                      true,
                    );
                  }}
                />
              ) : (
                <div className="bg-muted/30 p-6 rounded-2xl border border-border text-foreground leading-relaxed text-[15px] whitespace-pre-wrap shadow-sm">
                  <HighlightText
                    text={task.taskDescription}
                    search={searchTerm}
                  />
                </div>
              )}
            </div>

            {/* --- ATTACHMENTS (all tasks, owner only) --- */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-border mt-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
                Attachments
              </label>
              <ImageAttachment
                taskId={task.id}
                userId={user.id}
                attachments={formData.attachments || []}
                onChange={(newAttachments) => {
                  setFormData({ ...formData, attachments: newAttachments });
                  executeUpdate(
                    {
                      id: task.id,
                      attachments: newAttachments,
                      editedBy: user.id,
                    },
                    true,
                  );
                }}
                readOnly={!canEdit || !isOwner}
              />
            </div>

            {/* --- GRADE SELECTOR (for evaluation) --- */}
            {!isEditing && (
              <div
                className={`p-4 rounded-xl border ${
                  isComplete
                    ? "bg-muted/50/50 border-border"
                    : isNotApproved
                      ? "bg-destructive/10 border-destructive/20"
                      : "border-mauve-8"
                }`}
              >
                <div className="grid gap-1 mb-3">
                  <div className="text-xs font-bold uppercase tracking-wider">
                    {isFinalized
                      ? "Performance Grade"
                      : canEvaluate
                        ? "Performance Grade (Required for Approval)"
                        : "Evaluation Status (Not Yet Evaluated)"}
                  </div>

                  {isFinalized && task.evaluatedByName && (
                    <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        Evaluated by:{" "}
                        <span className="font-bold text-muted-foreground">
                          {task.evaluatedByName}
                        </span>
                      </div>
                      {task.evaluatedById === task.loggedById && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-900/20 text-plum-9 text-[10px] font-black uppercase tracking-widest border border-purple-500/30">
                          Self-Verified
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <GradeSelector
                  grade={isFinalized ? task.grade : approvalGrade}
                  onSelect={setApprovalGrade}
                  canEvaluate={canEvaluate && !isFinalized}
                  finalized={isFinalized}
                />
              </div>
            )}

            {/* --- UNIFIED ACTIVITY TIMELINE --- */}
            {!isEditing && (
              <div className="pt-2 border-t border-border mt-2">
                <TaskActivityTimeline
                  taskId={task.id}
                  legacyRemarks={timelineLegacyRemarks}
                  legacyHrRemarks={task.hrRemarks}
                  evaluatedByName={task.evaluatedByName}
                  grade={task.grade}
                  disabled={task.status === TASK_STATUS.DELETED}
                />
              </div>
            )}

            {!isEditing && task.editedById && (
              <div className="pt-4 border-t border-border flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <PencilLine size={12} /> Last Modified By{" "}
                  <span className="text-muted-foreground/80">
                    {task.editedByName}
                  </span>
                </p>
                <p>{formatDate(task.editedAt)}</p>
              </div>
            )}

            {/* KEYBOARD SHORTCUTS HINT */}
            {!isFinalized && !isEditing && canEvaluate && (
              <div className="pt-2 flex justify-center opacity-70 mb-4 pb-4">
                <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase flex items-center gap-2">
                  Shortcuts:
                  {!isHr ? (
                    <>
                      <span className="bg-muted/50 text-foreground px-1.5 py-0.5 rounded border border-border">
                        1-5
                      </span>{" "}
                      Select Grade
                      <span className="bg-muted/50 text-foreground px-1.5 py-0.5 rounded border border-border ml-2">
                        Enter
                      </span>{" "}
                      Approve
                      <span className="bg-muted/50 text-foreground px-1.5 py-0.5 rounded border border-border ml-2">
                        X
                      </span>{" "}
                      Reject
                    </>
                  ) : (
                    <>
                      <span className="bg-muted/50 text-foreground px-1.5 py-0.5 rounded border border-border">
                        V / Enter
                      </span>{" "}
                      Verify
                      <span className="bg-muted/50 text-foreground px-1.5 py-0.5 rounded border border-border ml-2">
                        X
                      </span>{" "}
                      Reject
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        <TaskFooter
          actions={{
            onCancel: () => setIsEditing(false),
            onClose,
            onSave: handleSaveEdit,
            onToggleEdit: handleToggleEdit,
            onDelete: handleDelete,

            onHeadReject: handleReject,

            onSubmitApproval: () => {
              const payload = {
                id: task.id,
                status: TASK_STATUS.AWAITING_APPROVAL,
                editedBy: user.id,
              };
              if (isMarketing) {
                payload.endAt = task.endAt || new Date().toISOString();
              }
              return executeUpdate(payload);
            },

            onMarkComplete: handleApprove,

            onUndoVerify: () =>
              executeUpdate({
                id: task.id,
                status: TASK_STATUS.COMPLETE,
                hrVerified: false,
                hrRemarks: "",
                editedBy: user.id,
              }),

            onHrVerify: handleVerify,

            onSelfVerify: () =>
              executeUpdate({
                id: task.id,
                status: TASK_STATUS.COMPLETE,
                endAt: new Date().toISOString(),
                grade: 3,
                remarks: "Self-Verified (System Bypass)",
                evaluatedBy: user.id,
                editedBy: user.id,
                hrVerified: false,
                hrRemarks: "",
              }),

            onRecallTask: () =>
              executeUpdate({
                id: task.id,
                status: TASK_STATUS.INCOMPLETE,
                editedBy: user.id,
              }),

            onResubmit: handleResubmit,

            setTimelineMessage: (msg) => {
              timelineMessageRef.current = msg;
            },
          }}
          permissions={{ canEdit, canEvaluate, isHr, isManagement, isOwner }}
          state={{
            isEditing,
            isSubmitting,
            task,
            formIsValid:
              !isSubmitting &&
              !topologyData.isLoadingTop &&
              !(isManagement && !formData.loggedById) &&
              formData.categoryId,
            canApprove: approvalGrade !== null && !hasUncheckedItems,
            isMarketing,
            universalTaskSubmission:
              appSettings?.universal_task_submission === true,
            hasAttachments:
              formData.attachments && formData.attachments.length > 0,
            hasUncheckedItems,
            isHrRejected,
            isDelayed,
            enableSelfVerification:
              appSettings?.enable_self_verification === true,
            enableVisualShaming: appSettings?.enable_visual_shaming === true,
          }}
        />
      </div>
    </>,
    document.body,
  );
}
