/**
 * Shared react-select styles to ensure UI consistency across the application.
 * All colors use Radix UI CSS variables — no hardcoded hex values.
 */

// JS-based styles for standard react-select implementations
export const defaultSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: "36px",
    backgroundColor: "var(--mauve-2)",
    borderColor: state.isFocused ? "var(--mauve-8)" : "var(--mauve-6)",
    borderRadius: "8px",
    boxShadow: state.isFocused ? "0 0 0 1px var(--mauve-8)" : "none",
    "&:hover": {
      borderColor: "var(--mauve-7)",
    },
    cursor: "pointer",
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: "var(--mauve-2)",
    border: "1px solid var(--mauve-6)",
    borderRadius: "8px",
    boxShadow:
      "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    zIndex: 1000000,
  }),
  menuPortal: (base) => ({ ...base, zIndex: 1000000 }),
  option: (base, state) => ({
    ...base,
    fontSize: "13px",
    padding: "8px 12px",
    backgroundColor: state.isFocused
      ? "var(--mauve-4)"
      : state.isSelected
        ? "var(--mauve-5)"
        : "transparent",
    color: "var(--mauve-12)",
    cursor: "pointer",
    "&:active": {
      backgroundColor: "var(--mauve-5)",
    },
  }),
  singleValue: (base) => ({
    ...base,
    color: "var(--mauve-12)",
    fontWeight: "600",
    fontSize: "13px",
  }),
  placeholder: (base) => ({
    ...base,
    color: "var(--mauve-9)",
    fontSize: "13px",
  }),
  input: (base) => ({
    ...base,
    color: "var(--mauve-12)",
    fontSize: "13px",
  }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base) => ({
    ...base,
    color: "var(--mauve-9)",
    "&:hover": { color: "var(--mauve-11)" },
    padding: "4px",
  }),
};

export const sidebarSelectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused
      ? "var(--sidebar-accent)"
      : "transparent",
    color: "var(--sidebar-foreground)",
    border: "none",
    boxShadow: "none",
    cursor: "pointer",
    minHeight: "auto",
    padding: "4px",
    borderRadius: "6px",
    "&:hover": {
      backgroundColor: "var(--sidebar-accent)",
    },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "0px 8px",
  }),
  indicatorSeparator: () => ({ display: "none" }),
  menu: (base) => ({
    ...base,
    backgroundColor: "var(--sidebar)",
    border: "1px solid var(--sidebar-border)",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    borderRadius: "6px",
    overflow: "hidden",
    zIndex: 100,
    marginTop: "4px",
    animation: "popover-in 0.15s ease-out forwards",
    transformOrigin: "top",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused
      ? "var(--sidebar-accent)"
      : "transparent",
    color: "var(--sidebar-foreground)",
    cursor: "pointer",
    padding: "8px 12px",
    fontSize: "13px",
    fontWeight: 500,
  }),
  dropdownIndicator: (base) => ({
    ...base,
    padding: "0px 8px 0px 0px",
  }),
};

export const inlineSelectStyles = (isFilled) => ({
  control: (base) => ({
    ...base,
    backgroundColor: "transparent",
    border: "none",
    boxShadow: "none",
    minHeight: "32px",
    fontSize: "14px",
    fontWeight: isFilled ? "700" : "400",
    color: isFilled ? "var(--mauve-12)" : "var(--mauve-9)",
    cursor: "pointer",
    "&:hover": { borderColor: "transparent" },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "0",
  }),
  input: (base) => ({
    ...base,
    color: "inherit",
  }),
  placeholder: (base) => ({
    ...base,
    color: "var(--mauve-9)",
    fontWeight: "400",
  }),
  singleValue: (base) => ({
    ...base,
    color: "inherit",
  }),
  indicatorsContainer: (base) => ({
    ...base,
    display: "none",
  }),
  menu: (base) => ({
    ...base,
    borderRadius: "12px",
    border: "1px solid var(--mauve-6)",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    marginTop: "4px",
    overflow: "hidden",
    backgroundColor: "var(--mauve-2)",
    zIndex: 50,
  }),
  groupHeading: (base) => ({
    ...base,
    fontSize: "10px",
    fontWeight: "800",
    textTransform: "uppercase",
    color: "var(--mauve-9)",
    backgroundColor: "var(--mauve-3)",
    padding: "8px 12px",
    margin: "0",
  }),
  option: (base, state) => ({
    ...base,
    fontSize: "13px",
    fontWeight: "600",
    padding: "8px 12px",
    backgroundColor: state.isFocused ? "var(--mauve-4)" : state.isSelected ? "var(--mauve-3)" : "var(--mauve-2)",
    color: state.isSelected ? "var(--mauve-12)" : "var(--mauve-11)",
    cursor: "pointer",
    "&:active": { backgroundColor: "var(--mauve-5)" },
  }),
});

// Tailwind-based classNames for react-select (Secondary/Administrative style)
export const secondarySelectClassNames = {
  control: (state) =>
    `min-h-[36px] w-full bg-mauve-1 border ${state.isFocused ? "border-mauve-6 ring-1 ring-mauve-6" : "border-mauve-4"} hover:border-mauve-5 rounded-lg px-2 shadow-sm transition-all cursor-pointer`,
  menu: () =>
    `mt-1 bg-mauve-1 border border-mauve-4 rounded-lg shadow-xl overflow-hidden popover-enter`,
  menuList: () => `p-1`,
  option: (state) =>
    `px-3 py-1.5 cursor-pointer transition-colors rounded-md !text-[13px] ${state.isFocused
      ? "bg-mauve-4 text-foreground font-bold"
      : state.isSelected
        ? "bg-mauve-5 text-foreground font-bold"
        : "text-muted-foreground bg-transparent"
    }`,
  singleValue: () => `text-foreground font-semibold text-xs`,
  placeholder: () => `text-muted-foreground text-xs`,
  input: () => `text-foreground text-xs`,
  indicatorSeparator: () => `hidden`,
  dropdownIndicator: () => `text-muted-foreground hover:text-foreground p-1`,
  valueContainer: () => `gap-1 py-0`,
};

// Aliases for backward compatibility or specific contexts
export const activityLogClassNames = secondarySelectClassNames;
export const logTaskSelectClassNames = {
  ...secondarySelectClassNames,
  control: (state) =>
    `${secondarySelectClassNames.control(state)} min-h-[44px]`, // Log task uses taller controls
};

export const portalStyles = { menuPortal: (base) => ({ ...base, zIndex: 9999 }) };
