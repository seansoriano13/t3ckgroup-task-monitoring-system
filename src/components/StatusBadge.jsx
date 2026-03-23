export default function StatusBadge({ status }) {
  const statusStyles = {
    // Adapting to both light and dark modes
    COMPLETE: "bg-gray-2 text-green-500 border-gray-4",
    INCOMPLETE: "bg-gray-2 text-yellow-500 border-gray-4",
    NOT_APPROVED: "bg-red-a2 text-red-9 border-red-a4",
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
