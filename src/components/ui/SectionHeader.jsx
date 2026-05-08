import React from "react";
import { cn } from "@/lib/utils";

/**
 * Standard Section Header component following the "Personal Pipeline" style.
 * Includes an icon box, title with optional range label, and subtitle.
 */
const SectionHeader = ({
  icon: Icon,
  title,
  description,
  rangeLabel,
  children,
  className,
  bgIcon: BgIcon,
}) => {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6 relative overflow-hidden", className)}>
      {BgIcon && (
        <div className="absolute top-0 right-0 opacity-5 pointer-events-none">
          <BgIcon size={80} />
        </div>
      )}
      
      <div className="relative z-10 flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-mauve-2 flex items-center justify-center text-mauve-11 shadow-sm border border-mauve-4">
            <Icon size={20} />
          </div>
        )}
        <div className="flex flex-col space-y-0.5">
          <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            {title}
            {rangeLabel && (
              <span className="text-muted-foreground font-medium text-lg">— {rangeLabel}</span>
            )}
          </h2>
          <p className="text-sm font-medium text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      
      {children && (
        <div className="relative z-10 flex items-center gap-3 shrink-0 flex-wrap">
          {children}
        </div>
      )}
    </div>
  );
};

export default SectionHeader;
