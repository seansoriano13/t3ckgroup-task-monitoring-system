import { supabase } from "../../lib/supabase";
import { notificationService } from "../notificationService";
import { SALES_PLAN_STATUS } from "../../constants/status";

export const salesPlanService = {
  async getWeeklyPlan(employeeId, weekStartDate) {
    const { data, error } = await supabase
      .from("sales_weekly_plans")
      .select(`*, sales_activities(*)`)
      .eq("employee_id", employeeId)
      .eq("week_start_date", weekStartDate)
      .maybeSingle();

    if (error) throw error;
    if (data && data.sales_activities) {
      data.sales_activities = data.sales_activities.filter(a => !a.is_deleted);
    }
    return data; // returns null if doesn't exist
  },

  async getPlanById(planId) {
    const { data, error } = await supabase
      .from("sales_weekly_plans")
      .select(`*, sales_activities(*)`)
      .eq("id", planId)
      .single();

    if (error) throw error;
    if (data && data.sales_activities) {
      data.sales_activities = data.sales_activities.filter(a => !a.is_deleted);
    }
    return data;
  },

  async upsertWeeklyPlan(employeeId, weekStartDate, status) {
    const { data, error } = await supabase
      .from("sales_weekly_plans")
      .upsert(
        { employee_id: employeeId, week_start_date: weekStartDate, status },
        { onConflict: "employee_id, week_start_date" },
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async submitPlan(planId, userObj) {
    const isAutoApproved = userObj && (userObj.is_head || userObj.isHead || userObj.is_super_admin || userObj.isSuperAdmin);
    const newStatus = isAutoApproved ? SALES_PLAN_STATUS.APPROVED : SALES_PLAN_STATUS.SUBMITTED;

    const { data, error } = await supabase
      .from("sales_weekly_plans")
      .update({ status: newStatus })
      .eq("id", planId)
      .select()
      .single();

    if (error) throw error;

    if (userObj && !isAutoApproved) {
      notificationService.broadcastToRole(["HR", "SUPER_ADMIN"], {
        sender_id: userObj.id,
        type: "SALES_PLAN_SUBMITTED",
        title: "Sales Plan Submitted",
        message: `${userObj.name || "A Sales Rep"} just submitted their weekly sales execution plan.`,
        reference_id: data.id,
      });
    }

    return data;
  },

  async requestPlanAmendment(planId, reason, userObj) {
    // Take a snapshot of the current activities
    const { data: activities } = await supabase
      .from("sales_activities")
      .select("*")
      .eq("plan_id", planId)
      .neq("is_deleted", true);

    const payload = {
      status: SALES_PLAN_STATUS.REVISION,
      amendment_reason: reason,
      amendment_requested_at: new Date().toISOString(),
      amendment_snapshot: activities,
    };

    const { data, error } = await supabase
      .from("sales_weekly_plans")
      .update(payload)
      .eq("id", planId)
      .select()
      .single();
    if (error) throw error;

    // #5 — notify admins about who requested the amendment (was silently dropped before)
    if (userObj?.id) {
      notificationService.broadcastToRole(["HR", "SUPER_ADMIN"], {
        sender_id: userObj.id,
        type: "PLAN_AMENDMENT_REQUESTED",
        title: "Plan Amendment Requested",
        message: `${userObj.name || "A Sales Rep"} has requested to amend their approved weekly plan. Reason: ${reason}`,
        reference_id: String(planId),
      }).catch(console.error);
    }

    return data;
  },

  async resolvePlanAmendment(planId, isApproved, userObj) {
    const { data: currentPlan } = await supabase
      .from("sales_weekly_plans")
      .select("amendment_snapshot, employee_id")
      .eq("id", planId)
      .single();

    // Once resolved, it goes back to APPROVED (since amendments happen on approved plans)
    // and we clear the amendment fields
    const payload = {
      status: SALES_PLAN_STATUS.APPROVED,
      amendment_reason: null,
      amendment_requested_at: null,
      amendment_snapshot: null,
    };

    if (isApproved) {
      const { data, error } = await supabase
        .from("sales_weekly_plans")
        .update(payload)
        .eq("id", planId)
        .select()
        .single();
      if (error) throw error;

      if (userObj?.id !== currentPlan.employee_id) {
        notificationService.createNotification({
          recipient_id: currentPlan.employee_id,
          sender_id: userObj?.id,
          type: "PLAN_AMENDMENT_RESULT",
          title: "Amendment Approved",
          message: `Your requested plan changes were approved.`,
          reference_id: planId,
        });
      }
      return data;
    } else {
      // Revert to snapshot
      await supabase.from("sales_activities").delete().eq("plan_id", planId);

      // Re-insert snapshot activities
      // #7 - strip out ID and other internal fields from snapshot to prevent IDENTITY conflict
      if (currentPlan.amendment_snapshot?.length > 0) {
        const cleanSnapshot = currentPlan.amendment_snapshot.map(act => {
          const { id: _id, created_at: _created_at, ...cleanAct } = act;
          return cleanAct;
        });

        const { error: insertError } = await supabase
          .from("sales_activities")
          .insert(cleanSnapshot);

        if (insertError) {
          console.error("Failed to restore snapshot:", insertError);
          throw insertError;
        }
      }

      const { data, error } = await supabase
        .from("sales_weekly_plans")
        .update(payload)
        .eq("id", planId)
        .select()
        .single();
      if (error) throw error;

      if (userObj?.id !== currentPlan.employee_id) {
        notificationService.createNotification({
          recipient_id: currentPlan.employee_id,
          sender_id: userObj?.id,
          type: "PLAN_AMENDMENT_RESULT",
          title: "Amendment Rejected",
          message: `Your requested plan changes were rejected. The plan has been reverted to its previous state.`,
          reference_id: planId,
        });
      }

      return data;
    }
  },

  async deleteWeeklyPlan(planId) {
    if (!planId) return;
    const { error } = await supabase
      .from("sales_weekly_plans")
      .delete()
      .eq("id", planId);
    if (error) throw error;
  },
};
