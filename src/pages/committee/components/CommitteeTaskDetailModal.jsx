import { useState, useRef, useEffect, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  X,
  CheckCircle2,
  Star,
  Calendar,
  Users,
  FileText,
  Maximize2,
  Check,
  Trash2,
  Clock,
  PlusCircle,
  Plus,
  Loader2,
  User,
  Edit3,
  ShieldCheck,
  XCircle,
  AlertTriangle
} from "lucide-react";
import StatusBadge from "../../../components/StatusBadge";
import { Button } from "@/components/ui/button";
import ChecklistTaskRenderer from "../../../components/ChecklistTaskRenderer";
import ChecklistTaskInput from "../../../components/ChecklistTaskInput";
import GradeSelector from "../../../components/GradeSelector";
import { confirmDeleteToast } from "../../../components/ui/CustomToast";
import { committeeTaskService } from "../../../services/committeeTaskService";
import { MessageCircle } from "lucide-react";
import { activeChatService } from "../../../services/tasks/activeChatService";
import { useQuery } from "@tanstack/react-query";
import Select from "react-select";
import { LOG_TASK_SELECT_STYLES } from "../../../constants/task";

const COMMITTEE_ROLES = ["EVENT", "CREATIVE", "DEMO", "BAC", "ODOO", "OTHERS"];

export default function CommitteeTaskDetailModal({
  isOpen,
  onClose,
  task,
  currentUserId,
  onMarkDone,
  onOpenRateModal,
  onDelete,
  onRevertDone,
  isMarkingDone,
  isReverting,
  isDeleting,
  isSuperAdmin,
  isHr,
  employees = [],
  onAddMember,
  isAddingMember,
  onUpdateMember,
  onRemoveMember,
  isUpdatingMember,
  isRemovingMember,
  onVerify,
  onReject,
  isVerifying,
  isRejecting,
  onInlineCheck,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState("");

  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberId, setNewMemberId] = useState(null);
  const [newMemberRole, setNewMemberRole] = useState("");
  const [newMemberCustomRole, setNewMemberCustomRole] = useState("");
  const [newMemberDescType, setNewMemberDescType] = useState("description");
  const [newMemberDesc, setNewMemberDesc] = useState("");

  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editMemberRole, setEditMemberRole] = useState("");
  const [editMemberCustomRole, setEditMemberCustomRole] = useState("");
  const [editMemberDescType, setEditMemberDescType] = useState("description");
  const [editMemberDesc, setEditMemberDesc] = useState("");

  const handleEditClick = (member) => {
    setEditingMemberId(member.id);
    setEditMemberRole(member.role || "");
    setEditMemberCustomRole(member.custom_role || "");
    
    const isChecklist =
      typeof member.task_description === "string" &&
      (member.task_description.trim().startsWith("[") ||
        member.task_description.trim().startsWith("{"));
    
    setEditMemberDescType(isChecklist ? "checklist" : "description");
    setEditMemberDesc(member.task_description || "");
  };

  const handleCancelEdit = () => {
    setEditingMemberId(null);
    setEditMemberRole("");
    setEditMemberCustomRole("");
    setEditMemberDescType("description");
    setEditMemberDesc("");
  };

  const handleUpdateMember = async () => {
    if (!editingMemberId || !editMemberDesc.trim()) return;
    await onUpdateMember(editingMemberId, {
      taskDescription: editMemberDesc,
      role: editMemberRole,
      customRole: editMemberCustomRole,
    });
    handleCancelEdit();
  };

  const handleRemoveMember = (memberId) => {
    confirmDeleteToast(
      "Remove Member",
      "Are you sure you want to remove this member from the task?",
      () => {
        onRemoveMember(memberId);
      }
    );
  };

  const { data: logs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ["committeeHistory", task?.id],
    queryFn: () => committeeTaskService.getCommitteeTaskHistory(task.id),
    enabled: !!task?.id && isOpen && activeTab === "history",
  });

  const employeeOptions = useMemo(() => {
    return employees
      .filter((e) => !e.is_super_admin)
      .map((e) => ({ value: e.id, label: e.name, department: e.department }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [employees]);

  useEffect(() => {
    if (isOpen) {
      setIsExpanded(false);
      setActiveTab("overview");
      setShowAddMember(false);
      setNewMemberId(null);
      setNewMemberRole("");
      setNewMemberCustomRole("");
      setNewMemberDescType("description");
      setNewMemberDesc("");
      setShowRejectForm(false);
      setRejectRemarks("");
      handleCancelEdit();
    }
  }, [isOpen]);

  // Mark as read when opened (same pattern as TaskDetails & SalesTaskDetailsModal)
  useEffect(() => {
    if (isOpen && task?.id && currentUserId) {
      activeChatService.markAsRead(currentUserId, "COMMITTEE_TASK", task.id);
    }
  }, [isOpen, task?.id, currentUserId]);

  const resolveEmployeeName = (id) => {
    if (!id) return "Unknown";
    // 1. Try task members (most reliable for all users)
    const member = task.members?.find((m) => m.employee_id === id);
    if (member?.employee?.name) return member.employee.name;

    // 2. Try employees prop (only available for admins/heads)
    const emp = employees.find((e) => e.id === id);
    if (emp?.name) return emp.name;

    return "Unknown";
  };

  if (!task) return null;

  const isCreator = task.created_by === currentUserId;
  const isCancelled = task.status === "CANCELLED";
  const isHrPending = task.status === "HR_PENDING";
  const isHrVerified = task.status === "HR_VERIFIED";
  const isCompletedOrBeyond =
    task.status === "COMPLETED" || isHrPending || isHrVerified;

  // Map display status: COMPLETED/HR_PENDING/HR_VERIFIED → "COMPLETED"
  const displayStatus = isCompletedOrBeyond ? "COMPLETED" : task.status;

  const members = task.members || [];
  const myMember = members.find((m) => m.employee_id === currentUserId);
  const allMembersDone =
    members.length > 0 && members.every((m) => m.status === "DONE");

  const handleDelete = () => {
    confirmDeleteToast(
      "Delete Committee Task",
      "Are you sure you want to delete this group task? This action cannot be undone.",
      () => {
        onDelete();
      },
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={`p-0 gap-0 z-[70] shadow-[0_10px_40px_-10px_rgba(79,70,229,0.15)] flex flex-col transition-all duration-300 w-[960px] sm:max-w-none max-w-[95vw] rounded-2xl ${
          isExpanded
            ? "top-4 bottom-4 !translate-y-0 h-[calc(100vh-2rem)] max-h-none overflow-hidden"
            : "max-h-[90vh] overflow-hidden"
        }`}
      >
        {/* HEADER */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-3/40 shrink-0 relative overflow-hidden bg-card">
          <div className="space-y-1 mt-1">
            <div className="flex items-center gap-2 mb-2.5">
              <StatusBadge status={displayStatus} />
              {(isHrPending || isHrVerified) && (
                <div title={isHrVerified ? "Verified by HR" : "Pending HR Verification"} className="flex items-center">
                  {isHrVerified ? <CheckCircle2 size={14} className="text-green-500" /> : <Clock size={14} className="text-amber-500" />}
                </div>
              )}
            </div>
            <h2 className="text-2xl font-black text-foreground tracking-tight leading-tight">
              {task.title}
            </h2>
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 mt-2">
              <div className="flex items-center gap-1.5">
                <Users size={14} className="text-primary/70" /> Created by{" "}
                {task.creator?.name || "Unknown"}
              </div>
              {task.due_date && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-primary/70" /> Due{" "}
                  {new Date(task.due_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("OPEN_CHAT_MODAL", {
                    detail: { entityId: task.id, entityType: "COMMITTEE_TASK" },
                  }),
                );
              }}
              title="Open Conversation"
              className="p-1.5 rounded-md text-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors mr-1"
            >
              <MessageCircle size={15} />
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-md text-slate-400 hover:text-foreground hover:bg-muted/80 transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              <Maximize2 size={14} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-foreground hover:bg-muted/80 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex px-6 border-b border-border bg-card shrink-0 gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === "history"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            History
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8 bg-card/50">
          {activeTab === "overview" ? (
            <>
              {/* Description */}
              {task.description && (
                <div className="animate-content-in stagger-1 mb-2">
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {task.description}
                  </p>
                </div>
              )}

              {/* Members List */}
              <div className="animate-content-in stagger-2 flex-1">
                <div className="flex items-center justify-between mb-4 pl-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Committee Members ({members.length})
                  </label>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {members.map((member) => {
                const isMe = member.employee_id === currentUserId;
                const canSeeGrade = isCreator || isSuperAdmin || isMe;
                const showGrade =
                  isCompletedOrBeyond && canSeeGrade && member.grade > 0;

                const isChecklist =
                  typeof member.task_description === "string" &&
                  (member.task_description.trim().startsWith("[") ||
                    member.task_description.trim().startsWith("{"));

                let hasUncheckedItems = false;
                if (isChecklist) {
                  try {
                    const parsed = JSON.parse(member.task_description.trim());
                    if (Array.isArray(parsed)) {
                      hasUncheckedItems = parsed.some((i) => !i.checked);
                    } else if (parsed && Array.isArray(parsed.items)) {
                      hasUncheckedItems = parsed.items.some((i) => !i.checked);
                    }
                  } catch (e) {}
                }

                return (
                  <div
                    key={member.id}
                    className={`p-5 border rounded-2xl flex flex-col gap-4 shadow-sm hover:shadow-md transition-all duration-300 transform origin-center ${isMe ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}
                  >
                    {editingMemberId === member.id ? (
                      // EDIT MODE
                      <div className="flex flex-col gap-4 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-foreground uppercase tracking-widest">
                            Edit Assignment: {member.employee?.name}
                          </h4>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase">
                            Role (Optional)
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {COMMITTEE_ROLES.map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setEditMemberRole(editMemberRole === r ? "" : r)}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider transition-all ${
                                  editMemberRole === r
                                    ? "bg-primary text-white shadow-sm"
                                    : "bg-card text-foreground border border-border hover:border-slate-400"
                                }`}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                          {editMemberRole === "OTHERS" && (
                            <div className="animate-slide-down mt-1">
                              <input
                                type="text"
                                value={editMemberCustomRole}
                                onChange={(e) => setEditMemberCustomRole(e.target.value)}
                                placeholder="Specify custom role..."
                                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors"
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-end">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase">
                              Specific Task
                            </label>
                            <div className="flex gap-0.5 bg-muted rounded border border-border p-0.5 w-fit">
                              <button
                                type="button"
                                onClick={() => setEditMemberDescType("description")}
                                className={`text-[9px] px-2 py-0.5 rounded font-bold transition-all ${
                                  editMemberDescType === "description" ? "bg-card text-foreground shadow-sm" : "text-slate-400"
                                }`}
                              >
                                Text
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditMemberDescType("checklist")}
                                className={`text-[9px] px-2 py-0.5 rounded font-bold transition-all ${
                                  editMemberDescType === "checklist" ? "bg-card text-foreground shadow-sm" : "text-slate-400"
                                }`}
                              >
                                Checklist
                              </button>
                            </div>
                          </div>

                          {editMemberDescType === "checklist" ? (
                            <div className="bg-card rounded-lg border border-border p-1.5 flex-1 min-h-[96px]">
                              <ChecklistTaskInput
                                value={editMemberDesc}
                                onChange={(e) => setEditMemberDesc(e.target.value)}
                              />
                            </div>
                          ) : (
                            <textarea
                              value={editMemberDesc}
                              onChange={(e) => setEditMemberDesc(e.target.value)}
                              placeholder="What exactly are they responsible for?"
                              className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-primary/50 transition-colors h-24 resize-none flex-1"
                            />
                          )}
                        </div>

                        <div className="flex justify-end pt-2 gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={handleCancelEdit}
                            disabled={isUpdatingMember}
                            className="h-9 px-4 rounded-xl text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            disabled={!editMemberDesc.trim() || isUpdatingMember}
                            onClick={handleUpdateMember}
                            className="h-9 px-6 rounded-xl text-xs bg-primary hover:bg-primary/90 text-white"
                          >
                            {isUpdatingMember ? "Saving..." : "Save Changes"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // VIEW MODE
                      <>
                        <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-sm text-foreground tracking-tight">
                              {member.employee?.name}
                            </span>
                            {isMe && (
                              <span className="text-[9px] font-bold bg-primary text-white px-2 py-0.5 rounded shadow-sm uppercase tracking-wider">
                                You
                              </span>
                            )}

                            {member.role && (
                              <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded shadow-sm uppercase tracking-wider border border-slate-200 dark:border-slate-700">
                                {member.custom_role || member.role}
                              </span>
                            )}

                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded shadow-sm uppercase tracking-wider ${
                                member.status === "DONE"
                                  ? "bg-green-500/10 text-green-600 border border-green-500/20"
                                  : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              }`}
                            >
                              {member.status}
                            </span>
                          </div>

                          {/* Head/Admin Controls */}
                          {(isCreator || isSuperAdmin) && task.status === "ACTIVE" && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditClick(member)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Edit Assignment"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(member.id)}
                                disabled={isRemovingMember}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Remove Member"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 flex flex-col gap-2 relative">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Specific Task
                          </label>
                          {isChecklist ? (
                            <div className="bg-muted/30 rounded-xl p-3 border border-border/50 min-h-[80px]">
                              <ChecklistTaskRenderer
                                description={member.task_description}
                                isOwner={isMe}
                                disabled={!isMe || member.status === "DONE"}
                                onInlineCheck={(newDesc) => {
                                  if (onInlineCheck) {
                                    onInlineCheck(member.id, newDesc);
                                  } else {
                                    committeeTaskService
                                      .updateMemberTaskDescription(member.id, newDesc, task.id, currentUserId)
                                      .catch(console.error);
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <div className="text-[13px] text-foreground bg-muted/20 p-4 rounded-xl border border-border/50 leading-relaxed min-h-[80px] whitespace-pre-wrap">
                              {member.task_description}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-4 pt-1">
                          {/* Grades */}
                          {showGrade ? (
                            <div className="flex-1">
                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                Grade
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <GradeSelector grade={member.grade} finalized />
                                {member.grade_remarks && (
                                  <div className="text-xs text-muted-foreground bg-card border border-border/50 p-2 rounded-lg italic">
                                    "{member.grade_remarks}"
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div /> /* Spacer */
                          )}

                          {/* Action for the logged-in member */}
                          {isMe &&
                            member.status === "PENDING" &&
                            task.status === "ACTIVE" && (
                              <button
                                onClick={() => onMarkDone(member.id)}
                                disabled={
                                  isMarkingDone ||
                                  (isChecklist && hasUncheckedItems)
                                }
                                title={
                                  isChecklist && hasUncheckedItems
                                    ? "Check all items first"
                                    : ""
                                }
                                className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 transition-colors shadow-sm disabled:opacity-50 ml-auto"
                              >
                                <CheckCircle2 size={16} />
                                {isMarkingDone ? "Marking..." : "Mark as Done"}
                              </button>
                            )}

                          {/* Undo action for Heads/Admins */}
                          {(isCreator || isSuperAdmin) &&
                            member.status === "DONE" &&
                            task.status === "ACTIVE" && (
                              <button
                                onClick={() => onRevertDone(member.id)}
                                disabled={isReverting}
                                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-lg text-[10px] uppercase tracking-widest font-bold hover:bg-amber-500/20 transition-colors ml-auto"
                              >
                                {isReverting ? "..." : "Revert"}
                              </button>
                            )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

              {/* ADD MEMBER FORM */}
              {(isCreator || isSuperAdmin) && task.status === "ACTIVE" && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  {!showAddMember ? (
                    <button
                      type="button"
                      onClick={() => setShowAddMember(true)}
                      className="flex items-center justify-center gap-2 w-full h-[60px] border-2 border-dashed border-primary/20 rounded-xl text-primary font-bold text-xs hover:bg-primary/5 hover:border-primary/40 transition-colors"
                    >
                      <Plus size={16} /> Add Another Member
                    </button>
                  ) : (
                    <div className="p-5 border border-primary/20 rounded-xl bg-primary/5 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-widest">
                          Add New Member
                        </h4>
                        <button
                          type="button"
                          onClick={() => setShowAddMember(false)}
                          className="p-1 text-slate-400 hover:text-foreground hover:bg-card rounded-md"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="flex flex-col gap-1.5 relative z-20">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">
                          Assignee
                        </label>
                        <Select
                          className="w-full flex-1"
                          options={employeeOptions}
                          value={employeeOptions.find((o) => o.value === newMemberId) || null}
                          onChange={(opt) => setNewMemberId(opt?.value)}
                          placeholder="Select Employee..."
                          classNamePrefix="react-select"
                          classNames={LOG_TASK_SELECT_STYLES}
                          unstyled
                          isClearable
                          menuShouldBlockScroll={false}
                          menuPortalTarget={document.body}
                          styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">
                          Role (Optional)
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {COMMITTEE_ROLES.map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setNewMemberRole(newMemberRole === r ? "" : r)}
                              className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider transition-all ${
                                newMemberRole === r
                                  ? "bg-primary text-white shadow-sm"
                                  : "bg-card text-foreground border border-border hover:border-slate-400"
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                        {newMemberRole === "OTHERS" && (
                          <div className="animate-slide-down mt-1">
                            <input
                              type="text"
                              value={newMemberCustomRole}
                              onChange={(e) => setNewMemberCustomRole(e.target.value)}
                              placeholder="Specify custom role..."
                              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase">
                            Specific Task
                          </label>
                          <div className="flex gap-0.5 bg-muted rounded border border-border p-0.5 w-fit">
                            <button
                              type="button"
                              onClick={() => setNewMemberDescType("description")}
                              className={`text-[9px] px-2 py-0.5 rounded font-bold transition-all ${
                                newMemberDescType === "description" ? "bg-card text-foreground shadow-sm" : "text-slate-400"
                              }`}
                            >
                              Text
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewMemberDescType("checklist")}
                              className={`text-[9px] px-2 py-0.5 rounded font-bold transition-all ${
                                newMemberDescType === "checklist" ? "bg-card text-foreground shadow-sm" : "text-slate-400"
                              }`}
                            >
                              Checklist
                            </button>
                          </div>
                        </div>

                        {newMemberDescType === "checklist" ? (
                          <div className="bg-card rounded-lg border border-border p-1.5 flex-1 min-h-[96px]">
                            <ChecklistTaskInput
                              value={newMemberDesc}
                              onChange={(e) => setNewMemberDesc(e.target.value)}
                            />
                          </div>
                        ) : (
                          <textarea
                            value={newMemberDesc}
                            onChange={(e) => setNewMemberDesc(e.target.value)}
                            placeholder="What exactly are they responsible for?"
                            className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-primary/50 transition-colors h-24 resize-none flex-1"
                          />
                        )}
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button
                          type="button"
                          disabled={!newMemberId || !newMemberDesc.trim() || isAddingMember}
                          onClick={async () => {
                            if (!newMemberId || !newMemberDesc.trim()) return;
                            await onAddMember({
                              employeeId: newMemberId,
                              taskDescription: newMemberDesc,
                              role: newMemberRole,
                              customRole: newMemberCustomRole,
                            });
                            setShowAddMember(false);
                            setNewMemberId(null);
                            setNewMemberDesc("");
                            setNewMemberRole("");
                            setNewMemberCustomRole("");
                          }}
                          className="h-9 px-6 rounded-xl text-xs"
                        >
                          {isAddingMember ? "Adding..." : "Add Member"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* HR Remarks */}
          {task.hr_remarks && (
            <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl mt-6 shadow-sm animate-content-in stagger-3">
              <h4 className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <FileText size={12} /> HR Remarks
              </h4>
              <p className="text-sm text-red-900 dark:text-red-200/90 leading-relaxed font-medium">
                {task.hr_remarks}
              </p>
            </div>
          )}
            </>
          ) : (
            <div className="animate-in fade-in space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {isLoadingLogs ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="animate-spin text-primary" size={24} />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-slate-500 text-sm font-medium">No history available for this task.</p>
                </div>
              ) : (
                logs.map((log) => {
                  let Icon = Edit3;
                  let colorClass = "bg-blue-100 text-blue-600 border-blue-200";

                  if (log.action === "CREATED" || log.action === "MEMBER_ADDED") {
                    Icon = log.action === "CREATED" ? PlusCircle : Plus;
                    colorClass = "bg-green-100 text-green-600 border-green-200";
                  } else if (log.action === "MEMBER_DONE" || log.action === "COMPLETED" || log.action === "HR_VERIFIED") {
                    Icon = CheckCircle2;
                    colorClass = "bg-indigo-100 text-indigo-600 border-indigo-200";
                  } else if (log.action === "MEMBER_PENDING") {
                    Icon = Clock;
                    colorClass = "bg-amber-100 text-amber-600 border-amber-200";
                  } else if (log.action === "HR_REJECTED") {
                    Icon = X;
                    colorClass = "bg-red-100 text-red-600 border-red-200";
                  }

                  return (
                    <div
                      key={log.id}
                      className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                    >
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${colorClass} bg-card z-10`}
                      >
                        <Icon size={14} />
                      </div>

                      <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-4 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                              log.action === "CREATED" || log.action === "MEMBER_ADDED"
                                ? "bg-green-50 text-green-600"
                                : log.action === "MEMBER_DONE" || log.action === "COMPLETED" || log.action === "HR_VERIFIED"
                                  ? "bg-indigo-50 text-indigo-600"
                                  : log.action === "MEMBER_PENDING"
                                    ? "bg-amber-50 text-amber-600"
                                    : log.action === "HR_REJECTED"
                                      ? "bg-red-50 text-red-600"
                                      : "bg-blue-50 text-blue-600"
                            }`}
                          >
                            {log.action.replace("_", " ")}
                          </span>
                          <time className="text-xs text-slate-400 font-semibold">
                            {new Date(log.created_at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </time>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-slate-500 overflow-hidden shrink-0">
                            {log.actor?.avatar_path ? (
                              <img
                                src={log.actor.avatar_path}
                                alt="avatar"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User size={12} />
                            )}
                          </div>
                          <span className="text-xs font-semibold text-foreground">
                            {log.actor?.name || "System"}
                          </span>
                        </div>

                        {log.details && Object.keys(log.details).length > 0 && (
                          <div className="text-xs text-slate-600 dark:text-slate-300 mt-2 bg-muted/30 p-3 rounded-lg border border-border/50 flex flex-col gap-1.5">
                            {log.details.title && <div><strong className="text-foreground">Title:</strong> {log.details.title}</div>}
                            {log.details.remarks && <div><strong className="text-foreground">Remarks:</strong> {log.details.remarks}</div>}
                            {log.details.role && <div><strong className="text-foreground">Role:</strong> {log.details.role}</div>}
                            
                            {(() => {
                              const empId = log.details.employeeId || log.details.addedEmployeeId;
                              if (empId) {
                                const empName = resolveEmployeeName(empId);
                                if (empName !== (log.actor?.name || "System")) {
                                  return (
                                    <div>
                                      <strong className="text-foreground">Employee:</strong> {empName}
                                    </div>
                                  );
                                }
                              }
                              return null;
                            })()}

                            {(() => {
                              if (log.details.memberId && !log.details.employeeId) {
                                const member = task.members?.find(m => m.id === log.details.memberId);
                                const empName = resolveEmployeeName(member?.employee_id);
                                if (empName && empName !== (log.actor?.name || "System")) {
                                  return (
                                    <div>
                                      <strong className="text-foreground">Member:</strong> {empName}
                                    </div>
                                  );
                                }
                              }
                              return null;
                            })()}

                            {log.details.taskDescription && (
                              <div className="mt-1 bg-card rounded-lg border border-border overflow-hidden">
                                <div className="px-3 py-1.5 bg-muted/50 border-b border-border/50 flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Task Snapshot</span>
                                </div>
                                <div className="p-3 text-xs max-h-32 overflow-y-auto custom-scrollbar">
                                  {(() => {
                                    try {
                                      const parsed = JSON.parse(log.details.taskDescription);
                                      const items = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.items) ? parsed.items : null);
                                      if (items) {
                                        return (
                                          <ul className="space-y-1.5">
                                            {items.map((item, i) => (
                                              <li key={i} className="flex items-start gap-2">
                                                <div className="mt-0.5 shrink-0">
                                                  {item.checked ? (
                                                    <CheckCircle2 size={14} className="text-green-500" />
                                                  ) : (
                                                    <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                                                  )}
                                                </div>
                                                <span className={`leading-snug ${item.checked ? "text-slate-400 line-through" : "text-foreground"}`}>
                                                  {item.text}
                                                </span>
                                              </li>
                                            ))}
                                          </ul>
                                        );
                                      }
                                    } catch (e) {}
                                    return <div className="whitespace-pre-wrap text-foreground">{log.details.taskDescription}</div>;
                                  })()}
                                </div>
                              </div>
                            )}

                            {log.details.ratings && Array.isArray(log.details.ratings) && (
                               <div className="mt-1">
                                 <strong className="text-foreground block mb-1.5">Evaluations:</strong>
                                 <div className="flex flex-col gap-1.5 pl-3 border-l-2 border-primary/20">
                                   {log.details.ratings.map((r, idx) => {
                                     const member = task.members?.find(m => m.id === r.memberId);
                                     const empName = resolveEmployeeName(member?.employee_id);
                                     return (
                                       <div key={idx} className="flex items-center justify-between gap-3 bg-card px-2.5 py-1.5 rounded-md border border-border/50">
                                         <span className="truncate text-slate-700 dark:text-slate-300 font-medium" title={empName}>
                                           {empName}
                                         </span>
                                         <span className="font-bold text-primary shrink-0 bg-primary/10 px-2 py-0.5 rounded text-xs">
                                           {r.grade} <span className="text-[10px] text-primary/70">/ 5</span>
                                         </span>
                                       </div>
                                     );
                                   })}
                                 </div>
                               </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between shrink-0">
          <div className="hidden sm:flex items-center gap-3 text-[10px] text-slate-400 font-medium">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted/80 border border-border rounded text-muted-foreground font-sans text-[9px]">
                Esc
              </kbd>
              <span>to close</span>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {/* Delete Task Button */}
            {(isCreator || isSuperAdmin) && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-[13px] font-bold text-red-500/80 hover:text-red-600 hover:bg-red-50 h-9 rounded-xl px-4 mr-2"
              >
                {isDeleting ? (
                  "Deleting..."
                ) : (
                  <Trash2 size={14} className="mr-1.5" />
                )}
                {!isDeleting && "Delete Task"}
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-[13px] font-bold text-muted-foreground/80 hover:text-foreground h-9 rounded-xl px-4"
            >
              Close
            </Button>

            {/* Rate Button for Heads/Admins */}
            {(isCreator || isSuperAdmin) &&
              (task.status === "ACTIVE" || task.status === "COMPLETED") && (
                <Button
                  onClick={onOpenRateModal}
                  className="h-9 px-6 rounded-xl shadow-lg shadow-indigo-200 bg-primary hover:bg-primary/90 text-white flex items-center gap-2"
                >
                  <Star size={16} fill="currentColor" />
                  <span className="font-bold">Rate & Complete</span>
                </Button>
              )}

            {/* HR Verification Actions */}
            {isHr && isHrPending && (
              <>
                {showRejectForm ? (
                  <div className="flex items-center gap-2 animate-in fade-in">
                    <input
                      type="text"
                      value={rejectRemarks}
                      onChange={(e) => setRejectRemarks(e.target.value)}
                      placeholder="Reason for rejection..."
                      className="h-9 px-3 bg-card border border-border rounded-xl text-xs text-foreground outline-none focus:border-red-400 transition-colors w-[220px]"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => { setShowRejectForm(false); setRejectRemarks(""); }}
                      className="h-9 px-3 rounded-xl text-xs text-muted-foreground"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      disabled={!rejectRemarks.trim() || isRejecting}
                      onClick={() => { onReject(rejectRemarks); setShowRejectForm(false); setRejectRemarks(""); }}
                      className="h-9 px-5 rounded-xl text-xs bg-red-500 hover:bg-red-600 text-white font-bold"
                    >
                      {isRejecting ? "Rejecting..." : "Confirm Reject"}
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      type="button"
                      onClick={() => setShowRejectForm(true)}
                      className="h-9 px-5 rounded-xl text-xs bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20 font-bold flex items-center gap-1.5"
                      variant="ghost"
                    >
                      <XCircle size={14} /> Reject
                    </Button>
                    <Button
                      type="button"
                      disabled={isVerifying}
                      onClick={() => onVerify()}
                      className="h-9 px-6 rounded-xl shadow-lg shadow-green-200 bg-green-500 hover:bg-green-600 text-white flex items-center gap-2 font-bold text-xs"
                    >
                      <ShieldCheck size={16} />
                      {isVerifying ? "Verifying..." : "Verify & Approve"}
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
