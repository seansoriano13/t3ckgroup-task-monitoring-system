import React from "react";
import { ChevronDown } from "lucide-react";

/**
 * FilterTrigger - A standardized trigger button for filter dropdowns.
 */
export function FilterTrigger({
  label,
  isActive,
  isOpen,
  icon: Icon,
  disabled,
}) {
  return (
    <div
      className={`bg-card h-[40px] md:h-[46px] w-full flex items-center justify-between px-3 rounded-lg border transition-all cursor-pointer ${
        disabled ? "opacity-50 pointer-events-none" : ""
      } ${
        isOpen
          ? "border-mauve-6 ring-1 ring-mauve-6 bg-card"
          : isActive
            ? "border-mauve-8 font-medium bg-muted/30"
            : "border-border hover:border-border/80"
      }`}
    >
      <div className="flex items-center gap-2 overflow-hidden flex-1">
        {Icon && (
          <Icon
            size={14}
            className={`shrink-0 ${isActive ? "text-foreground" : "text-muted-foreground"}`}
          />
        )}
        <span className="text-[13px] text-foreground font-[500] truncate block w-full text-left">
          {label}
        </span>
      </div>
      <ChevronDown
        size={14}
        className={`ml-1 shrink-0 text-muted-foreground transition-transform ${
          isOpen ? "rotate-180" : ""
        }`}
      />
    </div>
  );
}

/**
 * FilterOptionList - A standardized list of options for filter popovers.
 * Shows a search bar when options exceed 5 items.
 */
export function FilterOptionList({ options, value, onChange, close }) {
  const [query, setQuery] = React.useState("");

  const filtered = query.trim()
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : options;

  return (
    <div className="flex flex-col">
      {options.length > 5 && (
        <div className="px-2 pt-2 pb-1 border-b border-border">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-muted/50 border border-border rounded-md px-2.5 py-1.5 text-[12px] font-medium text-foreground placeholder:text-muted-foreground outline-none focus:border-mauve-6 focus:ring-1 focus:ring-mauve-6 transition-all"
          />
        </div>
      )}
      <div className="p-1 max-h-56 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-center text-[12px] text-muted-foreground py-3 font-medium">
            No results found
          </p>
        ) : (
          filtered.map((opt) => (
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
                  ? "bg-mauve-5 text-foreground font-bold"
                  : "text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {opt.label}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// Default export for convenience
export default {
  Trigger: FilterTrigger,
  OptionList: FilterOptionList,
};
