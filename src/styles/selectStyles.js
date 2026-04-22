/**
 * Shared react-select styles to ensure UI consistency across the application.
 */

// JS-based styles for standard react-select implementations
export const defaultSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: "36px",
    backgroundColor: "#F9FAFB",
    borderColor: state.isFocused ? "#111827" : "#E5E7EB",
    borderRadius: "8px",
    boxShadow: state.isFocused ? "0 0 0 1px #111827" : "none",
    "&:hover": {
      borderColor: "#D1D5DB",
    },
    cursor: "pointer",
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
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
      ? "#F3F4F6"
      : state.isSelected
        ? "#E5E7EB"
        : "transparent",
    color: "#111827",
    cursor: "pointer",
    "&:active": {
      backgroundColor: "#E5E7EB",
    },
  }),
  singleValue: (base) => ({
    ...base,
    color: "#111827",
    fontWeight: "600",
    fontSize: "13px",
  }),
  placeholder: (base) => ({
    ...base,
    color: "#9CA3AF",
    fontSize: "13px",
  }),
  input: (base) => ({
    ...base,
    color: "#111827",
    fontSize: "13px",
  }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base) => ({
    ...base,
    color: "#9CA3AF",
    "&:hover": { color: "#4B5563" },
    padding: "4px",
  }),
};

export const sidebarSelectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused
      ? "rgba(var(--sidebar-accent-rgb), 0.5)"
      : "transparent",
    color: "rgba(var(--sidebar-foreground-rgb), 0.8)",
    border: "none",
    boxShadow: "none",
    cursor: "pointer",
    minHeight: "auto",
    padding: "4px",
    borderRadius: "6px",
    "&:hover": {
      backgroundColor: "rgba(var(--sidebar-accent-rgb), 0.5)",
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
  control: (base, state) => ({
    ...base,
    backgroundColor: "transparent",
    border: "none",
    boxShadow: "none",
    minHeight: "32px",
    fontSize: "14px",
    fontWeight: isFilled ? "700" : "400",
    color: isFilled ? "#111827" : "#9CA3AF",
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
    color: "#9CA3AF",
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
    border: "1px solid #E5E7EB",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    marginTop: "4px",
    overflow: "hidden",
    zIndex: 50,
  }),
  groupHeading: (base) => ({
    ...base,
    fontSize: "10px",
    fontWeight: "800",
    textTransform: "uppercase",
    color: "#9CA3AF",
    backgroundColor: "#F9FAFB",
    padding: "8px 12px",
    margin: "0",
  }),
  option: (base, state) => ({
    ...base,
    fontSize: "13px",
    fontWeight: "600",
    padding: "8px 12px",
    backgroundColor: state.isFocused ? "#F3F4F6" : state.isSelected ? "#F9FAFB" : "white",
    color: state.isSelected ? "#111827" : "#374151",
    cursor: "pointer",
    "&:active": { backgroundColor: "#E5E7EB" },
  }),
});

// Tailwind-based classNames for react-select (Secondary/Administrative style)
export const secondarySelectClassNames = {
  control: (state) =>
    `min-h-[36px] w-full bg-gray-1 border ${state.isFocused ? "border-gray-6 ring-1 ring-gray-6" : "border-gray-4"} hover:border-gray-5 rounded-lg px-2 shadow-sm transition-all cursor-pointer`,
  menu: () =>
    `mt-1 bg-gray-1 border border-gray-4 rounded-lg shadow-xl overflow-hidden popover-enter`,
  menuList: () => `p-1`,
  option: (state) =>
    `px-3 py-1.5 cursor-pointer transition-colors rounded-md !text-[13px] ${state.isFocused
      ? "bg-slate-200 text-foreground font-bold"
      : state.isSelected
        ? "bg-slate-300 text-foreground font-bold"
        : "text-muted-foreground bg-transparent"
    }`,
  singleValue: () => `text-foreground font-semibold text-xs`,
  placeholder: () => `text-muted-foreground text-xs`,
  input: () => `text-foreground text-xs`,
  indicatorSeparator: () => `hidden`,
  dropdownIndicator: () => `text-slate-400 hover:text-slate-600 p-1`,
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
