import { supabase } from "../../lib/supabase";
import { notificationService } from "../notificationService";
import { getMonthBoundaries } from "../../utils/dateUtils";
import { REVENUE_STATUS } from "../../constants/status";

export const salesRevenueService = {
  async getRevenueLogsByMonth(selectedMonth) {
    const { startDate, endDate } = getMonthBoundaries(selectedMonth);

    const { data, error } = await supabase
      .from("sales_revenue_logs")
      .select("*, employees!sales_revenue_logs_employee_id_fkey(name)")
      .eq("record_type", "SALES_ORDER")
      .gte("date", startDate)
      .lt("date", endDate)
      .neq("is_deleted", true) // exclude soft-deleted rows
      .order("date", { ascending: false });

    if (error) throw error;
    return data;
  },

  async getEmployeeRevenue(employeeId, yearMonthStr) {
    // yearMonthStr e.g. '2026-03'
    const { startDate, endDate } = getMonthBoundaries(yearMonthStr);
    const { data, error } = await supabase
      .from("sales_revenue_logs")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("record_type", "SALES_ORDER")
      .gte("date", startDate)
      .lt("date", endDate);

    if (error) throw error;
    return data;
  },

  async logRevenue(payload) {
    const { data, error } = await supabase
      .from("sales_revenue_logs")
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateRevenueLog(id, payload) {
    // Pre-fetch if we are locking it
    let oldLog = null;
    if (payload.is_verified === true) {
      const { data: old } = await supabase
        .from("sales_revenue_logs")
        .select("is_verified")
        .eq("id", id)
        .single();
      oldLog = old;
    }

    const { data, error } = await supabase
      .from("sales_revenue_logs")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    if (payload.is_verified === true && oldLog && !oldLog.is_verified) {
      notificationService.createNotification({
        recipient_id: data.employee_id,
        type: "REVENUE_LOCKED",
        title: "Revenue Audit Passed",
        message: `Your revenue log for ${data.account || "an account"} was globally verified.`,
        reference_id: data.id,
      });
    }

    return data;
  },

  async requestRevenueEdit(id, amount, reason, userId) {
    const payload = {
      edit_request_amount: amount,
      edit_request_reason: reason,
      edit_request_status: REVENUE_STATUS.PENDING,
      edit_requested_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("sales_revenue_logs")
      .update(payload)
      .eq("id", id)
      .select("*, employees(name)")
      .single();
    if (error) throw error;

    notificationService.broadcastToRole(["SUPER_ADMIN"], {
      sender_id: userId,
      type: "REVENUE_EDIT_REQUESTED",
      title: "Incoming Edit Protocol",
      message: `${data.employees?.name} requested permission to change a locked log to ₱${Number(amount).toLocaleString()}.`,
      reference_id: id,
    });

    return data;
  },

  async resolveEditRequest(id, isApproved, newAmount, adminId) {
    const payload = {};
    if (isApproved) {
      payload.revenue_amount = newAmount; // Overwrite actual baseline
      payload.edit_request_status = null;
      payload.edit_request_amount = null;
      payload.edit_request_reason = null;
      payload.last_edited_by = adminId;
      payload.last_edited_at = new Date().toISOString();
    } else {
      payload.edit_request_status = REVENUE_STATUS.REJECTED;
    }
    const { data, error } = await supabase
      .from("sales_revenue_logs")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    notificationService.createNotification({
      recipient_id: data.employee_id,
      sender_id: adminId,
      type: "REVENUE_EDIT_RESULT",
      title: isApproved ? "Edit Protocol Approved" : "Edit Protocol Denied",
      message: isApproved
        ? `Your requested change for ${data.account || "an account"} was accepted. Values were updated.`
        : `Your request to change ${data.account || "an account"} was declined. Log remains strictly locked.`,
      reference_id: id,
    });

    return data;
  },

  async softDeleteRevenueLog(id) {
    const { data: log, error: fetchErr } = await supabase
      .from("sales_revenue_logs")
      .select("id, is_verified, is_deleted")
      .eq("id", id)
      .single();

    if (fetchErr) throw new Error(fetchErr.message);
    if (log?.is_deleted) throw new Error("This log has already been removed.");

    const { error } = await supabase
      .from("sales_revenue_logs")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw new Error(error.message);
  },

  async getRevenueAnalysis(startDate, endDate) {
    const { data, error } = await supabase
      .from("sales_revenue_logs")
      .select("*, employees!sales_revenue_logs_employee_id_fkey(name)")
      .eq("record_type", "SALES_ORDER")
      .gte("date", startDate)
      .lte("date", endDate)
      .neq("is_deleted", true) // exclude soft-deleted rows
      .order("date", { ascending: false });
    if (error) throw error;
    return data;
  },
};
