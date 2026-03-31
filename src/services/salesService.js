import { supabase } from "../lib/supabase";
import { notificationService } from "./notificationService";

export const salesService = {
  // === QUOTAS ===
  async getQuotasByMonth(monthYearDate) {
    // monthYearDate e.g. '2026-03-01'
    const { data, error } = await supabase
      .from("sales_quotas")
      .select(`*, employees(name, department, email)`)
      .eq("month_year", monthYearDate);

    if (error) throw error;
    return data;
  },

  async upsertQuota(employeeId, amountTarget, monthYearDate) {
    const { data, error } = await supabase
      .from("sales_quotas")
      .upsert(
        { employee_id: employeeId, amount_target: amountTarget, month_year: monthYearDate },
        { onConflict: 'employee_id, month_year' }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // === CATEGORIES ===
  async getSalesCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('description')
      .eq('department', 'SALES')
      .order('created_at');
    if (error) throw error;
    return data.map(c => c.description);
  },

  // === SALES EMPLOYEES LIST ===
  async getSalesEmployees() {
    // Simple fetch, filtering could be based on roles string if needed
    // Assuming they are assigned to specific departments for 'Sales'
    const { data, error } = await supabase
      .from("employees")
      .select("id, name, department, sub_department, role, is_super_admin")
      .or('department.ilike.%sales%,sub_department.ilike.%sales%,is_super_admin.eq.true'); 

    if (error) throw error;
    return data;
  },

  // === WEEKLY PLANS & SCHEDULING ===
  async getWeeklyPlan(employeeId, weekStartDate) {
    const { data, error } = await supabase
      .from("sales_weekly_plans")
      .select(`*, sales_activities(*)`)
      .eq("employee_id", employeeId)
      .eq("week_start_date", weekStartDate)
      .maybeSingle();

    if (error) throw error;
    return data; // returns null if doesn't exist
  },

  async upsertWeeklyPlan(employeeId, weekStartDate, status) {
    const { data, error } = await supabase
      .from("sales_weekly_plans")
      .upsert(
        { employee_id: employeeId, week_start_date: weekStartDate, status },
        { onConflict: 'employee_id, week_start_date' }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },
  async submitPlan(planId, userObj) {
    const { data, error } = await supabase
      .from("sales_weekly_plans")
      .update({ status: 'SUBMITTED' })
      .eq('id', planId)
      .select()
      .single();

    if (error) throw error;

    if (userObj) {
       notificationService.broadcastToRole(['HR', 'SUPER_ADMIN'], {
          sender_id: userObj.id,
          type: 'SALES_PLAN_SUBMITTED',
          title: 'Sales Plan Submitted',
          message: `${userObj.name || 'A Sales Rep'} just submitted their weekly sales execution plan.`,
          reference_id: data.id
       });
    }

    return data;
  },

  async bulkUpsertActivities(activitiesArray) {
    if (!activitiesArray || activitiesArray.length === 0) return [];
    
    // Separate new records (no id) from existing records (has id)
    // This prevents Supabase from forcing NULL into the ID identity column during a unified batch query
    const toInsert = activitiesArray.filter(a => !a.id);
    const toUpdate = activitiesArray.filter(a => !!a.id);

    let results = [];

    if (toInsert.length > 0) {
      const { data: inserted, error: iErr } = await supabase
        .from("sales_activities")
        .insert(toInsert)
        .select('*, employees(name)');
      if (iErr) throw iErr;
      results = [...results, ...inserted];

      // Broadcast Unplanned injection
      const unplannedCount = inserted.filter(a => a.is_unplanned).length;
      if (unplannedCount > 0) {
         const firstUnplanned = inserted.find(a => a.is_unplanned);
         await notificationService.broadcastToRole(['HR', 'SUPER_ADMIN'], {
            sender_id: firstUnplanned?.employee_id,
            type: 'UNPLANNED_ACTIVITY',
            title: 'Unplanned Action Logged',
            message: `${inserted[0].employees?.name || 'A Sales Rep'} dynamically injected ${unplannedCount} unplanned activit${unplannedCount > 1 ? 'ies' : 'y'} into their tracker.`,
            reference_id: firstUnplanned?.id
         });
      }

      // Notify admins if any inserted items need expense approval
      const pendingExpenseItems = inserted.filter(a => a.status === 'PENDING_APPROVAL' && Number(a.expense_amount) > 0);
      if (pendingExpenseItems.length > 0) {
         for (const item of pendingExpenseItems) {
            await notificationService.broadcastToRole(['SUPER_ADMIN', 'HEAD'], {
               sender_id: item.employee_id,
               type: 'SALES_EXPENSE_PENDING',
               title: 'Expense Approval Needed',
               message: `${item.employees?.name || 'A Sales Rep'} logged an unplanned activity with a requested expense of ₱${Number(item.expense_amount).toLocaleString()}.`,
               reference_id: item.id
            });
         }
      }
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
    const { error } = await supabase.from('sales_activities').delete().in('id', activityIds);
    if (error) throw error;
  },

  async deleteWeeklyPlan(planId) {
    if (!planId) return;
    const { error } = await supabase.from('sales_weekly_plans').delete().eq('id', planId);
    if (error) throw error;
  },

  // === EXECUTION TRACKING ===
  async getDailyActivities(employeeId, dateStr) {
     const { data, error } = await supabase
       .from("sales_activities")
       .select("*")
       .eq("employee_id", employeeId)
       .eq("scheduled_date", dateStr);

     if (error) throw error;
     return data;
  },

  async markActivityDone(activityId, details_daily) {
     // Fetch activity first to check expense_amount natively before completion
     const { data: actCheck } = await supabase.from("sales_activities").select('expense_amount').eq("id", activityId).single();
     
     // Fetch self approval setting override
     const { data: settings } = await supabase.from('app_settings').select('sales_self_approve_expenses').eq('id', true).single();

     let targetStatus = 'DONE';
     if (Number(actCheck?.expense_amount) > 0 && !settings?.sales_self_approve_expenses) {
         targetStatus = 'PENDING_APPROVAL';
     }

     const { data: activity, error } = await supabase
       .from("sales_activities")
       .update({ status: targetStatus, details_daily, ...(targetStatus === 'DONE' && { completed_at: new Date().toISOString() }) })
       .eq("id", activityId)
       .select('*, employees(name)')
       .single();

     if (error) throw error;

     // Blast notification to Super Admin / Head if waiting for money
     if (targetStatus === 'PENDING_APPROVAL') {
         notificationService.broadcastToRole(['SUPER_ADMIN', 'HEAD'], {
           sender_id: activity.employee_id,
           type: 'SALES_EXPENSE_PENDING',
           title: 'Expense Approval Needed',
           message: `${activity.employees?.name} mapped an activity with a requested expense of ₱${Number(activity.expense_amount).toLocaleString()}.`,
           reference_id: activity.id
         });
     }

     // Calculate if Day/Week is conquered (Fire & forget)
     if (activity && targetStatus === 'DONE') {
         supabase.from('sales_activities').select('id').eq('employee_id', activity.employee_id).eq('scheduled_date', activity.scheduled_date).neq('id', activityId).neq('status', 'DONE').then(({ data: pendingDay }) => {
           if (pendingDay && pendingDay.length === 0) {
              notificationService.broadcastToRole(['HR', 'SUPER_ADMIN'], {
                 sender_id: activity.employee_id,
                 type: 'SALES_DAY_CONQUERED',
                 title: 'Day Conquered!',
                 message: `${activity.employees?.name} just conquered their entire daily pipeline!`,
              });
           }
        });
     }

     return activity;
  },

  async approveExpenseActivity(activityId, isApproved) {
     const targetStatus = isApproved ? 'DONE' : 'REJECTED';
     const { data: activity, error } = await supabase
       .from("sales_activities")
       .update({ status: targetStatus, completed_at: targetStatus === 'DONE' ? new Date().toISOString() : null })
       .eq("id", activityId)
       .select('*, employees(name)')
       .single();

     if (error) throw error;

     // Notify employee of result
     notificationService.createNotification({
         recipient_id: activity.employee_id,
         type: 'SALES_EXPENSE_PROCESSED',
         title: isApproved ? 'Fund Request Approved' : 'Fund Request Denied',
         message: isApproved ? `Your planned activity expense for ${activity.account_name || 'an account'} was successfully approved.` : `Your expense for ${activity.account_name || 'an account'} was rejected.`,
         reference_id: activity.id
     });

     return activity;
  },

  async bulkApproveExpenses(activityIds) {
     if (!activityIds || activityIds.length === 0) return;
     // Batch-update all to DONE in one query
     const { data, error } = await supabase
       .from('sales_activities')
       .update({ status: 'DONE', completed_at: new Date().toISOString() })
       .in('id', activityIds)
       .select('id, employee_id, account_name');
     if (error) throw error;

     // Notify each unique employee
     const byEmployee = {};
     (data || []).forEach(a => {
        if (!byEmployee[a.employee_id]) byEmployee[a.employee_id] = [];
        byEmployee[a.employee_id].push(a.account_name || 'an activity');
     });
     Object.entries(byEmployee).forEach(([empId, names]) => {
        notificationService.createNotification({
           recipient_id: empId,
           type: 'SALES_EXPENSE_PROCESSED',
           title: 'Fund Request Approved',
           message: `${names.length} expense${names.length > 1 ? 's' : ''} approved: ${names.slice(0,3).join(', ')}${names.length > 3 ? '…' : ''}`,
        });
     });

     return data;
  },

  // === REVENUE TRACKING ===
  async getEmployeeRevenue(employeeId, yearMonthStr) {
     // yearMonthStr e.g. '2026-03'
     const { data, error } = await supabase
       .from("sales_revenue_logs")
       .select("*")
       .eq("employee_id", employeeId)
       .like("date", `${yearMonthStr}-%`);

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
        const { data: old } = await supabase.from('sales_revenue_logs').select('is_verified').eq('id', id).single();
        oldLog = old;
     }

     const { data, error } = await supabase.from('sales_revenue_logs').update(payload).eq('id', id).select().single();
     if (error) throw error;

     if (payload.is_verified === true && oldLog && !oldLog.is_verified) {
        notificationService.createNotification({
           recipient_id: data.employee_id,
           type: 'REVENUE_LOCKED',
           title: 'Revenue Audit Passed',
           message: `Your revenue log for ${data.account || 'an account'} was globally verified.`,
           reference_id: data.id
        });
     }

     return data;
  },

  async requestRevenueEdit(id, amount, reason, userId) {
     const payload = {
         edit_request_amount: amount,
         edit_request_reason: reason,
         edit_request_status: 'PENDING',
         edit_requested_at: new Date().toISOString()
     };
     const { data, error } = await supabase.from('sales_revenue_logs').update(payload).eq('id', id).select('*, employees(name)').single();
     if (error) throw error;

     notificationService.broadcastToRole(['SUPER_ADMIN'], {
         sender_id: userId,
         type: 'REVENUE_EDIT_REQUESTED',
         title: 'Incoming Edit Protocol',
         message: `${data.employees?.name} requested permission to change a locked log to ₱${Number(amount).toLocaleString()}.`,
         reference_id: id
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
         payload.edit_request_status = 'REJECTED';
     }
     const { data, error } = await supabase.from('sales_revenue_logs').update(payload).eq('id', id).select().single();
     if (error) throw error;

     notificationService.createNotification({
         recipient_id: data.employee_id,
         sender_id: adminId,
         type: 'REVENUE_EDIT_RESULT',
         title: isApproved ? 'Edit Protocol Approved' : 'Edit Protocol Denied',
         message: isApproved ? `Your requested change for ${data.account || 'an account'} was accepted. Values were updated.` : `Your request to change ${data.account || 'an account'} was declined. Log remains strictly locked.`,
         reference_id: id
     });

     return data;
  },

  // === GLOBAL APP SETTINGS ===
  async getAppSettings() {
     const { data, error } = await supabase.from('app_settings').select('*').single();
      if (error || !data) {
        // Fallback initialized row
        const { data: d } = await supabase.from('app_settings').upsert({ id: true, require_revenue_verification: false, sales_self_approve_expenses: false }).select().single();
        return d;
     }
     return data;
  },

  async updateAppSettings(payload) {
     const { data, error } = await supabase.from('app_settings').update(payload).eq('id', true).select().single();
     if (error) throw error;
     return data;
  },

  // === ADMIN & REPORTS ===
  async getPendingExpenses(departmentStr = null) {
     let query = supabase
       .from('sales_activities')
       .select('*, employees!inner(name, department, is_super_admin)')
       .eq('status', 'PENDING_APPROVAL')
       .order('scheduled_date', { ascending: false });

     if (departmentStr) {
        query = query.eq('employees.department', departmentStr);
     }
     
     const { data, error } = await query;
     if (error) throw error;
     return data || [];
  },

  async getAllSalesActivities() {
     const { data, error } = await supabase
       .from('sales_activities')
       .select('*, employees(name, department, is_super_admin)')
       .order('scheduled_date', { ascending: false });
     if (error) throw error;
     return data;
  },

  async getAllRevenueLogs() {
     const { data, error } = await supabase
       .from('sales_revenue_logs')
       .select('*, employees!sales_revenue_logs_employee_id_fkey(name, department, is_super_admin), editor:employees!sales_revenue_logs_last_edited_by_fkey(name)')
       .order('date', { ascending: false });
     if (error) throw error;
     return data;
  },

  async getRevenueAnalysis(startDate, endDate) {
     const { data, error } = await supabase
       .from('sales_revenue_logs')
       .select('*, employees!sales_revenue_logs_employee_id_fkey(name)')
       .gte('date', startDate)
       .lte('date', endDate)
       .order('date', { ascending: false });
     if (error) throw error;
     return data;
  },

  // === SALES OUTCOME (Admin/Head only) ===
  async updateActivityOutcome(activityId, outcome) {
    // outcome: 'WON' | 'LOST' | null
    const { data, error } = await supabase
      .from('sales_activities')
      .update({ sales_outcome: outcome || null })
      .eq('id', activityId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // === DASHBOARD AGGREGATES ===
  async getLeaderboardData(monthYearStr) {
    // 1. Get Quotas for the month
    const { data: quotas, error: qErr } = await supabase
       .from('sales_quotas')
       .select('*, employees(name, is_super_admin)')
       .eq('month_year', `${monthYearStr}-01`);
    if (qErr) throw qErr;

    // 2. Get all revenues for the month using proper date ranging
    const startDate = `${monthYearStr}-01`;
    const [yy, mm] = monthYearStr.split('-').map(Number);
    const nextMonth = mm === 12 ? 1 : mm + 1;
    const nextYear = mm === 12 ? yy + 1 : yy;
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    const { data: revenues, error: rErr } = await supabase
       .from('sales_revenue_logs')
       .select('*, employees!sales_revenue_logs_employee_id_fkey(name, is_super_admin)')
       .gte('date', startDate)
       .lt('date', endDate);
    if (rErr) throw rErr;

    // 3. Combine
    const agg = {};
    quotas.forEach(q => {
       if (q.employees?.is_super_admin) return;
       agg[q.employee_id] = { 
          employee_id: q.employee_id, 
          name: q.employees?.name || 'Unknown', 
          quota: q.amount_target, 
          revenueWon: 0, 
          revenueLost: 0 
       };
    });
    
    revenues.forEach(r => {
       if (r.employees?.is_super_admin) return;
       if (!agg[r.employee_id]) {
           // If they have revenue but no quota, we should probably still show them or skip.
           // Let's create a placeholder so they don't disappear.
            agg[r.employee_id] = {
               employee_id: r.employee_id,
               name: r.employees?.name || 'Sales Rep',
               quota: 0,
               revenueWon: 0,
               revenueLost: 0
            }
       }
        if (r.status?.toUpperCase().includes('COMPLETED')) {
          agg[r.employee_id].revenueWon += Number(r.revenue_amount);
       } else {
          agg[r.employee_id].revenueLost += Number(r.revenue_amount);
       }
    });

    return Object.values(agg).sort((a,b) => {
       const pctB = b.quota > 0 ? (b.revenueWon / b.quota) : 0;
       const pctA = a.quota > 0 ? (a.revenueWon / a.quota) : 0;
       return pctB - pctA;
    });
  }
};
