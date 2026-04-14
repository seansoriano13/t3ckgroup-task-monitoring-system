import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTaskTopology } from "../hooks/useTaskTopology";
import TaskHeader from "./TaskHeader";
import ManagementSection from "./ManagementSection";
import StandardDetailsSection from "./StandardDetailsSection";
import GradeSelector from "./GradeSelector";
import TaskActivityTimeline from "./TaskActivityTimeline";
import { formatDate, toLocalDatetimeString } from "../utils/formatDate";
import { PencilLine, FolderKanban, Receipt } from "lucide-react";
import TaskFooter from "./TaskFooter.jsx";
import { TASK_STATUS } from "../constants/status.js";
import ChecklistTaskInput from "./ChecklistTaskInput";
import ChecklistTaskRenderer from "./ChecklistTaskRenderer";
import ImageAttachment from "./ImageAttachment";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase.js";
import { toast } from "react-hot-toast";

export default function TaskDetails({
  isOpen,
  onClose,
  task,
  onUpdateTask,
  onDeleteTask,
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
          if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}")) || Array.isArray(desc)) {
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
    }
  }, [isOpen]);

  if (!task) return null;

  const isDelayed =
    task?.status === TASK_STATUS.AWAITING_APPROVAL &&
    task?.createdAt &&
    (new Date() - new Date(task.createdAt)) / (1000 * 60 * 60) >= 48;

  // Permissions & Handlers
  const isOwner = user?.id === task.loggedById;
  const isHrRejected = task.status === "NOT APPROVED" && (task.grade ?? 0) > 0;
  const canEdit =
    isHr || isHead || (isOwner && task.status !== TASK_STATUS.COMPLETE && task.status !== TASK_STATUS.AWAITING_APPROVAL && !isHrRejected);

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
    try {
      await onUpdateTask(payload);
      if (!silent) onClose();
    } catch {
      if (!silent) setIsSubmitting(false);
    }
  };

  const handleSaveEdit = () => {
    // eslint-disable-next-line no-unused-vars
    const { department, subDepartment, status, grade, ...dbPayload } = formData;

    executeUpdate({ id: task.id, ...dbPayload, editedBy: user.id });
  };

  const handleDelete = async () => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <span className="font-bold text-sm text-gray-12">
            Are you sure you want to delete this task? It will be removed from
            the active queues.
          </span>
          <div className="flex gap-2">
            <button
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded text-sm font-bold transition-colors"
              onClick={async () => {
                toast.dismiss(t.id);
                setIsSubmitting(true);
                try {
                  await onDeleteTask({ id: task.id, userId: user.id });
                  onClose();
                } catch {
                  setIsSubmitting(false);
                }
              }}
            >
              Confirm Delete
            </button>
            <button
              className="bg-gray-3 hover:bg-gray-4 text-gray-11 px-4 py-1.5 rounded text-sm font-bold transition-colors border border-gray-4"
              onClick={() => toast.dismiss(t.id)}
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity,
        id: "delete-confirm",
      },
    );
  };

  return (
    <>
      <div
        className={`dropdown-backdrop transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-[600px] bg-gray-2 border-l border-gray-4 shadow-2xl z-[9999] transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <TaskHeader
          isEditing={isEditing}
          isHrVerified={task.hrVerified}
          onClose={onClose}
        />

        <div className="p-6 flex-1 overflow-y-auto space-y-6 custom-scrollbar bg-gray-2">
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
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-9 uppercase tracking-wider pl-1">
                  <FolderKanban size={12} /> Project / Campaign Title
                  {isEditing && (
                    <span className="font-normal text-gray-7 normal-case tracking-normal">
                      (optional)
                    </span>
                  )}
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="projectTitle"
                    value={formData.projectTitle}
                    onChange={handleChange}
                    placeholder="e.g. Q2 Brand Awareness Campaign"
                    className="min-h-[44px] w-full bg-gray-1 border border-gray-4 focus:border-violet-500 text-gray-12 rounded-lg px-4 outline-none transition-colors text-sm placeholder:text-gray-7"
                  />
                ) : (
                  <div className="bg-gray-1 px-4 py-3 rounded-xl border border-transparent text-sm font-semibold text-violet-400 flex items-center gap-2">
                    <FolderKanban size={14} />
                    {formData.projectTitle}
                  </div>
                )}
              </div>
            )}

            {/* --- PAYMENT VOUCHER --- */}
            {((isEditing &&
              taskDept?.toUpperCase() === "ADMIN") ||
              formData.paymentVoucher) && (
              <div className="flex flex-col gap-1.5 pt-2">
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-9 uppercase tracking-wider pl-1">
                  <Receipt size={12} /> Payment Voucher
                  {isEditing && (
                    <span className="font-normal text-gray-7 normal-case tracking-normal">
                      (optional)
                    </span>
                  )}
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="paymentVoucher"
                    value={formData.paymentVoucher || ""}
                    onChange={handleChange}
                    placeholder="e.g. PV-2026-001"
                    className="min-h-[44px] w-full bg-gray-1 border border-gray-4 focus:border-violet-500 text-gray-12 rounded-lg px-4 outline-none transition-colors text-sm placeholder:text-gray-7"
                  />
                ) : (
                  <div className="bg-gray-1 px-4 py-3 rounded-xl border border-transparent text-sm font-semibold flex items-center gap-2">
                    <Receipt size={14} />
                    {formData.paymentVoucher}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1.5 pt-2">
              {isEditing ? (
                <div className="flex items-center justify-between pl-1">
                  <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider">
                    Task Details
                  </label>
                  <div className="flex gap-1 bg-gray-3 p-0.5 rounded-lg border border-gray-4">
                    <button
                      type="button"
                      onClick={() => setDescriptionType("description")}
                      className={`text-[10px] px-3 py-1 rounded-md font-bold transition-all ${
                        descriptionType === "description" ? "bg-gray-1 text-gray-12 shadow-sm" : "text-gray-8 hover:text-gray-10"
                      }`}
                    >
                      Description
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescriptionType("checklist")}
                      className={`text-[10px] px-3 py-1 rounded-md font-bold transition-all ${
                        descriptionType === "checklist" ? "bg-gray-1 text-gray-12 shadow-sm" : "text-gray-8 hover:text-gray-10"
                      }`}
                    >
                      Checklist
                    </button>
                  </div>
                </div>
              ) : (
                <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider pl-1">
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
                  <textarea
                    name="taskDescription"
                    value={
                      typeof formData.taskDescription === "string" &&
                      (formData.taskDescription.trim().startsWith("[") || formData.taskDescription.trim().startsWith("{"))
                        ? ""
                        : formData.taskDescription
                    }
                    onChange={handleChange}
                    required
                    className="w-full bg-gray-1 border border-gray-4 text-gray-12 rounded-lg p-4 outline-none focus:border-red-9 focus:ring-1 focus:ring-red-9 transition-all h-24 resize-none text-sm shadow-inner"
                  />
                )
              ) : isChecklistFormat ? (
                <ChecklistTaskRenderer
                  description={task.taskDescription}
                  isOwner={isOwner}
                  disabled={!canEdit || !isOwner}
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
                <div className="bg-gray-1 p-5 rounded-xl border border-transparent text-gray-12 leading-relaxed text-sm whitespace-pre-wrap">
                  {task.taskDescription}
                </div>
              )}
            </div>

            {/* --- ATTACHMENTS (all tasks, owner only) --- */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-4 mt-2">
              <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider pl-1">
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
                readOnly={
                  !canEdit ||
                  !isOwner ||
                  task.status === TASK_STATUS.NOT_APPROVED
                }
              />
            </div>

            {/* --- GRADE SELECTOR (for evaluation) --- */}
            {!isEditing && (
              <div className={`p-4 rounded-xl border ${
                isComplete
                  ? "bg-gray-3/50 border-gray-4"
                  : isNotApproved
                    ? "bg-red-a2 border-red-a5"
                    : "border-gray-6"
              }`}>
                <div className="grid gap-1 mb-3">
                  <div className="text-xs font-bold uppercase tracking-wider">
                    {isFinalized
                      ? "Performance Grade"
                      : canEvaluate
                        ? "Performance Grade (Required for Approval)"
                        : "Evaluation Status (Not Yet Evaluated)"}
                  </div>

                  {isFinalized && task.evaluatedByName && (
                    <div className="text-[11px] text-gray-8 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        Evaluated by:{" "}
                        <span className="font-bold text-gray-11">
                          {task.evaluatedByName}
                        </span>
                      </div>
                      {task.evaluatedById === task.loggedById && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-900/20 text-purple-500 text-[10px] font-black uppercase tracking-widest border border-purple-500/30">
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
            <div className="pt-2 border-t border-gray-4 mt-2">
              <TaskActivityTimeline
                taskId={task.id}
                legacyRemarks={task.remarks}
                legacyHrRemarks={task.hrRemarks}
                evaluatedByName={task.evaluatedByName}
                grade={task.grade}
                disabled={isEditing || task.status === TASK_STATUS.DELETED}
              />
            </div>

            {!isEditing && task.editedById && (
              <div className="pt-4 border-t border-gray-4 flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-gray-8">
                <p className="flex items-center gap-1.5">
                  <PencilLine size={12} /> Last Modified By{" "}
                  <span className="text-gray-10">{task.editedByName}</span>
                </p>
                <p>{formatDate(task.editedAt)}</p>
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

            onHeadReject: () =>
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
              }),

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

            onMarkComplete: () =>
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
              }),

            onUndoVerify: () =>
              executeUpdate({
                id: task.id,
                status: TASK_STATUS.COMPLETE,
                hrVerified: false,
                hrRemarks: "",
                editedBy: user.id,
              }),

            onHrVerify: () => {
              if (task.status !== TASK_STATUS.COMPLETE) {
                toast.error(
                  "Security policy limits verification exclusively to fully COMPLETE entries.",
                  { icon: "🔒" },
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
            },

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
            isDelayed,
            enableSelfVerification:
              appSettings?.enable_self_verification === true,
            enableVisualShaming: appSettings?.enable_visual_shaming === true,
          }}
        />
      </div>
    </>
  );
}
