import React from "react";
import { cn } from "@/lib/utils";

/**
 * Standard badge for displaying the global date range.
 * Used for visual consistency across report headers and section titles.
 */
const GlobalRangeBadge = ({ label, className = "", size = "default", showSeparator = true }) => {
  if (!label) return null;

  const sizeClasses = {
    default: "text-lg md:text-xl px-3 py-1",
    sm: "text-xs md:text-sm px-2 py-0.5",
  };

  return (
    <span className={cn(
      "text-mauve-11 font-bold bg-mauve-2 border border-mauve-4 rounded-xl shrink-0 shadow-sm inline-flex items-center whitespace-nowrap",
      sizeClasses[size] || sizeClasses.default,
      className
    )}>
      {showSeparator && <span className="mr-2 opacity-70">—</span>}
      {label}
    </span>
  );
};

export default GlobalRangeBadge;
