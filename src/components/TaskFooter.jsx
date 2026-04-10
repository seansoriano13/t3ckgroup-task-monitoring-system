import {
  Edit3,
  RotateCcw,
  Trash2,
  ShieldCheck,
  CheckCircle,
  Loader2,
  XCircle,
  Clock,
  Clock,
} from "lucide-react";
import { TASK_STATUS } from "../constants/status.js";

const TaskFooter = ({ actions, permissions, state }) => {
  const {
    onCancel,
    onClose,
    onSave,
    onToggleEdit,
    onMarkComplete,
    onHeadReject, // 🔥 New action added here
    onHrVerify,
    onDelete,
    onUndoVerify,
    onSubmitApproval,
  } = actions;
  const { canEdit, canEvaluate, isHr, isManagement, isOwner } = permissions;
  const { isEditing, isSubmitting, task, formIsValid } = state;

  return (
    <div className="p-4 border-t border-gray-4 bg-gray-1 flex justify-between items-center shrink-0 rounded-b-xl">
      {/* ========================================= */}
      {/* LEFT: CANCEL / CLOSE & DELETE ZONE          */}
      {/* ========================================= */}
      <div className="flex items-center gap-2">
        <button
          onClick={isEditing ? onCancel : onClose}
          className="text-sm font-bold text-gray-10 hover:text-gray-12 px-4 py-2 rounded-lg hover:bg-gray-3 transition-colors"
        >
          {isEditing ? "Cancel" : "Close"}
        </button>

        {!isEditing && (isManagement || (isOwner && task.status === "INCOMPLETE")) && (
          <button
            onClick={onDelete}
            disabled={isSubmitting}
            className="text-sm font-bold text-gray-9 hover:text-red-11 hover:bg-red-a3 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="Delete Task"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">Delete</span>{" "}
            {/* Hides text on tiny screens */}
          </button>
        )}
      </div>

      {/* ========================================= */}
      {/* RIGHT: PRIMARY ACTIONS ZONE                 */}
      {/* ========================================= */}
      <div className="flex items-center gap-2.5">
        {/* --- EDITING STATE --- */}
        {isEditing ? (
          <button
            onClick={onSave}
            disabled={!formIsValid || isSubmitting}
            className="bg-primary hover:bg-primary-hover text-white text-sm font-bold px-6 py-2.5 rounded-lg transition-all shadow-md shadow-red-a3 active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle size={16} />
            )}
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        ) : (
          <>
            {/* --- AUTHOR ACTION --- */}
            {canEdit && (
              <button
                onClick={onToggleEdit}
                className="bg-gray-3 hover:bg-gray-4 border border-gray-4 text-gray-12 text-sm font-bold px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2 active:scale-95"
              >
                <Edit3 size={16} /> Edit
              </button>
            )}

            {/* --- MARKETING SELF-COMPLETE --- */}
            {/* --- SUBMIT FOR REVIEW (Marketing always / All when setting enabled) --- */}
            {(state.isMarketing || state.universalTaskSubmission) && isOwner && (task.status === "INCOMPLETE" || task.status === "NOT APPROVED") && (
              <button
                onClick={onSubmitApproval}
                disabled={
                  isSubmitting ||
                  (state.isMarketing && !state.hasAttachments) || // Only enforce attachment check for Marketing
                  state.task.status === TASK_STATUS.AWAITING_APPROVAL
                }
                className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors shadow-md shadow-blue-900/20 active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                {state.isMarketing ? "Mark as Done" : "Submit for Review"}
              </button>
            )}

            {(state.isMarketing || state.universalTaskSubmission) && isOwner && task.status === TASK_STATUS.AWAITING_APPROVAL && (
                <div className="text-xs font-bold text-blue-500 flex items-center gap-1.5 px-3">
                   <Clock size={16} /> Waiting for Review
                </div>
            )}

            {/* --- HEAD ACTIONS (EVALUATION) --- */}
            {canEvaluate && (task.status === TASK_STATUS.INCOMPLETE || task.status === TASK_STATUS.AWAITING_APPROVAL) && (
              <div className="flex items-center gap-2 pl-2 sm:pl-3 sm:ml-1 sm:border-l border-gray-4">
                <button
                  onClick={onHeadReject}
                  // 🔥 Disables if submitting OR if remarks are empty/whitespace
                  disabled={
                    isSubmitting ||
                    !state.approvalRemarks ||
                    state.approvalRemarks.trim() === ""
                  }
                  className="bg-gray-2 border border-gray-4 text-gray-11 hover:text-red-11 hover:border-red-a5 text-sm font-bold px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle size={16} /> Not Approve
                </button>

                <button
                  onClick={onMarkComplete}
                  disabled={isSubmitting || !state.canApprove}
                  className="bg-green-600 hover:bg-green-500 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors shadow-md shadow-green-900/20 active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                  Approve
                </button>
              </div>
            )}

            {/* --- HR ACTIONS (VERIFICATION) --- */}
            {isHr && task.status === "COMPLETE" && !task.hrVerified && (
              <button
                onClick={onHrVerify}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors shadow-md shadow-blue-900/20 active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ShieldCheck size={16} />
                )}
                Verify & Sign
              </button>
            )}

            {isHr && task.hrVerified && (
              <button
                onClick={onUndoVerify}
                disabled={isSubmitting}
                className="bg-gray-3 border border-gray-4 hover:border-orange-500 hover:text-orange-500 text-gray-11 text-sm font-bold px-4 py-2.5 rounded-lg transition-colors active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RotateCcw size={16} />
                )}
                Undo
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TaskFooter;
