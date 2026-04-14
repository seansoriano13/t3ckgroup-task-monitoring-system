import { supabase } from "../../lib/supabase";
import { TASK_STATUS } from "../../constants/status";

export const taskQueryService = {
  // 1. HR/HEAD VIEW: Get everything
  async getAllTasks() {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        `
        *, 
        creator:employees!tasks_logged_by_fk(name, department, sub_department, email, is_super_admin),
        editor:employees!tasks_edited_by_fk(name),
        evaluator:employees!tasks_evaluated_by_fkey(name),
        reportedToHead:employees!tasks_reported_to_fkey(name),
        categories(description)
      `,
      )
      .neq("status", TASK_STATUS.DELETED)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data.map((task) => ({
      id: task.id,
      taskDescription: task.task_description,
      projectTitle: task.project_title || null,
      categoryId: task.category_id,
      categoryDesc: task.categories?.description,
      loggedById: task.logged_by,
      loggedByName: task.creator?.name,
      loggedByEmail: task.creator?.email,
      creator: task.creator,
      editedById: task.edited_by,
      editedByName: task.editor?.name,
      editedAt: task.edited_at,
      evaluatedById: task.evaluated_by,
      evaluatedByName: task.evaluator?.name,
      evaluatedAt: task.evaluated_at,
      reportedTo: task.reported_to,
      reportedToName: task.reportedToHead?.name || null,
      startAt: task.start_at,
      endAt: task.end_at,
      status: task.status,
      priority: task.priority,
      remarks: task.remarks,
      hrRemarks: task.hr_remarks,
      grade: task.grade,
      hrVerifiedAt: task.hr_verified_at,
      hrVerified: task.hr_verified,
      paymentVoucher: task.payment_voucher,
      attachments: task.attachment_urls || [],
      createdAt: task.created_at,
    }));
  },

  // 2. EMPLOYEE VIEW: Get only tasks logged by the current user
  async getMyTasks(userId) {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        `
        id,
        created_at,
        task_description,
        project_title,
        category_id,
        logged_by,
        edited_by,
        edited_at,
        evaluated_by,
        evaluated_at,
        reported_to,
        start_at,
        end_at,
        status,
        priority,
        remarks,
        grade,
        hr_verified,
        hr_remarks,
        hr_verified_at,
        payment_voucher,
        attachment_urls,
        creator:employees!tasks_logged_by_fk(name, department, sub_department, email),
        editor:employees!tasks_edited_by_fk(name),
        evaluator:employees!tasks_evaluated_by_fkey(name),
        reportedToHead:employees!tasks_reported_to_fkey(name),
        categories(description)
      `,
      )
      .eq("logged_by", userId)
      .neq("status", TASK_STATUS.DELETED)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data.map((task) => ({
      id: task.id,
      taskDescription: task.task_description,
      projectTitle: task.project_title || null,
      categoryId: task.category_id,
      categoryDesc: task.categories?.description,
      loggedById: task.logged_by,
      loggedByName: task.creator?.name,
      creator: task.creator,
      editedById: task.edited_by,
      editedByName: task.editor?.name,
      editedAt: task.edited_at,
      evaluatedById: task.evaluated_by,
      evaluatedByName: task.evaluator?.name,
      evaluatedAt: task.evaluated_at,
      reportedTo: task.reported_to,
      reportedToName: task.reportedToHead?.name || null,
      startAt: task.start_at,
      endAt: task.end_at,
      status: task.status,
      priority: task.priority,
      remarks: task.remarks,
      hrRemarks: task.hr_remarks,
      hrVerified: task.hr_verified,
      hrVerifiedAt: task.hr_verified_at,
      grade: task.grade,
      paymentVoucher: task.payment_voucher,
      attachments: task.attachment_urls || [],
      createdAt: task.created_at,
    }));
  },

  // 2.5. SINGLE FETCH: Get one task by ID (for deep linking)
  async getTaskById(taskId) {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        `
        *, 
        creator:employees!tasks_logged_by_fk(name, department, sub_department, email, is_super_admin),
        editor:employees!tasks_edited_by_fk(name),
        evaluator:employees!tasks_evaluated_by_fkey(name),
        reportedToHead:employees!tasks_reported_to_fkey(name),
        categories(description)
      `,
      )
      .eq("id", taskId)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      taskDescription: data.task_description,
      projectTitle: data.project_title || null,
      categoryId: data.category_id,
      categoryDesc: data.categories?.description,
      loggedById: data.logged_by,
      loggedByName: data.creator?.name,
      loggedByEmail: data.creator?.email,
      creator: data.creator,
      editedById: data.edited_by,
      editedByName: data.editor?.name,
      editedAt: data.edited_at,
      evaluatedById: data.evaluated_by,
      evaluatedByName: data.evaluator?.name,
      evaluatedAt: data.evaluated_at,
      reportedTo: data.reported_to,
      reportedToName: data.reportedToHead?.name || null,
      startAt: data.start_at,
      endAt: data.end_at,
      status: data.status,
      priority: data.priority,
      remarks: data.remarks,
      hrRemarks: data.hr_remarks,
      grade: data.grade,
      hrVerified: data.hr_verified,
      hrVerifiedAt: data.hr_verified_at,
      paymentVoucher: data.payment_voucher,
      attachments: data.attachment_urls || [],
      createdAt: data.created_at,
    };
  },
};
