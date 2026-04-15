import { supabase } from "../../lib/supabase";

export const salesQuotaService = {
  async getQuotasByMonth(monthYearDate) {
    // monthYearDate e.g. '2026-03-01'
    const { data, error } = await supabase
      .from("sales_quotas")
      .select(`*, employees(name, department, email)`)
      .eq("month_year", monthYearDate);

    if (error) throw error;
    return data;
  },

  async getQuotasByMonths(monthYearDates) {
    if (!monthYearDates || monthYearDates.length === 0) return [];
    const { data, error } = await supabase
      .from("sales_quotas")
      .select(`*, employees(name, department, email)`)
      .in("month_year", monthYearDates);

    if (error) throw error;
    return data;
  },

  async upsertQuota(employeeId, amountTarget, monthYearDate) {
    const { data, error } = await supabase
      .from("sales_quotas")
      .upsert(
        {
          employee_id: employeeId,
          amount_target: amountTarget,
          month_year: monthYearDate,
        },
        { onConflict: "employee_id, month_year" },
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
