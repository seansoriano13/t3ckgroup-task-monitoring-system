import { CheckCircle2, Clock } from "lucide-react";

export function ApprovalHeader({
  isHr,
  isSuperAdmin,
  appSettings,
  filteredTasksCount,
  pendingTasksCount,
  handleBulkApprove,
}) {
  return (
    <div className="flex justify-between items-end border-b border-gray-4 pb-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-12">
          {isHr ? "HR Verification Queue" : "Manager Action Queue"}
        </h1>
        <p className="text-gray-9 mt-1">
          {isHr
            ? "Audit and verify graded tasks."
            : "Review and grade pending tasks from your team."}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {isSuperAdmin &&
          appSettings?.enable_bulk_approval &&
          filteredTasksCount > 0 && (
            <button
              onClick={handleBulkApprove}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-2"
            >
              <CheckCircle2 size={16} /> Bulk Approve All
            </button>
          )}
        <div className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-lg flex items-center gap-2">
          <Clock size={16} className="text-primary" />
          <span className="text-primary font-bold">
            {pendingTasksCount} Pending
          </span>
        </div>
      </div>
    </div>
  );
}
