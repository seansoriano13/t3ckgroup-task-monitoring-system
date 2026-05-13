/**
 * Centralized status constants to prevent magic string bugs
 * and ensure consistency across the task and sales modules.
 */

export const TASK_STATUS = {
  INCOMPLETE: "INCOMPLETE",
  AWAITING_APPROVAL: "AWAITING APPROVAL",
  COMPLETE: "COMPLETED", // Migrated: was "COMPLETE" → now "COMPLETED"
  NOT_APPROVED: "NOT APPROVED", // Standardized to match database string
  DELETED: "DELETED",
};

export const REVENUE_STATUS = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED", // DB migrated: was "COMPLETED SALES" → now "COMPLETED"
  LOST: "LOST", // DB migrated: was "LOST SALES" → now "LOST"
  REJECTED: "REJECTED",
  APPROVED: "APPROVED",
  DONE: "APPROVED", // Alias for backward compatibility and UI filters
};

// Alias used in StatusBadge and sales-related UI components
export const SALES_STATUS = REVENUE_STATUS;

export const RECORD_TYPE = {
  SALES_ORDER: "SALES_ORDER",
  SALES_QUOTATION: "SALES_QUOTATION",
};

export const SALES_PLAN_STATUS = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  REVISION: "REVISION",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

export const STATUS_THEME = {
  GREEN: "green",
  AMBER: "amber",
  BLUE: "blue",
  RED: "red",
  VIOLET: "violet",
  ORANGE: "orange",
  MAUVE: "mauve",
};

// Map each task status to a consistent color theme
export const TASK_STATUS_THEME = {
  [TASK_STATUS.COMPLETE]: STATUS_THEME.GREEN,
  [TASK_STATUS.INCOMPLETE]: STATUS_THEME.AMBER,
  [TASK_STATUS.AWAITING_APPROVAL]: STATUS_THEME.BLUE,
  [TASK_STATUS.NOT_APPROVED]: STATUS_THEME.RED,
  [TASK_STATUS.DELETED]: STATUS_THEME.MAUVE,
};

// Map each sales status to a consistent color theme
export const SALES_STATUS_THEME = {
  [SALES_STATUS.COMPLETED]: STATUS_THEME.GREEN,
  [SALES_STATUS.LOST]: STATUS_THEME.RED,
  [SALES_STATUS.PENDING]: STATUS_THEME.AMBER,
  [SALES_STATUS.REJECTED]: STATUS_THEME.RED,
  [SALES_STATUS.APPROVED]: STATUS_THEME.GREEN,
  DONE: STATUS_THEME.GREEN, // Alias
};

// Helper function to get theme
export const getStatusTheme = (status) => {
  const safeStatus = status?.toUpperCase() || "";
  
  if (TASK_STATUS_THEME[safeStatus]) return TASK_STATUS_THEME[safeStatus];
  if (SALES_STATUS_THEME[safeStatus]) return SALES_STATUS_THEME[safeStatus];
  
  // Legacy / Other supports
  switch (safeStatus) {
    case "WON": return STATUS_THEME.GREEN;
    case "DRAFT": return STATUS_THEME.AMBER;
    case "SUBMITTED": return STATUS_THEME.BLUE;
    case "ACTIVE": return STATUS_THEME.BLUE;
    case "CANCELLED": return STATUS_THEME.RED;
    default: return STATUS_THEME.MAUVE;
  }
};

export const getStatusDotColor = (status) => {
  const theme = getStatusTheme(status);
  
  switch(theme) {
    case STATUS_THEME.GREEN: return "bg-green-9 shadow-[0_0_8px_rgba(34,197,94,0.3)]";
    case STATUS_THEME.AMBER: return "bg-amber-9 shadow-[0_0_8px_rgba(245,158,11,0.3)]";
    case STATUS_THEME.BLUE: return "bg-blue-9 shadow-[0_0_8px_rgba(59,130,246,0.3)]";
    case STATUS_THEME.RED: return "bg-red-9 shadow-[0_0_8px_rgba(239,68,68,0.3)]";
    case STATUS_THEME.VIOLET: return "bg-violet-9 shadow-[0_0_8px_rgba(139,92,246,0.3)]";
    case STATUS_THEME.ORANGE: return "bg-orange-9 shadow-[0_0_8px_rgba(249,115,22,0.3)]";
    default: return "bg-mauve-9 shadow-[0_0_8px_rgba(158,158,158,0.3)]";
  }
};

export const getStatusColorAlpha = (theme) => {
  switch(theme) {
    case STATUS_THEME.GREEN: return "bg-green-a7 shadow-green-5";
    case STATUS_THEME.AMBER: return "bg-amber-a7 shadow-amber-5";
    case STATUS_THEME.BLUE: return "bg-blue-a7 shadow-blue-5";
    case STATUS_THEME.RED: return "bg-red-a7 shadow-red-5";
    case STATUS_THEME.VIOLET: return "bg-violet-a7 shadow-violet-5";
    case STATUS_THEME.ORANGE: return "bg-orange-a7 shadow-orange-5";
    default: return "bg-mauve-a7 shadow-mauve-5";
  }
};
