/**
 * Centralized status constants to prevent magic string bugs
 * and ensure consistency across the task and sales modules.
 */

export const TASK_STATUS = {
  INCOMPLETE: "INCOMPLETE",
  AWAITING_APPROVAL: "AWAITING APPROVAL",
  COMPLETE: "COMPLETE",
  NOT_APPROVED: "NOT APPROVED", // Standardized to match database string
  DELETED: "DELETED",
};

export const REVENUE_STATUS = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED SALES",
  LOST: "LOST SALES",
  REJECTED: "REJECTED",
  APPROVED: "APPROVED",
  DONE: "APPROVED", // Alias for backward compatibility and UI filters
};

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
