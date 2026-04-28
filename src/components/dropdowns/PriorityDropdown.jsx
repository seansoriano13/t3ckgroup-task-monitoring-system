import React from "react";
import Dropdown from "../ui/Dropdown";
import { ChevronDown } from "lucide-react";
import Dot from "../ui/Dot";
import { PRIORITY_OPTIONS } from "../../constants/task";

export default function PriorityDropdown({
  value,
  onChange,
  disabled = false,
  className = "",
  triggerClassName,
  customTrigger,
}) {
  const currentPriority =
    PRIORITY_OPTIONS.find((p) => p.value === value) || PRIORITY_OPTIONS[0];

  return (
    <Dropdown
      disabled={disabled}
      className={`z-100 ${className}`}
      popoverClassName="absolute top-full left-0 mt-1.5 bg-muted border border-border rounded-xl shadow-2xl z-[110] min-w-[150px] popover-enter p-1"
      trigger={({ isOpen }) => {
        if (customTrigger) return customTrigger({ isOpen, currentPriority });

        return (
          <button
            type="button"
            className={
              triggerClassName || `property-pill ${isOpen ? "active" : ""}`
            }
          >
            <Dot size="w-2 h-2" color={currentPriority.dot} />
            <span className="text-muted-foreground font-medium">
              {currentPriority.label}
            </span>
            <ChevronDown size={12} className="text-mauve-7 ml-auto" />
          </button>
        );
      }}
    >
      {({ close }) => (
        <>
          {PRIORITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onChange) onChange(opt.value);
                close();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                value === opt.value
                  ? "bg-muted/80 text-foreground font-bold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Dot size="w-2 h-2" color={opt.dot} />
              {opt.label}
            </button>
          ))}
        </>
      )}
    </Dropdown>
  );
}
