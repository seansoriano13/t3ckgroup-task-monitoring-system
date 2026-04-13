import React from "react";
import { FieldBox } from "./FieldBox";
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
      ? "bg-gray-3/50 border-gray-4"
      : isNotApproved
        ? "bg-red-a2 border-red-a5"
        : "border-gray-6"
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
          <div className="col-span-2 text-[11px] text-gray-8 flex items-center gap-1">
            Evaluated by:{" "}
            <span className="font-bold text-gray-11">
              {task.evaluatedByName}
            </span>
          </div>
        )}
      </div>

      {isFinalized ? (
        /* ========================================= */
        /* FINALIZED VIEW (Complete OR Not Approved)     */
        /* ========================================= */
        <>
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider pl-1">
              Final Grade
            </label>
            <div className="flex gap-2 pointer-events-none select-none">
              {[1, 2, 3, 4, 5].map((num) => {
                const activeColorMap = {
                  1: "bg-red-500 text-gray-1 border-red-500 shadow-red-500/40",
                  2: "bg-orange-500 text-gray-1 border-orange-500 shadow-orange-500/40",
                  3: "bg-yellow-500 text-gray-1 border-yellow-500 shadow-yellow-500/40",
                  4: "bg-lime-500 text-gray-1 border-lime-500 shadow-lime-500/40",
                  5: "bg-green-500 text-gray-1 border-green-500 shadow-green-500/40",
                };
                const isSelected = task.grade === num;
                return (
                  <div
                    key={num}
                    className={`flex-1 py-2.5 rounded-lg font-black border text-sm text-center transition-all ${
                      isSelected
                        ? `${activeColorMap[num]} shadow-md scale-[1.05]`
                        : "bg-gray-2 text-gray-10 border-gray-4 opacity-40"
                    }`}
                  >
                    {num}
                  </div>
                );
              })}
            </div>
          </div>

          {task.hrRemarks && (
            <div className="col-span-2 flex flex-col gap-1.5 pt-2 border-t border-gray-4 mt-2">
              <label className="text-[10px] font-bold text-red-9 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                HR Audit Notes / Rejection Reason
              </label>
              <div className=" p-4 rounded-xl border border-gray-a5 text-sm text-gray-11 whitespace-pre-wrap min-h-[44px] flex items-center shadow-inner font-semibold">
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
            <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider pl-1 mb-2 block">
              Performance Grade (1-5)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((num) => {
                const isActive = approvalGrade === num;

                // 1. Define the dynamic color scheme for each grade
                const activeColorMap = {
                  1: "bg-red-500 text-gray-1 hover:bg-red-600 border-red-500 shadow-red-500/40",
                  2: "bg-orange-500 text-gray-1 hover:bg-orange-600 border-orange-500 shadow-orange-500/40",
                  3: "bg-yellow-500 text-gray-1 hover:bg-yellow-600 border-yellow-500 shadow-yellow-500/40",
                  4: "bg-lime-500 text-gray-1 hover:bg-lime-600 border-lime-500 shadow-lime-500/40",
                  5: "bg-green-500 text-gray-1 hover:bg-green-600 border-green-500 shadow-green-500/40",
                };

                return (
                  <button
                    key={num}
                    disabled={!canEvaluate}
                    onClick={() => setApprovalGrade(num)}
                    className={`flex-1 py-2.5 rounded-lg font-bold transition-all border ${
                      !canEvaluate ? "opacity-50 cursor-not-allowed" : ""
                    } ${
                      isActive
                        ? // 2. Apply the specific color from the map if active
                          `${activeColorMap[num]} shadow-lg scale-[1.02]`
                        : // 3. Otherwise, apply default inactive styles
                          `bg-gray-2 text-gray-10 border-gray-4 ${
                            canEvaluate
                              ? "hover:border-gray-6 hover:bg-gray-3"
                              : ""
                          }`
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider pl-1">
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
              className="w-full bg-gray-1 border border-gray-4 text-gray-12 rounded-lg p-3 outline-none focus:border-red-9 transition-colors h-20 resize-none text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      )}
    </div>
  );
}
