import {
  Edit3,
  RotateCcw,
  Trash2,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  Undo2,
  RefreshCw,
} from "lucide-react";
import { TASK_STATUS } from "../constants/status.js";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/Spinner";

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
    onResubmit,
  } = actions;
  const { canEdit, canEvaluate, isHr, isManagement, isOwner } = permissions;
  const { isEditing, isSubmitting, task, formIsValid, isHrRejected } = state;

  return (
    <div className="px-5 py-3 border-t border-border bg-card flex justify-between items-center shrink-0 rounded-b-xl">
      {/* ========================================= */}
      {/* LEFT: CANCEL / CLOSE & DELETE ZONE          */}
      {/* ========================================= */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={isEditing ? onCancel : onClose}
          className="text-sm font-bold text-muted-foreground hover:text-foreground"
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
            className="font-bold px-6 h-9 text-sm"
          >
            {isSubmitting ? (
              <Spinner size="sm" />
            ) : (
              <CheckCircle size={16} />
            )}
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        ) : (
          <>
            {/* --- RESUBMIT (HR-rejected tasks — owner only) --- */}
            {!isEditing && isOwner && isHrRejected && (
              <Button
                onClick={onResubmit}
                disabled={isSubmitting || state.hasUncheckedItems}
                className="bg-violet-9 hover:bg-violet-10 text-white font-bold px-5 h-9 text-sm"
                title={state.hasUncheckedItems ? "Check all items first" : "Reset this task back to the head review queue"}
              >
                {isSubmitting ? (
                  <Spinner size="sm" />
                ) : (
                  <RefreshCw size={16} />
                )}
                Resubmit for Review
              </Button>
            )}

            {/* --- AUTHOR ACTION --- */}
            {canEdit && (
              <Button
                variant="outline"
                onClick={onToggleEdit}
                className="font-bold flex items-center gap-2 h-9 text-sm"
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
                  disabled={isSubmitting || state.task.status === TASK_STATUS.AWAITING_APPROVAL || state.hasUncheckedItems}
                  title={state.hasUncheckedItems ? "Check all items first" : ""}
                  className="bg-blue-600 hover:bg-blue-700 font-bold px-5 h-9 text-sm"
                >
                  {isSubmitting ? (
                    <Spinner size="sm" />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                  Submit for Review
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
                      className="bg-purple-600 hover:bg-purple-700 text-primary-foreground font-bold h-9 px-4"
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

                  <div className="text-[10px] uppercase tracking-widest font-bold text-blue-10 flex items-center gap-1.5 px-2">
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
                    className="text-sm font-bold text-muted-foreground hover:text-destructive hover:border-destructive/30 h-9"
                  >
                    <XCircle size={16} /> Not Approve
                  </Button>

                  <Button
                    onClick={onMarkComplete}
                    disabled={isSubmitting || !state.canApprove}
                    className="bg-green-9 hover:bg-green-9 text-primary-foreground font-bold px-5 h-9 text-sm shadow-green-900/10"
                  >
                    {isSubmitting ? (
                      <Spinner size="sm" />
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
                className="bg-blue-600 hover:bg-blue-700 font-bold px-5 h-9 text-sm"
              >
                {isSubmitting ? (
                  <Spinner size="sm" />
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
                className="font-bold px-4 h-9 text-sm"
              >
                {isSubmitting ? (
                  <Spinner size="sm" />
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
