import { TASK_STATUS, SALES_STATUS } from "../constants/status";

export default function StatusBadge({ status }) {
  const statusStyles = {
    [TASK_STATUS.COMPLETE]: "bg-white text-green-600 border-green-400",
    [TASK_STATUS.INCOMPLETE]: "bg-white text-amber-600 border-amber-400",
    [TASK_STATUS.AWAITING_APPROVAL]: "bg-white text-blue-600 border-blue-400",
    [TASK_STATUS.NOT_APPROVED]: "bg-white text-red-600 border-red-400",
    [SALES_STATUS.COMPLETED]: "bg-white text-green-600 border-green-400",
    [SALES_STATUS.LOST]: "bg-white text-red-600 border-red-400",
    
    // Legacy / Other support
    WON: "bg-white text-green-600 border-green-400",
    LOST: "bg-white text-red-600 border-red-400",
    DRAFT: "bg-white text-amber-600 border-amber-400",
    SUBMITTED: "bg-white text-blue-600 border-blue-400",
    APPROVED: "bg-white text-green-600 border-green-400",
    DONE: "bg-white text-green-600 border-green-400",
    DEFAULT: "bg-white text-gray-500 border-gray-300",
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
