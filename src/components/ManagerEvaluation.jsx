import React from "react";
import { FieldBox } from "./FieldBox";
import GradeSelector from "./GradeSelector.jsx";
import { TASK_STATUS } from "../constants/status";

export default function ManagerEvaluation({
  isEditing,
  canEvaluate,
  task,
  approvalGrade,
  setApprovalGrade,
  approvalRemarks,
  setApprovalRemarks,
}) {
  if (isEditing) return null;

  const isComplete = task.status === TASK_STATUS.COMPLETE;
  const isNotApproved = task.status === TASK_STATUS.NOT_APPROVED;

  // 🔥 THE FIX: Both statuses mean the manager is done evaluating
  const isFinalized = isComplete || isNotApproved;

  const containerClass = `grid grid-cols-2 gap-4 p-4 rounded-xl border ${
    isComplete
      ? "bg-mauve-3/50 border-mauve-4"
      : isNotApproved
        ? "bg-red-a2 border-red-a5"
        : "border-mauve-6"
  }`;

  return (
    <div className={containerClass}>
      <div className="col-span-2 grid gap-1">
        <div className={` text-xs font-bold uppercase tracking-wider`}>
          {isFinalized
            ? "Manager Evaluation"
            : canEvaluate
              ? "Manager Evaluation (Required for Approval)"
              : "Evaluation Status (Not Yet Evaluated)"}
        </div>

        {isFinalized && task.evaluatedByName && (
          <div className="col-span-2 text-[11px] text-mauve-8 flex items-center justify-between">
            <div className="flex items-center gap-1">
              Evaluated by:{" "}
              <span className="font-bold text-mauve-11">
                {task.evaluatedByName}
              </span>
            </div>
            {task.evaluatedBy === task.loggedById && (
              <span className="px-2 py-0.5 rounded-full bg-purple-900/20 text-plum-9 text-[10px] font-black uppercase tracking-widest border border-purple-500/30">
                Self-Verified
              </span>
            )}
          </div>
        )}
      </div>

      {isFinalized ? (
        /* ========================================= */
        /* FINALIZED VIEW (Complete OR Not Approved)     */
        /* ========================================= */
        <>
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
              Final Grade
            </label>
            <div className="mt-1">
              <GradeSelector grade={task.grade} finalized={true} />
            </div>
          </div>

          {task.hrRemarks && (
            <div className="col-span-2 flex flex-col gap-1.5 pt-2 border-t border-mauve-4 mt-2">
              <label className="text-[10px] font-bold text-red-9 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                HR Audit Notes / Rejection Reason
              </label>
              <div className=" p-4 rounded-xl border border-mauve-a5 text-sm text-mauve-11 whitespace-pre-wrap min-h-[44px] flex items-center shadow-inner font-semibold">
                {task.hrRemarks}
              </div>
            </div>
          )}
        </>
      ) : (
        /* ========================================= */
        /* PENDING VIEW (Incomplete)                 */
        /* ========================================= */
        <div className="col-span-2 space-y-4 pt-2">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1 mb-2 block">
              Performance Grade (1-5)
            </label>
            <div className="mt-1">
              <GradeSelector
                grade={approvalGrade}
                onSelect={setApprovalGrade}
                canEvaluate={canEvaluate}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
              Manager Remarks
            </label>
            <textarea
              value={canEvaluate ? approvalRemarks : task.remarks || ""}
              onChange={(e) => setApprovalRemarks(e.target.value)}
              disabled={!canEvaluate}
              placeholder={
                canEvaluate
                  ? "Add feedback before approving..."
                  : "Waiting for manager review..."
              }
              className="w-full bg-mauve-1 border border-mauve-4 text-foreground rounded-lg p-3 outline-none focus:border-red-9 transition-colors h-20 resize-none text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      )}
    </div>
  );
}
