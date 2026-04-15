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

  /**
   * Fetch all sales activities within an arbitrary date range.
   * Used by the unified dashboard for quarterly/yearly/custom views.
   */
  async getSalesActivitiesByRange(startDate, endDate) {
    const { data, error } = await supabase
      .from("sales_activities")
      .select(
        "*, employees!sales_activities_employee_id_fkey(name, department, sub_department, is_super_admin)",
      )
      .neq("is_deleted", true)
      .gte("scheduled_date", startDate)
      .lt("scheduled_date", endDate)
      .order("scheduled_date", { ascending: false });

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

  /**
   * Unified leaderboard/rankings data for an arbitrary date range.
   * Returns per-employee: quota (summed), revenue won/lost (amounts + counts), win rate.
   */
  async getLeaderboardData(startDate, endDate, quotaMonthKeys = []) {
    // 1. Get Quotas — sum across all month keys in the range
    let quotas = [];
    if (quotaMonthKeys.length > 0) {
      const { data: qData, error: qErr } = await supabase
        .from("sales_quotas")
        .select("*, employees(name, sub_department)")
        .in("month_year", quotaMonthKeys);
      if (qErr) throw qErr;
      quotas = qData || [];
    }

    // 2. Get all revenues for the range
    const { data: revenues, error: rErr } = await supabase
      .from("sales_revenue_logs")
      .select(
        "*, employees!sales_revenue_logs_employee_id_fkey(name, sub_department)",
      )
      .eq("record_type", "SALES_ORDER")
      .gte("date", startDate)
      .lt("date", endDate)
      .neq("is_deleted", true);
    if (rErr) throw rErr;

    // 3. Combine — sum quotas per employee across months
    const agg = {};

    quotas.forEach((q) => {
      if (!agg[q.employee_id]) {
        agg[q.employee_id] = {
          employee_id: q.employee_id,
          name: q.employees?.name || "Unknown",
          sub_department: q.employees?.sub_department || "",
          quota: 0,
          revenueWon: 0,
          revenueLost: 0,
          dealsWon: 0,
          dealsLost: 0,
          dealsPending: 0,
        };
      }
      agg[q.employee_id].quota += Number(q.amount_target) || 0;
    });

    revenues.forEach((r) => {
      if (!agg[r.employee_id]) {
        agg[r.employee_id] = {
          employee_id: r.employee_id,
          name: r.employees?.name || "Sales Rep",
          sub_department: r.employees?.sub_department || "",
          quota: 0,
          revenueWon: 0,
          revenueLost: 0,
          dealsWon: 0,
          dealsLost: 0,
          dealsPending: 0,
        };
      }
      if (
        r.status === REVENUE_STATUS.COMPLETED ||
        r.status === REVENUE_STATUS.APPROVED
      ) {
        agg[r.employee_id].revenueWon += Number(r.revenue_amount);
        agg[r.employee_id].dealsWon++;
      } else if (r.status === REVENUE_STATUS.LOST) {
        agg[r.employee_id].revenueLost += Number(r.revenue_amount);
        agg[r.employee_id].dealsLost++;
      } else {
        agg[r.employee_id].dealsPending++;
      }
    });

    // 4. Compute derived metrics and sort
    return Object.values(agg)
      .map((emp) => {
        const totalDeals = emp.dealsWon + emp.dealsLost;
        const winRate = totalDeals > 0 ? Math.round((emp.dealsWon / totalDeals) * 100) : null;
        const quotaPct = emp.quota > 0 ? Math.round((emp.revenueWon / emp.quota) * 100) : 0;
        return { ...emp, winRate, quotaPct };
      })
      .sort((a, b) => {
        const pctB = b.quota > 0 ? b.revenueWon / b.quota : 0;
        const pctA = a.quota > 0 ? a.revenueWon / a.quota : 0;
        return pctB - pctA;
      });
  },
};
