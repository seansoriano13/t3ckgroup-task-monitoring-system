import { supabase } from "../../lib/supabase";
import { TASK_STATUS } from "../../constants/status";

const extractSubmittedByName = (activityLogs = [], fallbackName = null) => {
  if (!Array.isArray(activityLogs) || activityLogs.length === 0) return fallbackName;

  const createdLog = activityLogs.find((log) => {
    if (!log) return false;
    const event = log?.metadata?.event;
    const content = log?.content || "";
    return event === "TASK_CREATED" || content.startsWith("Task submitted by ");
  });

  if (!createdLog) return fallbackName;

  if (createdLog?.metadata?.submittedByName) {
    return createdLog.metadata.submittedByName;
  }

  const content = createdLog?.content || "";
  const match = content.match(/^Task submitted by (.+?)\.$/);
  return match?.[1] || fallbackName;
};

export const taskQueryService = {
  // 1. HR/HEAD VIEW: Get everything
  async getAllTasks({ from = null, to = null } = {}) {
    let query = supabase
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
        creator:employees!tasks_logged_by_fk(name, department, sub_department, email, is_super_admin, avatar_path),
        editor:employees!tasks_edited_by_fk(name, avatar_path),
        evaluator:employees!tasks_evaluated_by_fkey(name, avatar_path),
        reportedToHead:employees!tasks_reported_to_fkey(name, avatar_path),
        categories(description)
      `,
      )
      .neq("status", TASK_STATUS.DELETED)
      .order("created_at", { ascending: false });

    if (Number.isInteger(from) && Number.isInteger(to) && from >= 0 && to >= from) {
      query = query.range(from, to);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map((task) => ({
      id: task.id,
      taskDescription: task.task_description,
      projectTitle: task.project_title || null,
      categoryId: task.category_id,
      categoryDesc: task.categories?.description,
      loggedById: task.logged_by,
      loggedByName: task.creator?.name,
      loggedByAvatar: task.creator?.avatar_path,
      loggedByEmail: task.creator?.email,
      submittedByName: task.creator?.name,
      creator: task.creator,
      editedById: task.edited_by,
      editedByName: task.editor?.name,
      editedByAvatar: task.editor?.avatar_path,
      editedAt: task.edited_at,
      evaluatedById: task.evaluated_by,
      evaluatedByName: task.evaluator?.name,
      evaluatedByAvatar: task.evaluator?.avatar_path,
      evaluatedAt: task.evaluated_at,
      reportedTo: task.reported_to,
      reportedToName: task.reportedToHead?.name || null,
      reportedToAvatar: task.reportedToHead?.avatar_path || null,
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
  async getMyTasks(userId, { from = null, to = null } = {}) {
    let query = supabase
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
        creator:employees!tasks_logged_by_fk(name, department, sub_department, email, avatar_path),
        editor:employees!tasks_edited_by_fk(name, avatar_path),
        evaluator:employees!tasks_evaluated_by_fkey(name, avatar_path),
        reportedToHead:employees!tasks_reported_to_fkey(name, avatar_path),
        categories(description)
      `,
      )
      .eq("logged_by", userId)
      .neq("status", TASK_STATUS.DELETED)
      .order("created_at", { ascending: false });

    if (Number.isInteger(from) && Number.isInteger(to) && from >= 0 && to >= from) {
      query = query.range(from, to);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map((task) => ({
      id: task.id,
      taskDescription: task.task_description,
      projectTitle: task.project_title || null,
      categoryId: task.category_id,
      categoryDesc: task.categories?.description,
      loggedById: task.logged_by,
      loggedByName: task.creator?.name,
      loggedByAvatar: task.creator?.avatar_path,
      submittedByName: task.creator?.name,
      creator: task.creator,
      editedById: task.edited_by,
      editedByName: task.editor?.name,
      editedByAvatar: task.editor?.avatar_path,
      editedAt: task.edited_at,
      evaluatedById: task.evaluated_by,
      evaluatedByName: task.evaluator?.name,
      evaluatedByAvatar: task.evaluator?.avatar_path,
      evaluatedAt: task.evaluated_at,
      reportedTo: task.reported_to,
      reportedToName: task.reportedToHead?.name || null,
      reportedToAvatar: task.reportedToHead?.avatar_path || null,
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

  // 2.3. MANAGER REPLIES: Fetch all task IDs where the current user has any activity entry
  async getManagerRepliesForTasks(taskIds, userId) {
    if (!taskIds?.length || !userId) return new Set();
    const { data, error } = await supabase
      .from("task_activity")
      .select("task_id")
      .in("task_id", taskIds)
      .eq("author_id", userId);
    if (error) throw error;
    return new Set((data || []).map((r) => r.task_id));
  },

  // 2.5. SINGLE FETCH: Get one task by ID (for deep linking)
  async getTaskById(taskId) {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        `
        *, 
        creator:employees!tasks_logged_by_fk(name, department, sub_department, email, is_super_admin, avatar_path),
        editor:employees!tasks_edited_by_fk(name, avatar_path),
        evaluator:employees!tasks_evaluated_by_fkey(name, avatar_path),
        reportedToHead:employees!tasks_reported_to_fkey(name, avatar_path),
        activityLogs:task_activity!task_activity_task_id_fkey(content, metadata, created_at),
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
      loggedByAvatar: data.creator?.avatar_path,
      loggedByEmail: data.creator?.email,
      submittedByName: extractSubmittedByName(data.activityLogs, data.creator?.name),
      creator: data.creator,
      editedById: data.edited_by,
      editedByName: data.editor?.name,
      editedByAvatar: data.editor?.avatar_path,
      editedAt: data.edited_at,
      evaluatedById: data.evaluated_by,
      evaluatedByName: data.evaluator?.name,
      evaluatedByAvatar: data.evaluator?.avatar_path,
      evaluatedAt: data.evaluated_at,
      reportedTo: data.reported_to,
      reportedToName: data.reportedToHead?.name || null,
      reportedToAvatar: data.reportedToHead?.avatar_path || null,
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
