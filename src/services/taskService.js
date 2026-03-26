import { supabase } from "../lib/supabase.js";

export const taskService = {
  // 1. HR/HEAD VIEW: Get everything
  async getAllTasks() {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        `
        *, 
        creator:employees!tasks_logged_by_fk(name, department, sub_department, email),
        editor:employees!tasks_edited_by_fk(name),
        evaluator:employees!tasks_evaluated_by_fkey(name),
        categories(description)
      `,
      )
      .neq("status", "DELETED")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data.map((task) => ({
      id: task.id,
      taskDescription: task.task_description,
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
      startAt: task.start_at,
      endAt: task.end_at,
      status: task.status,
      priority: task.priority,
      remarks: task.remarks,
      hrRemarks: task.hr_remarks,
      grade: task.grade,
      hrVerified: task.hr_verified,
      hrVerifiedAt: task.hr_verified_at,
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
        category_id,
        logged_by,
        edited_by,
        edited_at,
        evaluated_by,
        evaluated_at,
        start_at,
        end_at,
        status,
        priority,
        remarks,
        grade,
        hr_verified,
        hr_verified_at,
        creator:employees!tasks_logged_by_fk(name, department, sub_department, email),
        editor:employees!tasks_edited_by_fk(name),
        evaluator:employees!tasks_evaluated_by_fkey(name), 
        categories(description)
      `,
      )
      .eq("logged_by", userId)
      .neq("status", "DELETED")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data.map((task) => ({
      id: task.id,
      taskDescription: task.task_description,
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
      startAt: task.start_at,
      endAt: task.end_at,
      status: task.status,
      priority: task.priority,
      remarks: task.remarks,
      hrRemarks: task.hr_remarks,
      hrVerified: task.hr_verified,
      hrVerifiedAt: task.hr_verified_at,
      grade: task.grade,
      createdAt: task.created_at,
    }));
  },

  // 3. CREATE
  async createTask(payload) {
    const { data, error } = await supabase
      .from("tasks")
      .insert([
        {
          task_description: payload.taskDescription,
          category_id: payload.categoryId,
          logged_by: payload.loggedById,
          start_at: payload.startAt
            ? new Date(payload.startAt).toISOString()
            : new Date().toISOString(),
          end_at: payload.endAt ? new Date(payload.endAt).toISOString() : null,
          status: "INCOMPLETE",
          priority: payload.priority || "LOW",
          remarks: payload.remarks || "",
        },
      ])
      .select();

    if (error) throw error;
    return data[0];
  },

  // 4. UPDATE (Used for Employee Edits AND Manager Grading)
  async updateTask(taskId, payload) {
    const updateData = {};

    // --- Guard rails for pipeline integrity ---
    // - If HR verification is being applied, the task must be in COMPLETE.
    // - If task is being moved back to INCOMPLETE, HR verification must be cleared.
    // - For COMPLETE/NOT APPROVED transitions, prevent "finalized with no evaluator" if caller didn't provide evaluatedBy.
    if (payload?.hrVerified === true && payload?.status !== "COMPLETE") {
      payload = { ...payload, status: "COMPLETE" };
    }

    if (payload?.status === "INCOMPLETE") {
      updateData.hr_verified = false;
      updateData.hr_verified_at = null;
      updateData.hr_remarks = "";
    }

    if (payload?.status === "NOT APPROVED") {
      updateData.hr_verified = false;
      updateData.hr_verified_at = null;
      // Preserve existing hr_remarks unless caller explicitly provided hrRemarks.
      if (payload?.hrRemarks !== undefined) {
        updateData.hr_remarks = payload.hrRemarks;
      }
    }

    // If the caller is attempting to transition workflow state, validate it against the current DB state.
    const needsTransitionCheck =
      payload?.status !== undefined || payload?.hrVerified !== undefined;

    let current = null;
    if (needsTransitionCheck) {
      const { data: cur, error: curErr } = await supabase
        .from("tasks")
        .select("status, hr_verified, evaluated_by")
        .eq("id", taskId)
        .single();
      if (curErr) throw curErr;
      current = cur;
    }

    // Prevent approving/rejecting if the task isn't in the expected pre-state.
    // Head transitions include evaluatedBy; HR transitions do not.
    const isHeadApprove =
      payload?.status === "COMPLETE" && payload?.evaluatedBy !== undefined;
    const isHeadReject =
      payload?.status === "NOT APPROVED" && payload?.evaluatedBy !== undefined;
    const isHrReject = payload?.status === "NOT APPROVED" && payload?.evaluatedBy === undefined;

    if (isHeadApprove) {
      if (current?.status !== "INCOMPLETE") {
        throw new Error(
          `Invalid pipeline transition: can only approve tasks from INCOMPLETE`,
        );
      }
    }

    if (isHeadReject) {
      if (current?.status !== "INCOMPLETE") {
        throw new Error(
          `Invalid pipeline transition: can only reject tasks from INCOMPLETE`,
        );
      }
    }

    // If a caller tries to move to COMPLETE/NOT APPROVED without head evaluation metadata,
    // only HR should be allowed to do it via hrVerified/hrVerified=false paths.
    if (
      payload?.status === "COMPLETE" &&
      payload?.evaluatedBy === undefined &&
      payload?.hrVerified !== true
    ) {
      throw new Error(`Invalid pipeline state: status=COMPLETE requires evaluatedBy`);
    }

    if (
      payload?.status === "NOT APPROVED" &&
      payload?.evaluatedBy === undefined &&
      payload?.hrVerified !== false
    ) {
      throw new Error(`Invalid pipeline state: status=NOT APPROVED requires evaluatedBy`);
    }

    // HR rejection should only happen while the task is currently COMPLETE and unverified.
    if (isHrReject) {
      if (current?.status !== "COMPLETE" || current?.hr_verified !== false) {
        throw new Error(
          `Invalid pipeline transition: HR reject requires status=COMPLETE and hrVerified=false`,
        );
      }
      // HR rejection should not require evaluated_by, since manager evaluation may already exist.
    }

    // Enforce HR verification/undo pre-conditions.
    if (payload?.hrVerified === true) {
      if (current?.status !== "COMPLETE" || current?.hr_verified !== false) {
        throw new Error(
          `Invalid pipeline transition: HR verify requires status=COMPLETE and hrVerified=false`,
        );
      }
      // HR verification depends on head evaluation existing.
      if (current?.evaluated_by == null) {
        throw new Error(
          `Invalid pipeline state: HR verification requires evaluatedBy`,
        );
      }
    }

    // HR undo verification: HR should only be able to "un-verify" when the row is currently verified.
    // Head transitions may also set hrVerified=false, so we distinguish HR undo by absence of evaluatedBy.
    const isHrUndo =
      payload?.hrVerified === false &&
      payload?.status === "COMPLETE" &&
      payload?.evaluatedBy === undefined;

    if (isHrUndo) {
      if (current?.status !== "COMPLETE" || current?.hr_verified !== true) {
        throw new Error(
          `Invalid pipeline transition: HR undo requires status=COMPLETE and hrVerified=true`,
        );
      }
    }

    // Employee Edit Fields
    if (payload.taskDescription !== undefined)
      updateData.task_description = payload.taskDescription;
    if (payload.categoryId !== undefined)
      updateData.category_id = payload.categoryId;
    if (payload.priority !== undefined) updateData.priority = payload.priority;
    if (payload.startAt !== undefined) {
      updateData.start_at = payload.startAt
        ? new Date(payload.startAt).toISOString()
        : null;
    }
    if (payload.endAt !== undefined) {
      updateData.end_at = payload.endAt
        ? new Date(payload.endAt).toISOString()
        : null;
    }

    // Manager/HR Fields
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.remarks !== undefined) updateData.remarks = payload.remarks;
    if (payload.grade !== undefined) updateData.grade = payload.grade;
    if (payload.hrVerified !== undefined) {
      updateData.hr_verified = payload.hrVerified;
      updateData.hr_verified_at = payload.hrVerified
        ? new Date().toISOString()
        : null;
    }

    if (payload.evaluatedBy !== undefined) {
      updateData.evaluated_by = payload.evaluatedBy;
      updateData.evaluated_at = new Date().toISOString();
    }

    if (payload.hrRemarks !== undefined)
      updateData.hr_remarks = payload.hrRemarks;

    // 🔥 The Audit Trail Hookup
    if (payload.editedBy) {
      updateData.edited_by = payload.editedBy;
      updateData.edited_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(updateData)
      .eq("id", taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 5. DELETE
  async deleteTask(taskId, userId) {
    const { error } = await supabase
      .from("tasks")
      .update({
        status: "DELETED", // Hides it from normal views
        edited_by: userId, // Audit trail: Who deleted it?
        edited_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (error) throw error;
    return true;
  },
};
