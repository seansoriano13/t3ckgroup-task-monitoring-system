import { supabase } from "../lib/supabase";

export const taskService = {
  // 1. HR/HEAD VIEW: Get everything
  async getAllTasks() {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        `*, 
         employees:logged_by (name, department, sub_department, email),
         categories:category_id (description)`, // 👈 Added this join so categoryDesc works!
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data.map((task) => ({
      id: task.id,
      taskDescription: task.task_description,
      categoryId: task.category_id,
      categoryDesc: task.categories?.description,
      loggedById: task.logged_by,
      loggedByName: task.employees?.name, // 👈 Added name for the UI cards
      loggedByEmail: task.employees?.email,
      startAt: task.start_at,
      endAt: task.end_at,
      status: task.status,
      priority: task.priority,
      remarks: task.remarks,
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
      .select(`*, employees:logged_by (name)`) // Still need the name for the card UI
      .eq("logged_by", userId) // 👈 The crucial filter to keep it private
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data.map((task) => ({
      id: task.id,
      taskDescription: task.task_description,
      categoryId: task.category_id,
      loggedById: task.logged_by,
      loggedByName: task.employees?.name,
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
          // 👈 Upgraded to use the modal's date, or fallback to right now
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
    // Dynamically build the payload so we only update what changed
    const updateData = {};

    // Employee Edit Fields
    if (payload.taskDescription !== undefined)
      updateData.task_description = payload.taskDescription;
    if (payload.categoryId !== undefined)
      updateData.category_id = payload.categoryId;
    if (payload.priority !== undefined) updateData.priority = payload.priority;
    if (payload.startAt !== undefined)
      updateData.start_at = payload.startAt
        ? new Date(payload.startAt).toISOString()
        : null;
    if (payload.endAt !== undefined)
      updateData.end_at = payload.endAt
        ? new Date(payload.endAt).toISOString()
        : null;

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
  async deleteTask(taskId) {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) throw error;
    return true;
  },
};
