import { Edit3 } from "lucide-react";
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
  } = actions;
  const { canEdit, isStrictlyHead, isHr } = permissions;
  const { isEditing, isSubmitting, task, formIsValid } = state;

  return (
    <div className="p-5 border-t border-gray-4 bg-gray-1 flex justify-between items-center shrink-0">
      <button
        onClick={isEditing ? onCancel : onClose}
        className="text-sm font-bold text-gray-10 hover:text-gray-12 px-4 py-2 rounded-lg hover:bg-gray-3 transition-colors"
      >
        {isEditing ? "Cancel" : "Close"}
      </button>

      <div className="flex gap-3">
        {isEditing ? (
          <button
            onClick={onSave}
            disabled={!formIsValid}
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
              <button
                onClick={onMarkComplete}
                disabled={state.isSubmitting || !state.canApprove}
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
          </>
        )}
      </div>
    </div>
  );
};

export default TaskFooter;
