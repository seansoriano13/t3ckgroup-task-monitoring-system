import { CheckCircle2, Clock, CheckSquare, XSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ApprovalHeader({
  isHr,
  isSuperAdmin,
  appSettings,
  pendingTasksCount,
  delayedTasksCount,
  selectedCount,
  onSelectAllDelayed,
  onDeselectAll,
  handleBulkApprove,
}) {
  const title = isSuperAdmin ? "Task Verification Queue" : isHr ? "HR Verification Queue" : "Manager Task Queue";
  
  // Split title for gradient emphasis
  const titleWords = title.split(" ");
  const firstPart = titleWords.slice(0, 2).join(" ");
  const secondPart = titleWords.slice(2).join(" ");

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-border pb-6 gap-4">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight">
          <span className="text-foreground">{firstPart}</span>{" "}
          {secondPart && (
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary pr-1">
              {secondPart}
            </span>
          )}
        </h1>
        <p className="text-muted-foreground mt-2 font-medium">
          {isSuperAdmin ? "Review and verify all tasks system-wide." : isHr
            ? "Audit and verify graded tasks for payroll accuracy."
            : "Review and grade pending tasks from your team."}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {isSuperAdmin && appSettings?.enable_bulk_approval && (
          <>
            {selectedCount > 0 ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onDeselectAll}
                  className="font-semibold shadow-sm"
                >
                  <XSquare className="mr-2 h-4 w-4" /> Deselect All
                </Button>
                <Button
                  onClick={handleBulkApprove}
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-sm"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Approve {selectedCount} Selected
                </Button>
              </>
            ) : delayedTasksCount > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onSelectAllDelayed}
                className="font-semibold shadow-sm"
              >
                <CheckSquare className="mr-2 h-4 w-4" /> Select All Delayed
              </Button>
            ) : null}
          </>
        )}
        <div className="bg-card border border-border px-4 py-2.5 rounded-lg flex items-center gap-2.5 shadow-[0_4px_20px_-2px_rgba(79,70,229,0.1)]">
          <Clock size={16} className="text-primary" />
          <span className="text-foreground font-bold text-sm tracking-tight">
            {pendingTasksCount} Pending
          </span>
        </div>
      </div>
    </div>
  );
}
