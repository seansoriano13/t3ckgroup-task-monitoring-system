import { TASK_STATUS, SALES_STATUS } from "../constants/status";

export default function StatusBadge({ status }) {
  const statusStyles = {
    [TASK_STATUS.COMPLETE]: "bg-card text-green-600 dark:text-green-400 border-green-400",
    [TASK_STATUS.INCOMPLETE]: "bg-card text-amber-600 dark:text-amber-400 border-amber-400",
    [TASK_STATUS.AWAITING_APPROVAL]: "bg-card text-blue-600 dark:text-blue-400 border-blue-400",
    [TASK_STATUS.NOT_APPROVED]: "bg-card text-red-600 dark:text-red-400 border-red-400",
    [SALES_STATUS.COMPLETED]: "bg-card text-green-600 dark:text-green-400 border-green-400",
    [SALES_STATUS.LOST]: "bg-card text-red-600 dark:text-red-400 border-red-400",
    
    // Legacy / Other support
    WON: "bg-card text-green-600 dark:text-green-400 border-green-400",
    LOST: "bg-card text-red-600 dark:text-red-400 border-red-400",
    DRAFT: "bg-card text-amber-600 dark:text-amber-400 border-amber-400",
    SUBMITTED: "bg-card text-blue-600 dark:text-blue-400 border-blue-400",
    APPROVED: "bg-card text-green-600 dark:text-green-400 border-green-400",
    DONE: "bg-card text-green-600 dark:text-green-400 border-green-400",
    ACTIVE: "bg-card text-blue-600 dark:text-blue-400 border-blue-400",
    CANCELLED: "bg-card text-red-600 dark:text-red-400 border-red-400",
    DEFAULT: "bg-card text-muted-foreground border-mauve-5",
  };

  const safeStatus = status?.toUpperCase() || "";
  const appliedStyle = statusStyles[safeStatus] || statusStyles.DEFAULT;

  return (
    <span
      className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded-full whitespace-nowrap ${appliedStyle}`}
    >
      {safeStatus || "UNKNOWN"}
    </span>
  );
}
