import React from "react";
import { ChevronDown } from "lucide-react";

/**
 * FilterTrigger - A standardized trigger button for filter dropdowns.
 */
export function FilterTrigger({ label, isActive, isOpen, icon: Icon, disabled }) {
  return (
    <div
      className={`bg-card h-[40px] md:h-[46px] w-full flex items-center justify-between px-3 rounded-lg border transition-all cursor-pointer ${
        disabled ? "opacity-50 pointer-events-none" : ""
      } ${
        isOpen
          ? "border-primary/50 ring-1 ring-primary/20 bg-card"
          : isActive
          ? "border-primary/20 font-medium bg-muted/30"
          : "border-border hover:border-border/80"
      }`}
    >
      <div className="flex items-center gap-2 overflow-hidden flex-1">
        {Icon && (
          <Icon
            size={14}
            className={`shrink-0 ${isActive ? "text-foreground" : "text-slate-400"}`}
          />
        )}
        <span className="text-[13px] text-foreground font-[500] truncate block w-full text-left">
          {label}
        </span>
      </div>
      <ChevronDown
        size={14}
        className={`ml-1 shrink-0 text-slate-400 transition-transform ${
          isOpen ? "rotate-180" : ""
        }`}
      />
    </div>
  );
}

/**
 * FilterOptionList - A standardized list of options for filter popovers.
 */
export function FilterOptionList({ options, value, onChange, close }) {
  return (
    <div className="p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(opt.value);
            if (close) close();
          }}
          className={`w-full text-left px-3 py-2 rounded-md text-[13px] transition-colors font-medium ${
            value === opt.value
              ? "bg-slate-200 text-foreground font-bold"
              : "text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// Default export for convenience
export default {
  Trigger: FilterTrigger,
  OptionList: FilterOptionList,
};
