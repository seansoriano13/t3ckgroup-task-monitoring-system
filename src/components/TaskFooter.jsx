import {
  Edit3,
  RotateCcw,
  Trash2,
  ShieldCheck,
  CheckCircle,
  Loader2,
  XCircle,
  Clock,
  Undo2,
} from "lucide-react";
import { TASK_STATUS } from "../constants/status.js";
import { Button } from "@/components/ui/button";

const TaskFooter = ({ actions, permissions, state }) => {
  const {
    onCancel,
    onClose,
    onSave,
    onToggleEdit,
    onMarkComplete,
    onHeadReject,
    onHrVerify,
    onDelete,
    onUndoVerify,
    onSubmitApproval,
    onSelfVerify,
    onRecallTask,
  } = actions;
  const { canEdit, canEvaluate, isHr, isManagement, isOwner } = permissions;
  const { isEditing, isSubmitting, task, formIsValid } = state;

  return (
    <div className="p-4 border-t border-border bg-card flex justify-between items-center shrink-0 rounded-b-xl">
      {/* ========================================= */}
      {/* LEFT: CANCEL / CLOSE & DELETE ZONE          */}
      {/* ========================================= */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={isEditing ? onCancel : onClose}
          className="text-sm font-bold text-slate-500 hover:text-foreground"
        >
          {isEditing ? "Cancel" : "Close"}
        </Button>

        {!isEditing &&
          (isManagement || (isOwner && task.status === TASK_STATUS.INCOMPLETE)) && (
            <Button
              variant="outline"
              onClick={onDelete}
              disabled={isSubmitting}
              className="text-sm font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-none shadow-none"
              title="Delete Task"
            >
              <Trash2 size={16} />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          )}
      </div>

      {/* ========================================= */}
      {/* RIGHT: PRIMARY ACTIONS ZONE                 */}
      {/* ========================================= */}
      <div className="flex items-center gap-2.5">
        {/* --- EDITING STATE --- */}
        {isEditing ? (
          <Button
            onClick={onSave}
            disabled={!formIsValid || isSubmitting}
            className="font-bold px-8"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle size={16} />
            )}
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        ) : (
          <>
            {/* --- AUTHOR ACTION --- */}
            {canEdit && (
              <Button
                variant="outline"
                onClick={onToggleEdit}
                className="font-bold flex items-center gap-2"
              >
                <Edit3 size={16} /> Edit
              </Button>
            )}

            {/* --- SUBMIT FOR REVIEW (Marketing always / All when setting enabled) --- */}
            {(state.isMarketing || state.universalTaskSubmission) &&
              isOwner &&
              (task.status === TASK_STATUS.INCOMPLETE ||
                task.status === TASK_STATUS.NOT_APPROVED) && (
                <Button
                  onClick={onSubmitApproval}
                  disabled={
                    isSubmitting ||
                    (state.isMarketing && !state.hasAttachments) ||
                    state.task.status === TASK_STATUS.AWAITING_APPROVAL
                  }
                  className="bg-blue-600 hover:bg-blue-700 font-bold px-6"
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                  {state.isMarketing ? "Mark as Done" : "Submit for Review"}
                </Button>
              )}

            {(state.isMarketing || state.universalTaskSubmission) &&
              isOwner &&
              task.status === TASK_STATUS.AWAITING_APPROVAL && (
                 <div className="flex items-center gap-3">
                  {state.isDelayed && state.enableSelfVerification && (
                    <Button
                      variant="secondary"
                      onClick={onSelfVerify}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-9 px-4"
                      title="Bypass unresponsive head approval"
                    >
                      <ShieldCheck size={14} /> Self-Verify
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={onRecallTask}
                    disabled={isSubmitting}
                    className="h-9 px-4 font-bold border-border hover:border-orange-500 hover:text-orange-600"
                    title="Recall this task to make edits"
                  >
                    <Undo2 size={14} /> Recall
                  </Button>

                  <div className="text-[10px] uppercase tracking-widest font-bold text-blue-600 flex items-center gap-1.5 px-2">
                    <Clock size={16} />
                    {state.isDelayed && state.enableVisualShaming ? (
                      <span className="text-destructive animate-pulse">DELAYED</span>
                    ) : (
                      "Pending Review"
                    )}
                  </div>
                </div>
              )}

            {/* --- HEAD ACTIONS (EVALUATION) --- */}
            {canEvaluate &&
              (task.status === TASK_STATUS.INCOMPLETE ||
                task.status === TASK_STATUS.AWAITING_APPROVAL) && (
                 <div className="flex items-center gap-3 pl-3 ml-1 border-l border-border">
                  <Button
                    variant="outline"
                    onClick={onHeadReject}
                    disabled={isSubmitting}
                    className="text-sm font-bold text-muted-foreground hover:text-destructive hover:border-destructive/30"
                  >
                    <XCircle size={16} /> Not Approve
                  </Button>

                  <Button
                    onClick={onMarkComplete}
                    disabled={isSubmitting || !state.canApprove}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 shadow-green-900/10"
                  >
                    {isSubmitting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    Approve
                  </Button>
                </div>
              )}

            {/* --- HR ACTIONS (VERIFICATION) --- */}
            {isHr && task.status === TASK_STATUS.COMPLETE && !task.hrVerified && (
              <Button
                onClick={onHrVerify}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 font-bold px-6"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ShieldCheck size={16} />
                )}
                Verify & Sign
              </Button>
            )}

            {isHr && task.hrVerified && (
              <Button
                variant="outline"
                onClick={onUndoVerify}
                disabled={isSubmitting}
                className="font-bold px-4"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RotateCcw size={16} />
                )}
                Undo
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TaskFooter;
