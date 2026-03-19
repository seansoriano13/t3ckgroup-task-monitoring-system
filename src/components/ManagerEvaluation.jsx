import React from "react";
import { FieldBox } from "./FieldBox";

export default function ManagerEvaluation({
  isEditing,
  isStrictlyHead,
  task,
  approvalGrade,
  setApprovalGrade,
  approvalRemarks,
  setApprovalRemarks,
}) {
  // Grading happens in View Mode
  if (isEditing) return null;

  const isComplete = task.status === "COMPLETE";
  const isRejected = task.status === "REJECTED";

  // Use the exact same container style as ManagementSection
  const containerClass = `grid grid-cols-2 gap-4 p-4 rounded-xl border ${
    isComplete
      ? "bg-gray-3/50 border-gray-4 border-dashed"
      : isRejected
        ? "bg-red-a2 border-red-a5"
        : "bg-primary/5 border-primary/20"
  }`;

  return (
    <div className={containerClass}>
      {/* Header - Matching ManagementSection exactly */}
      <div
        className={`col-span-2 text-xs font-bold uppercase tracking-wider mb-[-8px] ${isRejected ? "text-red-9" : "text-primary"}`}
      >
        {isComplete
          ? "Manager Evaluation"
          : isStrictlyHead
            ? "Manager Evaluation (Required for Approval)"
            : "Evaluation Status (Not Yet Evaluated)"}
      </div>

      {isComplete ? (
        /* ========================================= */
        /* COMPLETED VIEW (The Clean "Data" Layout)  */
        /* ========================================= */
        <>
          <FieldBox label="Final Grade" isEditing={false}>
            <p className="px-3 text-sm font-bold text-gray-12">
              {task.grade || "N/A"} / 5
            </p>
          </FieldBox>
          <div /> {/* Layout Spacer */}
          <div className="col-span-2 flex flex-col gap-1.5 pt-1">
            <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider pl-1">
              Remarks
            </label>
            <div
              className={`bg-gray-1 p-4 rounded-xl border border-transparent text-sm ${task.remarks ? "text-gray-12" : "text-gray-5"} whitespace-pre-wrap min-h-[44px] flex items-center shadow-inner`}
            >
              {task.remarks || "No Remarks provided."}
            </div>
          </div>
        </>
      ) : (
        /* ========================================= */
        /* PENDING VIEW (Buttons & Active Input)     */
        /* ========================================= */
        <div className="col-span-2 space-y-4 pt-2">
          <div>
            <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider pl-1 mb-2 block">
              Performance Grade (1-5)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((num) => {
                const isActive = approvalGrade === num;
                return (
                  <button
                    key={num}
                    disabled={!isStrictlyHead}
                    onClick={() => setApprovalGrade(num)}
                    className={`flex-1 py-2.5 rounded-lg font-bold transition-all border ${
                      isActive
                        ? "bg-primary text-gray-12 border-primary shadow-lg shadow-red-a3 scale-[1.02]"
                        : "bg-gray-2 text-gray-10 border-gray-4"
                    } ${
                      isStrictlyHead
                        ? "hover:border-gray-6 hover:bg-gray-3"
                        : "opacity-50 cursor-not-allowed"
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
              value={isStrictlyHead ? approvalRemarks : task.remarks || ""}
              onChange={(e) => setApprovalRemarks(e.target.value)}
              disabled={!isStrictlyHead}
              placeholder={
                isStrictlyHead
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
