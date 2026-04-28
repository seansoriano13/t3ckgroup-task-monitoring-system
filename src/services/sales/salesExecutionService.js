import { supabase } from "../../lib/supabase";
import { notificationService } from "../notificationService";
import { REVENUE_STATUS } from "../../constants/status";
import { salesActivityLogService } from "./salesActivityLogService";

export const salesExecutionService = {
  async bulkUpsertActivities(activitiesArray) {
    if (!activitiesArray || activitiesArray.length === 0) return [];

    // Separate new records (no id) from existing records (has id)
    // This prevents Supabase from forcing NULL into the ID identity column during a unified batch query
    const toInsert = activitiesArray.filter((a) => !a.id);
    const toUpdate = activitiesArray.filter((a) => !!a.id);

    let results = [];

    if (toInsert.length > 0) {
      const { data: inserted, error: iErr } = await supabase
        .from("sales_activities")
        .insert(toInsert)
        .select("*, employees!sales_activities_employee_id_fkey(name, avatar_path)");
      if (iErr) throw iErr;
      results = [...results, ...inserted];

      // Broadcast Unplanned injection
      const unplannedCount = inserted.filter((a) => a.is_unplanned).length;
      if (unplannedCount > 0) {
        try {
          const firstUnplanned = inserted.find((a) => a.is_unplanned);
          await notificationService.broadcastToRole(["HR", "SUPER_ADMIN"], {
            sender_id: firstUnplanned?.employee_id,
            type: "UNPLANNED_ACTIVITY",
            title: "Unplanned Action Logged",
            message: `${firstUnplanned.employees?.name || "A Sales Rep"} dynamically added ${unplannedCount} unplanned activit${unplannedCount > 1 ? "ies" : "y"} into their tracker.`,
            reference_id: firstUnplanned?.id,
          });
        } catch (e) {
          console.error("Notification failed", e);
        }
      }

      // Notify admins if any inserted items need expense approval
      const pendingExpenseItems = inserted.filter(
        (a) =>
          a.status === REVENUE_STATUS.PENDING && Number(a.expense_amount) > 0,
      );
      if (pendingExpenseItems.length > 0) {
        for (const item of pendingExpenseItems) {
          try {
            await notificationService.broadcastToRole(["SUPER_ADMIN", "HEAD"], {
              sender_id: item.employee_id,
              type: "SALES_EXPENSE_PENDING",
              title: "Expense Approval Needed",
              message: `${item.employees?.name || "A Sales Rep"} logged an unplanned activity with a requested expense of ₱${Number(item.expense_amount).toLocaleString()}.`,
              reference_id: item.id,
            });
          } catch (e) {
            console.error("Notification failed", e);
          }
        }
      }

      // Add SYSTEM logs for newly created activities
      Promise.allSettled(
        inserted.map((item) =>
          salesActivityLogService.addSystemEvent(
            item.id,
            "Activity created.",
            { event: "CREATED" },
          ),
        ),
      ).catch(console.error);
    }

    if (toUpdate.length > 0) {
      const { data: updated, error: uErr } = await supabase
        .from("sales_activities")
        .upsert(toUpdate)
        .select();
      if (uErr) throw uErr;
      results = [...results, ...updated];
    }

    return results;
  },

  async deleteActivities(activityIds) {
    if (!activityIds || activityIds.length === 0) return;
    const { error } = await supabase
      .from("sales_activities")
      .delete()
      .in("id", activityIds);
    if (error) throw error;
  },

  async requestDayDeletion(employeeId, dateOrDates, reason, userId) {
    const dates = Array.isArray(dateOrDates) ? dateOrDates : [dateOrDates];
    const payload = {
      delete_reason: reason,
      delete_requested_by: userId,
    };

    // Update all activities for those days
    const { data: activities, error: updateErr } = await supabase
      .from("sales_activities")
      .update(payload)
      .eq("employee_id", employeeId)
      .in("scheduled_date", dates)
      .neq("is_deleted", true)
      .select(
        "id, account_name, scheduled_date, employees!sales_activities_employee_id_fkey(name)",
      );

    if (updateErr) throw updateErr;

    if (activities && activities.length > 0) {
      const datesStr = dates.length > 1 ? `${dates.length} days` : dates[0];
      notificationService
        .broadcastToRole(["SUPER_ADMIN", "HEAD"], {
          sender_id: userId,
          type: "DAY_DELETE_REQUESTED",
          title: "Full Day Deletion Request",
          message: `${activities[0].employees?.name || "A Sales Rep"} requested to delete ALL activities on ${datesStr}. Reason: ${reason}`,
          reference_id: dates[0],
        })
        .catch(console.error);

      // Add SYSTEM logs for wipe request
      Promise.allSettled(
        activities.map((item) =>
          salesActivityLogService.addSystemEvent(
            item.id,
            `Requested to wipe this activity from the day's pipeline. Reason: ${reason}`,
            { event: "DAY_WIPE_REQUESTED", reason },
          ),
        ),
      ).catch(console.error);
    }

    return activities;
  },

  async resolveDayDeletion(employeeId, dateStr, isApproved, adminId) {
    const payload = {};
    if (isApproved) {
      payload.is_deleted = true;
      payload.delete_reason = null;
      payload.delete_requested_by = null;
    } else {
      payload.delete_reason = null;
      payload.delete_requested_by = null;
    }

    const { data: activities, error } = await supabase
      .from("sales_activities")
      .update(payload)
      .eq("employee_id", employeeId)
      .eq("scheduled_date", dateStr)
      .not("delete_requested_by", "is", null)
      .select("id, account_name, plan_id"); // #7 — fetch plan_id to trigger revision

    if (error) throw error;

    if (isApproved && activities && activities.length > 0) {
      const planIds = Array.from(new Set(activities.map((a) => a.plan_id).filter(Boolean)));
      if (planIds.length > 0) {
        await supabase
          .from("sales_weekly_plans")
          .update({ 
            status: "REVISION", 
            amendment_reason: `System: Plan revised due to approved day wipe on ${dateStr}.`,
            amendment_requested_at: new Date().toISOString()
          })
          .in("id", planIds)
          .eq("status", "APPROVED"); // Only move to revision if it was approved
      }
    }

    notificationService
      .createNotification({
        recipient_id: employeeId,
        sender_id: adminId,
        type: "DAY_DELETE_RESULT",
        title: isApproved ? "Day Deletion Approved" : "Day Deletion Denied",
        message: isApproved
          ? `Your request to wipe activities for ${dateStr} was approved.`
          : `Your request to wipe activities for ${dateStr} was denied.`,
        reference_id: dateStr,
      })
      .catch(console.error);

    // Add SYSTEM logs for wipe resolution
    if (activities && activities.length > 0) {
      Promise.allSettled(
        activities.map((item) =>
          salesActivityLogService.addSystemEvent(
            item.id,
            `Day wipe request was ${isApproved ? "approved (activity deleted)" : "denied (activity retained)"}.`,
            { event: "DAY_WIPE_RESOLVED", isApproved },
          ),
        ),
      ).catch(console.error);
    }

    return activities;
  },

  async getDailyActivities(employeeId, dateStr) {
    const { data, error } = await supabase
      .from("sales_activities")
      .select("*, employees!sales_activities_employee_id_fkey(name, avatar_path)")
      .eq("employee_id", employeeId)
      .eq("scheduled_date", dateStr)
      .neq("is_deleted", true)
      .order("id", { ascending: true });

    if (error) throw error;
    return data;
  },

  async markActivityDone(activityId, details_daily, attachments) {
    // Fetch activity first to check expense_amount natively before completion
    const { data: actCheck } = await supabase
      .from("sales_activities")
      .select("expense_amount")
      .eq("id", activityId)
      .single();
    // Fetch self approval setting override
    const { data: settings } = await supabase
      .from("app_settings")
      .select("sales_self_approve_expenses")
      .eq("id", true)
      .single();

    let targetStatus = REVENUE_STATUS.APPROVED;
    if (
      Number(actCheck?.expense_amount) > 0 &&
      !settings?.sales_self_approve_expenses
    ) {
      targetStatus = REVENUE_STATUS.PENDING;
    }

    const { data: activity, error } = await supabase
      .from("sales_activities")
      .update({
        status: targetStatus,
        details_daily,
        attachments: attachments || [],
        ...(targetStatus === REVENUE_STATUS.APPROVED && {
          completed_at: new Date().toISOString(),
        }),
      })
      .eq("id", activityId)
      .select("*, employees!sales_activities_employee_id_fkey(name, avatar_path)")
      .single();

    if (error) throw error;

    // Blast notification to Super Admin / Head if waiting for money
    if (targetStatus === REVENUE_STATUS.PENDING) {
      notificationService
        .broadcastToRole(["SUPER_ADMIN", "HEAD"], {
          sender_id: activity.employee_id,
          type: "SALES_EXPENSE_PENDING",
          title: "Expense Approval Needed",
          message: `${activity.employees?.name} mapped an activity with a requested expense of ₱${Number(activity.expense_amount).toLocaleString()}.`,
          reference_id: activity.id,
        })
        .catch(console.error);
    }

    // Calculate if Day/Week is conquered (Fire & forget)
    if (activity && targetStatus === REVENUE_STATUS.APPROVED) {
      supabase
        .from("sales_activities")
        .select("id")
        .eq("employee_id", activity.employee_id)
        .eq("scheduled_date", activity.scheduled_date)
        .neq("id", activityId)
        .neq("status", REVENUE_STATUS.APPROVED)
        .neq("is_deleted", true) // #4 — exclude soft-deleted activities from conquered check
        .then(({ data: pendingDay, error }) => {
          if (error) {
            console.error("Day conquered check failed:", error);
            return;
          }
          if (pendingDay && pendingDay.length === 0) {
            notificationService
              .broadcastToRole(["HR", "SUPER_ADMIN"], {
                sender_id: activity.employee_id,
                type: "SALES_DAY_CONQUERED",
                title: "Day Conquered!",
                message: `${activity.employees?.name} just conquered their entire daily pipeline!`,
                reference_id: activity.scheduled_date,
              })
              .catch(console.error);
          }
        })
        .catch(console.error);
    }

    // Add logging
    if (activity) {
      salesActivityLogService.addSystemEvent(
        activityId,
        targetStatus === REVENUE_STATUS.APPROVED ? "Activity marked as done." : "Activity completion requested (Expense pending approval).",
        { event: "COMPLETED", targetStatus }
      ).catch(console.error);
    }

    return activity;
  },

  async updateActivityOutcome(activityId, outcome) {
    // outcome: 'COMPLETED' | 'LOST' | null
    const { data, error } = await supabase
      .from("sales_activities")
      .update({ sales_outcome: outcome || null })
      .eq("id", activityId)
      .select()
      .single();
    if (error) throw error;

    if (data) {
      salesActivityLogService.addSystemEvent(
        activityId,
        `Outcome updated to ${outcome || 'none'}.`,
        { event: "OUTCOME_UPDATED", outcome }
      ).catch(console.error);
    }

    return data;
  },

  async updateActivityAttachments(activityId, attachments) {
    const { data, error } = await supabase
      .from("sales_activities")
      .update({ attachments: attachments || [] })
      .eq("id", activityId)
      .select()
      .single();
    if (error) throw error;

    if (data) {
      salesActivityLogService.addSystemEvent(
        activityId,
        "Activity attachments updated.",
        { event: "ATTACHMENTS_UPDATED" }
      ).catch(console.error);
    }

    return data;
  },

  async getSalesActivityById(activityId) {
    const { data, error } = await supabase
      .from("sales_activities")
      .select(`
        *,
        employees!sales_activities_employee_id_fkey(name, department, sub_department, email, avatar_path),
        sales_weekly_plans(id, status)
      `)
      .eq("id", activityId)
      .single();

    if (error) throw error;
    return data;
  },
};
