import supabase from "../lib/supabase";

export const taskService = {
  async getAllTasks() {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        `*, employees:logged_by (name, department, sub_department, email)`,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data.map((task) => ({
      id: task.id,
      taskDescription: task.task_description,
      categoryId: task.category_id,
      categoryDesc: task.categories?.description,
      loggedById: task.logged_by,
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

  async createTask(payload) {
    const { data, error } = await supabase
      .from("tasks")
      .insert([
        {
          task_description: payload.taskDescription,
          category_id: payload.categoryId, //Must match from categories.category_id
          logged_by: payload.loggedById, //Employee UUID
          start_at: new Date().toISOString(),
          status: "INCOMPLETE",
          priority: payload.priority || "LOW",
        },
      ])
      .select();

    if (error) throw error;
    return data[0];
  },

  async deleteTask(taskId) {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) throw error;
    return true;
  },
};
