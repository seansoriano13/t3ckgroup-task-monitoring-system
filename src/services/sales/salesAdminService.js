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
        universal_task_submission: true,
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
        "*, employees!sales_activities_employee_id_fkey(name, department, sub_department, is_super_admin, avatar_path), sales_weekly_plans!sales_activities_plan_id_fkey(status)",
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
        "*, employees!sales_activities_employee_id_fkey(name, department, sub_department, is_super_admin, avatar_path)",
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
        "*, employees!sales_revenue_logs_employee_id_fkey(name, department, sub_department, is_super_admin, avatar_path), editor:employees!sales_revenue_logs_last_edited_by_fkey(name, avatar_path)",
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
    if (!quotaMonthKeys || quotaMonthKeys.length === 0) return [];

    // Query sales_quotas which now has all the pre-calculated metrics via triggers
    const { data: quotas, error } = await supabase
      .from("sales_quotas")
      .select("*, employees(name, sub_department, department)")
      .in("month_year", quotaMonthKeys);

    if (error) throw error;

    // Aggregate by employee (in case of multiple months)
    const agg = {};

    (quotas || []).forEach((q) => {
      if (!agg[q.employee_id]) {
        agg[q.employee_id] = {
          employee_id: q.employee_id,
          name: q.employees?.name || "Unknown",
          sub_department: q.employees?.sub_department || "",
          department: q.employees?.department || "",
          quota: 0,
          revenueWon: 0,
          revenueLost: 0,
          dealsWon: 0,
          dealsLost: 0,
          dealsPending: 0,
        };
      }
      agg[q.employee_id].quota += q.status === "PUBLISHED" ? Number(q.amount_target) || 0 : 0;
      agg[q.employee_id].revenueWon += Number(q.current_actual) || 0;
      agg[q.employee_id].revenueLost += Number(q.revenue_lost) || 0;
      agg[q.employee_id].dealsWon += Number(q.deals_won) || 0;
      agg[q.employee_id].dealsLost += Number(q.deals_lost) || 0;
      agg[q.employee_id].dealsPending += Number(q.deals_pending) || 0;
    });

    // Compute derived metrics, aggregate totals, and sort
    let totalWon = 0;
    let totalLost = 0;
    let totalQuota = 0;
    let totalDealsWon = 0;
    let totalDealsLost = 0;

    const rankings = Object.values(agg)
      .map((emp) => {
        const totalDeals = emp.dealsWon + emp.dealsLost;
        const winRate =
          totalDeals > 0 ? Math.round((emp.dealsWon / totalDeals) * 100) : null;
        const quotaPct =
          emp.quota > 0 ? Math.round((emp.revenueWon / emp.quota) * 100) : 0;

        // Accumulate totals for summary
        totalWon += emp.revenueWon;
        totalLost += emp.revenueLost;
        totalQuota += emp.quota;
        totalDealsWon += emp.dealsWon;
        totalDealsLost += emp.dealsLost;

        return { ...emp, winRate, quotaPct };
      })
      .sort((a, b) => {
        const pctB = b.quota > 0 ? b.revenueWon / b.quota : 0;
        const pctA = a.quota > 0 ? a.revenueWon / a.quota : 0;
        return pctB - pctA;
      });

    const teamWinRate =
      totalDealsWon + totalDealsLost > 0
        ? Math.round((totalDealsWon / (totalDealsWon + totalDealsLost)) * 100)
        : null;

    const companyPct =
      totalQuota > 0 ? Math.round((totalWon / totalQuota) * 100) : 0;

    return {
      rankings,
      summary: {
        totalWon,
        totalLost,
        totalQuota,
        companyPct,
        teamWinRate,
        totalDealsWon,
        totalDealsLost,
      },
    };
  },
};
