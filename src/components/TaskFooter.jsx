import { Edit3 } from "lucide-react";
import { RotateCcw } from "lucide-react";
import { Trash2 } from "lucide-react";
import { ShieldCheck } from "lucide-react";
import { CheckCircle } from "lucide-react";
import { Loader2 } from "lucide-react";

const TaskFooter = ({ actions, permissions, state }) => {
  const {
    onCancel,
    onClose,
    onSave,
    onToggleEdit,
    onMarkComplete,
    onHrVerify,
    onDelete,
    onUndoVerify,
  } = actions;
  const { canEdit, isStrictlyHead, isHr, isManagement } = permissions;
  const { isEditing, isSubmitting, task, formIsValid } = state;

  return (
    <div className="p-5 border-t border-gray-4 bg-gray-1 flex justify-between items-center shrink-0">
      {/* LEFT SIDE: Close/Cancel & Delete */}
      <div className="flex items-center gap-2">
        <button
          onClick={isEditing ? onCancel : onClose}
          className="text-sm font-bold text-gray-10 hover:text-gray-12 px-4 py-2 rounded-lg hover:bg-gray-3 transition-colors"
        >
          {isEditing ? "Cancel" : "Close"}
        </button>

        {/* 🔥 Delete Button (Only for Management when not editing) */}
        {!isEditing && isManagement && (
          <button
            onClick={onDelete}
            disabled={isSubmitting}
            className="text-sm font-bold text-red-9 hover:text-red-11 hover:bg-red-a3 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Trash2 size={16} /> Delete
          </button>
        )}
      </div>

      {/* RIGHT SIDE: Primary Actions */}
      <div className="flex gap-3">
        {isEditing ? (
          <button
            onClick={onSave}
            disabled={!formIsValid || isSubmitting}
            className="bg-primary hover:bg-primary-hover text-white text-sm font-bold px-6 py-2.5 rounded-lg transition-colors shadow-lg shadow-red-a3 active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle size={16} />
            )}
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        ) : (
          <>
            {canEdit && (
              <button
                onClick={onToggleEdit}
                className="bg-gray-3 hover:bg-gray-4 border border-gray-4 text-gray-12 text-sm font-bold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 active:scale-95"
              >
                <Edit3 size={16} /> Edit
              </button>
            )}

            {isStrictlyHead && task.status !== "COMPLETE" && (
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
                className="bg-green-600 hover:bg-green-500 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors shadow-lg shadow-green-900/20 active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                {isSubmitting ? "Approving..." : "Approve Task"}
              </button>
            )}

            {isHr && task.status === "COMPLETE" && !task.hrVerified && (
              <button
                onClick={onHrVerify}
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary-hover text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors shadow-lg shadow-red-a3 active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ShieldCheck size={16} />
                )}
                {isSubmitting ? "Verifying..." : "Verify (HR)"}
              </button>
            )}

            {/* 🔥 Undo Verification Button (Only shows if HR verified it) */}
            {isHr && task.hrVerified && (
              <button
                onClick={onUndoVerify}
                disabled={isSubmitting}
                className="bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors shadow-lg shadow-orange-900/20 active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RotateCcw size={16} />
                )}
                {isSubmitting ? "Undoing..." : "Undo Verification"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TaskFooter;
