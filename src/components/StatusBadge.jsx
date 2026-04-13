import { TASK_STATUS, SALES_STATUS } from "../constants/status";

export default function StatusBadge({ status }) {
  const statusStyles = {
    [TASK_STATUS.COMPLETE]: "bg-green-500/10 text-green-500 border-green-500/20",
    [TASK_STATUS.INCOMPLETE]: "bg-gray-2 text-yellow-500 border-gray-4",
    [TASK_STATUS.AWAITING_APPROVAL]: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    [TASK_STATUS.NOT_APPROVED]: "bg-red-a2 text-red-9 border-red-a4",
    [SALES_STATUS.COMPLETED]: "bg-green-500/10 text-green-500 border-green-500/20",
    [SALES_STATUS.LOST]: "bg-red-500/10 text-red-500 border-red-500/20",
    
    // Legacy / Other support
    WON: "bg-green-500/10 text-green-500 border-green-500/20",
    LOST: "bg-red-500/10 text-red-500 border-red-500/20",
    DRAFT: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    SUBMITTED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    APPROVED: "bg-green-500/10 text-green-500 border-green-500/20",
    DONE: "bg-green-500/10 text-green-500 border-green-500/20",
    DEFAULT: "bg-gray-2 text-gray-10 border-gray-4",
  };

  const safeStatus = status?.toUpperCase() || "";
  const appliedStyle = statusStyles[safeStatus] || statusStyles.DEFAULT;

  return (
    <span
      className={`px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider border rounded-full whitespace-nowrap ${appliedStyle}`}
    >
      {safeStatus || "UNKNOWN"}
    </span>
  );
}
