import { CheckCircle2, Clock, CheckSquare, XSquare, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "../../../components/ui/PageHeader";

export function ApprovalHeader({
  isHr,
  isSuperAdmin,
  appSettings,
  pendingTasksCount,
  filteredTasksCount,
  selectedCount,
  onSelectAllPending,
  onDeselectAll,
  handleBulkApprove,
  handleBulkDecline,
  handleUndoBulk,
  isVerifiedTab,
  pageTitle,
  pageDescription,
}) {
  const title = pageTitle ?? (isSuperAdmin
    ? "Verification Queue"
    : isHr
      ? "HR Queue"
      : "Manager Queue");
  const description = pageDescription ?? (isSuperAdmin
    ? "Review and verify all tasks system-wide."
    : isHr
      ? "Audit and verify graded tasks for payroll accuracy."
      : "Review and grade pending tasks from your team.");


  return (
    <PageHeader title={title} description={description}>
      {appSettings?.enable_bulk_approval && (
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
              {!isVerifiedTab && !isHr && (
                <Button
                  onClick={handleBulkDecline}
                  size="sm"
                  className="font-semibold shadow-sm text-primary-foreground bg-destructive hover:bg-red-9"
                >
                  <XSquare className="mr-2 h-4 w-4" /> Decline {selectedCount}{" "}
                  Selected
                </Button>
              )}
              <Button
                onClick={isVerifiedTab ? handleUndoBulk : handleBulkApprove}
                size="sm"
                className={`font-semibold shadow-sm text-primary-foreground ${
                  isVerifiedTab
                    ? "bg-destructive hover:bg-destructive"
                    : isHr
                      ? "bg-blue-10 hover:bg-blue-11"
                      : "bg-green-10 hover:bg-green-9"
                }`}
              >
                {isVerifiedTab ? (
                  <Undo2 className="mr-2 h-4 w-4" />
                ) : isHr ? (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                {isVerifiedTab
                  ? isHr
                    ? `Undo ${selectedCount} Verification${selectedCount > 1 ? "s" : ""}`
                    : `Undo ${selectedCount} Approval${selectedCount > 1 ? "s" : ""}`
                  : isHr
                    ? `Verify ${selectedCount} Selected`
                    : `Approve ${selectedCount} Selected`}
              </Button>
            </>
          ) : filteredTasksCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectAllPending}
              className="font-semibold shadow-sm"
            >
              <CheckSquare className="mr-2 h-4 w-4" /> Select All
            </Button>
          ) : null}
        </>
      )}
      <div className="bg-card border border-border px-4 py-2 rounded-xl flex items-center gap-2.5 shadow-sm">
        <Clock size={16} className="text-primary" />
        <span className="text-foreground font-black text-[11px] uppercase tracking-widest">
          {pendingTasksCount} {isVerifiedTab ? (isHr ? "Verified" : "Approved") : "Pending"}
        </span>
      </div>
    </PageHeader>
  );
}
