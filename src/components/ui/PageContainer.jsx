import React from "react";

/**
 * Standardized container for all dashboard pages.
 * Ensures consistent max-width, horizontal padding, and vertical spacing.
 */
export default function PageContainer({
  children,
  className = "",
  maxWidth = "7xl", // 4xl, 5xl, 6xl, 7xl, full
  spaceY = "6", // 4, 6, 8, 10
}) {
  const maxWidthClass =
    {
      "4xl": "max-w-4xl",
      "5xl": "max-w-5xl",
      "6xl": "max-w-6xl",
      "7xl": "max-w-7xl",
      full: "max-w-full",
    }[maxWidth] || "max-w-7xl";

  const spaceYClass =
    {
      4: "space-y-4",
      6: "space-y-6",
      8: "space-y-8",
      10: "space-y-10",
    }[spaceY] || "space-y-6";

  return (
    <div
      className={`mx-auto ${maxWidthClass} ${spaceYClass} px-4 sm:px-6 lg:px-8 pb-10 ${className}`}
    >
      {children}
    </div>
  );
}
