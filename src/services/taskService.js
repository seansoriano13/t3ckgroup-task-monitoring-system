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
        categories(description)
      `,
      )
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
        *, 
        creator:employees!tasks_logged_by_fk(name, department, sub_department, email),
        editor:employees!tasks_edited_by_fk(name),
        categories(description)
      `,
      )
      .eq("logged_by", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data.map((task) => ({
      id: task.id,
      taskDescription: task.task_description,
      categoryId: task.category_id,
      loggedById: task.logged_by, // Make sure we keep the ID!
      loggedByName: task.creator?.name,
      creator: task.creator,
      editedById: task.edited_by,
      editedByName: task.editor?.name,
      editedAt: task.edited_at,
      startAt: task.start_at,
      endAt: task.end_at,
      status: task.status,
      priority: task.priority,
      remarks: task.remarks,
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
        },
      ])
      .select();

    if (error) throw error;
    return data[0];
  },

  // 4. UPDATE (Used for Employee Edits AND Manager Grading)
  async updateTask(taskId, payload) {
    const updateData = {};

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
