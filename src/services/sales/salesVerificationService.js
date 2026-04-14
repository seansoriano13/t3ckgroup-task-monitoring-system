import { supabase } from "../../lib/supabase";
import { notificationService } from "../notificationService";
import { REVENUE_STATUS } from "../../constants/status";

export const salesVerificationService = {
  async getHeadPendingActivities() {
    const { data, error } = await supabase
      .from("sales_activities")
      .select(
        "*, employees!sales_activities_employee_id_fkey!inner(name, department, sub_department, is_super_admin)",
      )
      .is("head_verified_at", null)
      .neq("is_deleted", true)
      .order("scheduled_date", { ascending: false });

    if (error) throw error;
    return data;
  },

  async verifyActivity(activityId, headRemarks, verifiedBy) {
    const { data, error } = await supabase
      .from("sales_activities")
      .update({
        head_remarks: headRemarks,
        head_verified_at: new Date().toISOString(),
        head_verified_by: verifiedBy,
      })
      .eq("id", activityId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async bulkVerifyActivities(activityIds, headRemarks, verifiedBy) {
    if (!activityIds || activityIds.length === 0) return [];
    const { data, error } = await supabase
      .from("sales_activities")
      .update({
        head_remarks: headRemarks,
        head_verified_at: new Date().toISOString(),
        head_verified_by: verifiedBy,
      })
      .in("id", activityIds)
      .select();
    if (error) throw error;
    return data;
  },

  async approveExpenseActivity(activityId, isApproved) {
    const targetStatus = isApproved
      ? REVENUE_STATUS.APPROVED
      : REVENUE_STATUS.REJECTED;
    const { data: activity, error } = await supabase
      .from("sales_activities")
      .update({
        status: targetStatus,
        completed_at:
          targetStatus === REVENUE_STATUS.APPROVED
            ? new Date().toISOString()
            : null,
      })
      .eq("id", activityId)
      .select("*, employees!sales_activities_employee_id_fkey(name)")
      .single();

    if (error) throw error;

    // Notify employee of result
    notificationService.createNotification({
      recipient_id: activity.employee_id,
      type: "SALES_EXPENSE_PROCESSED",
      title: isApproved ? "Fund Request Approved" : "Fund Request Denied",
      message: isApproved
        ? `Your planned activity expense for ${activity.account_name || "an account"} was successfully approved.`
        : `Your expense for ${activity.account_name || "an account"} was rejected.`,
      reference_id: activity.id,
    });

    return activity;
  },

  async bulkApproveExpenses(activityIds) {
    if (!activityIds || activityIds.length === 0) return;
    const { data, error } = await supabase
      .from("sales_activities")
      .update({
        status: REVENUE_STATUS.APPROVED,
        completed_at: new Date().toISOString(),
      })
      .in("id", activityIds)
      .eq("status", REVENUE_STATUS.PENDING)
      .select("id, employee_id, account_name");
    if (error) throw error;

    // Notify each unique employee
    const byEmployee = {};
    (data || []).forEach((a) => {
      if (!byEmployee[a.employee_id]) byEmployee[a.employee_id] = [];
      byEmployee[a.employee_id].push(a.account_name || "an activity");
    });
    Object.entries(byEmployee).forEach(([empId, names]) => {
      notificationService.createNotification({
        recipient_id: empId,
        type: "SALES_EXPENSE_PROCESSED",
        title: "Fund Request Approved",
        message: `${names.length} expense${names.length > 1 ? "s" : ""} approved: ${names.slice(0, 3).join(", ")}${names.length > 3 ? "…" : ""}`,
      });
    });

    return data;
  },

  async getPendingExpenses(departmentStr = null) {
    let query = supabase
      .from("sales_activities")
      .select(
        "*, employees!sales_activities_employee_id_fkey!inner(name, department, is_super_admin)",
      )
      .eq("status", REVENUE_STATUS.PENDING)
      .neq("is_deleted", true)
      .order("scheduled_date", { ascending: false });

    if (departmentStr) {
      query = query.eq("employees.department", departmentStr);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },
};
