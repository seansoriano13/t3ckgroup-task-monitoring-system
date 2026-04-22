import { supabase } from "../../lib/supabase";
import { notificationService } from "../notificationService";

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

  async upsertQuota(employeeId, amountTarget, monthYearDate, status = "PUBLISHED", changedBy = null) {
    // 1. Fetch existing to know old amount
    const { data: existing } = await supabase
      .from("sales_quotas")
      .select("id, amount_target, status")
      .eq("employee_id", employeeId)
      .eq("month_year", monthYearDate)
      .single();

    // 2. Upsert new quota
    const { data, error } = await supabase
      .from("sales_quotas")
      .upsert(
        {
          ...(existing?.id ? { id: existing.id } : {}),
          employee_id: employeeId,
          amount_target: amountTarget,
          month_year: monthYearDate,
          status: status,
        },
        { onConflict: "employee_id, month_year" },
      )
      .select()
      .single();

    if (error) throw error;

    // 3. Log history
    if (data) {
      let action = "UPDATED";
      if (!existing) action = "CREATED";
      else if (existing.status === "DRAFT" && status === "PUBLISHED") action = "PUBLISHED";
      else if (existing.amount_target === amountTarget && existing.status === status) {
        return data; // No actual change
      }

      const logPayload = {
        quota_id: data.id,
        changed_by: changedBy || null,
        old_amount: existing?.amount_target || null,
        new_amount: amountTarget,
        action: action,
      };
      
      const { error: logError } = await supabase.from("sales_quota_logs").insert(logPayload);
      if (logError) console.error("Failed to insert quota log:", logError);
    }

    return data;
  },

  async publishQuotas(quotaIds, changedBy = null) {
    if (!quotaIds || quotaIds.length === 0) return [];
    
    const { data, error } = await supabase
      .from("sales_quotas")
      .update({ status: "PUBLISHED" })
      .in("id", quotaIds)
      .select();

    if (error) throw error;

    if (data && data.length > 0) {
      const logs = data.map(quota => ({
        quota_id: quota.id,
        changed_by: changedBy || null,
        old_amount: quota.amount_target, // For publish, old and new amount are same
        new_amount: quota.amount_target,
        action: "PUBLISHED",
      }));
      
      const { error: logError } = await supabase.from("sales_quota_logs").insert(logs);
      if (logError) console.error("Failed to insert publish logs:", logError);

      data.forEach(quota => {
        notificationService.createNotification({
          recipient_id: quota.employee_id,
          sender_id: changedBy || quota.employee_id,
          type: "SALES_QUOTA_PUBLISHED",
          title: "New Sales Quota Published",
          message: `Your sales quota for ${quota.month_year} has been set to ₱${Number(quota.amount_target).toLocaleString()}.`,
          reference_id: quota.id.toString(),
        });
      });
    }

    return data;
  },

  async getQuotaHistory(quotaId) {
    const { data, error } = await supabase
      .from("sales_quota_logs")
      .select(`*, changed_by_employee:changed_by(name, avatar_path)`)
      .eq("quota_id", quotaId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },
};
