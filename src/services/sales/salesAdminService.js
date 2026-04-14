import { supabase } from "../../lib/supabase";
import { getMonthBoundaries } from "../../utils/dateUtils";
import { REVENUE_STATUS } from "../../constants/status";

export const salesAdminService = {
  async getAppSettings() {
    const { data, error } = await supabase
      .from("app_settings")
      .select("*")
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Critical error fetching app settings", error);
      throw error;
    }

    // Default configuration if no row exists or if fetch failed
    return (
      data || {
        require_revenue_verification: false,
        sales_self_approve_expenses: false,
        universal_task_submission: false,
        marketing_approval_by_ops_manager: false,
        enable_self_verification: false,
        enable_bulk_approval: false,
        enable_visual_shaming: false,
      }
    );
  },

  async updateAppSettings(payload) {
    const { data, error } = await supabase
      .from("app_settings")
      .update(payload)
      .eq("id", true)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getAllSalesActivities(monthFilter = null) {
    let query = supabase
      .from("sales_activities")
      .select(
        "*, employees!sales_activities_employee_id_fkey(name, department, is_super_admin), sales_weekly_plans!sales_activities_plan_id_fkey(status)",
      )
      .neq("is_deleted", true)
      .order("scheduled_date", { ascending: false });

    if (monthFilter) {
      const { startDate, endDate } = getMonthBoundaries(monthFilter);
      query = query
        .gte("scheduled_date", startDate)
        .lt("scheduled_date", endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getAllRevenueLogs() {
    const { data, error } = await supabase
      .from("sales_revenue_logs")
      .select(
        "*, employees!sales_revenue_logs_employee_id_fkey(name, department, sub_department, is_super_admin), editor:employees!sales_revenue_logs_last_edited_by_fkey(name)",
      )
      .neq("is_deleted", true) // exclude soft-deleted rows
      .order("date", { ascending: false });
    if (error) throw error;
    return data;
  },

  async getLeaderboardData(monthYearStr) {
    // 1. Get Quotas for the month
    const { startDate, endDate } = getMonthBoundaries(monthYearStr);

    const { data: quotas, error: qErr } = await supabase
      .from("sales_quotas")
      .select("*, employees(name, is_super_admin)")
      .eq("month_year", startDate);
    if (qErr) throw qErr;

    // 2. Get all revenues for the month using proper date ranging
    const { data: revenues, error: rErr } = await supabase
      .from("sales_revenue_logs")
      .select(
        "*, employees!sales_revenue_logs_employee_id_fkey(name, is_super_admin)",
      )
      .eq("record_type", "SALES_ORDER")
      .gte("date", startDate)
      .lt("date", endDate)
      .neq("is_deleted", true); // exclude soft-deleted rows
    if (rErr) throw rErr;

    // 3. Combine
    const agg = {};
    quotas.forEach((q) => {
      if (q.employees?.is_super_admin) return;
      agg[q.employee_id] = {
        employee_id: q.employee_id,
        name: q.employees?.name || "Unknown",
        quota: q.amount_target,
        revenueWon: 0,
        revenueLost: 0,
      };
    });

    revenues.forEach((r) => {
      if (r.employees?.is_super_admin) return;
      if (!agg[r.employee_id]) {
        // If they have revenue but no quota, we should probably still show them or skip.
        // Let's create a placeholder so they don't disappear.
        agg[r.employee_id] = {
          employee_id: r.employee_id,
          name: r.employees?.name || "Sales Rep",
          quota: 0,
          revenueWon: 0,
          revenueLost: 0,
        };
      }
      if (
        r.status === REVENUE_STATUS.COMPLETED ||
        r.status === REVENUE_STATUS.APPROVED
      ) {
        agg[r.employee_id].revenueWon += Number(r.revenue_amount);
      } else {
        agg[r.employee_id].revenueLost += Number(r.revenue_amount);
      }
    });

    return Object.values(agg).sort((a, b) => {
      const pctB = b.quota > 0 ? b.revenueWon / b.quota : 0;
      const pctA = a.quota > 0 ? a.revenueWon / a.quota : 0;
      return pctB - pctA;
    });
  },
};
