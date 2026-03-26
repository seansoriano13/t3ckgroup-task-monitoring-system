import { supabase } from "../lib/supabase";

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
      .select("id, name, department, sub_department, is_super_admin")
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

  async submitPlan(planId) {
    const { data, error } = await supabase
      .from("sales_weekly_plans")
      .update({ status: 'SUBMITTED' })
      .eq('id', planId)
      .select()
      .single();

    if (error) throw error;
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
        .select();
      if (iErr) throw iErr;
      results = [...results, ...inserted];
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
     const { data, error } = await supabase
       .from("sales_activities")
       .update({ status: 'DONE', details_daily })
       .eq("id", activityId)
       .select()
       .single();

     if (error) throw error;
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

  // === ADMIN & REPORTS ===
  async getAllSalesActivities() {
     const { data, error } = await supabase
       .from('sales_activities')
       .select('*, employees(name, department)')
       .order('scheduled_date', { ascending: false });
     if (error) throw error;
     return data;
  },

  async getAllRevenueLogs() {
     const { data, error } = await supabase
       .from('sales_revenue_logs')
       .select('*, employees(name, department)')
       .order('date', { ascending: false });
     if (error) throw error;
     return data;
  },

  async getRevenueAnalysis(startDate, endDate) {
     const { data, error } = await supabase
       .from('sales_revenue_logs')
       .select('*, employees(name)')
       .gte('date', startDate)
       .lte('date', endDate)
       .order('date', { ascending: false });
     if (error) throw error;
     return data;
  },

  // === DASHBOARD AGGREGATES ===
  async getLeaderboardData(monthYearStr) {
    // 1. Get Quotas for the month
    const { data: quotas, error: qErr } = await supabase
       .from('sales_quotas')
       .select('*, employees(name)')
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
       .select('*')
       .gte('date', startDate)
       .lt('date', endDate);
    if (rErr) throw rErr;

    // 3. Combine
    const agg = {};
    quotas.forEach(q => {
       agg[q.employee_id] = { 
          employee_id: q.employee_id, 
          name: q.employees?.name || 'Unknown', 
          quota: q.amount_target, 
          revenueWon: 0, 
          revenueLost: 0 
       };
    });
    
    revenues.forEach(r => {
       if (!agg[r.employee_id]) {
           // If they have revenue but no quota, we should probably still show them or skip.
           // Let's create a placeholder so they don't disappear.
           agg[r.employee_id] = {
              employee_id: r.employee_id,
              name: 'Sales Rep', // Ideally joined, but this is fallback
              quota: 0,
              revenueWon: 0,
              revenueLost: 0
           }
       }
       if (r.status === 'COMPLETED SALES' || r.status === 'Won') {
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
