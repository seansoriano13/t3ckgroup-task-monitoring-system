/**
 * TabGroup — Unified reusable tab bar component.
 *
 * Props:
 *  tabs       - array of strings OR { value, label, icon?, badge? } objects
 *  activeTab  - currently active value (string)
 *  onChange   - (value: string) => void
 *  variant    - "pill" | "primary" | "underline"  (default: "pill")
 *  size       - "sm" | "md"                       (default: "sm")
 *  className  - optional extra class on the wrapper
 *
 * Variants:
 *  pill      → bg-muted wrapper, bg-card active (committee / approvals / broadcast)
 *  primary   → bg-card+border wrapper, bg-primary active (tasks, HR management)
 *  underline → no wrapper bg, border-b-2 active (notification drawer)
 */

import { cn } from "@/lib/utils";

export default function TabGroup({
  tabs = [],
  activeTab,
  onChange,
  variant = "pill",
  size = "sm",
  fullWidth = false,
  className,
}) {
  const normalised = tabs.map((t) =>
    typeof t === "string" ? { value: t, label: t } : t,
  );

  // Wrapper classes
  const wrapperCls = cn(
    "flex overflow-x-auto shrink-0",
    variant === "pill" && "bg-muted p-1 rounded-xl w-fit",
    (variant === "primary" ||
      variant === "success" ||
      variant === "destructive") &&
      "bg-card border border-border p-1 rounded-xl shadow-sm",
    variant === "underline" && "gap-6 border-b border-border",
    fullWidth && "w-full",
    className,
  );

  // Per-button classes
  const btnBase = cn(
    "flex items-center justify-center gap-1.5 font-bold whitespace-nowrap transition-all",
    size === "sm" && "px-4 py-1.5 text-xs",
    size === "md" && "px-4 py-2 text-xs",
    fullWidth && "flex-1",
  );

  const btnActive = {
    pill: "bg-card text-foreground shadow-sm rounded-lg",
    primary:
      "bg-primary text-primary-foreground shadow-md shadow-primary/15 rounded-lg",
    success:
      "bg-green-10 text-white shadow-md shadow-green-9/20 rounded-lg",
    destructive:
      "bg-destructive text-destructive-foreground shadow-md shadow-destructive/15 rounded-lg",
    underline: "border-b-2 border-primary text-foreground -mb-px",
  };

  const btnInactive = {
    pill: "text-muted-foreground hover:text-foreground hover:bg-card/50 rounded-lg",
    primary:
      "text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg",
    success:
      "text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg",
    destructive:
      "text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg",
    underline:
      "border-b-2 border-transparent text-muted-foreground hover:text-foreground pb-3",
  };

  return (
    <div className={wrapperCls}>
      {normalised.map(
        ({
          value,
          label,
          icon: Icon,
          badge,
          activeClass,
          variant: tabVariant,
        }) => {
          const isActive = activeTab === value;
          const currentVariant = tabVariant || variant;
          return (
            <button
              key={value}
              onClick={() => onChange(value)}
              className={cn(
                btnBase,
                isActive
                  ? activeClass || btnActive[currentVariant]
                  : btnInactive[currentVariant],
                variant === "underline" && size === "sm" && "pb-3",
              )}
            >
              {Icon && <Icon size={14} />}
              <span>{label}</span>
              {badge != null && badge > 0 && (
                <span
                  className={cn(
                    "ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-black",
                    isActive
                      ? variant === "success"
                        ? "bg-white/20 text-white"
                        : "bg-primary/10 text-primary"
                      : "bg-muted-foreground/20 text-muted-foreground",
                  )}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        },
      )}
    </div>
  );
}
