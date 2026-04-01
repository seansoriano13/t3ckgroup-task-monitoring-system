/**
 * Standardized date utilities for month-range calculations
 * to prevent edge-case bugs around leap years and year rollovers.
 */

/**
 * Returns the first day of the selected month and the first day of the NEXT month.
 * Useful for .gte(start) and .lt(nextMonthStart) queries.
 * @param {string} monthYearStr - Format "YYYY-MM"
 * @returns {{ startDate: string, endDate: string }} 
 */
export function getMonthBoundaries(monthYearStr) {
  const [year, month] = monthYearStr.split("-").map(Number);
  
  // Start of current month (e.g., 2026-03-01)
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  
  // Start of NEXT month
  const nextMonthDate = new Date(year, month, 1); // JS Date months are 0-indexed, so 'month' here is actually next month
  const nextYear = nextMonthDate.getFullYear();
  const nextMonth = nextMonthDate.getMonth() + 1;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  
  return { startDate, endDate };
}

/**
 * Returns the start and end string for a generic date range.
 * @param {Date} date 
 * @returns {string} YYYY-MM-DD
 */
export function formatDateToYMD(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
