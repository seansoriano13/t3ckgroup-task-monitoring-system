export default function StatusBadge({ status }) {
  const statusStyles = {
    // Using subtle alpha backgrounds and bright text for dark mode
    COMPLETE: "bg-green-900/30 text-green-400 border-green-800/50",
    INCOMPLETE: "bg-yellow-900/30 text-yellow-400 border-yellow-800/50",
    NOT_APPROVED: "bg-red-a3 text-red-9 border-red-a5",
    DEFAULT: "bg-gray-3 text-gray-10 border-gray-4",
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
