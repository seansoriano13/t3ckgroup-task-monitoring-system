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
    <div className={cn("flex justify-between items-center bg-card p-4 rounded-2xl border border-border shadow-sm relative overflow-hidden", className)}>
      {BgIcon && (
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <BgIcon size={80} />
        </div>
      )}
      
      <div className="relative z-10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-mauve-2 flex items-center justify-center text-mauve-11 shadow-sm border border-mauve-4">
          <Icon size={20} />
        </div>
        <div className="flex flex-col">
          <h2 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
            {title}
            {rangeLabel && (
              <span className="text-mauve-11 opacity-50 font-medium">— {rangeLabel}</span>
            )}
          </h2>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            {description}
          </p>
        </div>
      </div>
      
      {children && (
        <div className="relative z-10">
          {children}
        </div>
      )}
    </div>
  );
};

export default SectionHeader;
